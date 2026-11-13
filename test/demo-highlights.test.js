import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const read = (path) => readFile(resolve(process.cwd(), path), 'utf8');
const { version } = JSON.parse(await read('package.json'));
const baselines = {
	'index.html': [
		'65847286a5ace4a54b7ecf8bd7871b1c838946d5011717dccee43c5b67c98fd5',
		'53101d88be5f37ecbffbdc868f4a47c1496f36502e4c5d47bb463a8193dc92b3',
		'ed7e7d7f90942c33fad1209289f89dc6f7761cd1c347e1a0dfa3abd6d85a4da4',
		'a67ed89a16c1975aa6d691246fc76ae6558ad634485a4a937c6c5cbb59fc4739',
		'5dc78d073ad69ea714a02a645d5eb3fd9eaca46e3bfac1e6205bbb9c30d20167',
		'e9fafd92962a2d5508293d4847a145bc0437481b22ac0da45eb18fe23f8e2ba6',
		'3ab6c1aaba9bc2ea54a5b7e2dffc608e1980917b5a09b08ef71321014d39caaa',
		'5bf4c59ff02bbb11d496fcfd98b3683368b443cea5dc214e9edae6571eb373b6',
		'ed25a6164c2058e1e1858e6341904b2a71da77c81e8cf587b7c0cb3afd4904c4',
		'054f4e8ed5c9c47dc8e5ec89f7cca94186a7ace555cbd5ee7a24c7d66e5f434d',
		'05156245656144f4d893d246121c3dca3718ec91c0edebc4d6571d976a3c4fd9',
		'0c5d2ec80eef8226b27da9137283c25324260f91b8f0bd3a91941c193c98ba3d',
		'3b5ebbe95804c138f13e011641f9a750507db65d1999e8514637dd242028eb50',
	],
	'esm.html': [
		'f9ab1ad6d033095dce81835b18a33cc7e014e8940391b35145efc239d91dc99c',
	],
	'unpkg.html': [
		'bec338bf8a646319964c2f1cd735225b7a5e4e0bebe07a1f5d47c824badacbcd',
	],
};

const componentCode = [
	/<\/?lazy-img\b[^>]*>/g,
	/--lazy-img-mq:\s*[^;]+;/g,
	/lazy-img\[loaded\]:not\(\[qualifies\]\)/g,
	/\.addEventListener\('lazy-img:loaded', \(e\) => \{/g,
	/e\.detail\.src/g,
	/import\s+\{ (?:LazyImgElement|defineLazyImg) \} from\s+'[^']+';/g,
	/customElements\.define\('lazy-img', LazyImgElement\);/g,
	/defineLazyImg\(\);/g,
];

function snippetsFrom(html) {
	const template = document.createElement('template');
	template.innerHTML = html;
	return [...template.content.querySelectorAll('pre code')];
}

function textHashes(snippets, releaseVersion = version) {
	return snippets.map((code) => {
		// Normalize only the release-managed package URL version.
		const text = code.textContent.replaceAll(
			`@aarongustafson/lazy-img@${releaseVersion}/`,
			'@aarongustafson/lazy-img@VERSION/',
		);
		return createHash('sha256').update(text).digest('hex');
	});
}

function expectHighlights(snippets) {
	let covered = 0;
	for (const code of snippets) {
		expect(code.querySelector('mark mark')).toBeNull();
		const actual = Array(code.textContent.length).fill(false);
		const expected = Array(code.textContent.length).fill(false);
		const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
		let offset = 0;
		while (walker.nextNode()) {
			const node = walker.currentNode;
			if (node.parentElement.closest('mark'))
				actual.fill(true, offset, offset + node.textContent.length);
			offset += node.textContent.length;
		}
		for (const pattern of componentCode) {
			for (const match of code.textContent.matchAll(pattern)) {
				const end = match.index + match[0].length;
				expected.fill(true, match.index, end);
				expect(
					actual.slice(match.index, end).every(Boolean),
					match[0],
				).toBe(true);
				covered++;
			}
		}
		expect(
			actual.every((marked, index) => !marked || expected[index]),
			'generic surrounding code stays unmarked',
		).toBe(true);
	}
	expect(covered).toBeGreaterThan(0);
}

it('covers every authored HTML demo page', async () => {
	const pages = (await readdir(resolve(process.cwd(), 'demo')))
		.filter((name) => name.endsWith('.html'))
		.sort();
	expect(pages).toEqual(Object.keys(baselines).sort());
});

it('retained publishing helper preserves highlighting contracts after a future version update', async () => {
	const originalPackage = await read('package.json');
	const originals = Object.fromEntries(
		await Promise.all(
			Object.keys(baselines).map(async (name) => [
				name,
				await read(`demo/${name}`),
			]),
		),
	);
	const futureVersion = '99.0.0';
	const writes = [];
	vi.doMock('fs', () => ({
		readFileSync(path) {
			if (path.endsWith('package.json'))
				return JSON.stringify({
					...JSON.parse(originalPackage),
					version: futureVersion,
				});
			if (path.endsWith('/demo/esm.html')) return originals['esm.html'];
			throw new Error(`Unexpected fixture read: ${path}`);
		},
		writeFileSync(path, content) {
			expect(path.endsWith('/demo/esm.html')).toBe(true);
			writes.push(content);
		},
	}));
	const log = vi.spyOn(console, 'log').mockImplementation(() => {});
	try {
		await import('../scripts/update-demo-versions.js');
		expect(writes).toHaveLength(1);
		expect(writes[0]).toBe(
			originals['esm.html'].replaceAll(
				`@aarongustafson/lazy-img@${version}/`,
				`@aarongustafson/lazy-img@${futureVersion}/`,
			),
		);
		for (const [name, hashes] of Object.entries(baselines)) {
			const snippets = snippetsFrom(
				name === 'esm.html' ? writes[0] : originals[name],
			);
			expectHighlights(snippets);
			expect(textHashes(snippets, futureVersion)).toEqual(hashes);
		}
		const changedGenericCode = snippetsFrom(
			writes[0].replace(
				'&lt;script type="module"&gt;',
				'&lt;script type="text/plain"&gt;',
			),
		);
		expect(textHashes(changedGenericCode, futureVersion)).not.toEqual(
			baselines['esm.html'],
		);
		expect(await read('package.json')).toBe(originalPackage);
		for (const [name, original] of Object.entries(originals))
			expect(await read(`demo/${name}`)).toBe(original);
	} finally {
		vi.doUnmock('fs');
		log.mockRestore();
	}
});

for (const [name, hashes] of Object.entries(baselines)) {
	const snippets = snippetsFrom(await read(`demo/${name}`));
	describe(name, () => {
		it('marks every component-specific span without marking generic code or nesting marks', () => {
			expectHighlights(snippets);
		});

		it('preserves every displayed code character from the unmarked baseline', () => {
			expect(textHashes(snippets)).toEqual(hashes);
		});
	});
}
