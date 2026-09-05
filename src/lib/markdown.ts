import { createMarkdownProcessor } from '@astrojs/markdown-remark';

import { rehypeBodyMedia } from './body-media';
import { rehypeExternalLinks } from './external-links';

const processor = createMarkdownProcessor({
	rehypePlugins: [rehypeExternalLinks, rehypeBodyMedia],
});

export async function renderPortfolioMarkdown(markdown: string): Promise<string> {
	return (await (await processor).render(markdown)).code;
}
