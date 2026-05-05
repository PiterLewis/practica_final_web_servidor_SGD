// Definiciones de tipo compartidas para la API de BildyApp
// Las usamos para el typecheck (tsc --noEmit) y como contrato del dominio

import type { Types } from 'mongoose';

export type ObjectId = Types.ObjectId;
export type ID = string | ObjectId;

export interface Address {
  street?: string;
  number?: string;
  postal?: string;
  city?: string;
  province?: string;
}

export type UserRole = 'admin' | 'guest';
export type UserStatus = 'pending' | 'verified';

export interface IUser {
  _id: ObjectId;
  email: string;
  password: string;
  name: string | null;
  lastName: string | null;
  nif: string | null;
  role: UserRole;
  status: UserStatus;
  verificationCode: string | null;
  verificationAttempts: number;
  company: ObjectId | null;
  address?: Address;
  refreshToken: string | null;
  deleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fullName: string | null;
}

export interface ICompany {
  _id: ObjectId;
  owner: ObjectId;
  name: string;
  cif: string;
  address?: Address;
  logo: string | null;
  isFreelance: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClient {
  _id: ObjectId;
  user: ObjectId;
  company: ObjectId;
  name: string;
  cif: string;
  email: string | null;
  phone: string | null;
  address?: Address;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  _id: ObjectId;
  user: ObjectId;
  company: ObjectId;
  client: ObjectId;
  name: string;
  projectCode: string;
  email: string | null;
  notes: string | null;
  active: boolean;
  address?: Address;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryNoteFormat = 'material' | 'hours';

export interface DeliveryNoteWorker {
  name: string;
  hours: number;
}

export interface IDeliveryNote {
  _id: ObjectId;
  user: ObjectId;
  company: ObjectId;
  client: ObjectId;
  project: ObjectId;
  format: DeliveryNoteFormat;
  description: string | null;
  workDate: Date;
  material: string | null;
  quantity: number | null;
  unit: string | null;
  hours: number | null;
  workers: DeliveryNoteWorker[];
  signed: boolean;
  signedAt: Date | null;
  signatureUrl: string | null;
  pdfUrl: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

export interface ApiErrorBody {
  error: true;
  message: string;
  code: string;
  details?: Array<{ field: string; message: string }>;
  stack?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}
