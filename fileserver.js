const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const config = require('./config.json');
const Logger = require('./modules/logs.js');

const logger = new Logger(fs, config.logLocation);
const fsCfg = config.fileServer || {};

if (fsCfg.enabled === false) {
	logger.log('[fileserver] disabled in config; exiting.');
	process.exit(0);
}

if (!fsCfg.path || typeof fsCfg.port !== 'number') {
	logger.log('[fileserver] missing fileServer.path or fileServer.port in config.json; exiting.', true);
	process.exit(1);
}

const root = fsCfg.path.startsWith('~')
	? path.join(os.homedir(), fsCfg.path.slice(1))
	: fsCfg.path;

let index = new Map();

function rebuildIndex() {
	const next = new Map();
	const collisions = [];
	const walk = (dir) => {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch (e) {
			logger.log(`[fileserver] failed to read ${dir}: ${e.message}`, true);
			return;
		}
		entries.sort((a, b) => a.name.localeCompare(b.name));
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(full);
			} else if (entry.isFile()) {
				if (next.has(entry.name)) {
					collisions.push({ name: entry.name, kept: next.get(entry.name), skipped: full });
				} else {
					next.set(entry.name, full);
				}
			}
		}
	};
	walk(root);
	index = next;
	return { count: index.size, collisions };
}

function parseRange(header, size) {
	const match = /^bytes=(\d*)-(\d*)$/.exec(header);
	if (!match) return null;
	let start = match[1] === '' ? null : parseInt(match[1], 10);
	let end = match[2] === '' ? null : parseInt(match[2], 10);
	if (start === null && end === null) return null;
	if (start === null) {
		start = Math.max(0, size - end);
		end = size - 1;
	} else if (end === null) {
		end = size - 1;
	}
	if (isNaN(start) || isNaN(end) || start > end || start < 0 || end >= size) return null;
	return { start, end };
}

function serveFile(req, res, full, name) {
	let stat;
	try {
		stat = fs.statSync(full);
	} catch (e) {
		logger.log(`[fileserver] stat failed for ${full}: ${e.message}`, true);
		res.statusCode = 500;
		return res.end();
	}

	const headers = {
		'Content-Type': 'application/octet-stream',
		'Accept-Ranges': 'bytes',
		'Last-Modified': stat.mtime.toUTCString()
	};

	const rangeHeader = req.headers.range;
	if (rangeHeader) {
		const range = parseRange(rangeHeader, stat.size);
		if (!range) {
			res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
			return res.end();
		}
		const length = range.end - range.start + 1;
		headers['Content-Range'] = `bytes ${range.start}-${range.end}/${stat.size}`;
		headers['Content-Length'] = length;
		res.writeHead(206, headers);
		logger.log(`[fileserver] 206 ${name} (${range.start}-${range.end}/${stat.size})`);
		if (req.method === 'HEAD') return res.end();
		const stream = fs.createReadStream(full, { start: range.start, end: range.end });
		stream.on('error', (e) => {
			logger.log(`[fileserver] stream error on ${name}: ${e.message}`, true);
			res.destroy();
		});
		return stream.pipe(res);
	}

	headers['Content-Length'] = stat.size;
	res.writeHead(200, headers);
	logger.log(`[fileserver] 200 ${name} (${stat.size} bytes)`);
	if (req.method === 'HEAD') return res.end();
	const stream = fs.createReadStream(full);
	stream.on('error', (e) => {
		logger.log(`[fileserver] stream error on ${name}: ${e.message}`, true);
		res.destroy();
	});
	stream.pipe(res);
}

const initial = rebuildIndex();
logger.log(`[fileserver] indexed ${initial.count} files from ${root}`);
for (const c of initial.collisions) {
	logger.log(`[fileserver] basename collision: kept ${c.kept}, skipped ${c.skipped}`, true);
}

const server = http.createServer((req, res) => {
	try {
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			res.statusCode = 405;
			res.setHeader('Allow', 'GET, HEAD');
			return res.end();
		}

		const urlPath = req.url.split('?')[0];
		let name;
		try {
			name = path.basename(decodeURIComponent(urlPath));
		} catch {
			res.statusCode = 400;
			return res.end('Bad Request');
		}

		if (!name || name === '/' || name === '.') {
			res.statusCode = 404;
			return res.end('Not Found');
		}

		let full = index.get(name);
		if (!full) {
			const r = rebuildIndex();
			for (const c of r.collisions) {
				logger.log(`[fileserver] basename collision: kept ${c.kept}, skipped ${c.skipped}`, true);
			}
			full = index.get(name);
		}

		if (!full) {
			logger.log(`[fileserver] 404 ${name}`);
			res.statusCode = 404;
			return res.end('Not Found');
		}

		serveFile(req, res, full, name);
	} catch (e) {
		logger.log(`[fileserver] handler error: ${e && e.stack ? e.stack : e}`, true);
		try { res.statusCode = 500; res.end(); } catch {}
	}
});

process.on('uncaughtException', (e) => {
	logger.log(`[fileserver] uncaught: ${e && e.stack ? e.stack : e}`, true);
});
process.on('unhandledRejection', (e) => {
	logger.log(`[fileserver] unhandled rejection: ${e && e.stack ? e.stack : e}`, true);
});

server.listen(fsCfg.port, () => {
	logger.log(`[fileserver] serving on port ${fsCfg.port}`);
});
