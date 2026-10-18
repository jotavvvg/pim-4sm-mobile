import { z } from 'zod';

const usernameSchema = z.string().min(3).max(100);
const passwordSchema = z.string().min(8).max(128);

export const createCredentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const updateCredentialsSchema = z.object({
  username: z.union([z.literal(''), usernameSchema]).optional(),
  password: z.union([z.literal(''), passwordSchema]).optional(),
});

export function credentialsAreValid(username: string, password: string, creating: boolean) {
  const schema = creating ? createCredentialsSchema : updateCredentialsSchema;
  return schema.safeParse({ username: username.trim(), password }).success;
}