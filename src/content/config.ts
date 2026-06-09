// src/content/config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const jsonDataCollection = defineCollection({
  type: 'data',
  schema: z.object({
    //Define JSON-file structure
    profileImage: z.string(),
    profileAlt: z.string(),
    profileLink: z.string(),
    profileTitle: z.string(),
    profileName: z.string(),
    github: z.string().url(),
    githubText: z.string(),
    portfolioImage: z.string(),
    email: z.string().email(),
    linkedin: z.string().url(),
    // instagram: z.string().url(),
    // youtube: z.string().url(),
    alias: z.string(),
    contactSectionTitle: z.string(),
    contactSectionSubtitle: z.string(),
    contactSectionButtonText: z.string(),
    contactSectionButtonIcon: z.string(),
    techsTitle: z.string(),
    instagramIconName: z.string(),
    youtubeIconName: z.string(),
    githubIconName: z.string(),
    linkedinIconName: z.string(),
    emailIconName: z.string(),
    hobbies: z.array(z.string()),
    pageTitle: z.string(),
    pageDescription: z.string(),
    OGImage: z.object({
      url: z.string(),
      alt: z.string(),
    }),
  }),
});

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    author: z.string().default('Santos Martínez'),
    description: z.string().optional(),
    image: z
      .object({
        url: z.string(),
        alt: z.string().optional(),
      })
      .optional(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
  }),
});

export const collections = {
  staticData: jsonDataCollection,
  blog: blogCollection,
};
