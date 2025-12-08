# Lazy Img Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/lazy-img.svg)](https://www.npmjs.com/package/@aarongustafson/lazy-img) [![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/lazy-img/ci.yml?branch=main)](https://github.com/aarongustafson/lazy-img/actions)

A lightweight, flexible web component for lazy-loading images based on viewport or container size. Perfect for responsive images that should only load when needed.

Based on the original [Easy Lazy Images](https://github.com/easy-designs/easy-lazy-images.js) by Aaron Gustafson, now reimagined as a modern Custom Element.

## Demo

[Live Demo](https://aarongustafson.github.io/lazy-img/demo/) ([Source](./demo/index.html))

## Why Use This?

**Performance Benefit:** Unlike `picture` or `srcset` which always load *some* image variant, `lazy-img` can **completely skip loading images** on screens or containers below your specified threshold. This saves bandwidth and improves performance for users on smaller devices or slower connections.

For example, if you set `min-inline-size="768"`, mobile users will never download that image at all — saving their data and speeding up your page load.

**Note on Resize Behavior:** Once an image is loaded, it remains loaded even if the viewport or container is resized below the threshold. This is intentional for performance — the component prevents unnecessary downloads, but doesn't unload images that are already in memory. Use the [`loaded` and `qualifies` attributes](#controlling-visibility-with-state-attributes) to control visibility with CSS if needed.

## Features

- **[Container Queries](#container-query-default)**: Load images based on container width (default)
- **[Media Queries](#media-query)**: Load images based on viewport width
- **[View-Based Loading](#view-mode-intersectionobserver)**: Load images when they enter the viewport using IntersectionObserver
- **[Named Breakpoints](#named-breakpoints)**: Support for named breakpoints via CSS custom properties
- **[Responsive Images](#responsive-images)**: Full support for `srcset` and `sizes`
- **Throttled Resize**: Efficient resize handling to prevent performance issues
- **[Event-Driven](#events)**: Dispatches events when images load
- **Zero Dependencies**: No external libraries required
- **Shadow DOM**: Fully encapsulated with CSS custom properties

## Installation

### npm

```bash
npm install @aarongustafson/lazy-img
```

### Import

**Option 1: Manual registration**
```javascript
import { LazyImgElement } from '@aarongustafson/lazy-img';

customElements.define('lazy-img', LazyImgElement);
```

**Option 2: Auto-define (browser environments only)**
```javascript
import '@aarongustafson/lazy-img/define.js';
// Registers <lazy-img> when customElements is available
```

Prefer to control when registration happens? Call the helper directly:

```javascript
import { defineLazyImg } from '@aarongustafson/lazy-img/define.js';

defineLazyImg();
```

You can also include the guarded script from HTML:

```html
<script src="./node_modules/@aarongustafson/lazy-img/define.js" type="module"></script>
```

## Usage

### Basic Example

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#basic-example)

```html
<lazy-img
  src="image.jpg"
  alt="A beautiful image">
</lazy-img>
```

### Container Query (Default)

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#container-query-example)

Load an image when its container reaches a minimum width:

```html
<lazy-img
  src="large-image.jpg"
  alt="Large image"
  min-inline-size="500">
</lazy-img>
```

The image will load when the `lazy-img` element's container reaches 500px width.

### Media Query

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#media-query-example)

Load an image based on viewport width:

```html
<lazy-img
  src="desktop-image.jpg"
  alt="Desktop image"
  min-inline-size="768"
  query="media">
</lazy-img>
```

The image will load when the browser window is at least 768px wide.

### View Mode (IntersectionObserver)

Load images when they scroll into view using IntersectionObserver:

```html
<lazy-img
  src="image.jpg"
  alt="Loads when scrolled into view"
  query="view">
</lazy-img>
```

The image will load when it enters the viewport. The default behavior (`view-range-start="entry 0%"`) loads as soon as any part of the image is visible.

#### Control When Images Load

**Load when 50% visible:**
```html
<lazy-img
  src="image.jpg"
  alt="Loads when half visible"
  query="view"
  view-range-start="entry 50%">
</lazy-img>
```

**Preload before entering viewport:**
```html
<lazy-img
  src="image.jpg"
  alt="Preloads 200px before visible"
  query="view"
  view-range-start="entry -200px">
</lazy-img>
```

The `view-range-start` attribute uses scroll-driven animation syntax:
- `"entry X%"` - Load when X% of the element is visible (e.g., `"entry 25%"` = 25% visible)
- `"entry -Xpx"` - Preload X pixels before entering viewport (e.g., `"entry -300px"` = load 300px before visible)

**Note:** Unlike container or media query modes, view mode doesn't use the `qualifies` attribute. Images load once when the intersection condition is met and remain loaded.

### Responsive Images

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#responsive-images)

Use `srcset` and `sizes` for responsive images:

```html
<lazy-img
  src="image-800.jpg"
  srcset="image-400.jpg 400w,
          image-800.jpg 800w,
          image-1200.jpg 1200w"
  sizes="(max-width: 600px) 400px,
         (max-width: 1000px) 800px,
         1200px"
  alt="Responsive image"
  min-inline-size="400">
</lazy-img>
```

### Named Breakpoints

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#named-breakpoints)

You can use named breakpoints by defining the `--lazy-img-mq` CSS custom property:

```css
:root {
  --lazy-img-mq: small;
}

@media (min-width: 768px) {
  :root {
    --lazy-img-mq: medium;
  }
}

@media (min-width: 1024px) {
  :root {
    --lazy-img-mq: large;
  }
}
```

```html
<lazy-img
  src="image.jpg"
  alt="Image with named breakpoints"
  named-breakpoints="medium, large"
  query="media">
</lazy-img>
```

The image will load when the `--lazy-img-mq` custom property matches any of the specified breakpoint names.

## API

### Attributes

#### Image Attributes (passed to `img`)

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | String | - | **Required.** The image source URL |
| `alt` | String | `""` | Alternative text for the image |
| `srcset` | String | - | Responsive image source set |
| `sizes` | String | - | Responsive image sizes |
| `width` | String (Number) | - | Intrinsic width of the image (helps prevent layout shift) |
| `height` | String (Number) | - | Intrinsic height of the image (helps prevent layout shift) |
| `loading` | String | - | Native lazy loading hint: `"lazy"` or `"eager"` |
| `decoding` | String | - | Image decoding hint: `"async"`, `"sync"`, or `"auto"` |
| `fetchpriority` | String | - | Resource fetch priority: `"high"`, `"low"`, or `"auto"` |
| `crossorigin` | String | - | CORS settings: `"anonymous"` or `"use-credentials"` |
| `referrerpolicy` | String | - | Referrer policy for the image request |

#### Configuration Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `min-inline-size` | String (Number) | - | Minimum inline size in pixels to load the image (ignored in view mode) |
| `named-breakpoints` | String | - | Comma-separated list of named breakpoints (reads from `--lazy-img-mq` CSS custom property, ignored in view mode) |
| `query` | String | `"container"` | Query type: `"container"`, `"media"`, or `"view"` |
| `view-range-start` | String | `"entry 0%"` | When to load in view mode: `"entry X%"` for threshold or `"entry -Xpx"` for preload margin |

#### State Attributes (read-only)

| Attribute | Type | Description |
|-----------|------|-------------|
| `loaded` | Boolean | Reflects whether the image has been loaded |
| `qualifies` | Boolean | Reflects whether element currently meets conditions to display (not used in view mode) |

### Query Types

- **`container`** (default): Uses ResizeObserver to watch the element's container size
- **`media`**: Uses window resize events to watch viewport size
- **`view`**: Uses IntersectionObserver to watch when element enters viewport

### Events

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#events)

| Event | Detail | Description |
|-------|--------|-------------|
| `lazy-img:loaded` | `{ src: string }` | Fired when the image has loaded |

#### Event Example

```javascript
const lazyImg = document.querySelector('lazy-img');
lazyImg.addEventListener('lazy-img:loaded', (event) => {
  console.log('Image loaded:', event.detail.src);
});
```

### CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--lazy-img-display` | `block` | Display mode for the component |
| `--lazy-img-mq` | - | Current named breakpoint identifier (define on `:root` with `@media` queries) |

#### CSS Example

```css
lazy-img {
  --lazy-img-display: inline-block;
}

/* Define named breakpoints */
:root {
  --lazy-img-mq: small;
}

@media (min-width: 768px) {
  :root {
    --lazy-img-mq: medium;
  }
}
```

## Examples

### Preventing Layout Shift with Width and Height

[Recommended for Core Web Vitals]

```html
<lazy-img
  src="image.jpg"
  alt="A beautiful image"
  width="800"
  height="600"
  min-inline-size="768">
</lazy-img>
```

The `width` and `height` attributes help browsers calculate the aspect ratio and reserve space before the image loads, preventing Cumulative Layout Shift (CLS).

### Using fetchpriority for LCP Images

```html
<lazy-img
  src="hero-image.jpg"
  alt="Hero image"
  width="1200"
  height="600"
  fetchpriority="high"
  loading="eager">
</lazy-img>
```

Use `fetchpriority="high"` for above-the-fold images that are critical for Largest Contentful Paint (LCP).

### CORS Images for Canvas Manipulation

```html
<lazy-img
  src="https://cdn.example.com/image.jpg"
  alt="CDN image"
  crossorigin="anonymous"
  min-inline-size="500">
</lazy-img>
```

The `crossorigin` attribute is necessary when you need to manipulate images from different origins in a canvas.

### Controlling Visibility with State Attributes

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#state-attributes)

The `loaded` and `qualifies` attributes allow you to control visibility based on current conditions:

```css
/* Hide images that loaded but no longer meet conditions (e.g., after rotation) */
lazy-img[loaded]:not([qualifies]) {
  display: none;
}

/* Show a placeholder for images that qualify but haven't loaded yet */
lazy-img[qualifies]:not([loaded])::before {
  content: "Loading...";
  display: block;
  padding: 2em;
  background: #f0f0f0;
  text-align: center;
}

/* Style images based on their qualification state */
lazy-img[qualifies] {
  opacity: 1;
  transition: opacity 0.3s;
}

lazy-img:not([qualifies]) {
  opacity: 0.5;
}
```


### Progressive Image Loading in Containers

```html
<style>
  .sidebar {
    container-type: inline-size;
  }
</style>

<div class="sidebar">
  <lazy-img
    src="sidebar-image.jpg"
    alt="Sidebar content"
    min-inline-size="300">
  </lazy-img>
</div>
```

### Art Direction with Named Breakpoints

```css
/* Define breakpoints in your CSS */
:root { --lazy-img-mq: small; }
@media (min-width: 768px) { :root { --lazy-img-mq: medium; } }
@media (min-width: 1024px) { :root { --lazy-img-mq: large; } }
@media (min-width: 1440px) { :root { --lazy-img-mq: xlarge; } }
```

```html
<lazy-img
  src="portrait.jpg"
  alt="Portrait orientation"
  named-breakpoints="small, medium"
  query="media">
</lazy-img>

<lazy-img
  src="landscape.jpg"
  alt="Landscape orientation"
  named-breakpoints="large, xlarge"
  query="media">
</lazy-img>
```

## Configuration Patterns

### Immediate Loading (No Conditions)

If you don't specify `min-inline-size` or `named-breakpoints`, the image loads immediately:

```html
<lazy-img src="image.jpg" alt="Loads immediately"></lazy-img>
```

**Note:** While this pattern loads the image immediately (like a standard `img`), it still provides a performance benefit: **if JavaScript fails to load or execute, the image won't load at all**. This can be desirable for non-critical images that enhance but aren't essential to the content (e.g., decorative images, supplementary graphics, or marketing banners).

**Important:** Only use this pattern for non-critical images that aren't referenced in your content. Critical images that are part of your content should use standard `img` tags to ensure they load even when JavaScript is unavailable.

### Container-Based Loading (Default)

```html
<lazy-img
  src="image.jpg"
  alt="Container-based"
  min-inline-size="400">
</lazy-img>
```

### Viewport-Based Loading

```html
<lazy-img
  src="image.jpg"
  alt="Viewport-based"
  min-inline-size="768"
  query="media">
</lazy-img>
```

### Scroll-Based Loading

```html
<lazy-img
  src="image.jpg"
  alt="Scroll-based"
  query="view"
  view-range-start="entry -100px">
</lazy-img>
```

## Browser Support

Works in all modern browsers supporting:
- Custom Elements v1
- Shadow DOM v1
- ResizeObserver (for container queries)
- IntersectionObserver (for view mode)
- ES Modules

For legacy browser support, consider polyfills for Custom Elements, ResizeObserver, and IntersectionObserver.

## Migration from Easy Lazy Images

If you're migrating from the original Easy Lazy Images script:

**Before:**
```html
<div data-image-src="image.jpg"
     data-image-alt="Alt text"
     data-image-srcset="image-400.jpg 400w, image-800.jpg 800w">
</div>

<script>
  window.easyLazyImages(500);
</script>
```

**After:**
```html
<lazy-img
  src="image.jpg"
  alt="Alt text"
  srcset="image-400.jpg 400w, image-800.jpg 800w"
  min-inline-size="500"
  query="media">
</lazy-img>
```

Key differences:
- Uses a custom element instead of a global function
- Configuration is per-element via attributes
- Default query type is `container` (not `media`)
- No longer requires `watchResize()` - uses ResizeObserver internally

## Performance

- **Throttled Resize**: Resize events are throttled to 150ms to prevent excessive checks
- **Shared ResizeObserver**: Multiple `lazy-img` elements observing the same parent container share a single `ResizeObserver` instance, making it highly efficient for galleries and other scenarios with many images
- **Shared Window Resize Listener**: Multiple `lazy-img` elements using media query mode (`query="media"`) share a single window resize event listener, ensuring optimal performance even with hundreds of instances on a page
- **Shared IntersectionObserver**: Multiple `lazy-img` elements using view mode with the same `view-range-start` configuration share a single `IntersectionObserver`, making scroll-based lazy loading extremely efficient even with hundreds of images
- **Efficient Loading**: Images only render in the DOM after loading conditions are met
- **Clean Disconnection**: Properly cleans up observers and event listeners when elements are removed; automatically removes unused shared observers and listeners when no longer needed

## License

MIT - See [LICENSE](LICENSE)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

## Author

Aaron Gustafson <aaron@easy-designs.net> (https://www.aaron-gustafson.com/)

## Credits

Based on my original [Easy Lazy Images](https://github.com/easy-designs/easy-lazy-images.js) concept, reimagined as a modern Custom Element.
