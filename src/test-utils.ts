import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import postcss, { type AtRule } from 'postcss';
import { compile, type Config as V4Config } from 'tailwindcss';
import tw, { type Config } from 'tailwindcss-v3';
import type v3Plugin from 'tailwindcss-v3/plugin';
import plugin from './index';

/** Major Tailwind CSS version being tested test, set per Vitest project */
export const major = process.env.TAILWIND_VERSION === '3' ? 3 : 4;

/** A partial configuration, in v3-style JavaScript format */
type Options = Partial<Config>;

const require = createRequire(import.meta.url);

/** Exact Tailwind CSS version installed, for the major being tested */
export const version: string = require(
	`${major === 3 ? 'tailwindcss-v3' : 'tailwindcss'}/package.json`
).version;

/** Whether the installed Tailwind CSS version is older than `target` */
export const isOlderThan = (target: string) =>
	version.localeCompare(target, undefined, { numeric: true }) < 0;

/** Compile CSS from input for Tailwind v3 */
const compile3 = (input: string, classes: string, options?: Options) =>
	postcss([
		tw({
			content: [{ raw: classes }],
			// Vitest aliases plugin() to v3 at runtime, but TypeScript stills sees v4 return type
			plugins: [plugin as unknown as ReturnType<typeof v3Plugin>],
			...options,
		}),
	])
		.process(input, { from: undefined })
		.then(({ css }) => css);

/** Compile CSS from input for Tailwind v4 */
const compile4 = async (input: string, classes: string, options: Options = {}) => {
	// Options are passed through @config to allow tests to share v3-style
	const css = `
    @import "tailwindcss/theme.css";
    ${input}
    @config "config";
    @plugin "scrim";
  `;

	const compiler = await compile(css, {
		// Resolve `tailwindcss/theme.css`
		loadStylesheet: async id => ({
			path: id,
			base: '',
			content: await readFile(require.resolve(id), 'utf8'),
		}),

		// Resolve `scrim` and `config`
		loadModule: async id => ({
			path: id,
			base: '',
			module: id === 'scrim' ? plugin : (options as V4Config),
		}),
	});

	return compiler.build(classes.split(/\s+/).filter(Boolean));
};

/** Compile custom CSS with utility candidates and shared theme configuration. */
export const compileStyles = (input: string, classes: string = '', options?: Options) =>
	major === 3 ? compile3(input, classes, options) : compile4(input, classes, options);

/** Generates the contents of one layer, so tests can assert on empty output */
const generateLayer = async (layer: 'base' | 'utilities', classes: string, options?: Options) => {
	if (major === 3) return compileStyles(`@tailwind ${layer}`, classes, options);

	const css = await compileStyles('@layer utilities { @tailwind utilities; }', classes, options);

	// v4 doesn't separate layers into directives. We parse and extract only the requested layer
	const node = postcss
		.parse(css)
		.nodes.find(
			(node): node is AtRule =>
				node.type === 'atrule' && node.name === 'layer' && node.params === layer
		);

	return node?.nodes?.join('\n').trim() ?? '';
};

/** Generates utility layer CSS */
export const generateCSS = (classes: string = '', options?: Options) =>
	generateLayer('utilities', classes, options);

/** Generates base layer CSS */
export const generateBase = () => generateLayer('base', '', { corePlugins: [] });
