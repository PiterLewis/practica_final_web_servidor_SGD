import { z } from 'zod';
import {
  objectIdSchema,
  paginationQuerySchema,
  booleanFromString,
  dateFromString,
} from './common.js';

const workerSchema = z.object({
  name: z.string().trim().min(1),
  hours: z.number().nonnegative('Las horas deben ser >= 0'),
});

const baseFields = {
  client: objectIdSchema,
  project: objectIdSchema,
  description: z.string().trim().optional(),
  workDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((v) => (v == null ? undefined : v instanceof Date ? v : new Date(v))),
};

const materialSchema = z
  .object({
    ...baseFields,
    format: z.literal('material'),
    material: z.string({ required_error: 'El material es obligatorio' }).trim().min(1),
    quantity: z.number({ required_error: 'La cantidad es obligatoria' }).nonnegative(),
    unit: z.string().trim().optional(),
  })
  .strict();

const hoursSchema = z
  .object({
    ...baseFields,
    format: z.literal('hours'),
    hours: z.number().nonnegative().optional(),
    workers: z.array(workerSchema).optional(),
  })
  .strict();

// Zod v3 no permite refine() dentro de discriminatedUnion, así que aplicamos
// el refine fuera de la unión
export const createDeliveryNoteSchema = z
  .discriminatedUnion('format', [materialSchema, hoursSchema])
  .refine(
    (data) =>
      data.format !== 'hours' ||
      (data.hours != null && data.hours > 0) ||
      (data.workers && data.workers.length > 0),
    {
      message: 'Debes indicar horas totales o al menos un trabajador con horas',
      path: ['hours'],
    }
  );

export const listDeliveryNotesQuerySchema = paginationQuerySchema.extend({
  client: objectIdSchema.optional(),
  project: objectIdSchema.optional(),
  format: z.enum(['material', 'hours']).optional(),
  signed: booleanFromString.optional(),
  from: dateFromString.optional(),
  to: dateFromString.optional(),
});
