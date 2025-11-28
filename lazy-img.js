/**
 * LazyImgElement - Custom element to lazy load an image based on screen size
 *
 * @element lazy-img
 *
 * @attr {string} src - The image source URL
 * @attr {string} alt - Alternative text for the image
 * @attr {string} srcset - Responsive image srcset attribute
 * @attr {string} sizes - Responsive image sizes attribute
 * @attr {string} width - Intrinsic width of the image (helps prevent layout shift)
 * @attr {string} height - Intrinsic height of the image (helps prevent layout shift)
 * @attr {string} loading - Native lazy loading hint ("lazy" or "eager")
 * @attr {string} decoding - Image decoding hint ("async", "sync", or "auto")
 * @attr {string} fetchpriority - Resource fetch priority ("high", "low", or "auto")
 * @attr {string} crossorigin - CORS settings ("anonymous" or "use-credentials")
 * @attr {string} referrerpolicy - Referrer policy for the image request
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

// Shared ResizeObserver registry to improve performance when multiple
// lazy-img elements observe the same parent container
const sharedObservers = new WeakMap();

// Shared window resize listener to improve performance when multiple
// lazy-img elements use media query mode
const windowResizeCallbacks = new Set();
let windowResizeListenerAttached = false;

function handleWindowResize() {
	windowResizeCallbacks.forEach((callback) => callback());
}

function addWindowResizeCallback(callback) {
	windowResizeCallbacks.add(callback);
	if (!windowResizeListenerAttached) {
		window.addEventListener('resize', handleWindowResize);
		windowResizeListenerAttached = true;
	}
}

function removeWindowResizeCallback(callback) {
	windowResizeCallbacks.delete(callback);
	// Clean up listener if no more callbacks
	if (windowResizeCallbacks.size === 0 && windowResizeListenerAttached) {
		window.removeEventListener('resize', handleWindowResize);
		windowResizeListenerAttached = false;
	}
}

export class LazyImgElement extends HTMLElement {
	// Attributes that get passed through to the inner <img> element
	static IMG_ATTRIBUTES = [
		'src',
		'alt',
		'srcset',
		'sizes',
		'width',
		'height',
		'loading',
		'decoding',
		'fetchpriority',
		'crossorigin',
		'referrerpolicy',
	];

	// Source attributes that shouldn't change after image is loaded
	static SOURCE_ATTRIBUTES = ['src', 'srcset', 'sizes'];

	// Attributes that control the lazy-img behavior
	static CONFIG_ATTRIBUTES = [
		'min-inline-size',
		'named-breakpoints',
		'query',
	];

	static get observedAttributes() {
		return [
			...LazyImgElement.IMG_ATTRIBUTES,
			...LazyImgElement.CONFIG_ATTRIBUTES,
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

	/**
	 * Gets or creates a shared ResizeObserver for a target element
	 * @param {Element} target - The element to observe
	 * @returns {Object} Object with observer and callbacks Set
	 */
	static _getSharedObserver(target) {
		if (!sharedObservers.has(target)) {
			const callbacks = new Set();
			const observer = new ResizeObserver((entries) => {
				// Call all registered callbacks for this observer
				callbacks.forEach((callback) => callback(entries));
			});
			observer.observe(target);
			sharedObservers.set(target, { observer, callbacks });
		}
		return sharedObservers.get(target);
	}

	/**
	 * Unregisters a callback from a shared ResizeObserver
	 * @param {Element} target - The observed element
	 * @param {Function} callback - The callback to remove
	 */
	static _removeSharedObserver(target, callback) {
		const shared = sharedObservers.get(target);
		if (shared) {
			shared.callbacks.delete(callback);
			// Clean up if no more callbacks
			if (shared.callbacks.size === 0) {
				shared.observer.disconnect();
				sharedObservers.delete(target);
			}
		}
	}

	/**
	 * Converts attribute object to HTML attribute string
	 * @param {Object} attrs - Attribute key-value pairs
	 * @returns {string} HTML attribute string
	 */
	static _buildAttributeString(attrs) {
		return Object.entries(attrs)
			.map(([key, value]) => `${key}="${value}"`)
			.join(' ');
	}

	/**
	 * Gathers all img-specific attributes from the host element
	 * @returns {Object} Object with attribute names as keys and escaped values
	 */
	_getImgAttributes() {
		const attrs = {};
		for (const attr of LazyImgElement.IMG_ATTRIBUTES) {
			const value = this.getAttribute(attr);
			if (value !== null) {
				attrs[attr] = LazyImgElement.escapeHtml(value);
			} else if (attr === 'alt') {
				// Always include alt attribute for accessibility, default to empty string
				attrs.alt = '';
			}
		}
		return attrs;
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

			// If already loaded and it's a source attribute change, don't allow it
			if (
				this._loaded &&
				LazyImgElement.SOURCE_ATTRIBUTES.includes(name)
			) {
				return;
			}

			// If already loaded and it's a non-source img attribute change, re-render
			if (this._loaded && LazyImgElement.IMG_ATTRIBUTES.includes(name)) {
				this.render();
				return;
			}

			// If already loaded and it's a config change, don't reload
			if (this._loaded && name !== 'query') {
				return;
			}
			this.render();
			// Reset and recheck if configuration changed
			if (LazyImgElement.CONFIG_ATTRIBUTES.includes(name)) {
				this._loaded = false;
				this._checkAndLoad();
			}
		}
	}

	_setupResizeWatcher() {
		const queryType = this.getAttribute('query') || 'container';

		if (queryType === 'container') {
			// Use shared ResizeObserver for container queries to improve performance
			// when multiple lazy-img elements share the same parent
			const targetElement = this.parentElement || this;
			this._observedTarget = targetElement;

			// Create callback for this instance
			this._resizeCallback = (entries) => {
				this._throttledResize(() => {
					for (const entry of entries) {
						this._currentSize =
							entry.contentBoxSize?.[0]?.inlineSize ||
							entry.contentRect.width;
						this._checkAndLoad();
					}
				});
			};

			// Register with shared observer
			const shared = LazyImgElement._getSharedObserver(targetElement);
			shared.callbacks.add(this._resizeCallback);
		} else {
			// Use shared window resize listener for media queries
			this._handleResize = () => {
				this._throttledResize(() => {
					this._currentSize = window.innerWidth;
					this._checkAndLoad();
				});
			};
			addWindowResizeCallback(this._handleResize);
			// Initial check
			this._currentSize = window.innerWidth;
		}
		this._checkAndLoad();
	}

	_cleanupResizeWatcher() {
		// Cleanup shared ResizeObserver callback
		if (this._observedTarget && this._resizeCallback) {
			LazyImgElement._removeSharedObserver(
				this._observedTarget,
				this._resizeCallback,
			);
			this._observedTarget = null;
			this._resizeCallback = null;
		}
		// Cleanup shared window resize listener
		if (this._handleResize) {
			removeWindowResizeCallback(this._handleResize);
			this._handleResize = null;
		}
		// Cleanup throttle timeout
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

		// Bail early if no src - img would be invalid
		if (!src) {
			this.shadowRoot.innerHTML = '';
			return;
		}

		let imageHTML = '';

		// Only render image if loaded or if no loading conditions are set
		if (
			this._loaded ||
			(!this.getAttribute('min-inline-size') &&
				!this.getAttribute('named-breakpoints'))
		) {
			const imgAttrs = this._getImgAttributes();
			const attrString = LazyImgElement._buildAttributeString(imgAttrs);
			imageHTML = `<img ${attrString} />`;
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
