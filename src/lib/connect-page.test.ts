import { describe, expect, it } from 'vitest';

import {
	CONNECT_DEFAULTS,
	connectHeading,
	linkedinHref,
	mapConnectPage,
	projectsHref,
	taglineParts,
} from './connect-page';

describe('mapConnectPage', () => {
	it('is the defaults before the CMS has saved the page', () => {
		expect(mapConnectPage(undefined)).toEqual(CONNECT_DEFAULTS);
		expect(mapConnectPage({})).toEqual(CONNECT_DEFAULTS);
		expect(mapConnectPage('nonsense')).toEqual(CONNECT_DEFAULTS);
	});

	it('keeps what was saved, including an emptied list and tagline', () => {
		const page = mapConnectPage({ address: 'Queens', eventName: " Queen's ", shares: [], tagline: '' });
		expect(page.address).toBe('queens');
		expect(page.eventName).toBe("Queen's");
		expect(page.shares).toEqual([]);
		expect(page.tagline).toBe('');
	});

	it('falls back rather than rendering the wrong type', () => {
		const page = mapConnectPage({ greeting: 7, shares: ['One', 3, ' ', null], linkedinLabel: '' });
		expect(page.greeting).toBe(CONNECT_DEFAULTS.greeting);
		expect(page.shares).toEqual(['One']);
		expect(page.linkedinLabel).toBe(CONNECT_DEFAULTS.linkedinLabel);
	});
});

describe('connectHeading', () => {
	it('names the event when there is one', () => {
		expect(connectHeading({ greeting: 'Nice meeting you', eventName: "Queen's" })).toBe("Nice meeting you at Queen's!");
		expect(connectHeading({ greeting: 'Nice meeting you', eventName: '' })).toBe('Nice meeting you!');
	});
});

describe('taglineParts', () => {
	it('splits a list into chips and leaves a sentence whole', () => {
		expect(taglineParts('Machine Vision • Robotics • AI')).toEqual(['Machine Vision', 'Robotics', 'AI']);
		expect(taglineParts('Building AI for the physical world')).toEqual(['Building AI for the physical world']);
		expect(taglineParts('')).toEqual([]);
	});
});

describe('linkedinHref', () => {
	it('prefers the page, then the settings', () => {
		expect(linkedinHref({ linkedinUrl: 'https://www.linkedin.com/in/page/' }, 'https://linkedin.com/in/settings')).toBe(
			'https://www.linkedin.com/in/page/',
		);
		expect(linkedinHref({ linkedinUrl: '' }, 'https://linkedin.com/in/settings')).toBe('https://linkedin.com/in/settings');
	});

	it('never sends the LinkedIn button anywhere but LinkedIn', () => {
		expect(linkedinHref({ linkedinUrl: 'https://evil.example/linkedin.com/' })).toBeUndefined();
		expect(linkedinHref({ linkedinUrl: 'javascript:alert(1)' }, 'http://linkedin.com/in/x')).toBeUndefined();
	});
});

describe('projectsHref', () => {
	it('accepts a site path or an https address', () => {
		expect(projectsHref({ projectsUrl: '/projects/' })).toBe('/projects/');
		expect(projectsHref({ projectsUrl: 'https://github.com/x' })).toBe('https://github.com/x');
	});

	it('refuses anything else', () => {
		expect(projectsHref({ projectsUrl: 'javascript:alert(1)' })).toBe('/projects/');
		expect(projectsHref({ projectsUrl: '//evil.example' })).toBe('/projects/');
	});
});
