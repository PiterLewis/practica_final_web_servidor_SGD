import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdSchema = z
  .string()
  .refine((val) => mongoose.isValidObjectId(val), { message: 'Identificador no válido' });

export const addressSchema = z
  .object({
    street: z.string().trim().optional(),
    number: z.string().trim().optional(),
    postal: z.string().trim().optional(),
    city: z.string().trim().optional(),
    province: z.string().trim().optional(),
  })
  .partial()
  .strict();

export const idParamSchema = z.object({
  id: objectIdSchema,
});

const positiveIntFromString = z
  .string()
  .regex(/^\d+$/u, 'Debe ser un entero positivo')
  .transform((v) => Number.parseInt(v, 10));

export const paginationQuerySchema = z.object({
  page: positiveIntFromString.optional().default('1'),
  limit: positiveIntFromString.optional().default('10'),
  sort: z.string().trim().optional(),
});

export const booleanFromString = z
  .union([z.literal('true'), z.literal('false')])
  .transform((v) => v === 'true');

export const dateFromString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Fecha no válida (ISO 8601)' })
  .transform((v) => new Date(v));
