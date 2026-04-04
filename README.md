
<h1 align='center'>tailwindcss scrim gradients</h1>

<p align="center">
  Generate beautiful gradient overlays with composable utilities
</p>

<p align="center">
    <a href="https://github.com/liam-macann/tailwindcss-scrim-gradients/blob/main/package.json"><img src="https://depx.co/api/badge/tailwindcss-scrim-gradients" alt="Dependencies"></a>
    <a href="https://www.npmjs.com/package/tailwindcss-scrim-gradients?activeTab=versions"><img src="https://img.shields.io/npm/v/tailwindcss-scrim-gradients.svg?color=2181c2" alt="Latest Release"></a>
    <a href="https://github.com/liam-macann/tailwindcss-scrim-gradients/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/tailwindcss-scrim-gradients.svg" alt="License"></a>
</p>

---

Gradient overlays (scrims) are a pattern employed to preserve legibility of text, or to suggest further content out-of-bounds. These utilities allow you to produce an eased gradient overlay, using your existing theme values: `scrim-b-48 scrim-orange-500`.

<p align="center">
  <a href="https://liam.macann.xyz/dev/scrim" target="_blank">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/f8b0947d-4bb7-4b0b-9f43-07d12e09f1ee">
      <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/facc533f-d409-48fd-bde0-8735ee68172d">
      <img width="671" height="328" alt="Comparison graphic of eased and uneased gradient" src="https://github.com/user-attachments/assets/facc533f-d409-48fd-bde0-8735ee68172d" />
    </picture>
  </a>
</p>

- Gradient easing subdues appearance of hard edges and luminance banding
- Multiple edges can be specified with independent sizes
- Use theme scales and arbitrary values for color and distances
- Allows the use of opacity modifiers without stacking conflicts

## Installation

Simply install and register the plugin, according to the version of `tailwindcss` used.

```sh
npm i -D tailwindcss-scrim-gradients
```

### Tailwind v4

```css
/* global.css */
@plugin "tailwindcss-scrim-gradients";
```

### Tailwind v3

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

Combine color and distance utilities to generate a scrim.

```html
<div class="scrim-b-12 dark:scrim-black/70" />
```

Shorthand utilities can be applied, and overridden on any edge.

```html
<div class="scrim-12 scrim-b-1/4" />
```

### Caveats

This plugin uses `::after` to position the overlay, and cannot be used with the respective Tailwind pseudo-element variants. This also means that the containing element will default to relative positioning.

Gradient stacking is achieved through mask-image, which has [good browser support](https://caniuse.com/mdn-css_properties_mask-image) when used with vendor prefixing. If you use Tailwind, you can use this.
