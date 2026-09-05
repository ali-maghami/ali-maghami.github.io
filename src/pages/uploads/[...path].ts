import { readFile } from 'node:fs/promises';
import nodePath from 'node:path';

import type { APIRoute } from 'astro';

import { getUploadedMedia } from '../../lib/portfolio-data';

const safeFilename = /^[0-9a-f-]{36}\.(?:gif|jpe?g|png|webp|mp4|webm|pdf)$/i;

export const GET: APIRoute = async ({ params }) => {
	const filename = params.path;
	if (!filename || !safeFilename.test(filename)) {
		return new Response('Not found', { status: 404 });
	}

	const mediaPath = `/uploads/${filename}`;
	const media = await getUploadedMedia(mediaPath);
	if (!media) return new Response('Not found', { status: 404 });

	const uploadDirectory = process.env.UPLOAD_DIR ?? '/app/uploads';
	try {
		const bytes = await readFile(nodePath.join(uploadDirectory, filename));
		return new Response(bytes, {
			headers: {
				'Cache-Control': 'public, max-age=31536000, immutable',
				'Content-Length': String(media.byteSize),
				'Content-Type': media.mimeType,
				'X-Content-Type-Options': 'nosniff',
			},
		});
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return new Response('Not found', { status: 404 });
		}
		throw error;
	}
};
