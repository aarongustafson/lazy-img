# &lt;lazy-img&gt;

A lightweight, flexible web component for lazy-loading images based on viewport or container size. Perfect for responsive images that should only load when needed.

Based on the original [Easy Lazy Images](https://github.com/easy-designs/easy-lazy-images.js) by Aaron Gustafson, now reimagined as a modern Custom Element.

## 🎯 Why Use This?

**Performance Benefit:** Unlike `<picture>` or `srcset` which always load *some* image variant, `<lazy-img>` can **completely skip loading images** on screens or containers below your specified threshold. This saves bandwidth and improves performance for users on smaller devices or slower connections.

For example, if you set `min-inline-size="768"`, mobile users will never download that image at all — saving their data and speeding up your page load.

## ✨ Features

- **Container Queries**: Load images based on container width (default)
- **Media Queries**: Load images based on viewport width
- **Named Breakpoints**: Support for named breakpoints via CSS custom properties
- **Responsive Images**: Full support for `srcset` and `sizes`
- **Throttled Resize**: Efficient resize handling to prevent performance issues
- **Event-Driven**: Dispatches events when images load
- **Zero Dependencies**: No external libraries required
- **Shadow DOM**: Fully encapsulated with CSS custom properties

## 📦 Installation

### npm

```bash
npm install @aarongustafson/lazy-img
```

### Import

**Option 1: Auto-define (easiest)**
```javascript
import '@aarongustafson/lazy-img';
```

**Option 2: Manual registration**
```javascript
import { LazyImgElement } from '@aarongustafson/lazy-img/lazy-img.js';
customElements.define('lazy-img', LazyImgElement);
```

**Option 3: Both**
```javascript
import { LazyImgElement } from '@aarongustafson/lazy-img';
// Element is registered AND class is available
```

## 🚀 Usage

### Basic Example

```html
<lazy-img
  src="image.jpg"
  alt="A beautiful image">
</lazy-img>
```

### Container Query (Default)

Load an image when its container reaches a minimum width:

```html
<lazy-img
  src="large-image.jpg"
  alt="Large image"
  min-inline-size="500">
</lazy-img>
```

The image will load when the `<lazy-img>` element's container reaches 500px width.

### Media Query

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

### Responsive Images

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

## 📖 API

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | String | - | **Required.** The image source URL |
| `alt` | String | `""` | Alternative text for the image |
| `srcset` | String | - | Responsive image source set |
| `sizes` | String | - | Responsive image sizes |
| `min-inline-size` | String (Number) | - | Minimum inline size in pixels to load the image |
| `named-breakpoints` | String | - | Comma-separated list of named breakpoints (reads from `--lazy-img-mq` CSS custom property) |
| `query` | String | `"container"` | Query type: `"container"` or `"media"` |

### Query Types

- **`container`** (default): Uses ResizeObserver to watch the element's container size
- **`media`**: Uses window resize events to watch viewport size

### Events

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

## 🎯 Examples

### Load Different Images at Different Breakpoints

You can use multiple `<lazy-img>` elements with different configurations:

```html
<!-- Mobile: Load small image immediately -->
<lazy-img
  src="mobile-image.jpg"
  alt="Mobile view"
  class="mobile-only">
</lazy-img>

<!-- Tablet: Load at 768px viewport -->
<lazy-img
  src="tablet-image.jpg"
  alt="Tablet view"
  min-inline-size="768"
  query="media"
  class="tablet-only">
</lazy-img>

<!-- Desktop: Load at 1024px viewport -->
<lazy-img
  src="desktop-image.jpg"
  alt="Desktop view"
  min-inline-size="1024"
  query="media"
  class="desktop-only">
</lazy-img>
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

## 🔧 Configuration Patterns

### Immediate Loading (No Conditions)

If you don't specify `min-inline-size` or `named-breakpoints`, the image loads immediately:

```html
<lazy-img src="image.jpg" alt="Loads immediately"></lazy-img>
```

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

## 🌐 Browser Support

Works in all modern browsers supporting:
- Custom Elements v1
- Shadow DOM v1
- ResizeObserver (for container queries)
- ES Modules

For legacy browser support, consider polyfills for Custom Elements and ResizeObserver.

## 🔄 Migration from Easy Lazy Images

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

## ⚙️ Performance

- **Throttled Resize**: Resize events are throttled to 150ms to prevent excessive checks
- **Single Observer**: Uses one ResizeObserver instance per element
- **Efficient Loading**: Images only render in the DOM after loading conditions are met
- **Clean Disconnection**: Properly cleans up observers when element is removed

## 📄 License

MIT - See [LICENSE](LICENSE)

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

## 👤 Author

Aaron Gustafson <aaron@easy-designs.net> (https://www.aaron-gustafson.com/)

## 🙏 Credits

Based on the original [Easy Lazy Images](https://github.com/easy-designs/easy-lazy-images.js) concept, reimagined as a modern Custom Element.
