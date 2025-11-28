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
 * @attr {boolean} loaded - Reflects whether the image has been loaded (read-only, set by component)
 * @attr {boolean} qualifies - Reflects whether element currently meets conditions to display (read-only, set by component)
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

	static getActiveMQ() {
		return getComputedStyle(document.documentElement)
			.getPropertyValue('--lazy-img-mq')
			.trim();
	}

	static escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._loaded = false;
		this._resizeObserver = null;
		this._throttleTimeout = null;
		this._throttleDelay = 150; // milliseconds
		this._namedBreakpoints = null;
		this._minInlineSize = null;
	}

	connectedCallback() {
		// Initialize cached attribute values
		this._namedBreakpoints = this.getAttribute('named-breakpoints');
		this._minInlineSize = this.getAttribute('min-inline-size');

		this.render();
		this._setupResizeWatcher();
	}

	disconnectedCallback() {
		this._cleanupResizeWatcher();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) {
			// Update cached attribute values
			if (name === 'named-breakpoints') {
				this._namedBreakpoints = newValue;
			} else if (name === 'min-inline-size') {
				this._minInlineSize = newValue;
			}

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
			// Observe the parent element, not this element, to avoid issues with display:none
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
			// Observe parent element to ensure we get resize events even with display:none
			const targetElement = this.parentElement || this;
			this._resizeObserver.observe(targetElement);
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

	_updateQualifies() {
		let qualifies = false;

		// Support named breakpoints via --lazy-img-mq CSS custom property
		if (this._namedBreakpoints) {
			const breakpoints = this._namedBreakpoints
				.split(',')
				.map((bp) => bp.trim());

			// Read the current value of --lazy-img-mq from :root
			const activeMQ = LazyImgElement.getActiveMQ();

			if (!activeMQ) {
				console.warn(
					'lazy-img: named-breakpoints requires --lazy-img-mq CSS custom property to be set on :root',
				);
				qualifies = false;
			} else {
				qualifies = breakpoints.includes(activeMQ);
			}
		} else if (this._minInlineSize) {
			// Support pixel-based min-inline-size
			const minSize = parseInt(this._minInlineSize, 10);
			if (isNaN(minSize)) {
				console.warn(
					'lazy-img: min-inline-size must be a valid number',
				);
				qualifies = false;
			} else {
				qualifies = (this._currentSize || 0) >= minSize;
			}
		} else {
			// If neither is specified, always qualifies
			qualifies = true;
		}

		// Update qualifies attribute
		if (qualifies) {
			this.setAttribute('qualifies', '');
		} else {
			this.removeAttribute('qualifies');
		}

		return qualifies;
	}

	_shouldLoad() {
		// Check if conditions are met (qualifies will be updated by caller)
		const qualifies = this._updateQualifies();

		// Only load if qualifies and not already loaded
		return qualifies && !this._loaded;
	}

	_checkAndLoad() {
		// Check if should load (this also updates qualifies)
		if (this._shouldLoad()) {
			this._loadImage();
		}
	}

	_loadImage() {
		const src = this.getAttribute('src');
		if (!src) {
			return;
		}

		this._loaded = true;
		this.setAttribute('loaded', '');
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
					src="${LazyImgElement.escapeHtml(src)}"
					alt="${LazyImgElement.escapeHtml(alt)}"
					${srcset ? `srcset="${LazyImgElement.escapeHtml(srcset)}"` : ''}
					${sizes ? `sizes="${LazyImgElement.escapeHtml(sizes)}"` : ''}
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
}
