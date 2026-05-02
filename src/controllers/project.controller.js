import Project from '../models/Project.js';
import Client from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { emitToCompany } from '../sockets/index.js';

const buildSort = (sort) => {
  if (!sort) return { createdAt: -1 };
  const direction = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');
  return { [field]: direction };
};

const ensureClientInCompany = async (clientId, companyId) => {
  const client = await Client.findOne({ _id: clientId, company: companyId });
  if (!client) {
    throw AppError.notFound('Cliente no encontrado en tu compañía', 'CLIENT_NOT_FOUND');
  }
  return client;
};

export const createProject = async (req, res, next) => {
  try {
    const data = req.body;
    const user = req.user;
    const companyId = user.company;

    await ensureClientInCompany(data.client, companyId);

    const exists = await Project.findOne({ company: companyId, projectCode: data.projectCode });
    if (exists) {
      return next(AppError.conflict('Ya existe un proyecto con ese código en tu compañía', 'DUPLICATE_PROJECT_CODE'));
    }

    const project = await Project.create({ ...data, user: user._id, company: companyId });

    emitToCompany(companyId, 'project:new', {
      id: project._id.toString(),
      name: project.name,
      projectCode: project.projectCode,
    });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;
    const project = await Project.findOne({ _id: id, company: companyId });
    if (!project) return next(AppError.notFound('Proyecto no encontrado'));

    if (req.body.client) {
      await ensureClientInCompany(req.body.client, companyId);
    }

    if (req.body.projectCode && req.body.projectCode !== project.projectCode) {
      const dup = await Project.findOne({
        company: companyId,
        projectCode: req.body.projectCode,
        _id: { $ne: project._id },
      });
      if (dup) {
        return next(AppError.conflict('Ya existe un proyecto con ese código en tu compañía', 'DUPLICATE_PROJECT_CODE'));
      }
    }

    Object.assign(project, req.body);
    await project.save();
    res.json({ project });
  } catch (err) {
    next(err);
  }
};

export const listProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, name, client, active, sort } = req.query;
    const filter = { company: req.user.company };
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (client) filter.client = client;
    if (active !== undefined) filter.active = active;

    const totalItems = await Project.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const items = await Project.find(filter)
      .populate('client', 'name cif')
      .sort(buildSort(sort))
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      items,
      currentPage: page,
      totalPages,
      totalItems,
      limit,
    });
  } catch (err) {
    next(err);
  }
};

export const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findOne({ _id: id, company: req.user.company }).populate('client');
    if (!project) return next(AppError.notFound('Proyecto no encontrado'));
    res.json({ project });
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSoft = req.query.soft === 'true';
    const project = await Project.findOne({ _id: id, company: req.user.company });
    if (!project) return next(AppError.notFound('Proyecto no encontrado'));

    if (isSoft) {
      await project.softDelete();
    } else {
      await project.hardDelete();
    }
    res.json({ message: `Proyecto eliminado (${isSoft ? 'soft' : 'hard'})` });
  } catch (err) {
    next(err);
  }
};

export const listArchivedProjects = async (req, res, next) => {
  try {
    const items = await Project.findDeleted({ company: req.user.company }).sort({ deletedAt: -1 });
    res.json({ items, totalItems: items.length });
  } catch (err) {
    next(err);
  }
};

export const restoreProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findOne({ _id: id, company: req.user.company, deleted: true });
    if (!project) return next(AppError.notFound('Proyecto archivado no encontrado'));
    await project.restore();
    res.json({ message: 'Proyecto restaurado', project });
  } catch (err) {
    next(err);
  }
};
