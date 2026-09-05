import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import nodePath from 'node:path';
import { Readable } from 'node:stream';

import type { APIRoute } from 'astro';

import { contentRange, parseRange } from '../../lib/byte-range';
import { getUploadedMedia } from '../../lib/portfolio-data';

/*
 * Files from the CMS upload volume, which is mounted read-only into this
 * container. The database row is the permission to serve: a file with no row
 * is not content, whatever is on disk.
 *
 * The file is streamed rather than read into memory, and a Range request is
 * honoured. Uploads include videos of tens of megabytes; reading one whole
 * into a Buffer for every viewer is what used to happen, and answering a
 * seek with the entire file is why scrubbing was slow.
 */
const safeFilename = /^[0-9a-f-]{36}\.(?:gif|jpe?g|png|webp|mp4|webm|pdf)$/i;

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
	const filename = params.path;
	if (!filename || !safeFilename.test(filename)) {
		return new Response('Not found', { status: 404 });
	}

	const media = await getUploadedMedia(`/uploads/${filename}`);
	if (!media) return new Response('Not found', { status: 404 });

	const file = nodePath.join(process.env.UPLOAD_DIR ?? '/app/uploads', filename);

	let size: number;
	try {
		size = (await stat(file)).size;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return new Response('Not found', { status: 404 });
		}
		throw error;
	}

	// An upload is immutable — its name is a UUID minted when it was stored —
	// so a copy may be kept for as long as a cache likes.
	const headers: Record<string, string> = {
		'Accept-Ranges': 'bytes',
		'Cache-Control': 'public, max-age=31536000, immutable',
		'Content-Type': media.mimeType,
		'X-Content-Type-Options': 'nosniff',
	};

	const range = parseRange(request.headers.get('range'), size);

	if (range.kind === 'unsatisfiable') {
		return new Response(null, {
			status: 416,
			headers: { ...headers, 'Content-Range': contentRange(range, size) },
		});
	}

	if (range.kind === 'partial') {
		const body = Readable.toWeb(createReadStream(file, { start: range.start, end: range.end }));
		return new Response(body as ReadableStream, {
			status: 206,
			headers: {
				...headers,
				'Content-Range': contentRange(range, size),
				'Content-Length': String(range.end - range.start + 1),
			},
		});
	}

	const body = Readable.toWeb(createReadStream(file));
	return new Response(body as ReadableStream, {
		headers: { ...headers, 'Content-Length': String(size) },
	});
};
