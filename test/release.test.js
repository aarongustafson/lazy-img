import { readFile } from 'node:fs/promises';
import { expect, it, vi } from 'vitest';

it('updates only managed ESM versions without writing to the checkout', async () => {
	const originalPackage = await readFile('package.json', 'utf8');
	const pkg = JSON.parse(originalPackage);
	const originalDemo = await readFile('demo/esm.html', 'utf8');
	const futureVersion = '99.0.0';
	const write = vi.fn();
	vi.doMock('fs', () => ({
		readFileSync(path) {
			if (path.endsWith('package.json'))
				return JSON.stringify({ ...pkg, version: futureVersion });
			if (path.endsWith('/demo/esm.html')) return originalDemo;
			throw new Error(`Unexpected fixture read: ${path}`);
		},
		writeFileSync: write,
	}));
	const log = vi.spyOn(console, 'log').mockImplementation(() => {});
	try {
		await import('../scripts/update-demo-versions.js');
		expect(originalDemo).toContain(`${pkg.name}@${pkg.version}/`);
		expect(write).toHaveBeenCalledExactlyOnceWith(
			expect.stringMatching(/[/\\]demo[/\\]esm\.html$/),
			originalDemo.replaceAll(
				`${pkg.name}@${pkg.version}/`,
				`${pkg.name}@${futureVersion}/`,
			),
			'utf-8',
		);
		expect(await readFile('package.json', 'utf8')).toBe(originalPackage);
		expect(await readFile('demo/esm.html', 'utf8')).toBe(originalDemo);
	} finally {
		vi.doUnmock('fs');
		log.mockRestore();
	}
});
