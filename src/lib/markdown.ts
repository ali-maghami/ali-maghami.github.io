import { createMarkdownProcessor } from '@astrojs/markdown-remark';

import { rehypeBodyMedia } from './body-media';
import { rehypeExternalLinks } from './external-links';
import { rehypeNotes } from './notes';
import { primeDimensions, publicImagePathsIn, uploadPathsIn } from './media-dimensions';

const processor = createMarkdownProcessor({
	rehypePlugins: [rehypeExternalLinks, rehypeBodyMedia, rehypeNotes],
});

export async function renderPortfolioMarkdown(markdown: string): Promise<string> {
	// Loaded before rendering because the rehype plugins run synchronously and
	// have nowhere to await a query. See media-dimensions.
	await primeDimensions([...uploadPathsIn(markdown), ...publicImagePathsIn(markdown)]);

	return (await (await processor).render(markdown)).code;
}
