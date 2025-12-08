import { LazyImgElement } from './lazy-img.js';

export function defineLazyImg(tagName = 'lazy-img') {
	const hasWindow = typeof window !== 'undefined';
	const registry = hasWindow ? window.customElements : undefined;

	if (!registry || typeof registry.define !== 'function') {
		return false;
	}

	if (!registry.get(tagName)) {
		registry.define(tagName, LazyImgElement);
	}

	return true;
}

defineLazyImg();
