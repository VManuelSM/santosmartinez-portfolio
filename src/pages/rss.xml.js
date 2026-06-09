import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: 'Blog | Santos Martínez',
    description: 'Notas sobre inteligencia artificial, gobierno digital y desarrollo.',
    site: context.site,
    items: posts
      .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
      .map((post) => ({
        title: post.data.title,
        description: post.data.description ?? '',
        pubDate: post.data.pubDate,
        link: `/blog/posts/${post.id}/`,
      })),
    customData: `<language>es</language>`,
  });
}
