import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
} from '../validators/project.validator.js';
import { idParamSchema } from '../validators/common.js';
import {
  createProject,
  updateProject,
  listProjects,
  getProject,
  deleteProject,
  listArchivedProjects,
  restoreProject,
} from '../controllers/project.controller.js';

const router = Router();

router.use(authenticate, requireCompany);

/**
 * @openapi
 * tags:
 *   - name: Proyectos
 *     description: Gestión de proyectos asociados a clientes
 */

/**
 * @openapi
 * /api/project:
 *   post:
 *     summary: Crea un proyecto
 *     tags: [Proyectos]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput'
 *     responses:
 *       201: { description: Proyecto creado }
 *       409: { description: Código de proyecto duplicado }
 *   get:
 *     summary: Lista proyectos con paginación y filtros
 *     tags: [Proyectos]
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
 *         name: client
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: ["true","false"] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-createdAt" }
 *     responses:
 *       200:
 *         description: Listado paginado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PagedProjects'
 */
router
  .route('/')
  .post(validate(createProjectSchema), createProject)
  .get(validate(listProjectsQuerySchema, 'query'), listProjects);

/**
 * @openapi
 * /api/project/archived:
 *   get:
 *     summary: Lista proyectos archivados
 *     tags: [Proyectos]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Listado de archivados }
 */
router.get('/archived', listArchivedProjects);

/**
 * @openapi
 * /api/project/{id}/restore:
 *   patch:
 *     summary: Restaura un proyecto archivado
 *     tags: [Proyectos]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Proyecto restaurado }
 *       404: { description: No encontrado }
 */
router.patch('/:id/restore', validate(idParamSchema, 'params'), restoreProject);

/**
 * @openapi
 * /api/project/{id}:
 *   get:
 *     summary: Devuelve un proyecto
 *     tags: [Proyectos]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Proyecto }
 *       404: { description: No encontrado }
 *   put:
 *     summary: Actualiza un proyecto
 *     tags: [Proyectos]
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
 *             $ref: '#/components/schemas/ProjectInput'
 *     responses:
 *       200: { description: Proyecto actualizado }
 *       409: { description: Código duplicado }
 *   delete:
 *     summary: Borra (soft o hard) un proyecto
 *     tags: [Proyectos]
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
 *       200: { description: Proyecto eliminado }
 */
router
  .route('/:id')
  .get(validate(idParamSchema, 'params'), getProject)
  .put(validate(idParamSchema, 'params'), validate(updateProjectSchema), updateProject)
  .delete(validate(idParamSchema, 'params'), deleteProject);

export default router;
