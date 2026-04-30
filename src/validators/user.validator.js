import { z } from 'zod';
import { addressSchema } from './common.js';

const passwordComplexity = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine((v) => /[a-z]/.test(v), { message: 'Debe contener al menos una minúscula' })
  .refine((v) => /[A-Z]/.test(v), { message: 'Debe contener al menos una mayúscula' })
  .refine((v) => /\d/.test(v), { message: 'Debe contener al menos un dígito' });

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .email('Email no válido')
    .transform((v) => v.toLowerCase().trim()),
  password: passwordComplexity,
});

export const verifyEmailSchema = z.object({
  code: z
    .string({ required_error: 'El código es obligatorio' })
    .regex(/^\d{6}$/u, 'El código debe tener exactamente 6 dígitos'),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .email('Email no válido')
    .transform((v) => v.toLowerCase().trim()),
  password: z.string({ required_error: 'La contraseña es obligatoria' }),
});

export const personalDataSchema = z.object({
  name: z.string({ required_error: 'El nombre es obligatorio' }).trim().min(1),
  lastName: z.string({ required_error: 'Los apellidos son obligatorios' }).trim().min(1),
  nif: z.string({ required_error: 'El NIF es obligatorio' }).trim().min(1),
  address: addressSchema.optional(),
});

const freelanceCompanySchema = z.object({
  isFreelance: z.literal(true),
});

const regularCompanySchema = z.object({
  isFreelance: z.literal(false),
  name: z.string({ required_error: 'El nombre de la empresa es obligatorio' }).trim().min(1),
  cif: z.string({ required_error: 'El CIF es obligatorio' }).trim().min(1),
  address: addressSchema.optional(),
});

export const companySchema = z.discriminatedUnion('isFreelance', [
  freelanceCompanySchema,
  regularCompanySchema,
]);

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'El refresh token es obligatorio' }),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'La contraseña actual es obligatoria' }),
    newPassword: passwordComplexity,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword'],
  });

export const inviteSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .email('Email no válido')
    .transform((v) => v.toLowerCase().trim()),
  name: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
});
