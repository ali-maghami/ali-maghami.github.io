import type { PostRecord } from './portfolio-data';

/**
 * What goes in the feed, and in what order.
 *
 * The serialisation is @astrojs/rss's job — it handles escaping and the RSS
 * envelope. The decisions are here, where they can be tested: which posts
 * appear, what each item says, and the order a reader sees them in.
 */
export interface FeedItem {
	title: string;
	description: string;
	/** Root-relative; the feed resolves it against the configured site. */
	link: string;
	pubDate: Date;
	categories?: string[];
}

/**
 * Newest first, which is the order every reader displays and the order a
 * partial fetch truncates from. `listPosts` already returns published posts
 * only, so a draft cannot reach the feed — but the sort is applied here rather
 * than assumed, because a feed silently in the wrong order is hard to notice.
 */
export function feedItems(posts: PostRecord[]): FeedItem[] {
	return [...posts]
		.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
		.map((post) => ({
			title: post.title,
			description: post.description,
			link: `/blog/${post.id}/`,
			pubDate: post.pubDate,
			...(post.tags.length ? { categories: post.tags } : {}),
		}));
}
