import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';

// Stable CSS-in-JS type across Tailwind versions
type CSSRuleObject = { [key: string]: string | CSSRuleObject };

// Tailwind color definition can return functions (eg. for opacity modifiers on custom colors)
// This was common prior to v3.1, and matched internally generated <alpha-value> callbacks post-3.1
type Color = string | ((options: Record<string, never>) => string);
type ColorPalette = { [key: string]: Color | ColorPalette };

const resolveColor = (value: Color): string => (typeof value === 'function' ? value({}) : value);

// Mirrors upstream implementation
function flattenColorPalette(colors?: ColorPalette | null): Record<string, Color> {
	const ThemeOptions = { DEFAULT: 1 << 2 } as const;
	const result: Record<string, Color> = {};

	for (const [root, children] of Object.entries(colors ?? {})) {
		if (root === '__CSS_VALUES__') continue;

		if (children === null) continue; // Unlike upstream, null colors are dropped
		if (typeof children === 'object') {
			for (const [parent, value] of Object.entries(flattenColorPalette(children))) {
				result[`${root}${parent === 'DEFAULT' ? '' : `-${parent}`}`] = value;
			}
		} else result[root] = children;
	}

	// Unlike upstream, a missing palette is tolerated
	if (colors && '__CSS_VALUES__' in colors) {
		for (const [key, value] of Object.entries(colors.__CSS_VALUES__)) {
			if ((Number(value) & ThemeOptions.DEFAULT) === 0) result[key] = colors[key] as Color;
		}
	}

	return result;
}

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
	// Prevent solid bar when attempting to hide scrim on edge. parseFloat() ignores unit, and matches any 0 value
	if (parseFloat(distance) <= 0) return 'linear-gradient(transparent, transparent)';
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

// Emitted with each edge utility, so Tailwind generates the selectors (variants, prefixes, etc.)
// Compression handles the duplication in output CSS
const overlay: CSSRuleObject = {
	// Zero-specificity so explicit positioning utilities can override
	':where(&)': { position: 'relative' },

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
};

// Published types resolve against the installed version
const scrim: ReturnType<typeof plugin> = plugin(({ matchUtilities, addBase, theme }) => {
	addBase({
		// Prevents mask variables from being inherited by descendants
		// (does not match pseudo-elements, so each overlay still inherits from its element)
		'*': {
			'--tw-scrim-mask-l': 'initial',
			'--tw-scrim-mask-r': 'initial',
			'--tw-scrim-mask-t': 'initial',
			'--tw-scrim-mask-b': 'initial',
		},
	});

	matchUtilities(
		{ scrim: (value: Color) => ({ '--tw-scrim-color': resolveColor(value) }) },
		{
			// v4 declares string values only, but we need to preserve legacy callbacks for v3.0 opacity handling
			values: flattenColorPalette(theme('colors')) as Record<string, string>,
			type: 'color',
		}
	);

	// The multiplier --spacing set in Tailwind v4
	const spacingUnit = theme('--spacing');

	/** Tailwind CSS v4 dynamic values support 0.25 increments */
	const isMultiplier = (value: string) =>
		Number(value) >= 0 && Number(value) % 0.25 === 0 && String(Number(value)) === value;

	/** Theme scale for a dimension, without generated numeric entries so they resolve through --spacing */
	const configuredScale = (dimension: 'width' | 'height'): Record<string, string> => {
		if (!spacingUnit) return theme(dimension);

		/** Whether a numeric entry was copied from the --spacing scale, rather than configured */
		const isGenerated = (key: string, value: string) => {
			/** The spacing value for each step
			 * @example { 4: '1rem', px: '1px', … }
			 * @remarks If --spacing is set without a scale, this is a string */
			const scale: string | Record<string, string> = theme('spacing');

			const defaults: Record<string, string> = defaultTheme.spacing;

			// v4 builds width and height scales by spreading theme('spacing')
			// If theme('spacing') is a string, this spreads each character into the scale
			return value === (typeof scale === 'string' ? scale[Number(key)] : defaults[key]);
		};

		return Object.fromEntries(
			Object.entries<string>(theme(dimension)).filter(
				([key, value]) => !isMultiplier(key) || !isGenerated(key, value)
			)
		);
	};

	const width = configuredScale('width');
	const height = configuredScale('height');

	for (const dir in directions) {
		const isVertical = ['t', 'b', 'y'].includes(dir);
		const isHorizontal = ['l', 'r', 'x'].includes(dir);

		matchUtilities(
			{
				[dir === 'DEFAULT' ? 'scrim' : `scrim-${dir}`]: value => ({
					...mask(dir, directions[dir], value),
					...overlay,
				}),
			},
			{
				values: (() => {
					const spacing: Record<string, string> =
						isVertical ? height
						: isHorizontal ? width
							// DEFAULT : allow only values identical in both scale
							// ie. scrim-x-screen → 100vw
							//     scrim-y-screen → 100vh
							//     scrim-screen → undefined
						: (intersection(width, height) as Record<string, string>);

					// Discard keywords incompatible with pseudo-element mask
					const { auto, min, max, fit, ...values } = spacing;

					// Allow these keywords to be included if default values are overridden
					const keywords: Record<string, string> = {};

					if (auto !== undefined && auto !== 'auto') keywords.auto = auto;
					if (min !== undefined && min !== 'min-content') keywords.min = min;
					if (max !== undefined && max !== 'max-content') keywords.max = max;
					if (fit !== undefined && fit !== 'fit-content') keywords.fit = fit;

					return {
						...values,
						...keywords,

						// Support dynamic values (eg. `scrim-b-13.5`, `scrim-b-3/7`)
						...(spacingUnit && {
							__BARE_VALUE__: ({ value, fraction }) => {
								if (fraction) {
									const [numerator, denominator] = fraction.split('/');

									// Zero is rejected, as calc() would bypass zero distance detection
									const isPositiveInteger = (value: string) => /^[1-9]\d*$/.test(value);

									if (!isPositiveInteger(numerator) || !isPositiveInteger(denominator)) return;
									return `calc(${numerator} / ${denominator} * 100%)`;
								}

								if (!isMultiplier(value)) return;
								if (dir === 'DEFAULT' && width[value] !== height[value]) return;
								return value === '0' ? '0px' : `--spacing(${value})`;
							},
						}),
					};
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
