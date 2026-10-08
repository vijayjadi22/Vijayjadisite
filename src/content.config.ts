import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Each case study is one Markdown file in src/content/work/.
// To add a case: copy an existing file, change the frontmatter, save.
const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    domain: z.enum(['Enterprise architecture', 'Digital workplace', 'Identity & access', 'Agentic AI']),
    organisation: z.string(),
    order: z.number(),
    featured: z.boolean().default(false),
    driver: z.string(),
    response: z.string(),
    outcome: z.string(),
  }),
});

export const collections = { work };
