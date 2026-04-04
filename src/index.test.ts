import postcss from 'postcss';
import tw, { type Config } from 'tailwindcss';
import { describe, expect, test } from 'vitest';
import plugin from './index';

const generateCSS = async (utilities: string, options?: Partial<Config>) =>
	await postcss([
		tw({
			content: [{ raw: utilities }],
			plugins: [plugin],
			...options,
		}),
	])
		.process('@tailwind utilities', { from: undefined })
		.then(({ css }) => css);

test('Base component styles are applied', async () => {
	const { css } = await postcss([
		tw({
			// Suppress missing content warning
			content: [{ raw: '' }],
			plugins: [plugin],
			corePlugins: [],
		}),
	]).process('@tailwind base', { from: undefined });

	expect(css).toContain('[class^="scrim-"], [class*=" scrim-"]');
	expect(css).toContain('[class^="scrim-"]::after, [class*=" scrim-"]::after');
	expect(css).toContain('content: ""');
	expect(css).toContain('mask-image: var(');
});

describe('Default, edges, and shorthand axes are defined', () => {
	const edges = ['t', 'r', 'b', 'l'] as const;

	const directions: Record<(typeof edges)[number], string> = {
		t: 'to bottom',
		b: 'to top',
		l: 'to right',
		r: 'to left',
	};

	const maskVar = (edge: (typeof edges)[number]) =>
		`--tw-scrim-mask-${edge}: linear-gradient(${directions[edge]}`;

	test.for([
		['scrim-t', ['t']],
		['scrim-b', ['b']],
		['scrim-l', ['l']],
		['scrim-r', ['r']],
		['scrim-x', ['l', 'r']],
		['scrim-y', ['t', 'b']],
		['scrim', ['t', 'b', 'l', 'r']],
	] as [string, (typeof edges)[number][]][])(
		'Utility: %s',
		async ([utility, activeEdges], { expect }) => {
			const css = await generateCSS(`${utility}-20`);

			edges.forEach(edge => {
				const matcher = expect(css);
				(activeEdges as readonly string[]).includes(edge) ?
					matcher.toContain(maskVar(edge))
				:	matcher.not.toContain(maskVar(edge));
			});
		}
	);
});

test('Opacity modifiers can be applied to color utilities', async () => {
	const css = await generateCSS('scrim-black/10 scrim-primary/20 scrim-secondary-500/10', {
		theme: {
			extend: {
				colors: {
					primary: 'red',
					secondary: { 500: 'rgb(20,60,80)' },
				},
			},
		},
	});

	expect(css).toContain('--tw-scrim-color: rgb(0 0 0 / 0.1)');
	expect(css).toContain('--tw-scrim-color: rgb(255 0 0 / 0.2)');
	expect(css).toContain('--tw-scrim-color: rgb(20 60 80 / 0.1)');
});

test('Length and color utilities compose with extended theme', async () => {
	const css = await generateCSS('scrim-primary scrim-secondary-500 scrim-b-arbitrary', {
		theme: {
			extend: {
				spacing: { arbitrary: 'var(--variable-length)' },
				colors: {
					primary: 'red',
					secondary: { 500: 'rgb(20,60,80)' },
				},
			},
		},
	});

	expect(css).toContain('var(--variable-length)');
	expect(css).toContain('--tw-scrim-color: red');
	expect(css).toContain('--tw-scrim-color: rgb(20,60,80)');
});

describe('Percentage lengths produce valid utility', () => {
	test.for([
		['full', '100%'],
		['1/4', '25%'],
	])('Length: %s', async ([label, length]) => {
		const css = await generateCSS(`scrim-l-${label}`);
		expect(css).toContain(length);
	});
});

describe('Horizontal and vertical axes diverge spacing scales', () => {
	test('Horizontal axis does not use height values', async () => {
		const css = await generateCSS('scrim-l-test scrim-r-test scrim-x-test', {
			theme: {
				width: { test: '97%' },
				height: { test: '18px' },
			},
		});

		expect(css).toContain('97%');
		expect(css).not.toContain('18px');
	});

	test('Vertical axis does not use width values', async () => {
		const css = await generateCSS('scrim-t-test scrim-b-test scrim-y-test', {
			theme: {
				width: { test: '97%' },
				height: { test: '18px' },
			},
		});

		expect(css).not.toContain('97%');
		expect(css).toContain('18px');
	});

	describe('DEFAULT shorthand uses intersection of height and width values', () => {
		test('Non-equivalent values are excluded', async () => {
			const css = await generateCSS('scrim-test scrim-screen', {
				theme: {
					extend: {
						width: { test: '97%' },
						height: { test: '18px' },
					},
				},
			});

			expect(css).toBe('');
		});

		test('Equivalent values are permitted', async () => {
			const css = await generateCSS('scrim-test scrim-screen scrim-1/2', {
				theme: {
					extend: {
						width: { test: '97%' },
						height: { test: '97%' },
					},
				},
			});

			expect(css).toContain('97%');
			expect(css).toContain('50%');
			expect(css).not.toContain('100vw');
			expect(css).not.toContain('100vh');
		});
	});
});

describe('Arbitrary color values are permitted', () => {
	test.for(['#cccccc', '#0af', 'rgba(30, 10, 100, 0.3)'])('Color: %s', async col => {
		const css = await generateCSS(`scrim-[${col.replaceAll(' ', '_')}]`);
		expect(css).toContain(`--tw-scrim-color: ${col}`);
	});
});

describe('Arbitrary lengths are permitted', () => {
	test.for(['20rem', '8.5px', '23%'])('Length: %s', async length => {
		const css = await generateCSS(`scrim-t-[${length}]`);
		expect(css).toContain(length);
	});
});

describe('Utilities compose with variants', () => {
	test.for(['hover', 'md', 'lg:focus', 'dark'])('Variant: `%s`', async variant => {
		const css = await generateCSS(`${variant}:scrim-t-4`);
		expect(css).toContain('--tw-scrim-mask-t');
	});
});

test('Invalid utilities produce no output', async () =>
	expect(await generateCSS('scrim-fake-500 scrim-b-4e0')).toBe(''));

test('Negative lengths produce no output', async () =>
	expect(await generateCSS('-scrim-b-12 -scrim-4')).toBe(''));

describe('Content-based keyword dimensions are handled', () => {
	describe('Invalid keyword dimensions produce no output', () => {
		test.for(['auto', 'fit', 'max', 'min'])('Keyword: %s', async keyword => {
			const css = await generateCSS(`scrim-l-${keyword} scrim-y-${keyword} scrim-${keyword}`);

			// Checks that there is no `undefined` leak
			const resetTheme = await generateCSS(
				`scrim-l-${keyword} scrim-y-${keyword} scrim-${keyword}`,
				{
					theme: { width: {}, height: {} },
				}
			);

			expect(css).toBe('');
			expect(resetTheme).toBe('');
		});
	});

	describe('Allow custom values to override keywords', () => {
		test.for(['auto', 'fit', 'max', 'min'])('Keyword: %s', async keyword => {
			const css = await generateCSS(`scrim-l-${keyword} scrim-y-${keyword} scrim-${keyword}`, {
				theme: { width: { [keyword]: '194px' }, height: { [keyword]: '194px' } },
			});

			expect(css).toContain('194px');
		});
	});
});

describe('Zero dimension edges do not render pixel-width gradient', () => {
	const maskVar = (edge: string) =>
		`--tw-scrim-mask-${edge}: linear-gradient(transparent, transparent)`;

	test('Edge utilities', async () => {
		const css = await generateCSS('scrim-b-0 scrim-l-0');

		expect(css).toContain(maskVar('b'));
		expect(css).toContain(maskVar('l'));
	});

	test('Shorthand axes', async () => {
		const css = await generateCSS('scrim-x-0');

		expect(css).toContain(maskVar('l'));
		expect(css).toContain(maskVar('r'));
	});

	test('Default', async () => {
		const css = await generateCSS('scrim-0');

		expect(css).toContain(maskVar('l'));
		expect(css).toContain(maskVar('r'));
		expect(css).toContain(maskVar('t'));
		expect(css).toContain(maskVar('b'));
	});
});
