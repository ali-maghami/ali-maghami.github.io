import { describe, expect, it } from 'vitest';
import { isVideoSrc, parseMediaOptions, rehypeBodyMedia } from './body-media';
import type { HastNode } from './external-links';

describe('isVideoSrc', () => {
	it('recognises the formats a browser can play', () => {
		expect(isVideoSrc('/media/clip.mp4')).toBe(true);
		expect(isVideoSrc('/media/clip.webm')).toBe(true);
		expect(isVideoSrc('/media/clip.mov')).toBe(true);
	});

	it('leaves images alone', () => {
		expect(isVideoSrc('/media/diagram.png')).toBe(false);
		expect(isVideoSrc('/media/animation.gif')).toBe(false);
	});

	// A phone camera commonly writes .MOV, and an upload keeps the case.
	it('ignores case', () => {
		expect(isVideoSrc('/media/Clip.MOV')).toBe(true);
	});

	it('ignores a query string or fragment', () => {
		expect(isVideoSrc('/media/clip.mp4?v=2')).toBe(true);
		expect(isVideoSrc('/media/clip.mp4#t=10')).toBe(true);
	});

	it('is not fooled by an extension in the middle of a name', () => {
		expect(isVideoSrc('/media/mp4-explainer.png')).toBe(false);
	});

	it('returns false for an empty source', () => {
		expect(isVideoSrc('')).toBe(false);
	});
});

describe('parseMediaOptions', () => {
	it('defaults to text width, played by the viewer, with no label', () => {
		expect(parseMediaOptions('')).toEqual({ playback: 'viewer', width: 'text', label: '' });
	});

	it('reads a single keyword', () => {
		expect(parseMediaOptions('loop')).toMatchObject({ playback: 'loop', width: 'text' });
		expect(parseMediaOptions('hero')).toMatchObject({ playback: 'viewer', width: 'hero' });
	});

	it('reads playback and width together, in either order', () => {
		expect(parseMediaOptions('loop hero')).toMatchObject({ playback: 'loop', width: 'hero' });
		expect(parseMediaOptions('hero loop')).toMatchObject({ playback: 'loop', width: 'hero' });
	});

	it('accepts commas between keywords', () => {
		expect(parseMediaOptions('once, hero')).toMatchObject({ playback: 'once', width: 'hero' });
	});

	it('ignores case, since the CMS box does not enforce any', () => {
		expect(parseMediaOptions('Loop Hero')).toMatchObject({ playback: 'loop', width: 'hero' });
	});

	it('keeps what follows a colon as the description', () => {
		expect(parseMediaOptions('loop hero: The coating rig')).toEqual({
			playback: 'loop',
			width: 'hero',
			label: 'The coating rig',
		});
	});

	// The trap this guards: alt text that happens to open with a keyword.
	it('treats ordinary alt text starting with a keyword as a description', () => {
		expect(parseMediaOptions('hero shot of the rig')).toEqual({
			playback: 'viewer',
			width: 'text',
			label: 'hero shot of the rig',
		});
	});

	it('takes plain alt text as the description', () => {
		expect(parseMediaOptions('A robot arm at work')).toEqual({
			playback: 'viewer',
			width: 'text',
			label: 'A robot arm at work',
		});
	});

	it('allows a description that is only a colon away from keywords', () => {
		expect(parseMediaOptions('hero: hero')).toEqual({
			playback: 'viewer',
			width: 'hero',
			label: 'hero',
		});
	});
});

const image = (src: string, alt = ''): HastNode => ({
	type: 'root',
	children: [
		{
			type: 'element',
			tagName: 'p',
			children: [{ type: 'element', tagName: 'img', properties: { src, alt }, children: [] }],
		},
	],
});

const media = (tree: HastNode) => tree.children![0].children![0];

describe('rehypeBodyMedia', () => {
	it('turns an image pointing at a video into a playable video', () => {
		const tree = image('/media/clip.mp4');
		rehypeBodyMedia()(tree);

		expect(media(tree).tagName).toBe('video');
		expect(media(tree).properties).toMatchObject({
			src: '/media/clip.mp4',
			controls: true,
			playsInline: true,
			preload: 'metadata',
		});
	});

	it('waits to be pressed by default', () => {
		const tree = image('/media/clip.mp4');
		rehypeBodyMedia()(tree);

		expect(media(tree).properties).not.toHaveProperty('autoplay');
		expect(media(tree).properties).not.toHaveProperty('loop');
	});

	// Muted is not a preference: a browser will not start an unmuted video.
	it('loops muted when asked to loop', () => {
		const tree = image('/media/clip.mp4', 'loop');
		rehypeBodyMedia()(tree);

		expect(media(tree).properties).toMatchObject({ autoplay: true, loop: true, muted: true });
	});

	it('starts once without looping when asked to play once', () => {
		const tree = image('/media/clip.mp4', 'once');
		rehypeBodyMedia()(tree);

		expect(media(tree).properties).toMatchObject({ autoplay: true, muted: true });
		expect(media(tree).properties).not.toHaveProperty('loop');
	});

	it('keeps controls whatever the playback, so a clip can always be paused', () => {
		for (const mode of ['loop', 'once', 'viewer']) {
			const tree = image('/media/clip.mp4', mode);
			rehypeBodyMedia()(tree);
			expect(media(tree).properties!.controls, mode).toBe(true);
		}
	});

	it('widens a video to hero width on request', () => {
		const tree = image('/media/clip.mp4', 'hero');
		rehypeBodyMedia()(tree);

		expect(media(tree).properties!.className).toEqual(['media-hero']);
	});

	it('widens an image too, leaving it an image', () => {
		const tree = image('/media/diagram.png', 'hero: A calibration diagram');
		rehypeBodyMedia()(tree);

		expect(media(tree).tagName).toBe('img');
		expect(media(tree).properties).toMatchObject({
			className: ['media-hero'],
			alt: 'A calibration diagram',
		});
	});

	it('gives text-width media no class attribute at all', () => {
		const tree = image('/media/diagram.png', 'A diagram');
		rehypeBodyMedia()(tree);

		expect(media(tree).properties).not.toHaveProperty('className');
	});

	// <video> has no alt attribute, so the description has to move somewhere
	// a screen reader still reads it.
	it('carries the description over as an accessible name', () => {
		const tree = image('/media/clip.mp4', 'loop: Coating inspection');
		rehypeBodyMedia()(tree);

		expect(media(tree).properties!['aria-label']).toBe('Coating inspection');
	});

	it('adds no empty label when the alt was only keywords', () => {
		const tree = image('/media/clip.mp4', 'loop');
		rehypeBodyMedia()(tree);

		expect(media(tree).properties).not.toHaveProperty('aria-label');
	});

	it('strips the keywords from an image alt rather than reading them aloud', () => {
		const tree = image('/media/diagram.png', 'hero');
		rehypeBodyMedia()(tree);

		expect(media(tree).properties!.alt).toBe('');
	});

	it('does not disturb a video element the author wrote by hand', () => {
		const tree: HastNode = {
			type: 'root',
			children: [
				{
					type: 'element',
					tagName: 'video',
					properties: { src: '/media/clip.mp4', controls: true },
					children: [],
				},
			],
		};
		const before = JSON.stringify(tree);
		rehypeBodyMedia()(tree);

		expect(JSON.stringify(tree)).toBe(before);
	});
});
