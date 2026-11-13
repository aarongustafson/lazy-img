import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = {
	'.css': 'text/css',
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.svg': 'image/svg+xml',
};

createServer(async (request, response) => {
	const pathname = new URL(request.url, 'http://localhost').pathname;
	const path = resolve(root, `.${pathname}`);
	if (!path.startsWith(`${resolve(root)}${sep}`)) {
		response.writeHead(403).end();
		return;
	}
	try {
		const file = await stat(path);
		if (!file.isFile()) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, {
			'content-type': types[extname(path)] || 'application/octet-stream',
			'content-length': file.size,
			'cache-control': 'no-store',
		});
		if (request.method === 'HEAD') response.end();
		else
			createReadStream(path)
				.on('error', (error) => response.destroy(error))
				.pipe(response);
	} catch (error) {
		response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
	}
}).listen(Number(process.env.PORT || 4184), '127.0.0.1');
