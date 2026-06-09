import { getCollection } from "astro:content";

/**
 * Devuelve las entradas del blog normalizadas a la forma `{ url, frontmatter }`
 * que esperan los componentes (BlogPost, LastPost, ListPosts, etc.).
 * Si no hay entradas, devuelve un arreglo vacío sin romper el build.
 */
export async function getBlogPosts() {
  const entries = await getCollection("blog");
  return entries.map((entry) => ({
    id: entry.id,
    url: `/blog/posts/${entry.id}`,
    frontmatter: entry.data,
  }));
}
