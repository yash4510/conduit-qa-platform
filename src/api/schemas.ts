import { z } from 'zod';

// Shapes follow the RealWorld API spec. z.object() allows extra keys, so the
// non-spec `id` this backend adds to user and article responses does not fail validation.

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

export const articleSchema = z.object({
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

export const articlesResponseSchema = z.object({
  articles: z.array(articleSchema),
  articlesCount: z.number(),
});

const commentSchema = z.object({
  id: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  body: z.string(),
  author: profileSchema,
});

export const commentResponseSchema = z.object({ comment: commentSchema });
export const commentsResponseSchema = z.object({ comments: z.array(commentSchema) });

export const tagsResponseSchema = z.object({ tags: z.array(z.string()) });

// The backend uses three different error bodies. Keeping one schema per shape lets
// negative tests assert which shape a given failure really returns.
export const validationErrorSchema = z.object({ errors: z.record(z.string(), z.array(z.string())) });
export const authErrorSchema = z.object({ status: z.literal('error'), message: z.string() });
export const messageErrorSchema = z.object({ message: z.string() });

export type User = z.infer<typeof userSchema>['user'];
export type Profile = z.infer<typeof profileSchema>;
export type Article = z.infer<typeof articleSchema>;
export type Comment = z.infer<typeof commentSchema>;
