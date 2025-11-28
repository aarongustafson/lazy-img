import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LazyImgElement } from '../lazy-img.js';

describe('LazyImgElement', () => {
	let element;

	beforeEach(() => {
		// Register the custom element
		if (!customElements.get('lazy-img')) {
			customElements.define('lazy-img', LazyImgElement);
		}
		element = document.createElement('lazy-img');
		document.body.appendChild(element);
	});

	afterEach(() => {
		document.body.removeChild(element);
	});

	describe('Basic functionality', () => {
		it('should be defined', () => {
			expect(customElements.get('lazy-img')).toBe(LazyImgElement);
		});

		it('should create an instance', () => {
			expect(element).toBeInstanceOf(LazyImgElement);
			expect(element).toBeInstanceOf(HTMLElement);
		});

		it('should have a shadow root', () => {
			expect(element.shadowRoot).toBeTruthy();
		});
	});

	describe('Attributes', () => {
		it('should observe required attributes', () => {
			const observed = LazyImgElement.observedAttributes;
			expect(observed).toContain('src');
			expect(observed).toContain('alt');
			expect(observed).toContain('srcset');
			expect(observed).toContain('sizes');
			expect(observed).toContain('min-inline-size');
			expect(observed).toContain('named-breakpoints');
			expect(observed).toContain('query');
		});

		it('should render image with src and alt', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('alt', 'Test image');

			const img = element.shadowRoot.querySelector('img');
			expect(img).toBeTruthy();
			expect(img.getAttribute('src')).toBe('test.jpg');
			expect(img.getAttribute('alt')).toBe('Test image');
		});

		it('should render srcset when provided', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute(
				'srcset',
				'test-400.jpg 400w, test-800.jpg 800w',
			);

			const img = element.shadowRoot.querySelector('img');
			expect(img.getAttribute('srcset')).toBe(
				'test-400.jpg 400w, test-800.jpg 800w',
			);
		});

		it('should render sizes when provided', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('sizes', '(max-width: 600px) 400px, 800px');

			const img = element.shadowRoot.querySelector('img');
			expect(img.getAttribute('sizes')).toBe(
				'(max-width: 600px) 400px, 800px',
			);
		});

		it('should default alt to empty string if not provided', () => {
			element.setAttribute('src', 'test.jpg');

			const img = element.shadowRoot.querySelector('img');
			expect(img.getAttribute('alt')).toBe('');
		});
	});

	describe('Immediate loading (no conditions)', () => {
		it('should load image immediately when no min-inline-size or named-breakpoints', () => {
			element.setAttribute('src', 'immediate.jpg');

			const img = element.shadowRoot.querySelector('img');
			expect(img).toBeTruthy();
			expect(img.getAttribute('src')).toBe('immediate.jpg');
		});
	});

	describe('Container query mode', () => {
		it('should default to container query mode', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '500');

			// Query attribute should default to "container"
			expect(element.getAttribute('query')).toBeNull(); // Not set explicitly
			// Component should set up ResizeObserver
			expect(element._resizeObserver).toBeTruthy();
		});

		it('should not load image until container reaches min-inline-size', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '500');

			// Initially, image should not be loaded if we haven't checked size yet
			// This is implementation-dependent, but we can check the _loaded flag
			expect(element._loaded).toBe(false);
		});
	});

	describe('Media query mode', () => {
		it('should set up window resize listener in media query mode', () => {
			// Need to disconnect first to clear any existing observers
			element.disconnectedCallback();

			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '768');
			element.setAttribute('query', 'media');

			// Manually trigger setup since we disconnected
			element._setupResizeWatcher();

			expect(element._handleResize).toBeTruthy();
		});

		it('should clean up resize listener on disconnect', () => {
			// Need to disconnect first to clear any existing observers
			element.disconnectedCallback();

			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '768');
			element.setAttribute('query', 'media');

			// Manually trigger setup
			element._setupResizeWatcher();
			const handleResize = element._handleResize;

			const removeEventListenerSpy = vi.spyOn(
				window,
				'removeEventListener',
			);
			element.disconnectedCallback();

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				'resize',
				handleResize,
			);
		});
	});

	describe('Named breakpoints', () => {
		it('should warn if named-breakpoints used without --lazy-img-mq', () => {
			const consoleSpy = vi.spyOn(console, 'warn');

			element.setAttribute('src', 'test.jpg');
			element.setAttribute('named-breakpoints', 'medium, large');

			// Trigger a check
			element._checkAndLoad();

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('--lazy-img-mq'),
			);
		});

		it('should use --lazy-img-mq CSS custom property when named-breakpoints is set', () => {
			// Set the CSS custom property on :root
			document.documentElement.style.setProperty(
				'--lazy-img-mq',
				'medium',
			);

			element.setAttribute('src', 'test.jpg');
			element.setAttribute('named-breakpoints', 'medium, large');

			element._checkAndLoad();

			// Should have loaded since 'medium' matches
			expect(element._loaded).toBe(true);

			// Cleanup
			document.documentElement.style.removeProperty('--lazy-img-mq');
		});

		it('should not load if --lazy-img-mq does not match named-breakpoints', () => {
			// Set the CSS custom property to a non-matching value
			document.documentElement.style.setProperty(
				'--lazy-img-mq',
				'small',
			);

			element.setAttribute('src', 'test.jpg');
			element.setAttribute('named-breakpoints', 'medium, large');

			element._checkAndLoad();

			// Should not have loaded since 'small' does not match
			expect(element._loaded).toBe(false);

			// Cleanup
			document.documentElement.style.removeProperty('--lazy-img-mq');
		});
	});

	describe('Events', () => {
		it('should dispatch lazy-img:loaded event when image loads', () => {
			return new Promise((resolve) => {
				element.addEventListener('lazy-img:loaded', (event) => {
					expect(event.detail.src).toBe('test.jpg');
					expect(event.bubbles).toBe(true);
					expect(event.composed).toBe(true);
					resolve();
				});

				element.setAttribute('src', 'test.jpg');
				// Trigger load manually since no conditions
				element._loadImage();
			});
		});
	});

	describe('Lifecycle', () => {
		it('should clean up ResizeObserver on disconnect', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '500');

			const observer = element._resizeObserver;
			expect(observer).toBeTruthy();

			const disconnectSpy = vi.spyOn(observer, 'disconnect');
			element.disconnectedCallback();

			expect(disconnectSpy).toHaveBeenCalled();
			expect(element._resizeObserver).toBeNull();
		});

		it('should clear throttle timeout on disconnect', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '500');

			// Set a throttle timeout
			element._throttleTimeout = setTimeout(() => {}, 1000);
			const timeoutId = element._throttleTimeout;

			element.disconnectedCallback();

			expect(element._throttleTimeout).toBeNull();
		});
	});

	describe('HTML escaping', () => {
		it('should escape HTML in src attribute', () => {
			element.setAttribute(
				'src',
				'test.jpg"><script>alert("xss")</script>',
			);

			const shadowHTML = element.shadowRoot.innerHTML;
			expect(shadowHTML).not.toContain('<script>');
		});

		it('should escape HTML in alt attribute', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('alt', '<script>alert("xss")</script>');

			const shadowHTML = element.shadowRoot.innerHTML;
			expect(shadowHTML).not.toContain('<script>');
		});
	});

	describe('Performance', () => {
		it('should throttle resize checks', () => {
			vi.useFakeTimers();

			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '500');

			const checkSpy = vi.spyOn(element, '_checkAndLoad');

			// Trigger multiple throttled calls
			element._throttledResize(() => element._checkAndLoad());
			element._throttledResize(() => element._checkAndLoad());
			element._throttledResize(() => element._checkAndLoad());

			// Should not be called yet
			expect(checkSpy).not.toHaveBeenCalled();

			// Fast forward time
			vi.advanceTimersByTime(150);

			// Should be called once
			expect(checkSpy).toHaveBeenCalledTimes(1);

			vi.useRealTimers();
		});
	});

	describe('Edge cases', () => {
		it('should handle invalid min-inline-size', () => {
			const consoleSpy = vi.spyOn(console, 'warn');

			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', 'invalid');

			element._checkAndLoad();

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('valid number'),
			);
		});

		it('should not reload image if already loaded', () => {
			element.setAttribute('src', 'test.jpg');
			element._loaded = true;

			const initialHTML = element.shadowRoot.innerHTML;

			// Try to change src
			element.setAttribute('src', 'new-test.jpg');

			// Should not have changed because already loaded
			const newHTML = element.shadowRoot.innerHTML;
			expect(newHTML).toBe(initialHTML);
		});

		it('should handle missing src attribute', () => {
			element.setAttribute('alt', 'No source');

			const img = element.shadowRoot.querySelector('img');
			expect(img).toBeFalsy();
		});
	});

	describe('CSS Custom Properties', () => {
		it('should support --lazy-img-display custom property', () => {
			element.setAttribute('src', 'test.jpg');

			const style = element.shadowRoot.querySelector('style');
			expect(style.textContent).toContain('--lazy-img-display');
		});
	});

	describe('State attributes', () => {
		it('should set loaded attribute when image loads', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('alt', 'Test');

			// Initially should not have loaded attribute
			expect(element.hasAttribute('loaded')).toBe(false);

			// Trigger load
			element._loadImage();

			// Should now have loaded attribute
			expect(element.hasAttribute('loaded')).toBe(true);
		});

		it('should set qualifies attribute when conditions are met', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '300');

			// Set current size below threshold
			element._currentSize = 200;
			element._checkAndLoad();

			// Should not qualify
			expect(element.hasAttribute('qualifies')).toBe(false);

			// Set current size above threshold
			element._currentSize = 400;
			element._checkAndLoad();

			// Should qualify
			expect(element.hasAttribute('qualifies')).toBe(true);
		});

		it('should remove qualifies attribute when conditions are no longer met', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '300');

			// Set current size above threshold
			element._currentSize = 400;
			element._checkAndLoad();
			expect(element.hasAttribute('qualifies')).toBe(true);

			// Set current size below threshold
			element._currentSize = 200;
			element._checkAndLoad();
			expect(element.hasAttribute('qualifies')).toBe(false);
		});

		it('should maintain loaded attribute even when qualifies changes', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '300');

			// Load the image
			element._currentSize = 400;
			element._checkAndLoad();
			expect(element.hasAttribute('loaded')).toBe(true);
			expect(element.hasAttribute('qualifies')).toBe(true);

			// Resize below threshold
			element._currentSize = 200;
			element._checkAndLoad();

			// loaded should persist, qualifies should be removed
			expect(element.hasAttribute('loaded')).toBe(true);
			expect(element.hasAttribute('qualifies')).toBe(false);
		});

		it('should restore qualifies when resized back above threshold after loading', () => {
			element.setAttribute('src', 'test.jpg');
			element.setAttribute('min-inline-size', '300');

			// Initial state - below threshold
			element._currentSize = 200;
			element._checkAndLoad();
			expect(element.hasAttribute('loaded')).toBe(false);
			expect(element.hasAttribute('qualifies')).toBe(false);

			// Resize above threshold - should load
			element._currentSize = 400;
			element._checkAndLoad();
			expect(element.hasAttribute('loaded')).toBe(true);
			expect(element.hasAttribute('qualifies')).toBe(true);

			// Resize below threshold - qualifies should be removed
			element._currentSize = 200;
			element._checkAndLoad();
			expect(element.hasAttribute('loaded')).toBe(true);
			expect(element.hasAttribute('qualifies')).toBe(false);

			// Resize above threshold again - qualifies should come back
			element._currentSize = 400;
			element._checkAndLoad();
			expect(element.hasAttribute('loaded')).toBe(true);
			expect(element.hasAttribute('qualifies')).toBe(true);
		});

		it('should always set qualifies when no conditions are specified', () => {
			element.setAttribute('src', 'test.jpg');

			element._checkAndLoad();

			expect(element.hasAttribute('qualifies')).toBe(true);
		});
	});
});
