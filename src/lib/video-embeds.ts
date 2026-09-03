/**
 * Turns a markdown image that points at a video into a real video element.
 *
 * The CMS has one way to put media in a body: the insert button, which writes
 * ![alt](/media/clip.mp4) whatever the file is. Markdown has no video syntax,
 * so that renders an <img> the browser cannot decode — a broken icon where a
 * clip should be. Writing raw <video> HTML by hand works but means knowing to
 * do it, and getting the path right unaided.
 *
 * Deciding from the file extension keeps the editor to one action for all
 * media, the same reasoning as the external-link marker: the file type is a
 * fact about the file, not a choice to be remembered.
 */
import type { HastNode } from './external-links';

/** Extensions a browser can play in a <video> element. */
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov'];

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
 * A rehype plugin that replaces such images with a playable video.
 *
 * `controls` because a clip in a body is something the reader chooses to
 * watch, unlike the hero video which loops silently as decoration.
 * `preload="metadata"` fetches only enough for the poster frame and duration,
 * so a page with a clip on it does not pull megabytes nobody asked for.
 * The alt text becomes aria-label, since <video> has no alt attribute.
 */
export function rehypeVideoEmbeds() {
	return (tree: HastNode) => {
		const walk = (node: HastNode) => {
			node.children?.forEach(walk);

			if (node.type !== 'element' || node.tagName !== 'img') return;

			const src = String(node.properties?.src ?? '');
			if (!isVideoSrc(src)) return;

			const alt = String(node.properties?.alt ?? '');
			node.tagName = 'video';
			node.properties = {
				src,
				controls: true,
				playsInline: true,
				preload: 'metadata',
				...(alt ? { 'aria-label': alt } : {}),
			};
			node.children = [];
		};

		walk(tree);
	};
}
