export declare class LazyImgElement extends HTMLElement {
	src: string | null;
	alt: string;
	srcset: string | null;
	sizes: string | null;
	width: string | null;
	height: string | null;
	loading: string | null;
	decoding: string | null;
	fetchPriority: string | null;
	crossOrigin: string | null;
	referrerPolicy: string | null;
	minInlineSize: string | null;
	namedBreakpoints: string | null;
	query: string;
	viewRangeStart: string;
	readonly loaded: boolean;
	readonly qualifies: boolean;
}

declare global {
	interface HTMLElementTagNameMap {
		'lazy-img': LazyImgElement;
	}
}
