/**
 * The page handed to people met at an event — maghami.dev/connect, or whatever
 * address the CMS gives it for that event — which sends them to LinkedIn to
 * connect and to the site to find out more.
 *
 * Duplicated in the CMS repository as src/lib/connect-page.ts, which validates
 * and writes what this reads. The defaults below are the same on both sides so
 * the page reads the same before it is first saved as after. Change both.
 */
export interface ConnectPage {
	/** The single path segment the page answers at. */
	address: string;
	/** "Queen's" in "Nice meeting you at Queen's!". Blank drops the "at …". */
	eventName: string;
	greeting: string;
	tagline: string;
	sharesIntro: string;
	shares: string[];
	linkedinLabel: string;
	/** Blank means the LinkedIn address in the site settings. */
	linkedinUrl: string;
	projectsLabel: string;
	projectsUrl: string;
}

export const CONNECT_DEFAULTS: ConnectPage = {
	address: 'connect',
	eventName: '',
	greeting: 'Nice meeting you',
	tagline: 'Machine Vision • Robotics • AI',
	sharesIntro: 'I occasionally share:',
	shares: [
		'Practical engineering/AI projects',
		'Computer vision & robotics lessons',
		'Career and professional-development insights',
	],
	linkedinLabel: 'Connect with me on LinkedIn',
	linkedinUrl: '',
	projectsLabel: 'Explore my projects',
	projectsUrl: '/projects/',
};

/**
 * The stored page, with defaults for anything never saved. `data` is the JSON
 * column of the `connect` row, or undefined when there is no row yet.
 *
 * The CMS validates on save, so this only guards against shapes it could not
 * have written: a wrong type falls back to the default rather than rendering
 * "undefined" or "[object Object]" on a page a stranger is looking at.
 */
export function mapConnectPage(data: unknown): ConnectPage {
	const stored = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
	const read = (key: Exclude<keyof ConnectPage, 'shares'>) =>
		typeof stored[key] === 'string' ? (stored[key] as string).trim() : CONNECT_DEFAULTS[key];
	return {
		address: read('address').toLowerCase() || CONNECT_DEFAULTS.address,
		eventName: read('eventName'),
		greeting: read('greeting') || CONNECT_DEFAULTS.greeting,
		tagline: read('tagline'),
		sharesIntro: read('sharesIntro'),
		shares: Array.isArray(stored.shares)
			? stored.shares.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
			: CONNECT_DEFAULTS.shares,
		linkedinLabel: read('linkedinLabel') || CONNECT_DEFAULTS.linkedinLabel,
		linkedinUrl: read('linkedinUrl'),
		projectsLabel: read('projectsLabel') || CONNECT_DEFAULTS.projectsLabel,
		projectsUrl: read('projectsUrl') || CONNECT_DEFAULTS.projectsUrl,
	};
}

/** The heading as plain text, for the title and share cards. */
export function connectHeading(page: Pick<ConnectPage, 'greeting' | 'eventName'>): string {
	return page.eventName ? `${page.greeting} at ${page.eventName}!` : `${page.greeting}!`;
}

/**
 * The tagline split into chips when it is a list — "Machine Vision • Robotics
 * • AI" — and left whole when it is a sentence.
 */
export function taglineParts(tagline: string): string[] {
	return tagline
		.split(/\s*[•·|]\s*/)
		.map((part) => part.trim())
		.filter(Boolean);
}

/**
 * Where the LinkedIn button goes: the page's own address, else the one in the
 * settings. Only an https LinkedIn address is used — the CMS enforces that on
 * save, and a button styled as LinkedIn must not lead anywhere else.
 */
export function linkedinHref(page: Pick<ConnectPage, 'linkedinUrl'>, settingsLinkedin?: string): string | undefined {
	for (const candidate of [page.linkedinUrl, settingsLinkedin]) {
		if (candidate && /^https:\/\/([a-z0-9-]+\.)*linkedin\.com\//i.test(candidate.trim())) return candidate.trim();
	}
	return undefined;
}

/** A site path or an https address; anything else (javascript:, //host) is refused. */
export function projectsHref(page: Pick<ConnectPage, 'projectsUrl'>): string {
	const value = page.projectsUrl.trim();
	if (value.startsWith('/') && !value.startsWith('//')) return value;
	if (/^https:\/\/\S+$/.test(value)) return value;
	return CONNECT_DEFAULTS.projectsUrl;
}
