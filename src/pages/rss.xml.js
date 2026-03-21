import rss, { pagesGlobToRssItems } from '@astrojs/rss';

export async function GET(context) {
  return rss({
    title: 'Blog de desarrollo y tecnología | Víctor Santos',
    description: 'Artículos y notas sobre desarrollo web, diseño, herramientas y tecnología.',
    site: context.site,
    items: await pagesGlobToRssItems(import.meta.glob('./**/*.md')),
    customData: `<language>es</language>`,
  });
}
