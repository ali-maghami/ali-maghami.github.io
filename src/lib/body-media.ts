/**
 * Handles images and videos placed in a post or project body.
 *
 * Markdown has one syntax for media — ![alt](src) — and the CMS insert button
 * writes it for every file. That leaves no room for the two things a body
 * embed needs to say: how a video should play, and how wide it should sit.
 *
 * Both are read from the alt text, because it is the only per-embed slot the
 * markdown editor offers. A leading run of known keywords is taken as options
 * and the rest as the description, so `![loop hero: The coating rig](clip.mp4)`
 * loops, spans the full width, and is still described to a screen reader.
 */
import type { HastNode } from './external-links';
import { isResizable, resizedImage } from './images';
import { dimensionsFor } from './media-dimensions';

/** Extensions a browser can play in a <video> element. */
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov'];

/** How a video starts. */
export type Playback = 'loop' | 'once' | 'viewer';

/** How wide an embed sits: with the text, or out to the full page width. */
export type Width = 'text' | 'hero';

export interface MediaOptions {
	playback: Playback;
	width: Width;
	/** The alt text with any option keywords removed. */
	label: string;
}

const PLAYBACK: Playback[] = ['loop', 'once', 'viewer'];
const WIDTH: Width[] = ['text', 'hero'];

const isPlayback = (word: string): word is Playback => (PLAYBACK as string[]).includes(word);
const isWidth = (word: string): word is Width => (WIDTH as string[]).includes(word);

/**
 * Whether a media source points at a video file.
 *
 * The query and fragment are stripped first so a cache-busted upload is still
 * recognised, and the test is case-insensitive because a phone camera commonly
 * produces .MOV.
 */
export function isVideoSrc(src: string): boolean {
	if (!src) return false;

	const withoutQuery = src.split(/[?#]/)[0].toLowerCase();
	return VIDEO_EXTENSIONS.some((ext) => withoutQuery.endsWith(ext));
}

/**
 * Reads playback and width keywords out of alt text.
 *
 * A colon separates options from a description explicitly. Without one, the
 * alt is only treated as options when every word is a keyword — so ordinary
 * alt text that happens to begin with one, like "hero shot of the rig", stays
 * a description rather than being silently eaten.
 */
export function parseMediaOptions(alt: string): MediaOptions {
	const defaults: MediaOptions = { playback: 'viewer', width: 'text', label: '' };
	const trimmed = (alt ?? '').trim();
	if (!trimmed) return defaults;

	const colon = trimmed.indexOf(':');
	const [candidate, rest] =
		colon === -1 ? [trimmed, null] : [trimmed.slice(0, colon), trimmed.slice(colon + 1).trim()];

	const words = candidate.split(/[\s,]+/).filter(Boolean);
	const known = words.every((word) => isPlayback(word.toLowerCase()) || isWidth(word.toLowerCase()));

	// Without a colon the keywords have to account for the whole alt text,
	// otherwise it is a description that merely starts with one.
	if (!known || words.length === 0) {
		return { ...defaults, label: trimmed };
	}

	const options = { ...defaults, label: rest ?? '' };
	for (const word of words) {
		const lower = word.toLowerCase();
		if (isPlayback(lower)) options.playback = lower;
		if (isWidth(lower)) options.width = lower;
	}
	return options;
}

/**
 * A committed image is served through the resize endpoint at two widths, so
 * a phone downloads a phone-sized file. `sizes` says how wide the image will
 * be laid out: the prose column, or the page wrap for a hero-width embed,
 * less the wrap's own padding on a narrow window. Uploads and files the site
 * cannot resize keep their original source.
 */
function responsiveSource(src: string, width: Width) {
	if (!isResizable(src)) return {};

	const small = resizedImage(src, 640);
	const large = resizedImage(src, 1280);
	return {
		src: large,
		srcSet: `${small} 640w, ${large} 1280w`,
		sizes:
			width === 'hero'
				? '(max-width: 1200px) calc(100vw - 2.5rem), 1160px'
				: '(max-width: 760px) calc(100vw - 2.5rem), 720px',
	};
}

/** The attributes that make a video start the way the author asked. */
function playbackAttributes(playback: Playback) {
	switch (playback) {
		// Muted is not a preference: a browser will not start an unmuted video
		// unprompted, so autoplay without it silently does nothing.
		case 'loop':
			return { autoplay: true, loop: true, muted: true };
		case 'once':
			return { autoplay: true, muted: true };
		// The reader starts it, so it stays silent and unbuffered until asked.
		case 'viewer':
			return {};
	}
}

/**
 * A rehype plugin that applies those options to body media.
 *
 * An image whose source is a video file becomes a real video element —
 * markdown cannot express one, so without this the insert button produces an
 * <img> the browser cannot decode. Controls are always on: a clip the reader
 * cannot pause is a nuisance, and the reduced-motion script already relies on
 * being able to turn autoplay off and controls on.
 *
 * The alt text becomes aria-label on a video, which has no alt attribute.
 */
export function rehypeBodyMedia() {
	return (tree: HastNode) => {
		const walk = (node: HastNode) => {
			node.children?.forEach(walk);

			if (node.type !== 'element' || node.tagName !== 'img') return;

			const src = String(node.properties?.src ?? '');
			const { playback, width, label } = parseMediaOptions(String(node.properties?.alt ?? ''));
			// Omitted rather than empty, so text-width media carries no class="".
			const widthClass = width === 'hero' ? { className: ['media-hero'] } : {};

			// Intrinsic size lets the browser reserve the space, so a body image
			// no longer shoves the text down as it arrives. Lazily loaded because
			// body media is below the fold by definition.
			const size = dimensionsFor(src);
			const measured = size ? { width: size.width, height: size.height } : {};

			if (!isVideoSrc(src)) {
				node.properties = {
					...node.properties,
					alt: label,
					...measured,
					...responsiveSource(src, width),
					loading: 'lazy',
					decoding: 'async',
					...widthClass,
				};
				return;
			}

			node.tagName = 'video';
			node.properties = {
				src,
				controls: true,
				playsInline: true,
				preload: 'metadata',
				...measured,
				...widthClass,
				...playbackAttributes(playback),
				...(label ? { 'aria-label': label } : {}),
			};
			node.children = [];
		};

		walk(tree);
	};
}
