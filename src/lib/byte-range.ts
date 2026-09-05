/**
 * Reads an HTTP Range header against a file of known size.
 *
 * A browser scrubbing a video, or resuming a paused PDF download, asks for a
 * slice of the file with `Range: bytes=start-end`. Answering with the whole
 * file instead is not wrong, exactly — the client will cope — but it means a
 * seek to the end of a 40 MB clip downloads all 40 MB first, and the player
 * shows no duration until it has. Serving the slice is what makes seeking
 * instant.
 *
 * Only a single range is honoured. Multiple ranges are permitted by the
 * specification but no browser media element sends them, and a server may
 * ignore them and send the whole resource, which is what happens here.
 */
export type ByteRange =
	| { kind: 'full' }
	| { kind: 'partial'; start: number; end: number }
	| { kind: 'unsatisfiable' };

const SINGLE_RANGE = /^bytes=(\d*)-(\d*)$/;

export function parseRange(header: string | null | undefined, size: number): ByteRange {
	if (!header) return { kind: 'full' };

	const match = SINGLE_RANGE.exec(header.trim());
	if (!match) return { kind: 'full' };

	const [, first, last] = match;
	if (first === '' && last === '') return { kind: 'full' };

	// `bytes=-500` is the final 500 bytes, however long the file is.
	if (first === '') {
		const suffix = Number(last);
		if (suffix === 0 || size === 0) return { kind: 'unsatisfiable' };
		return { kind: 'partial', start: Math.max(size - suffix, 0), end: size - 1 };
	}

	const start = Number(first);
	if (start >= size) return { kind: 'unsatisfiable' };

	// An open end, or one past the file, both mean "to the end".
	const end = last === '' ? size - 1 : Math.min(Number(last), size - 1);
	if (end < start) return { kind: 'unsatisfiable' };

	return { kind: 'partial', start, end };
}

/** The value of a Content-Range header for a slice, or for a refused request. */
export function contentRange(range: ByteRange, size: number): string {
	return range.kind === 'partial' ? `bytes ${range.start}-${range.end}/${size}` : `bytes */${size}`;
}
