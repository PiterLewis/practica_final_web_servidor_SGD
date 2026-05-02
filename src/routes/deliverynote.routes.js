import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { uploadSignature } from '../middleware/upload.js';
import {
  createDeliveryNoteSchema,
  listDeliveryNotesQuerySchema,
} from '../validators/deliverynote.validator.js';
import { idParamSchema } from '../validators/common.js';
import {
  createDeliveryNote,
  listDeliveryNotes,
  getDeliveryNote,
  downloadDeliveryNotePdf,
  signDeliveryNote,
  deleteDeliveryNote,
} from '../controllers/deliverynote.controller.js';

const router = Router();

router.use(authenticate, requireCompany);

/**
 * @openapi
 * tags:
 *   - name: Albaranes
 *     description: Gestión de albaranes (horas y materiales) con firma y PDF
 */

/**
 * @openapi
 * /api/deliverynote:
 *   post:
 *     summary: Crea un albarán
 *     tags: [Albaranes]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/DeliveryNoteMaterial'
 *               - $ref: '#/components/schemas/DeliveryNoteHours'
 *     responses:
 *       201: { description: Albarán creado }
 *   get:
 *     summary: Lista albaranes con paginación y filtros
 *     tags: [Albaranes]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: client
 *         schema: { type: string }
 *       - in: query
 *         name: project
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [hours, material] }
 *       - in: query
 *         name: signed
 *         schema: { type: string, enum: ["true","false"] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-workDate" }
 *     responses:
 *       200: { description: Listado paginado }
 */
router
  .route('/')
  .post(validate(createDeliveryNoteSchema), createDeliveryNote)
  .get(validate(listDeliveryNotesQuerySchema, 'query'), listDeliveryNotes);

/**
 * @openapi
 * /api/deliverynote/pdf/{id}:
 *   get:
 *     summary: Descarga el albarán en PDF
 *     tags: [Albaranes]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF binario o URL pública si ya está firmado
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 */
router.get('/pdf/:id', validate(idParamSchema, 'params'), downloadDeliveryNotePdf);

/**
 * @openapi
 * /api/deliverynote/{id}/sign:
 *   patch:
 *     summary: Firma un albarán subiendo la imagen de la firma
 *     tags: [Albaranes]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               signature: { type: string, format: binary }
 *     responses:
 *       200: { description: Albarán firmado }
 *       409: { description: Ya firmado }
 */
router.patch('/:id/sign', validate(idParamSchema, 'params'), uploadSignature, signDeliveryNote);

/**
 * @openapi
 * /api/deliverynote/{id}:
 *   get:
 *     summary: Devuelve un albarán con datos de usuario, cliente y proyecto
 *     tags: [Albaranes]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Albarán }
 *       404: { description: No encontrado }
 *   delete:
 *     summary: Borra un albarán (solo si no está firmado)
 *     tags: [Albaranes]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Albarán eliminado }
 *       403: { description: Albarán firmado }
 */
router
  .route('/:id')
  .get(validate(idParamSchema, 'params'), getDeliveryNote)
  .delete(validate(idParamSchema, 'params'), deleteDeliveryNote);

export default router;
