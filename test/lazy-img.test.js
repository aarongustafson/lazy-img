import { describe, it, expect, beforeEach } from 'vitest';
import { LazyImgElement } from '../lazy-img.js';

describe('LazyImgElement', () => {
	let element;

	beforeEach(() => {
		element = document.createElement('lazy-img');
		document.body.appendChild(element);
	});

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

	// Add more tests here
});
