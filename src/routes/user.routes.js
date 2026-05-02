import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.js';
import { uploadLogo as multerUpload } from '../middleware/upload.js';
import { authLimiter } from '../middleware/rate-limit.js';
import {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  personalDataSchema,
  companySchema,
  refreshTokenSchema,
  changePasswordSchema,
  inviteSchema,
} from '../validators/user.validator.js';
import {
  register,
  verifyEmail,
  login,
  updatePersonalData,
  updateCompany,
  uploadLogo,
  getProfile,
  refreshToken,
  logout,
  deleteUser,
  changePassword,
  inviteUser,
} from '../controllers/user.controller.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Usuarios
 *     description: Onboarding, autenticación y gestión de cuenta
 */

/**
 * @openapi
 * /api/user/register:
 *   post:
 *     summary: Registra un usuario y devuelve tokens
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400: { description: Datos inválidos }
 *       409: { description: Email ya registrado }
 */
router.post('/register', authLimiter, validate(registerSchema), register);

/**
 * @openapi
 * /api/user/validation:
 *   put:
 *     summary: Valida el código recibido por email
 *     tags: [Usuarios]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: Email verificado }
 *       400: { description: Código incorrecto }
 *       429: { description: Intentos agotados }
 */
router.put('/validation', authenticate, validate(verifyEmailSchema), verifyEmail);

/**
 * @openapi
 * /api/user/login:
 *   post:
 *     summary: Inicia sesión y devuelve tokens
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login correcto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401: { description: Credenciales incorrectas }
 */
router.post('/login', authLimiter, validate(loginSchema), login);

/**
 * @openapi
 * /api/user/register:
 *   put:
 *     summary: Actualiza los datos personales (onboarding)
 *     tags: [Usuarios]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PersonalDataRequest'
 *     responses:
 *       200: { description: Datos actualizados }
 */
router.put('/register', authenticate, validate(personalDataSchema), updatePersonalData);

/**
 * @openapi
 * /api/user/company:
 *   patch:
 *     summary: Crea o se une a una compañía
 *     tags: [Usuarios]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/CompanyRegular'
 *               - $ref: '#/components/schemas/CompanyFreelance'
 *     responses:
 *       200: { description: Compañía asignada }
 */
router.patch('/company', authenticate, validate(companySchema), updateCompany);

/**
 * @openapi
 * /api/user/logo:
 *   patch:
 *     summary: Sube el logo de la compañía
 *     tags: [Usuarios]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo: { type: string, format: binary }
 *     responses:
 *       200: { description: Logo actualizado }
 */
router.patch('/logo', authenticate, multerUpload, uploadLogo);

/**
 * @openapi
 * /api/user:
 *   get:
 *     summary: Devuelve el usuario autenticado
 *     tags: [Usuarios]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Usuario }
 */
router.get('/', authenticate, getProfile);

/**
 * @openapi
 * /api/user/refresh:
 *   post:
 *     summary: Renueva el access token
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Nuevos tokens }
 *       401: { description: Refresh inválido }
 */
router.post('/refresh', validate(refreshTokenSchema), refreshToken);

/**
 * @openapi
 * /api/user/logout:
 *   post:
 *     summary: Cierra sesión (invalida el refresh token)
 *     tags: [Usuarios]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Sesión cerrada }
 */
router.post('/logout', authenticate, logout);

/**
 * @openapi
 * /api/user:
 *   delete:
 *     summary: Elimina el usuario (soft o hard)
 *     tags: [Usuarios]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: soft
 *         schema: { type: string, enum: ["true","false"] }
 *     responses:
 *       200: { description: Usuario eliminado }
 */
router.delete('/', authenticate, deleteUser);

/**
 * @openapi
 * /api/user/password:
 *   put:
 *     summary: Cambia la contraseña del usuario
 *     tags: [Usuarios]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Contraseña actualizada }
 *       401: { description: Contraseña actual incorrecta }
 */
router.put('/password', authenticate, validate(changePasswordSchema), changePassword);

/**
 * @openapi
 * /api/user/invite:
 *   post:
 *     summary: Invita un usuario a la compañía (rol admin)
 *     tags: [Usuarios]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               name: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       201: { description: Usuario invitado }
 *       403: { description: No tienes permisos }
 */
router.post('/invite', authenticate, authorize('admin'), validate(inviteSchema), inviteUser);

export default router;
