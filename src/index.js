const plugin = require('tailwindcss/plugin');
const { default: flattenColorPalette } = require('tailwindcss/lib/util/flattenColorPalette');

//-----------------------------------------------------------------------------

// Consumed recursively
const directions = {
	DEFAULT: { l: 'to right', r: 'to left', b: 'to top', t: 'to bottom' },
	x: { l: 'to right', r: 'to left' },
	y: { b: 'to top', t: 'to bottom' },
	b: 'to top',
	t: 'to bottom',
	l: 'to right',
	r: 'to left',
};

// Smoooooth gradient
const gradient = (direction, distance) => {
	// Prevent solid bar when attempting to hide scrim on edge
	if (distance == '0px') return 'linear-gradient(transparent, transparent)';
	return `
		linear-gradient( ${direction},
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

const scrim = plugin(({ matchUtilities, addComponents, theme }) => {
	// Placing styles in component layer allows utility overrides with minimal output CSS
	addComponents({
		'[class^="scrim-"], [class*=" scrim-"]': {
			position: 'relative',
			'&::after': {
				content: '""',
				position: 'absolute',
				inset: 0,
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
		{
			scrim: value => ({
				// Hacky workaround for edge cases involving opacity modifiers on custom colors
				'--tw-scrim-color': value instanceof Function ? value() : value,
			}),
		},
		{
			values: flattenColorPalette(theme('colors')),
			type: 'color',
		}
	);

	for (const dir in directions) {
		matchUtilities(
			{ [dir == 'DEFAULT' ? 'scrim' : `scrim-${dir}`]: value => mask(dir, directions[dir], value) },
			{
				values: { ...theme('spacing'), full: '100%' },
				type: 'length',
				supportsNegativeValues: false,
			}
		);
	}
});

function mask(label, direction, distance) {
	return typeof direction === 'string' ?
			{ [`--tw-scrim-mask-${label}`]: gradient(direction, distance) }
		:	Object.keys(direction).map(label => mask(label, direction[label], distance));
}

module.exports = scrim;
