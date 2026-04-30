import { z } from 'zod';
import { addressSchema, objectIdSchema, paginationQuerySchema, booleanFromString } from './common.js';

export const createProjectSchema = z.object({
  name: z.string({ required_error: 'El nombre es obligatorio' }).trim().min(1),
  projectCode: z.string({ required_error: 'El código del proyecto es obligatorio' }).trim().min(1),
  client: objectIdSchema,
  email: z.string().email('Email no válido').transform((v) => v.toLowerCase().trim()).optional(),
  notes: z.string().trim().optional(),
  address: addressSchema.optional(),
  active: z.boolean().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  name: z.string().trim().optional(),
  client: objectIdSchema.optional(),
  active: booleanFromString.optional(),
});
