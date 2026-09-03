/**
 * The Video block for the CMS body editor.
 *
 * The markdown editor's media button only offers images, so a video could
 * otherwise be added only by typing HTML by hand. This registers a block with
 * its own fields, and turns those fields into the HTML that ends up in the
 * body — and back again when the entry is reopened.
 *
 * It lives in public/ rather than src/ because the admin page is served
 * verbatim and has no build step: it is loaded straight from index.html. It is
 * a plain module with no imports so it can also be unit tested, which matters
 * more than usual here — a mismatch between what toBlock writes and what
 * pattern matches would leave an existing video unrecognised, showing raw HTML
 * in the editor instead of the block.
 */

/** Escapes a value going into a double-quoted HTML attribute. */
const escapeAttribute = (value) =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

const unescapeAttribute = (value) =>
	String(value ?? '')
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');

/**
 * Matches both the block this writes now and the one it wrote before playback
 * and width existed, so a video already in a body is still recognised.
 *
 * The source is captured separately from the remaining attributes, so a file
 * name containing a word like "loop" cannot be mistaken for the loop flag.
 */
export const pattern = /<video src="([^"]*)"([^>]*)><\/video>/;

/** Reads the block's HTML back into field values. */
export const fromBlock = (match) => {
	const src = match[1] ?? '';
	const attributes = match[2] ?? '';

	// The description is removed before the flags are read: a video described
	// as "the loop closes" must not be mistaken for one set to loop.
	const label = attributes.match(/aria-label="([^"]*)"/)?.[1] ?? '';
	const flags = attributes.replace(/aria-label="[^"]*"/, '');

	return {
		src: decodeURI(src),
		playback: /\bloop\b/.test(flags) ? 'loop' : /\bautoplay\b/.test(flags) ? 'once' : 'viewer',
		width: /\bmedia-hero\b/.test(flags) ? 'hero' : 'text',
		alt: unescapeAttribute(label),
	};
};

/**
 * Writes the field values out as the HTML that goes in the body.
 *
 * Muted rides along with autoplay rather than being offered as a choice: no
 * browser will start a video with sound unprompted, so an unmuted autoplay
 * would simply not start. Controls are always on, so a reader can pause
 * anything that moves.
 */
export const toBlock = ({ src = '', playback = 'viewer', width = 'text', alt = '' } = {}) => {
	if (!src) return '';

	const parts = [`<video src="${escapeAttribute(src)}"`, 'controls', 'playsinline', 'preload="metadata"'];

	if (width === 'hero') parts.push('class="media-hero"');
	if (playback === 'loop') parts.push('autoplay', 'loop', 'muted');
	if (playback === 'once') parts.push('autoplay', 'muted');
	if (alt) parts.push(`aria-label="${escapeAttribute(alt)}"`);

	return `${parts.join(' ')}></video>`;
};

/** The definition handed to CMS.registerEditorComponent. */
export const videoComponent = {
	id: 'video',
	label: 'Video',
	icon: 'movie',
	fields: [
		{
			name: 'src',
			label: 'Video file',
			widget: 'file',
			accept: 'video/mp4',
			// Set here rather than inherited. A collection's media folder is
			// relative, because Astro's image() helper resolves heroImage
			// against the markdown file — but that path is meaningless as a
			// URL, so a video uploaded there is committed and then 404s.
			media_folder: '/public/media',
			public_folder: '/media',
			hint: 'MP4. Served exactly as uploaded, so a few megabytes at most.',
		},
		{
			name: 'playback',
			label: 'Playback',
			widget: 'select',
			default: 'viewer',
			options: [
				{ label: 'Play by viewer — waits to be pressed', value: 'viewer' },
				{ label: 'Play once — starts on its own, then stops', value: 'once' },
				{ label: 'Loop — starts on its own and repeats', value: 'loop' },
			],
			hint: 'Anything that starts on its own plays muted, because no browser will start a video with sound unprompted. Readers can always pause.',
		},
		{
			name: 'width',
			label: 'Width',
			widget: 'select',
			default: 'text',
			options: [
				{ label: 'Text width — sits in the reading column', value: 'text' },
				{ label: 'Hero width — spans the full page', value: 'hero' },
			],
		},
		{
			name: 'alt',
			label: 'Description',
			widget: 'string',
			required: false,
			hint: 'Read aloud by screen readers. Leave it empty if the video is decorative.',
		},
	],
	pattern,
	fromBlock,
	toBlock,
	toPreview: ({ src = '', width = 'text' } = {}) =>
		`<video src="${escapeAttribute(src)}" controls playsinline${
			width === 'hero' ? ' style="width:100%"' : ''
		}></video>`,
};
