const postcss = require('postcss');
const tw = require('tailwindcss');

let baseComponent = `
[class^="scrim-"], [class*=" scrim-"] {
    position: relative;
}
[class^="scrim-"]::after, [class*=" scrim-"]::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: var(--tw-scrim-color, white);
    mask-image: var(--tw-scrim-mask-l, linear-gradient(transparent, transparent)),
      		var(--tw-scrim-mask-r, linear-gradient(transparent, transparent)),
      		var(--tw-scrim-mask-t, linear-gradient(transparent, transparent)),
      		var(--tw-scrim-mask-b, linear-gradient(transparent, transparent));
    mask-repeat: no-repeat;
}
`.trim();

test('Base component styles are applied', async () => {
	const result = await postcss([
		tw({
			plugins: [require('../')],
			corePlugins: [],
		}),
	]).process('@tailwind base', { from: undefined });

	const css = result.css;

	expect(css).toBe(baseComponent);
});

test('Color variables and opacity modifiers function with extended theme', async () => {
	const result = await postcss([
		tw({
			content: [{ raw: 'scrim-orange-500 scrim-primary/20 scrim-secondary-500/10' }],
			plugins: [require('../')],
			theme: {
				extend: {
					colors: {
						primary: 'red',
						secondary: { 500: 'rgb(20,60,80)' },
					},
				},
			},
		}),
	]).process('@tailwind utilities', { from: undefined });

	const css = result.css;

	const expected = `
.scrim-orange-500 {
    --tw-scrim-color: #f97316
}
.scrim-primary\\/20 {
    --tw-scrim-color: rgb(255 0 0 / 0.2)
}
.scrim-secondary-500\\/10 {
    --tw-scrim-color: rgb(20 60 80 / 0.1)
}`.trim();

	expect(css).toBe(expected);
});

test('Default, edges, and shorthand axes are defined', async () => {
	const result = await postcss([
		tw({
			content: [{ raw: 'scrim-t-20 scrim-x-5 scrim-1' }],
			plugins: [require('../')],
			theme: {
				extend: {
					colors: {
						primary: 'red',
						secondary: { 500: 'rgb(20,60,80)' },
					},
				},
			},
		}),
	]).process('@tailwind utilities', { from: undefined });

	const css = result.css;

	const expected = `
.scrim-1 {
    --tw-scrim-mask-l: linear-gradient( to right,
		  black 0%,
		  rgba(0, 0, 0, 0.738),
		  rgba(0, 0, 0, 0.541),
		  rgba(0, 0, 0, 0.382),
		  rgba(0, 0, 0, 0.278),
		  rgba(0, 0, 0, 0.194),
		  rgba(0, 0, 0, 0.126),
		  rgba(0, 0, 0, 0.075),
		  rgba(0, 0, 0, 0.042),
		  rgba(0, 0, 0, 0.021),
		  rgba(0, 0, 0, 0.008),
		  rgba(0, 0, 0, 0.002),
		  rgba(0, 0, 0, 0) 0.25rem
		);
    --tw-scrim-mask-r: linear-gradient( to left,
		  black 0%,
		  rgba(0, 0, 0, 0.738),
		  rgba(0, 0, 0, 0.541),
		  rgba(0, 0, 0, 0.382),
		  rgba(0, 0, 0, 0.278),
		  rgba(0, 0, 0, 0.194),
		  rgba(0, 0, 0, 0.126),
		  rgba(0, 0, 0, 0.075),
		  rgba(0, 0, 0, 0.042),
		  rgba(0, 0, 0, 0.021),
		  rgba(0, 0, 0, 0.008),
		  rgba(0, 0, 0, 0.002),
		  rgba(0, 0, 0, 0) 0.25rem
		);
    --tw-scrim-mask-b: linear-gradient( to top,
		  black 0%,
		  rgba(0, 0, 0, 0.738),
		  rgba(0, 0, 0, 0.541),
		  rgba(0, 0, 0, 0.382),
		  rgba(0, 0, 0, 0.278),
		  rgba(0, 0, 0, 0.194),
		  rgba(0, 0, 0, 0.126),
		  rgba(0, 0, 0, 0.075),
		  rgba(0, 0, 0, 0.042),
		  rgba(0, 0, 0, 0.021),
		  rgba(0, 0, 0, 0.008),
		  rgba(0, 0, 0, 0.002),
		  rgba(0, 0, 0, 0) 0.25rem
		);
    --tw-scrim-mask-t: linear-gradient( to bottom,
		  black 0%,
		  rgba(0, 0, 0, 0.738),
		  rgba(0, 0, 0, 0.541),
		  rgba(0, 0, 0, 0.382),
		  rgba(0, 0, 0, 0.278),
		  rgba(0, 0, 0, 0.194),
		  rgba(0, 0, 0, 0.126),
		  rgba(0, 0, 0, 0.075),
		  rgba(0, 0, 0, 0.042),
		  rgba(0, 0, 0, 0.021),
		  rgba(0, 0, 0, 0.008),
		  rgba(0, 0, 0, 0.002),
		  rgba(0, 0, 0, 0) 0.25rem
		)
}
.scrim-x-5 {
    --tw-scrim-mask-l: linear-gradient( to right,
		  black 0%,
		  rgba(0, 0, 0, 0.738),
		  rgba(0, 0, 0, 0.541),
		  rgba(0, 0, 0, 0.382),
		  rgba(0, 0, 0, 0.278),
		  rgba(0, 0, 0, 0.194),
		  rgba(0, 0, 0, 0.126),
		  rgba(0, 0, 0, 0.075),
		  rgba(0, 0, 0, 0.042),
		  rgba(0, 0, 0, 0.021),
		  rgba(0, 0, 0, 0.008),
		  rgba(0, 0, 0, 0.002),
		  rgba(0, 0, 0, 0) 1.25rem
		);
    --tw-scrim-mask-r: linear-gradient( to left,
		  black 0%,
		  rgba(0, 0, 0, 0.738),
		  rgba(0, 0, 0, 0.541),
		  rgba(0, 0, 0, 0.382),
		  rgba(0, 0, 0, 0.278),
		  rgba(0, 0, 0, 0.194),
		  rgba(0, 0, 0, 0.126),
		  rgba(0, 0, 0, 0.075),
		  rgba(0, 0, 0, 0.042),
		  rgba(0, 0, 0, 0.021),
		  rgba(0, 0, 0, 0.008),
		  rgba(0, 0, 0, 0.002),
		  rgba(0, 0, 0, 0) 1.25rem
		)
}
.scrim-t-20 {
    --tw-scrim-mask-t: linear-gradient( to bottom,
		  black 0%,
		  rgba(0, 0, 0, 0.738),
		  rgba(0, 0, 0, 0.541),
		  rgba(0, 0, 0, 0.382),
		  rgba(0, 0, 0, 0.278),
		  rgba(0, 0, 0, 0.194),
		  rgba(0, 0, 0, 0.126),
		  rgba(0, 0, 0, 0.075),
		  rgba(0, 0, 0, 0.042),
		  rgba(0, 0, 0, 0.021),
		  rgba(0, 0, 0, 0.008),
		  rgba(0, 0, 0, 0.002),
		  rgba(0, 0, 0, 0) 5rem
		)
}
`.trim();

	expect(css).toBe(expected);
});

test('Zero dimension edges do not render pixel-width gradient', async () => {
	const result = await postcss([
		tw({
			content: [{ raw: 'scrim-b-0' }],
			plugins: [require('../')],
			theme: {
				extend: {
					colors: {
						primary: 'red',
						secondary: { 500: 'rgb(20,60,80)' },
					},
				},
			},
		}),
	]).process('@tailwind utilities', { from: undefined });

	const css = result.css;

	const expected = `
.scrim-b-0 {
    --tw-scrim-mask-b: linear-gradient(transparent, transparent)
}`.trim();

	expect(css).toBe(expected);
});
