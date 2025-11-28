/**
 * LazyImgElement - Custom element to lazy load an image based on screen size
 *
 * @element lazy-img
 *
 * @attr {string} src - The image source URL
 * @attr {string} alt - Alternative text for the image
 * @attr {string} srcset - Responsive image srcset attribute
 * @attr {string} sizes - Responsive image sizes attribute
 * @attr {string} min-inline-size - Minimum inline size (in pixels) to load the image
 * @attr {string} named-breakpoints - Comma-separated list of named breakpoints (reads from --lazy-img-mq CSS custom property)
 * @attr {string} query - Query type: "media" (default) or "container" for container queries
 *
 * @fires lazy-img:loaded - Dispatched when the image has been loaded
 *
 * @cssprop --lazy-img-display - Display mode (default: block)
 * @cssprop --lazy-img-mq - Named media query identifier (set at :root level via media queries)
 */
export class LazyImgElement extends HTMLElement {
	static get observedAttributes() {
		return [
			'src',
			'alt',
			'srcset',
			'sizes',
			'min-inline-size',
			'named-breakpoints',
			'query',
		];
	}

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._loaded = false;
		this._resizeObserver = null;
		this._throttleTimeout = null;
		this._throttleDelay = 150; // milliseconds
	}

	connectedCallback() {
		this.render();
		this._setupResizeWatcher();
	}

	disconnectedCallback() {
		this._cleanupResizeWatcher();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) {
			// If already loaded, don't reload
			if (this._loaded && name !== 'query') {
				return;
			}
			this.render();
			// Reset and recheck if configuration changed
			if (
				['min-inline-size', 'named-breakpoints', 'query'].includes(name)
			) {
				this._loaded = false;
				this._checkAndLoad();
			}
		}
	}

	_setupResizeWatcher() {
		const queryType = this.getAttribute('query') || 'container';

		if (queryType === 'container') {
			// Use ResizeObserver for container queries
			this._resizeObserver = new ResizeObserver((entries) => {
				this._throttledResize(() => {
					for (const entry of entries) {
						this._currentSize =
							entry.contentBoxSize?.[0]?.inlineSize ||
							entry.contentRect.width;
						this._checkAndLoad();
					}
				});
			});
			this._resizeObserver.observe(this);
		} else {
			// Use window resize for media queries
			this._handleResize = () => {
				this._throttledResize(() => {
					this._currentSize = window.innerWidth;
					this._checkAndLoad();
				});
			};
			window.addEventListener('resize', this._handleResize);
			// Initial check
			this._currentSize = window.innerWidth;
		}

		this._checkAndLoad();
	}

	_cleanupResizeWatcher() {
		if (this._resizeObserver) {
			this._resizeObserver.disconnect();
			this._resizeObserver = null;
		}
		if (this._handleResize) {
			window.removeEventListener('resize', this._handleResize);
			this._handleResize = null;
		}
		if (this._throttleTimeout) {
			clearTimeout(this._throttleTimeout);
			this._throttleTimeout = null;
		}
	}

	_throttledResize(callback) {
		if (this._throttleTimeout) {
			clearTimeout(this._throttleTimeout);
		}
		this._throttleTimeout = setTimeout(() => {
			callback();
			this._throttleTimeout = null;
		}, this._throttleDelay);
	}

	_shouldLoad() {
		// Already loaded
		if (this._loaded) {
			return false;
		}

		const namedBreakpoints = this.getAttribute('named-breakpoints');
		const minInlineSize = this.getAttribute('min-inline-size');

		// Support named breakpoints via --lazy-img-mq CSS custom property
		if (namedBreakpoints) {
			const breakpoints = namedBreakpoints
				.split(',')
				.map((bp) => bp.trim());

			// Read the current value of --lazy-img-mq from :root
			const activeMQ = getComputedStyle(document.documentElement)
				.getPropertyValue('--lazy-img-mq')
				.trim();

			if (!activeMQ) {
				console.warn(
					'lazy-img: named-breakpoints requires --lazy-img-mq CSS custom property to be set on :root',
				);
				return false;
			}

			return breakpoints.includes(activeMQ);
		}

		// Support pixel-based min-inline-size
		if (minInlineSize) {
			const minSize = parseInt(minInlineSize, 10);
			if (isNaN(minSize)) {
				console.warn(
					'lazy-img: min-inline-size must be a valid number',
				);
				return false;
			}
			return (this._currentSize || 0) >= minSize;
		}

		// If neither is specified, load immediately
		return true;
	}

	_checkAndLoad() {
		if (this._shouldLoad() && !this._loaded) {
			this._loadImage();
		}
	}

	_loadImage() {
		const src = this.getAttribute('src');
		if (!src) {
			return;
		}

		this._loaded = true;
		this.render();

		// Dispatch loaded event
		this.dispatchEvent(
			new CustomEvent('lazy-img:loaded', {
				bubbles: true,
				composed: true,
				detail: { src },
			}),
		);
	}

	render() {
		const src = this.getAttribute('src');
		const alt = this.getAttribute('alt') || '';
		const srcset = this.getAttribute('srcset');
		const sizes = this.getAttribute('sizes');

		let imageHTML = '';

		// Only render image if loaded or if no loading conditions are set
		if (
			this._loaded ||
			(!this.getAttribute('min-inline-size') &&
				!this.getAttribute('named-breakpoints'))
		) {
			if (src) {
				imageHTML = `<img
					src="${this._escapeHtml(src)}"
					alt="${this._escapeHtml(alt)}"
					${srcset ? `srcset="${this._escapeHtml(srcset)}"` : ''}
					${sizes ? `sizes="${this._escapeHtml(sizes)}"` : ''}
				/>`;
			}
		}

		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: var(--lazy-img-display, block);
				}
				img {
					max-width: 100%;
					height: auto;
				}
			</style>
			${imageHTML}
		`;
	}

	// eslint-disable-next-line class-methods-use-this
	_escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
}
