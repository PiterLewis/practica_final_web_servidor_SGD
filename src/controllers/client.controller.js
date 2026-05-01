import Client from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { emitToCompany } from '../sockets/index.js';

const buildSort = (sort) => {
  if (!sort) return { createdAt: -1 };
  const direction = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');
  return { [field]: direction };
};

export const createClient = async (req, res, next) => {
  try {
    const data = req.body;
    const user = req.user;
    const companyId = user.company;

    const exists = await Client.findOne({ company: companyId, cif: data.cif });
    if (exists) {
      return next(AppError.conflict('Ya existe un cliente con ese CIF en tu compañía', 'DUPLICATE_CLIENT'));
    }

    const client = await Client.create({ ...data, user: user._id, company: companyId });

    emitToCompany(companyId, 'client:new', { id: client._id.toString(), name: client.name, cif: client.cif });

    res.status(201).json({ client });
  } catch (err) {
    next(err);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;
    const client = await Client.findOne({ _id: id, company: companyId });
    if (!client) return next(AppError.notFound('Cliente no encontrado'));

    if (req.body.cif && req.body.cif !== client.cif) {
      const dup = await Client.findOne({
        company: companyId,
        cif: req.body.cif,
        _id: { $ne: client._id },
      });
      if (dup) {
        return next(AppError.conflict('Ya existe un cliente con ese CIF en tu compañía', 'DUPLICATE_CLIENT'));
      }
    }

    Object.assign(client, req.body);
    await client.save();
    res.json({ client });
  } catch (err) {
    next(err);
  }
};

export const listClients = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, name, cif, sort } = req.query;
    const filter = { company: req.user.company };
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (cif) filter.cif = { $regex: cif, $options: 'i' };

    const totalItems = await Client.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const items = await Client.find(filter)
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

export const getClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await Client.findOne({ _id: id, company: req.user.company });
    if (!client) return next(AppError.notFound('Cliente no encontrado'));
    res.json({ client });
  } catch (err) {
    next(err);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSoft = req.query.soft === 'true';
    const client = await Client.findOne({ _id: id, company: req.user.company });
    if (!client) return next(AppError.notFound('Cliente no encontrado'));

    if (isSoft) {
      await client.softDelete();
    } else {
      await client.hardDelete();
    }
    res.json({ message: `Cliente eliminado (${isSoft ? 'soft' : 'hard'})` });
  } catch (err) {
    next(err);
  }
};

export const listArchivedClients = async (req, res, next) => {
  try {
    const items = await Client.findDeleted({ company: req.user.company }).sort({ deletedAt: -1 });
    res.json({ items, totalItems: items.length });
  } catch (err) {
    next(err);
  }
};

export const restoreClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await Client.findOne({ _id: id, company: req.user.company, deleted: true });
    if (!client) return next(AppError.notFound('Cliente archivado no encontrado'));
    await client.restore();
    res.json({ message: 'Cliente restaurado', client });
  } catch (err) {
    next(err);
  }
};
