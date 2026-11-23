# Lazy Img Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/lazy-img.svg)](https://www.npmjs.com/package/@aarongustafson/lazy-img)
[![CI status](https://img.shields.io/github/actions/workflow/status/aarongustafson/lazy-img/ci.yml?branch=main&label=CI)](https://github.com/aarongustafson/lazy-img/actions/workflows/ci.yml)
[![Minified + gzipped size](https://img.shields.io/bundlejs/size/@aarongustafson/lazy-img?format=minzip&label=min%2Bgzip)](https://bundlejs.com/?q=@aarongustafson/lazy-img)
[![License](https://img.shields.io/npm/l/@aarongustafson/lazy-img)](https://github.com/aarongustafson/lazy-img/blob/main/LICENSE)
[![Type definitions](https://img.shields.io/npm/types/@aarongustafson/lazy-img)](https://github.com/aarongustafson/lazy-img/blob/main/lazy-img.d.ts)

`<lazy-img>` creates an optional image when its container size, viewport size,
or scroll position meets an authored condition. Use a native `<img>` for
essential content: the component creates no image without JavaScript.

For ordinary offscreen images, native
[`loading="lazy"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#loading)
lets the browser defer a request without depending on custom-element registration.
`<lazy-img>` adds size and intersection conditions before creating the `<img>`.
Its `loading` attribute passes the browser’s hint to that image.

## Demo

[Live Demo](https://aarongustafson.github.io/lazy-img/demo/) ([Source](./demo/index.html))

**CDN Demos:**

- [unpkg](https://aarongustafson.github.io/lazy-img/demo/unpkg.html) ([Source](./demo/unpkg.html))
- [esm.sh](https://aarongustafson.github.io/lazy-img/demo/esm.html) ([Source](./demo/esm.html))

## Conditional images

If a size condition never qualifies, the component doesn’t create its image.
For example, `min-inline-size="768" query="media"` waits for a viewport at least
768px wide. Viewport width doesn’t identify a device or its connection speed.

Once created, the image remains when the viewport or container shrinks below
the threshold. That resize doesn’t unload it or cancel its request. Use the
[`loaded` and `qualifies` attributes](#controlling-visibility-with-state-attributes)
to hide it if appropriate; CSS hiding doesn’t undo a request.

## Features

- **[Container Queries](#container-query-default)**: Load images based on container width (default)
- **[Media Queries](#media-query)**: Load images based on viewport width
- **[View-Based Loading](#view-mode-intersectionobserver)**: Create images after intersecting observer notifications, with the limitations below
- **[Named Breakpoints](#named-breakpoints)**: Support for named breakpoints via CSS custom properties
- **[Responsive Images](#responsive-images)**: Full support for `srcset` and `sizes`
- **Resize handling**: Size checks run after a 150ms delay

## Installation

### npm

```bash
npm install @aarongustafson/lazy-img
```

### Import

**Option 1: Manual registration**

The main import exports the class without registering it:

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

Importing `define.js` also calls `defineLazyImg()`. The helper skips an existing
definition and returns `true` when a custom-element registry is available,
or `false` otherwise.

You can also include the guarded script from HTML:

```html
<script
  src="./node_modules/@aarongustafson/lazy-img/define.js"
  type="module"
></script>
```

## Usage

### Basic Example

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#basic-example)

```html
<lazy-img src="trail.jpg" alt="Mountain trail at sunrise"></lazy-img>
```

With no conditions in container or media mode, the component creates the image
when it upgrades. Before upgrade, or if JavaScript fails, this markup supplies
no image. Keep essential information in native HTML.

### Container Query (Default)

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#container-query-example)

Load an image when its container reaches a minimum width:

```html
<lazy-img src="large-image.jpg" alt="Large image" min-inline-size="500">
</lazy-img>
```

The component creates the image when its parent’s observed content-box inline
size reaches 500px. You don’t need `container-type` to enable its ResizeObserver.

### Media Query

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#media-query-example)

Load an image based on viewport width:

```html
<lazy-img
  src="desktop-image.jpg"
  alt="Desktop image"
  min-inline-size="768"
  query="media"
>
</lazy-img>
```

The component creates the image when `window.innerWidth` is at least 768px.

### View Mode (IntersectionObserver)

Load images when they scroll into view using IntersectionObserver:

```html
<lazy-img src="trail.jpg" alt="Mountain trail at sunrise" query="view">
</lazy-img>
```

The default `view-range-start="entry 0%"` requests observation with a zero
intersection threshold. The component creates the image after an intersecting
observer notification. Observation uses the host element’s box, not a
downloaded image’s dimensions.

#### Control When Images Load

**Set a 50% intersection threshold:**

```html
<lazy-img
  src="image.jpg"
  alt="Mountain trail at sunrise"
  query="view"
  view-range-start="entry 50%"
>
</lazy-img>
```

**Preload before entering viewport:**

```html
<lazy-img
  src="image.jpg"
  alt="Mountain trail at sunrise"
  query="view"
  view-range-start="entry -200px"
>
</lazy-img>
```

The `view-range-start` attribute accepts this subset of scroll-driven animation syntax:

- `"entry X%"` sets an IntersectionObserver threshold from 0% to 100%.
- `"entry -Xpx"` expands the observer’s bottom margin by X pixels.
- Invalid values warn in the console and fall back to `"entry 0%"`.

**Current limitation:** The callback checks `isIntersecting`, not the intersection
ratio. Elements with the same observer settings also share callbacks: an
intersecting notification for one can create the others’ images. These settings
aren’t a guarantee of per-image visibility or request timing.

View mode ignores `min-inline-size` and `named-breakpoints`, doesn’t set
`qualifies`, and stops observing after its creation callback. The image remains
after it leaves the viewport.

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
  min-inline-size="400"
>
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
  query="media"
>
</lazy-img>
```

The component creates the image when the `--lazy-img-mq` custom property on
`:root` matches one of the comma-separated names. Names are case-sensitive.
In container and media modes, `named-breakpoints` takes precedence over
`min-inline-size`. A missing CSS value or an invalid numeric minimum warns in
the console and doesn’t qualify.

## API

### Attributes

#### Image Attributes

These attributes are passed through to the `<img>` element when loading conditions are met:

| Attribute        | Type            | Default | Description                                             |
| ---------------- | --------------- | ------- | ------------------------------------------------------- |
| `src`            | String          | -       | **Required.** The image source URL                      |
| `alt`            | String          | `""`    | Alternative text for the image                          |
| `srcset`         | String          | -       | Responsive image source set                             |
| `sizes`          | String          | -       | Responsive image sizes                                  |
| `width`          | String (Number) | -       | Intrinsic width passed to the created image             |
| `height`         | String (Number) | -       | Intrinsic height passed to the created image            |
| `loading`        | String          | -       | Native lazy loading hint: `"lazy"` or `"eager"`         |
| `decoding`       | String          | -       | Image decoding hint: `"async"`, `"sync"`, or `"auto"`   |
| `fetchpriority`  | String          | -       | Resource fetch priority: `"high"`, `"low"`, or `"auto"` |
| `crossorigin`    | String          | -       | CORS settings: `"anonymous"` or `"use-credentials"`     |
| `referrerpolicy` | String          | -       | Referrer policy for the image request                   |

The component applies these attributes to the `<img>` in its shadow root when
it creates the image. Container and media modes create it immediately if no
conditions are specified; view mode waits for an observer notification.

#### Configuration Attributes

| Attribute           | Type            | Default       | Description                                                                                                      |
| ------------------- | --------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `min-inline-size`   | String (Number) | -             | Minimum inline size in pixels to load the image (ignored in view mode)                                           |
| `named-breakpoints` | String          | -             | Comma-separated list of named breakpoints (reads from `--lazy-img-mq` CSS custom property, ignored in view mode) |
| `query`             | String          | `"container"` | Query type: `"container"`, `"media"`, or `"view"`                                                                |
| `view-range-start`  | String          | `"entry 0%"`  | When to load in view mode: `"entry X%"` for threshold or `"entry -Xpx"` for preload margin                       |

#### State Attributes (read-only)

| Attribute   | Type    | Description                                                                            |
| ----------- | ------- | -------------------------------------------------------------------------------------- |
| `loaded`    | Boolean | The component has created the image; not download completion or success                |
| `qualifies` | Boolean | Reflects whether element currently meets conditions to display (not used in view mode) |

### Query Types

- **`container`** (default): Uses ResizeObserver to watch the parent’s content-box inline size
- **`media`**: Uses window resize events to watch viewport size
- **`view`**: Uses IntersectionObserver to watch when element enters viewport

### Properties and updates

Properties reflect the corresponding attributes. Hyphenated configuration names
use `minInlineSize`, `namedBreakpoints`, and `viewRangeStart`; the image properties
include `fetchPriority`, `crossOrigin`, and `referrerPolicy`. Other names stay
the same. `loaded` and `qualifies` are read-only booleans. See the
[declarations](./lazy-img.d.ts) for the complete list.

After creation, changing `src`, `srcset`, or `sizes` doesn’t update the image
immediately. Other image attributes update the existing image; a later render
can also apply the current source attributes. Configuration changes aren’t a
general-purpose reset or mode-switch API. Configure conditions before connecting
the element; use a new element for a different conditional image.

The component has no additional documented instance methods.

### Events

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#events)

| Event             | Detail            | Description                                                |
| ----------------- | ----------------- | ---------------------------------------------------------- |
| `lazy-img:loaded` | `{ src: string }` | Fired after image creation, not after download or decoding |

The event bubbles and crosses shadow boundaries. `src` is the authored source,
not necessarily the responsive candidate selected by the browser. Neither this
event nor `loaded` confirms that a request succeeded; `loading="lazy"` may defer
the actual fetch even after creation. Listen to the shadow image’s native
`load` or `error` event if your application needs that result.

#### Event Example

```javascript
const lazyImg = document.querySelector('lazy-img');
lazyImg.addEventListener('lazy-img:loaded', (event) => {
  console.log('Image created; request may begin:', event.detail.src);
});
```

### CSS Custom Properties

| Property             | Default | Description                                                                   |
| -------------------- | ------- | ----------------------------------------------------------------------------- |
| `--lazy-img-display` | `block` | Display mode for the component                                                |
| `--lazy-img-mq`      | -       | Current named breakpoint identifier (define on `:root` with `@media` queries) |

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

### Image Dimensions and Reserved Space

```html
<lazy-img
  src="image.jpg"
  alt="A beautiful image"
  width="800"
  height="600"
  min-inline-size="768"
>
</lazy-img>
```

The component passes `width` and `height` to the created `<img>`, where the
browser can use them for its aspect ratio. They don’t reserve the host’s space
before enhancement or before the condition qualifies. If the layout needs that
space, author host sizing, for example:

```css
lazy-img {
  aspect-ratio: 4 / 3;
}
```

This isn’t a guarantee against layout shifts; check the surrounding layout too.

### Native Images for Essential Content

```html
<img
  src="hero-image.jpg"
  alt="Mountain trail leading toward a sunlit peak"
  width="1200"
  height="600"
  fetchpriority="high"
  loading="eager"
/>
```

Use native markup for essential images, including a page’s main image.
`fetchpriority="high"` is a browser hint, not a Largest Contentful Paint (LCP)
guarantee. Deferring image creation behind JavaScript can delay discovery.

### CORS Images for Canvas Manipulation

```html
<lazy-img
  src="https://cdn.example.com/image.jpg"
  alt="CDN image"
  crossorigin="anonymous"
  min-inline-size="500"
>
</lazy-img>
```

For cross-origin canvas pixel access, the image server must also return an
appropriate CORS response. The attribute alone doesn’t grant access.

### Controlling Visibility with State Attributes

[View Demo](https://aarongustafson.github.io/lazy-img/demo/#state-attributes)

The `loaded` and `qualifies` attributes allow you to control visibility based on
creation and current size conditions, not network progress. Don’t apply this
rule to view-mode images, which don’t receive `qualifies`:

```css
/* Hide created images that no longer meet size conditions */
lazy-img:not([query='view'])[loaded]:not([qualifies]) {
  display: none;
}
```

`[qualifies]:not([loaded])` isn’t a download-progress selector. The component
sets `loaded` before the browser finishes fetching or decoding.

### Progressive Image Loading in Containers

```html
<div class="sidebar">
  <lazy-img src="sidebar-image.jpg" alt="Sidebar content" min-inline-size="300">
  </lazy-img>
</div>
```

### Optional Alternatives with Named Breakpoints

These are separate conditional images, not mutually exclusive `<picture>`
sources. Once created, both can remain after a resize. Use native
[`<picture>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture)
for essential art-directed content.

```css
/* Define breakpoints in your CSS */
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
@media (min-width: 1440px) {
  :root {
    --lazy-img-mq: xlarge;
  }
}
```

```html
<lazy-img
  src="portrait.jpg"
  alt="Portrait orientation"
  named-breakpoints="small, medium"
  query="media"
>
</lazy-img>

<lazy-img
  src="landscape.jpg"
  alt="Landscape orientation"
  named-breakpoints="large, xlarge"
  query="media"
>
</lazy-img>
```

## Configuration Patterns

### Immediate Loading (No Conditions)

In container or media mode, if you don’t specify `min-inline-size` or
`named-breakpoints`, the component creates the image immediately:

```html
<lazy-img src="image.jpg" alt="Loads immediately"></lazy-img>
```

Without JavaScript, it creates no image. Use this only for optional images
that the surrounding content doesn’t depend on.

### Container-Based Loading (Default)

```html
<lazy-img src="image.jpg" alt="Container-based" min-inline-size="400">
</lazy-img>
```

### Viewport-Based Loading

```html
<lazy-img
  src="image.jpg"
  alt="Viewport-based"
  min-inline-size="768"
  query="media"
>
</lazy-img>
```

### Scroll-Based Loading

```html
<lazy-img
  src="image.jpg"
  alt="Scroll-based"
  query="view"
  view-range-start="entry -100px"
>
</lazy-img>
```

## Accessibility, Failure, and Localization

The component supplies no color palette or controls. Its image keeps the
authored alternative text; use native images for essential content that must
remain available without JavaScript.

Supply meaningful `alt` text for informative images, or `alt=""` for decoration.
The default is empty. The shadow root doesn’t expose a slot, so authored child
content isn’t a visible fallback after upgrade. Put descriptions and recovery
links beside the component, as in the
[failure example](https://aarongustafson.github.io/lazy-img/demo/#failure-example).
A missing `src` creates no image. A failed download doesn’t reset `loaded`, emit
a component error event, or trigger an automatic retry.

The component adds no focusable controls or live announcements. It generates
no status strings; authors provide alternative text and any messages or recovery
UI. Translate those strings or adapt them to your application’s vocabulary.

## Demo Validation

The [demos](demo/index.html) keep visible request-state text alongside visual cues.
Width sliders preserve native keyboard behavior and focus. They follow the
rounded content width after pointer resizing and update their bounds for the
available space; arrow keys adjust the width by one pixel. In forced colors,
code surfaces retain solid `ButtonFace` or `Field` backgrounds rather than
depending on gradients that browsers suppress.

The demos describe `loaded` and `lazy-img:loaded` as image-creation signals:
a request can begin, but they don’t confirm a successful download. The failure example retains an
authored description and recovery link. Demo messages are authored in the page
and can be translated there; the component generates no status strings.
The optional-image failure and essential native-image examples have separate
code/live pairs, each showing all of its authored markup. The native image
preserves its aspect ratio when constrained and works without JavaScript.

Run `npm run test:run`, `npm run lint`, and `npm run test:browser`.
Browser tests use one worker on port 4184 and cover Chromium, Firefox, and
WebKit, including palette substitution, light/dark rendering, native focus,
narrow layouts, enlarged text, image failure, and no-JavaScript behavior.
Every successful demo image uses a local
authored SVG; browser checks decode the actual image sources without intercepting
image requests. The responsive example includes 400px, 800px, and 1200px sources.
CDN tests substitute local module responses, so they don’t establish live CDN
availability. The intentional missing-image example remains a failure case.

Palette substitution and Chromium forced-color emulation are regression aids,
not evidence of OS repainting or accessibility conformance. Real Windows
Contrast themes, Firefox custom forced-color preferences, Android/iOS browsers,
macOS Increase Contrast/accent changes, physical zoom, and assistive-technology
acceptance still need manual checks. Ubuntu WebKit’s known dark
`ButtonText`/`ButtonFace` limitation is tracked separately from reading surfaces.
The native-grip drag check is skipped in bundled Linux WebKit after two grip
hit points left the width unchanged in CI. Measured fractional resizing,
keyboard transitions, and constrained range bounds remain tested in that engine;
native dragging still needs a manual check there.

## Browser Support

The component uses these browser APIs:

- Custom Elements v1
- Shadow DOM v1
- ResizeObserver (for container queries)
- IntersectionObserver (for view mode)
- ES Modules

Container and media modes use ResizeObserver and resize events respectively;
view mode requires IntersectionObserver. Unsupported APIs don’t have a built-in
fallback. Keep essential images native rather than relying on polyfills.

## Migration from Easy Lazy Images

If you're migrating from the original Easy Lazy Images script:

**Before:**

```html
<div
  data-image-src="image.jpg"
  data-image-alt="Alt text"
  data-image-srcset="image-400.jpg 400w, image-800.jpg 800w"
></div>

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
  query="media"
>
</lazy-img>
```

Key differences:

- Uses a custom element instead of a global function
- Configuration is per-element via attributes
- Default query type is `container` (not `media`)
- No longer requires `watchResize()` - uses ResizeObserver internally

## Resize Handling and Cleanup

Size checks run 150ms after the most recent resize notification. Elements with
the same parent share a ResizeObserver; media-mode elements share a window
resize listener. View-mode elements with matching settings share an
IntersectionObserver, subject to the [view-mode limitation](#view-mode-intersectionobserver).

On disconnection, the component removes its callbacks and pending size-check
timer. Shared observers and listeners are removed when no callbacks remain.
Disconnection doesn’t remove an already-created image or reset its state.
Reconnection sets up observation again. See the [source](./lazy-img.js) for
implementation details.

## License

MIT - See [LICENSE](LICENSE)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

## Author

Aaron Gustafson <aaron@easy-designs.net> (https://www.aaron-gustafson.com/)

## Credits

Based on my original [Easy Lazy Images](https://github.com/easy-designs/easy-lazy-images.js) concept, reimagined as a modern Custom Element.
