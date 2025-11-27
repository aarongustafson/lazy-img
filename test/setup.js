import { beforeAll } from 'vitest';
import { LazyImgElement } from '../lazy-img.js';

// Define the custom element before tests run
beforeAll(() => {
	if (!customElements.get('lazy-img')) {
		customElements.define('lazy-img', LazyImgElement);
	}

	// Make the class available globally for testing static methods
	globalThis.LazyImgElement = LazyImgElement;
});
