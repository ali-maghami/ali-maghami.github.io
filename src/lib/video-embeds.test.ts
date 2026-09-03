import { describe, expect, it } from 'vitest';
import { isVideoSrc, rehypeVideoEmbeds } from './video-embeds';
import type { HastNode } from './external-links';

describe('isVideoSrc', () => {
	it('recognises the formats a browser can play', () => {
		expect(isVideoSrc('/media/clip.mp4')).toBe(true);
		expect(isVideoSrc('/media/clip.webm')).toBe(true);
		expect(isVideoSrc('/media/clip.mov')).toBe(true);
	});

	it('leaves images alone', () => {
		expect(isVideoSrc('/media/diagram.png')).toBe(false);
		expect(isVideoSrc('/media/photo.jpg')).toBe(false);
		expect(isVideoSrc('/media/animation.gif')).toBe(false);
	});

	// A phone camera commonly writes .MOV, and an upload keeps the case.
	it('ignores case', () => {
		expect(isVideoSrc('/media/CLIP.MP4')).toBe(true);
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

const firstChild = (tree: HastNode) => tree.children![0].children![0];

describe('rehypeVideoEmbeds', () => {
	it('turns an image pointing at a video into a playable video', () => {
		const tree = image('/media/clip.mp4');
		rehypeVideoEmbeds()(tree);

		const el = firstChild(tree);
		expect(el.tagName).toBe('video');
		expect(el.properties).toMatchObject({
			src: '/media/clip.mp4',
			controls: true,
			playsInline: true,
			preload: 'metadata',
		});
	});

	// <video> has no alt attribute, so the description has to move somewhere
	// a screen reader still reads.
	it('carries the alt text over as an accessible name', () => {
		const tree = image('/media/clip.mp4', 'Coating inspection in progress');
		rehypeVideoEmbeds()(tree);

		expect(firstChild(tree).properties!['aria-label']).toBe('Coating inspection in progress');
	});

	it('adds no empty label when there is no alt text', () => {
		const tree = image('/media/clip.mp4');
		rehypeVideoEmbeds()(tree);

		expect(firstChild(tree).properties).not.toHaveProperty('aria-label');
	});

	it('leaves a real image untouched', () => {
		const tree = image('/media/diagram.png', 'A diagram');
		const before = JSON.stringify(tree);
		rehypeVideoEmbeds()(tree);

		expect(JSON.stringify(tree)).toBe(before);
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
		rehypeVideoEmbeds()(tree);

		expect(JSON.stringify(tree)).toBe(before);
	});
});
