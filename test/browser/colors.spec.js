import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const read = (path) =>
	readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = await read('lazy-img.js');
const definition = await read('define.js');
const image =
	'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#ddd"/></svg>';

async function demo(page, name = 'index.html') {
	await page.route('https://picsum.photos/**', (route) =>
		route.fulfill({ contentType: 'image/svg+xml', body: image }),
	);
	await page.route('https://esm.sh/**', (route) =>
		route.fulfill({ contentType: 'text/javascript', body: source }),
	);
	await page.route('https://unpkg.com/**', (route) =>
		route.fulfill({
			contentType: 'text/javascript',
			body: definition.replace(
				"'./lazy-img.js'",
				"'http://127.0.0.1:4184/lazy-img.js'",
			),
		}),
	);
	await page.goto(`/demo/${name}`);
	await expect(page.locator('lazy-img img').first()).toBeVisible();
}

async function contrast(locator) {
	return locator.evaluate((element) => {
		const context = document.createElement('canvas').getContext('2d', {
			willReadFrequently: true,
		});
		const pixel = () => [...context.getImageData(0, 0, 1, 1).data];
		const paint = (color) => {
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			return pixel();
		};
		const ancestors = [];
		for (let node = element; node; node = node.parentElement)
			ancestors.unshift(node);
		for (const node of ancestors) {
			const style = getComputedStyle(node);
			paint(style.backgroundColor);
			if (style.backgroundImage !== 'none') {
				const match = style.backgroundImage.match(
					/^linear-gradient\((.+), \1\)$/,
				);
				if (!match) throw new Error('Unsupported background');
				paint(match[1]);
			}
		}
		const background = pixel();
		if (background[3] !== 255) throw new Error('Expected opaque surface');
		const foreground = paint(getComputedStyle(element).color);
		const luminance = (rgb) =>
			rgb.slice(0, 3).reduce((sum, channel, index) => {
				const value = channel / 255;
				return (
					sum +
					(value <= 0.04045
						? value / 12.92
						: ((value + 0.055) / 1.055) ** 2.4) *
						[0.2126, 0.7152, 0.0722][index]
				);
			}, 0);
		const values = [luminance(background), luminance(foreground)].sort(
			(a, b) => b - a,
		);
		return (values[0] + 0.05) / (values[1] + 0.05);
	});
}

const surfaces = [
	'body',
	'.demo-section',
	'.demo',
	'pre',
	'.api-reference',
	'.container-info',
	'.load-time-display small',
	'.state-indicator',
	'footer',
];

// Nineteen distinct six-token palettes represent the study's 62 observations.
const tokens = [
	'Canvas',
	'CanvasText',
	'ButtonFace',
	'ButtonText',
	'Field',
	'FieldText',
];
const palettes = [
	['#ffffff', '#000000', '#efefef', '#000000', '#ffffff', '#000000'],
	['#121212', '#ffffff', '#6b6b6b', '#ffffff', '#3b3b3b', '#ffffff'],
	['#ffffff', '#000000', '#e9e9ed', '#000000', '#ffffff', '#000000'],
	['#1c1b22', '#fbfbfe', '#2b2a33', '#fbfbfe', '#2b2a33', '#fbfbfe'],
	['#ffffff', '#000000', '#c0c0c0', '#000000d8', '#ffffff', '#000000d8'],
	['#1e1e1e', '#ffffff', '#ffffff3f', '#ffffffd8', '#ffffff3f', '#ffffffd8'],
	['#ffffff', '#000000', '#f0f0f0', '#000000', '#ffffff', '#000000'],
	['#202020', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#3d3d3d'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffee32'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#b6f6f0'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#202020'],
	['#ffffff', '#000000', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#000000', '#ffffff', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#ffffff', '#000000', '#ffffff', '#000000d8', '#ffffff', '#000000d8'],
	['#282828', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#202020', '#ffffff', '#00000000', '#ffffff', '#00000000', '#ffffff'],
];

function substitute(css, palette) {
	const colors = Object.fromEntries(
		tokens.map((token, index) => [token.toLowerCase(), palette[index]]),
	);
	return css.replace(
		/\b(CanvasText|Canvas|ButtonFace|ButtonText|FieldText|Field)\b/gi,
		(token) => colors[token.toLowerCase()],
	);
}

for (const name of ['index.html', 'esm.html', 'unpkg.html']) {
	const selectors =
		name === 'index.html'
			? [...surfaces, '.note', '#event-status small']
			: ['body', '.demo-section', '.demo', 'pre', 'footer'];

	test(`${name}: all study palettes retain reading, supporting, and code contrast`, async ({
		page,
	}) => {
		await demo(page, name);
		const css = await read('demo/styles.css');
		await page.addStyleTag({ content: css });
		const sheets = [];
		for (const locator of await page.locator('style').all())
			sheets.push({ locator, css: await locator.textContent() });
		for (const palette of palettes) {
			for (const sheet of sheets)
				await sheet.locator.evaluate(
					(style, css) => {
						style.textContent = css;
					},
					substitute(sheet.css, palette),
				);
			for (const selector of [...selectors, 'h1 code'])
				expect(
					await contrast(page.locator(selector).first()),
					`${palette[0]} ${selector}`,
				).toBeGreaterThanOrEqual(4.5);
		}
	});

	for (const colorScheme of ['light', 'dark']) {
		test(`${name}: ${colorScheme} reading and supporting surfaces retain normal-text contrast`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme });
			await demo(page, name);
			for (const selector of selectors)
				expect(
					await contrast(page.locator(selector).first()),
					selector,
				).toBeGreaterThanOrEqual(4.5);
		});

		test(`${name}: ${colorScheme} native inline-code pair is measured separately`, async ({
			page,
			browserName,
		}) => {
			test.fail(
				process.platform === 'linux' &&
					browserName === 'webkit' &&
					colorScheme === 'dark',
				'Known Ubuntu WebKit dark ButtonText/ButtonFace limitation; do not lower text thresholds.',
			);
			await page.emulateMedia({ colorScheme });
			await demo(page, name);
			expect(
				await contrast(page.locator('h1 code')),
			).toBeGreaterThanOrEqual(4.5);
		});
	}

	test(`${name}: responsive code/live layout and enlarged text do not overflow the page`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await demo(page, name);
		const pair = page.locator('.code-demo-pair').first();
		const code = await pair.locator('pre').boundingBox();
		const live = await pair.locator('.demo').boundingBox();
		expect(code.x).toBeLessThan(live.x);
		await page.setViewportSize({ width: 320, height: 800 });
		await page.addStyleTag({ content: ':root { font-size: 200%; }' });
		const narrowCode = await pair.locator('pre').boundingBox();
		const narrowLive = await pair.locator('.demo').boundingBox();
		expect(narrowCode.y).toBeLessThan(narrowLive.y);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth),
		).toBeLessThanOrEqual(320);
	});

	test(`${name}: no-JavaScript and module failures retain fallback information`, async ({
		browser,
		page,
	}) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const noJS = await context.newPage();
		await noJS.goto(`http://127.0.0.1:4184/demo/${name}`);
		await expect(noJS.locator('noscript').first()).toBeVisible();
		await expect(
			noJS
				.getByRole('link', { name: 'Open an alternative image' })
				.first(),
		).toBeVisible();
		await expect(noJS.locator('lazy-img img')).toHaveCount(0);
		if (name === 'index.html')
			expect(
				await noJS
					.locator('figure img')
					.evaluate((img) => img.complete && img.naturalWidth > 0),
			).toBe(true);
		await context.close();
		await page.route('**/*.js*', (route) => route.abort());
		await page.goto(`/demo/${name}`);
		await expect(
			page
				.getByRole('link', { name: 'Open an alternative image' })
				.first(),
		).toBeVisible();
		await expect(page.locator('lazy-img img')).toHaveCount(0);
	});
}

test('container loading is keyboard-operable and retains focus', async ({
	page,
	browserName,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await demo(page);
	const slider = page.getByLabel('Width of container 1');
	const image = page.locator('#container-1 lazy-img');
	await expect(page.locator('[data-container="container-1"]')).toHaveText(
		'200',
	);
	await expect(image).not.toHaveAttribute('loaded');
	await slider.focus();
	for (let step = 0; step < 10; step++)
		await page.keyboard.press('ArrowRight');
	await expect(image).toHaveAttribute('loaded');
	await expect(slider).toBeFocused();
	expect(
		await slider.evaluate((element) => {
			const style = getComputedStyle(element);
			return (
				style.outlineStyle !== 'none' &&
				parseFloat(style.outlineWidth) > 0
			);
		}),
	).toBe(true);
	await page.keyboard.press(
		browserName === 'webkit' && process.platform === 'darwin'
			? 'Alt+Tab'
			: 'Tab',
	);
	await expect(page.getByLabel('Width of container 2')).toBeFocused();
});

test('media queries request only after qualifying and retain the same image on resize', async ({
	page,
}) => {
	await page.setViewportSize({ width: 600, height: 800 });
	await demo(page);
	const image = page.locator('#media-query-example lazy-img');
	await expect(image).not.toHaveAttribute('loaded');
	await page.setViewportSize({ width: 1000, height: 800 });
	await expect(image).toHaveAttribute('loaded');
	expect(
		await image
			.locator('img')
			.evaluate((img) => img.complete && img.naturalWidth > 0),
	).toBe(true);
	await image.locator('img').evaluate((img) => {
		img.dataset.retained = 'yes';
	});
	await page.setViewportSize({ width: 600, height: 800 });
	await expect(image).not.toHaveAttribute('qualifies');
	await expect(image.locator('img')).toHaveAttribute('data-retained', 'yes');
});

test('view loading uses text and border style cues without moving focus', async ({
	page,
}) => {
	await demo(page);
	const image = page.locator('#view-demo-1');
	const slider = page.getByLabel('Width of container 1');
	await slider.focus();
	await image.scrollIntoViewIfNeeded();
	await expect(image).toHaveAttribute('loaded');
	await expect(page.locator('#view-status-1')).toContainText(
		'Request started',
	);
	await expect(page.locator('#view-status-1')).toHaveCSS(
		'border-left-style',
		'solid',
	);
	await expect(slider).toBeFocused();
});

test('state visibility has readable text independent of color', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await demo(page);
	const slider = page.getByLabel('Width of state container');
	await slider.focus();
	await page.keyboard.press('End');
	await expect(page.locator('#state-display')).toContainText(
		'Requested and qualifies',
	);
	await expect(page.locator('#state-demo-img')).toBeVisible();
	await page.keyboard.press('Home');
	await expect(page.locator('#state-display')).toContainText(
		"doesn't qualify",
	);
	await expect(page.locator('#state-demo-img')).toBeHidden();
	await expect(slider).toBeFocused();
});

test('image failure keeps native alternative text, description, and recovery link', async ({
	page,
}) => {
	await demo(page);
	const image = page.locator('#failure-example lazy-img img');
	await expect(image).toHaveAttribute('alt', 'Mountain trail at sunrise');
	await expect(
		page.getByRole('img', {
			name: 'Mountain trail at sunrise',
			exact: true,
		}),
	).toBeVisible();
	expect(
		await image.evaluate((img) => img.complete && img.naturalWidth === 0),
	).toBe(true);
	await expect(page.locator('#failure-example .demo')).toContainText(
		'If the image is unavailable: mountain trail at sunrise.',
	);
	await expect(page.locator('#failure-example a')).toHaveAttribute(
		'href',
		'./sample.svg',
	);
});

test('event status renders untrusted URLs as text, not markup', async ({
	page,
}) => {
	await demo(page);
	await page.locator('#event-demo').evaluate((element) => {
		element.dispatchEvent(
			new CustomEvent('lazy-img:loaded', {
				detail: { src: '<img src=x onerror="window.injected=true">' },
			}),
		);
	});
	await expect(page.locator('#event-status')).toContainText('<img src=x');
	await expect(page.locator('#event-status img')).toHaveCount(0);
	expect(await page.evaluate(() => window.injected)).toBeUndefined();
});

test('forced-color emulation preserves automatic adjustment and readable state text', async ({
	page,
	browserName,
}) => {
	test.skip(
		browserName !== 'chromium',
		'Forced-color emulation is a Chromium regression aid, not OS theme coverage.',
	);
	await page.emulateMedia({ forcedColors: 'active' });
	await demo(page);
	for (const selector of surfaces) {
		await expect(page.locator(selector).first()).toHaveCSS(
			'forced-color-adjust',
			'auto',
		);
		expect(
			await contrast(page.locator(selector).first()),
			selector,
		).toBeGreaterThanOrEqual(4.5);
	}
});

test('increased contrast retains full-strength supporting text', async ({
	page,
}) => {
	await page.emulateMedia({ contrast: 'more' });
	await demo(page);
	expect(
		await page
			.locator('footer')
			.evaluate(
				(footer) =>
					getComputedStyle(footer).color ===
					getComputedStyle(document.body).color,
			),
	).toBe(true);
});

test('palette replacement handles normalized mixed-case CSSOM tokens', async ({
	page,
}) => {
	await page.setContent(
		'<style>.probe { background: cAnVaS; color: CANVASTEXT; }</style><p class="probe">Text</p>',
	);
	const css = await page
		.locator('style')
		.evaluate((style) => style.sheet.cssRules[0].cssText);
	await page.locator('style').evaluate(
		(style, css) => {
			style.textContent = css;
		},
		substitute(css, palettes[1]),
	);
	await expect(page.locator('.probe')).toHaveCSS(
		'background-color',
		'rgb(18, 18, 18)',
	);
	await expect(page.locator('.probe')).toHaveCSS(
		'color',
		'rgb(255, 255, 255)',
	);
});
