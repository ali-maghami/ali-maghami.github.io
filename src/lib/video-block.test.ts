import { describe, expect, it } from 'vitest';
// The CMS block lives in public/ because the admin page is served verbatim and
// has no build step. Tested from here so a change to it cannot silently break
// the round trip between the editor's fields and the HTML in a body.
import { fromBlock, pattern, toBlock, videoComponent } from '../../public/admin/video-block.js';

interface Fields {
	src: string;
	playback: string;
	width: string;
	alt: string;
}

/** What the CMS does: write a block, then read it back when reopened. */
const roundTrip = (fields: Partial<Fields>): Fields => {
	const html = toBlock(fields);
	const match = html.match(pattern);
	expect(match, `pattern did not match its own output: ${html}`).not.toBeNull();
	return fromBlock(match);
};

describe('toBlock', () => {
	it('writes nothing without a source, so an empty block adds no markup', () => {
		expect(toBlock({})).toBe('');
	});

	it('always gives the reader controls', () => {
		for (const playback of ['viewer', 'once', 'loop']) {
			expect(toBlock({ src: '/media/clip.mp4', playback })).toContain('controls');
		}
	});

	it('waits to be pressed by default', () => {
		const html = toBlock({ src: '/media/clip.mp4' });
		expect(html).not.toContain('autoplay');
		expect(html).not.toContain('loop');
	});

	// Muted is not a preference: a browser will not start an unmuted video.
	it('loops muted', () => {
		const html = toBlock({ src: '/media/clip.mp4', playback: 'loop' });
		expect(html).toContain('autoplay');
		expect(html).toContain('loop');
		expect(html).toContain('muted');
	});

	it('plays once without looping', () => {
		const html = toBlock({ src: '/media/clip.mp4', playback: 'once' });
		expect(html).toContain('autoplay');
		expect(html).toContain('muted');
		expect(html).not.toContain('loop');
	});

	it('carries hero width as the class the stylesheet expects', () => {
		expect(toBlock({ src: '/media/clip.mp4', width: 'hero' })).toContain('class="media-hero"');
		expect(toBlock({ src: '/media/clip.mp4', width: 'text' })).not.toContain('class=');
	});

	it('escapes a description that would otherwise break the tag', () => {
		const html = toBlock({ src: '/media/clip.mp4', alt: 'A "wide" shot & more' });
		expect(html).toContain('aria-label="A &quot;wide&quot; shot &amp; more"');
		// One closing bracket, at the end: the attribute did not terminate early.
		expect(html.indexOf('>')).toBe(html.length - '></video>'.length + 0);
	});

	it('omits the label entirely when there is no description', () => {
		expect(toBlock({ src: '/media/clip.mp4' })).not.toContain('aria-label');
	});
});

describe('pattern and fromBlock', () => {
	// The reason this file exists: a block written before playback and width
	// were added must still open as a Video block rather than raw HTML.
	it('still recognises the block written before the options existed', () => {
		const old = '<video src="/media/clip.mp4" controls playsinline></video>';
		const match = old.match(pattern);

		expect(match).not.toBeNull();
		expect(fromBlock(match)).toEqual({
			src: '/media/clip.mp4',
			playback: 'viewer',
			width: 'text',
			alt: '',
		});
	});

	it('does not read a flag out of the file name', () => {
		const html = '<video src="/media/loop-autoplay-hero.mp4" controls playsinline></video>';
		expect(fromBlock(html.match(pattern))).toMatchObject({ playback: 'viewer', width: 'text' });
	});

	// A description is free text and can contain the option words.
	it('does not read a flag out of the description', () => {
		const html = toBlock({ src: '/media/clip.mp4', alt: 'how the loop closes, on autoplay' });
		expect(fromBlock(html.match(pattern))).toMatchObject({ playback: 'viewer', width: 'text' });
	});

	it('reads an escaped description back as it was typed', () => {
		expect(roundTrip({ src: '/media/clip.mp4', alt: 'A "wide" shot & more' }).alt).toBe(
			'A "wide" shot & more',
		);
	});
});

describe('the round trip', () => {
	it('survives every combination of playback and width', () => {
		for (const playback of ['viewer', 'once', 'loop']) {
			for (const width of ['text', 'hero']) {
				const fields = { src: '/media/clip.mp4', playback, width, alt: 'A clip' };
				expect(roundTrip(fields), `${playback} / ${width}`).toEqual(fields);
			}
		}
	});
});

/** A field by name, throwing rather than yielding undefined. */
const field = (name: string) => {
	const found = videoComponent.fields.find((f) => f.name === name);
	if (!found) throw new Error(`the component has no ${name} field`);
	return found;
};

/** The values a select field offers, in the order the editor shows them. */
const optionValues = (name: string) => {
	const { options } = field(name);
	if (!options) throw new Error(`the ${name} field offers no options`);
	return options.map((o) => o.value);
};

describe('the component definition', () => {
	// Sveltia throws on registration if any of these are the wrong shape, and
	// the failure surfaces as a missing button rather than an error.
	it('is shaped the way registerEditorComponent demands', () => {
		expect(typeof videoComponent.id).toBe('string');
		expect(typeof videoComponent.label).toBe('string');
		expect(videoComponent.pattern).toBeInstanceOf(RegExp);
		expect(typeof videoComponent.toBlock).toBe('function');
		expect(typeof videoComponent.toPreview).toBe('function');
		expect(Array.isArray(videoComponent.fields)).toBe(true);
	});

	it('offers the playback and width choices, and a description', () => {
		const names = videoComponent.fields.map((f) => f.name);
		expect(names).toEqual(['src', 'playback', 'width', 'alt']);
	});

	// The bug this guards: an editor component's file field does not inherit
	// the body field's media folder, so an upload lands somewhere unservable.
	it('uploads into a folder the site actually serves', () => {
		expect(field('src').media_folder).toBe('/public/media');
		expect(field('src').public_folder).toBe('/media');
	});

	it('offers exactly the playback modes the site renders', () => {
		expect(optionValues('playback')).toEqual(['viewer', 'once', 'loop']);
		expect(field('playback').default).toBe('viewer');
	});

	it('offers both widths the stylesheet supports', () => {
		expect(optionValues('width')).toEqual(['text', 'hero']);
		expect(field('width').default).toBe('text');
	});
});
