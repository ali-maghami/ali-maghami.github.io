import { createMarkdownProcessor } from '@astrojs/markdown-remark';

import { rehypeBodyMedia } from './body-media';
import { rehypeExternalLinks } from './external-links';
import { primeDimensions, uploadPathsIn } from './media-dimensions';

const processor = createMarkdownProcessor({
	rehypePlugins: [rehypeExternalLinks, rehypeBodyMedia],
});

export async function renderPortfolioMarkdown(markdown: string): Promise<string> {
	// Loaded before rendering because the rehype plugins run synchronously and
	// have nowhere to await a query. See media-dimensions.
	await primeDimensions(uploadPathsIn(markdown));

	return (await (await processor).render(markdown)).code;
}
