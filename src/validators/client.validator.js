import { z } from 'zod';
import { addressSchema, paginationQuerySchema } from './common.js';

export const createClientSchema = z.object({
  name: z.string({ required_error: 'El nombre es obligatorio' }).trim().min(1),
  cif: z.string({ required_error: 'El CIF es obligatorio' }).trim().min(1),
  email: z.string().email('Email no válido').transform((v) => v.toLowerCase().trim()).optional(),
  phone: z.string().trim().optional(),
  address: addressSchema.optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const listClientsQuerySchema = paginationQuerySchema.extend({
  name: z.string().trim().optional(),
  cif: z.string().trim().optional(),
});
