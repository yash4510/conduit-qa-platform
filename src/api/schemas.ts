import { z } from 'zod';

// Shapes follow the RealWorld API spec. z.object() allows extra keys, so the
// non-spec `id` this backend adds to the user response does not fail validation.

export const userSchema = z.object({
  user: z.object({
    email: z.string(),
    username: z.string(),
    bio: z.string().nullable(),
    image: z.string().nullable(),
    token: z.string(),
  }),
});

const profileSchema = z.object({
  username: z.string(),
  bio: z.string().nullable(),
  image: z.string().nullable(),
  following: z.boolean(),
});

export const profileResponseSchema = z.object({ profile: profileSchema });

const articleSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  body: z.string(),
  tagList: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  favorited: z.boolean(),
  favoritesCount: z.number(),
  author: profileSchema,
});

export const articleResponseSchema = z.object({ article: articleSchema });

export const commentResponseSchema = z.object({
  comment: z.object({
    id: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
    body: z.string(),
    author: profileSchema,
  }),
});

export type User = z.infer<typeof userSchema>['user'];
export type Article = z.infer<typeof articleSchema>;
export type Comment = z.infer<typeof commentResponseSchema>['comment'];
