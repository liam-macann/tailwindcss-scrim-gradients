import plugin from 'tailwindcss/plugin';
import type { CSSRuleObject } from 'tailwindcss/types/config';

// Hacky workaround for edge cases involving opacity modifiers on custom colors
type Color = string | ((...args: unknown[]) => string);
type ColorPalette = { [key: string]: Color | ColorPalette };

const flattenColorPalette = (colors?: ColorPalette): Record<string, Color> =>
	Object.assign(
		{},
		...Object.entries(colors !== null && colors !== void 0 ? colors : {}).flatMap(
			([color, values]) =>
				typeof values === 'object' ?
					Object.entries(flattenColorPalette(values)).map(([number, hex]) => ({
						[color + (number === 'DEFAULT' ? '' : `-${number}`)]: hex,
					}))
				:	[{ [`${color}`]: values }]
		)
	);

/** Returns the shallow intersection of two objects (comparing by reference) */
const intersection = <T extends Record<string, unknown>>(a: T, b: T) =>
	Object.keys(a).reduce(
		(acc, key) => {
			if (a[key] === b[key]) acc[key] = a[key];
			return acc;
		},
		{} as Record<string, unknown>
	) as Partial<T>;

//-----------------------------------------------------------------------------

type CSSDirection = 'to right' | 'to left' | 'to top' | 'to bottom';
type DirectionMapping = CSSDirection | Record<string, CSSDirection>;

// Consumed recursively
const directions: Record<string, DirectionMapping> = {
	DEFAULT: { l: 'to right', r: 'to left', b: 'to top', t: 'to bottom' },
	x: { l: 'to right', r: 'to left' },
	y: { b: 'to top', t: 'to bottom' },
	b: 'to top',
	t: 'to bottom',
	l: 'to right',
	r: 'to left',
} as const;

// Smoooooth gradient
const gradient = (direction: string, distance: string): string => {
	// Prevent solid bar when attempting to hide scrim on edge
	if (distance === '0px') return 'linear-gradient(transparent, transparent)';
	return `
		linear-gradient(${direction},
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
		  rgba(0, 0, 0, 0) ${distance}
		)
	`.trim();
};

//-----------------------------------------------------------------------------

const scrim = plugin(({ matchUtilities, addBase, theme }) => {
	// Allow utility overrides (base layer allows raw CSS selector)
	addBase({
		'[class^="scrim-"], [class*=" scrim-"]': {
			position: 'relative',
			'&::after': {
				content: '""',
				position: 'absolute',
				inset: '0',
				pointerEvents: 'none',
				background: 'var(--tw-scrim-color, white)',
				maskImage: `
      		var(--tw-scrim-mask-l, linear-gradient(transparent, transparent)),
      		var(--tw-scrim-mask-r, linear-gradient(transparent, transparent)),
      		var(--tw-scrim-mask-t, linear-gradient(transparent, transparent)),
      		var(--tw-scrim-mask-b, linear-gradient(transparent, transparent))`.trim(),
				maskRepeat: 'no-repeat',
			},
		},
	});

	matchUtilities(
		{ scrim: value => ({ '--tw-scrim-color': value instanceof Function ? value() : value }) },
		{
			values: flattenColorPalette(theme('colors')),
			type: 'color',
		}
	);

	for (const dir in directions) {
		const isVertical = ['t', 'b', 'y'].includes(dir);
		const isHorizontal = ['l', 'r', 'x'].includes(dir);

		matchUtilities(
			{
				[dir === 'DEFAULT' ? 'scrim' : `scrim-${dir}`]: value => mask(dir, directions[dir], value),
			},
			{
				values: (() => {
					const spacing: Record<string, string> =
						isVertical ? theme('height')
						: isHorizontal ? theme('width')
							// DEFAULT : allow only values identical in both scale
							// ie. scrim-x-screen → 100vw
							//     scrim-y-screen → 100vh
							//     scrim-screen → undefined
						: (intersection(theme('width'), theme('height')) as Record<string, string>);

					// Discard keywords incompatible with pseudo-element mask
					const { auto, min, max, fit, ...values } = spacing;

					// Allow these keywords to be included if default values are overridden
					const keywords: Record<string, string> = {};

					if (auto !== 'auto') keywords.auto = auto;
					if (min !== 'min-content') keywords.min = min;
					if (max !== 'max-content') keywords.max = max;
					if (fit !== 'fit-content') keywords.fit = fit;

					return { ...values, ...keywords };
				})(),
				type: ['length', 'percentage'],
				supportsNegativeValues: false,
			}
		);
	}
});

function mask(label: string, direction: DirectionMapping, distance: string): CSSRuleObject {
	if (typeof direction === 'string')
		return { [`--tw-scrim-mask-${label}`]: gradient(direction, distance) };

	return Object.keys(direction).reduce(
		(acc, subLabel) => Object.assign(acc, mask(subLabel, direction[subLabel], distance)),
		{}
	);
}

export default scrim;
