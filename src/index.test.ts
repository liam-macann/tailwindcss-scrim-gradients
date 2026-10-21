import { describe, expect, test } from 'vitest';
import { compileStyles, generateBase, generateCSS, isOlderThan, major } from './test-utils';

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchRuleFor = (selector: string | RegExp, property: string, value: string) => {
	const s = selector instanceof RegExp ? selector.source : escapeRegex(selector);

	const block = `(?:^|[{};])\\s*${s}\\s*\\{`;
	const declaration = `(?<=\\{|;)\\s*${escapeRegex(property)}\\s*:\\s*${escapeRegex(value)}`;

	return new RegExp(`${block}[^}]*?${declaration}`);
};

describe('Edge utilities apply overlay', () => {
	test.for(['scrim-t-4', 'hover:scrim-t-4', '*:scrim-t-4'])(
		'Utility: %s',
		async (utility, { skip }) => {
			skip(utility.startsWith('*:') && isOlderThan('3.4.0'), 'The `*` variant was added in v3.4');

			const css = await generateCSS(utility);

			expect(css).toContain(`.${utility.replace(/[:*]/g, '\\$&')}`);
			expect(css, 'Expected mask variable').toContain('mask-image: var(');
			expect(css, 'Expected pseudo-element').toMatch(
				matchRuleFor(/[^{};]+::after/, 'content', '""')
			);

			expect(css, 'Expected zero-specificity positioning').toMatch(
				matchRuleFor(/:where\([^{}]+\)/, 'position', 'relative')
			);
		}
	);

	test('Important modifier applies to overlay and positioning', async () => {
		const css = await generateCSS(major === 3 ? '!scrim-t-4' : 'scrim-t-4!');
		expect(css).toContain('content: "" !important');
		expect(css).toContain('position: relative !important');
	});

	test('Color utilities do not apply overlay', async () => {
		const css = await generateCSS('scrim-black');
		expect(css).not.toContain('::after');
		expect(css).not.toContain('position:');
	});
});

test('Base styles reset mask variables, preventing inheritance', async () => {
	const css = await generateBase();

	expect(css).toMatch(matchRuleFor('*', '--tw-scrim-mask-l', 'initial'));
	expect(css).not.toContain('::after');
	expect(css).not.toContain('position:');
});

test('Position can be overridden', async () => {
	const css = await generateCSS('scrim-t-4 absolute');

	expect(css).toMatch(matchRuleFor(/:where\([^)]*\)/, 'position', 'relative'));
	expect(css).toContain('position: absolute');
	expect(css).not.toContain('!important');
});

test('Scrim can be added with @apply directive', async () => {
	const css = await compileStyles(`
		@tailwind utilities;
		.card { @apply scrim-b-12; }
	`);

	expect(css).toMatch(matchRuleFor(/:where\([^{}]+\)/, 'position', 'relative'));
	expect(css).toContain('--tw-scrim-mask-b:');
	expect(css, 'Expected pseudo-element').toMatch(matchRuleFor(/[^{};]+::after/, 'content', '""'));
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

	// v4 applies opacity with `color-mix()` rather than rewriting the color
	if (major === 3) {
		expect(css).toContain('--tw-scrim-color: rgb(0 0 0 / 0.1)');
		expect(css).toContain('--tw-scrim-color: rgb(255 0 0 / 0.2)');
		expect(css).toContain('--tw-scrim-color: rgb(20 60 80 / 0.1)');
	} else {
		expect(css).toContain('--tw-scrim-color: color-mix(in oklab, #000 10%, transparent)');
		expect(css).toContain('--tw-scrim-color: color-mix(in oklab, red 20%, transparent)');
		expect(css).toContain('--tw-scrim-color: color-mix(in oklab, rgb(20,60,80) 10%, transparent)');
	}
});

test('Color functions are resolved', async () => {
	// v3.0-style color function (both Tailwind versions can still pass these through)
	const fn = (() => 'rgb(1 2 3)') as unknown as string;

	const css = await generateCSS('scrim-fn scrim-nested-500', {
		theme: { extend: { colors: { fn, nested: { 500: fn } } } },
	});

	expect(css).not.toContain('=>');
	['.scrim-fn', '.scrim-nested-500'].forEach(selector => {
		expect(css).toMatch(matchRuleFor(selector, '--tw-scrim-color', 'rgb(1 2 3)'));
	});
});

test.skipIf(major !== 3)('Opacity modifiers can be applied to color functions', async () => {
	// Supporting this in v4 would require version sniffing, and is exceedingly uncommon

	const fn = ({ opacityValue }: { opacityValue?: string }) =>
		opacityValue ? `rgb(1 2 3 / ${opacityValue})` : 'rgb(1 2 3)';

	const css = await generateCSS('scrim-fn/50', {
		// Type declaration omits supported legacy color callbacks
		theme: { extend: { colors: { fn: fn as unknown as string } } },
	});

	expect(css).not.toContain('=>');
	expect(css).toContain('--tw-scrim-color: rgb(1 2 3 / 0.5)');
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
	test.for(['20rem', '8.5px', '23%', '0.1px'])('Length: %s', async length => {
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

	const zeroes = ['0', '0rem', '0%', '0.0px', '-10px'];

	test.for(zeroes)('Arbitrary length: %s', async length => {
		const css = await generateCSS(`scrim-b-[${length}]`);

		// v4 infers unitless arbitrary values as numbers, not lengths
		if (major === 4 && length === '0') expect(css).toBe('');
		else expect(css).toContain(maskVar('b'));
	});

	test.for(zeroes)('Configured length: %s', async length => {
		const css = await generateCSS('scrim-b-none', { theme: { height: { none: length } } });
		expect(css).toContain(maskVar('b'));
	});
});

describe.skipIf(major !== 4)('Dynamic numeric spacing', () => {
	test('Numeric distances respect the theme prefix', async () => {
		const css = await compileStyles(
			'@theme prefix(tw) { --spacing: 0.5rem; } @tailwind utilities;',
			'tw:scrim-b-13 tw:scrim-x-13 tw:scrim-13'
		);

		expect(css).toContain('--tw-spacing: 0.5rem');
		expect(css).toContain('calc(var(--tw-spacing) * 13)');
		expect(css).not.toContain('var(--spacing)');
	});

	test('Numeric distances use the spacing variable', async () => {
		const css = await generateCSS('scrim-b-13 scrim-x-2.75 scrim-4.5');

		['13', '2.75', '4.5'].forEach(value => {
			expect(css).toContain(`calc(var(--spacing) * ${value})`);
		});
	});

	test('Numeric distances off the spacing grid produce no output', async () =>
		expect(await generateCSS('scrim-b-2.1')).toBe(''));

	test('Custom spacing units replace generated scale values', async () => {
		// theme('spacing') is the string '0.5rem', which v4 spreads into the scales by character (4 → 'e')
		const css = await compileStyles(
			'@theme { --spacing: 0.5rem; } @tailwind utilities;',
			'scrim-b-4'
		);

		expect(css).toContain('calc(var(--spacing) * 4)');
	});

	test('Configured numeric values take precedence', async () => {
		const css = await generateCSS('scrim-b-4 scrim-l-4 scrim-4', {
			theme: { height: { 4: '7rem' }, width: { 4: '9rem' } },
		});

		expect(css).toContain('rgba(0, 0, 0, 0) 7rem');
		expect(css).toContain('rgba(0, 0, 0, 0) 9rem');
		expect(css).not.toContain('calc(var(--spacing) * 4)');
	});

	describe('Fractional distances', () => {
		test.for(['scrim-b-3/7', 'scrim-x-3/7', 'scrim-3/7'])('Utility: %s', async utility =>
			expect(await generateCSS(utility)).toContain('rgba(0, 0, 0, 0) calc(3 / 7 * 100%)')
		);

		test('Fractions of non-positive integers produce no output', async () =>
			expect(await generateCSS('scrim-b-0/4 scrim-b-3/0 scrim-b-1.5/4 scrim-b-03/7')).toBe(''));
	});
});
