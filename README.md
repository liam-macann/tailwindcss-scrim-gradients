# Tailwind CSS Scrim Gradients

Gradient scrim overlays are a common pattern employed to preserve legibility of text, or to suggest further content out-of-bounds. These utilities allow you to pair an edge or axis with a distance value, and produce an eased gradient overlay: `scrim-b-12`.

- Uses theme scales for color and distance values
- Multiple edges can be specified and overriden
- Allows the use of opacity modifiers without stacking conflicts
- Easing subdues appearance of hard edges when gradient begins

## Installation

Install the plugin:

```sh
npm install -D tailwindcss-scrim-gradients
```

Then add it to your `tailwind.config.js` file:

```js
// tailwind.config.js
module.exports = {
	theme: {
		// ...
	},
	plugins: [
		require('tailwindcss-scrim-gradients'),
		// ...
	],
};
```

## Usage

Combine color and distance utilities to generate a scrim:

```html
<div class="scrim-b-16 dark:scrim-black/70">
	<!-- ... -->
</div>
```

Shorthand utilities work exactly as you would expect:

```html
<div class="scrim-20 scrim-x-12 scrim-r-0">
	<!-- ... -->
</div>
```

## Caveats

The scrim uses the ::after pseudo-element to apply the overlay, and can not be used with the respective Tailwind variants. This also means that the containing element will default to relative positioning. Whatever position value you set will be respected, so long as you do not specify 'static'.

Gradient stacking is achieved through mask-image, which has [good browser support](https://caniuse.com/mdn-css_properties_mask-image) when used with PostCSS plugins such as `autoprefixer`.
