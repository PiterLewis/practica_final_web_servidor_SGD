import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import {
  createClientSchema,
  updateClientSchema,
  listClientsQuerySchema,
} from '../validators/client.validator.js';
import { idParamSchema } from '../validators/common.js';
import {
  createClient,
  updateClient,
  listClients,
  getClient,
  deleteClient,
  listArchivedClients,
  restoreClient,
} from '../controllers/client.controller.js';

const router = Router();

router.use(authenticate, requireCompany);

/**
 * @openapi
 * tags:
 *   - name: Clientes
 *     description: Gestión de clientes de la compañía
 */

/**
 * @openapi
 * /api/client:
 *   post:
 *     summary: Crea un cliente
 *     tags: [Clientes]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput'
 *     responses:
 *       201: { description: Cliente creado }
 *       409: { description: CIF ya existente en la compañía }
 *   get:
 *     summary: Lista los clientes con paginación y filtros
 *     tags: [Clientes]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: cif
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-createdAt" }
 *     responses:
 *       200:
 *         description: Listado paginado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PagedClients'
 */
router
  .route('/')
  .post(validate(createClientSchema), createClient)
  .get(validate(listClientsQuerySchema, 'query'), listClients);

/**
 * @openapi
 * /api/client/archived:
 *   get:
 *     summary: Lista clientes archivados
 *     tags: [Clientes]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Listado de archivados }
 */
router.get('/archived', listArchivedClients);

/**
 * @openapi
 * /api/client/{id}/restore:
 *   patch:
 *     summary: Restaura un cliente archivado
 *     tags: [Clientes]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Cliente restaurado }
 *       404: { description: No encontrado }
 */
router.patch('/:id/restore', validate(idParamSchema, 'params'), restoreClient);

/**
 * @openapi
 * /api/client/{id}:
 *   get:
 *     summary: Devuelve un cliente
 *     tags: [Clientes]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Cliente }
 *       404: { description: No encontrado }
 *   put:
 *     summary: Actualiza un cliente
 *     tags: [Clientes]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput'
 *     responses:
 *       200: { description: Cliente actualizado }
 *       404: { description: No encontrado }
 *       409: { description: CIF duplicado }
 *   delete:
 *     summary: Borra (soft o hard) un cliente
 *     tags: [Clientes]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: soft
 *         schema: { type: string, enum: ["true","false"] }
 *     responses:
 *       200: { description: Cliente eliminado }
 *       404: { description: No encontrado }
 */
router
  .route('/:id')
  .get(validate(idParamSchema, 'params'), getClient)
  .put(validate(idParamSchema, 'params'), validate(updateClientSchema), updateClient)
  .delete(validate(idParamSchema, 'params'), deleteClient);

export default router;
