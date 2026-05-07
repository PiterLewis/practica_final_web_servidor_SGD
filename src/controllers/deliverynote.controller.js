import DeliveryNote from '../models/DeliveryNote.js';
import Project from '../models/Project.js';
import Client from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { emitToCompany } from '../sockets/index.js';
import { generateDeliveryNotePdf } from '../services/pdf.service.js';
import {
  uploadSignature as uploadSignatureCloud,
  uploadPdf,
  isStorageEnabled,
} from '../services/storage.service.js';

const buildSort = (sort) => {
  if (!sort) return { workDate: -1 };
  const direction = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');
  return { [field]: direction };
};

const ensureProjectAndClient = async ({ projectId, clientId, companyId }) => {
  const project = await Project.findOne({ _id: projectId, company: companyId });
  if (!project) throw AppError.notFound('Proyecto no encontrado en tu compañía', 'PROJECT_NOT_FOUND');
  const client = await Client.findOne({ _id: clientId, company: companyId });
  if (!client) throw AppError.notFound('Cliente no encontrado en tu compañía', 'CLIENT_NOT_FOUND');
  if (project.client.toString() !== client._id.toString()) {
    throw AppError.badRequest('El cliente no coincide con el del proyecto', 'CLIENT_PROJECT_MISMATCH');
  }
  return { project, client };
};

export const createDeliveryNote = async (req, res, next) => {
  try {
    const data = req.body;
    const user = req.user;
    const companyId = user.company;

    await ensureProjectAndClient({
      projectId: data.project,
      clientId: data.client,
      companyId,
    });

    const note = await DeliveryNote.create({
      ...data,
      user: user._id,
      company: companyId,
    });

    emitToCompany(companyId, 'deliverynote:new', {
      id: note._id.toString(),
      format: note.format,
      project: note.project.toString(),
      client: note.client.toString(),
    });

    res.status(201).json({ deliveryNote: note });
  } catch (err) {
    next(err);
  }
};

export const listDeliveryNotes = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, client, project, format, signed, from, to, sort } = req.query;
    const filter = { company: req.user.company };
    if (client) filter.client = client;
    if (project) filter.project = project;
    if (format) filter.format = format;
    if (signed !== undefined) filter.signed = signed;
    if (from || to) {
      filter.workDate = {};
      if (from) filter.workDate.$gte = from;
      if (to) filter.workDate.$lte = to;
    }

    const totalItems = await DeliveryNote.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const items = await DeliveryNote.find(filter)
      .populate('client', 'name cif')
      .populate('project', 'name projectCode')
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

export const getDeliveryNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await DeliveryNote.findOne({ _id: id, company: req.user.company })
      .populate('user', 'email name lastName')
      .populate('client')
      .populate('project');
    if (!note) return next(AppError.notFound('Albarán no encontrado'));
    res.json({ deliveryNote: note });
  } catch (err) {
    next(err);
  }
};

export const downloadDeliveryNotePdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await DeliveryNote.findOne({ _id: id, company: req.user.company })
      .populate('user', 'email name lastName')
      .populate('client')
      .populate('project')
      .populate('company');
    if (!note) return next(AppError.notFound('Albarán no encontrado'));

    // Un guest solo puede descargar los albaranes que ha creado él. Un admin
    // puede descargar cualquiera de su compañía. note.user viene poblado y
    // _id es ObjectId, por eso comparo con toString().
    const creatorId = note.user?._id ?? note.user;
    if (req.user.role === 'guest' && creatorId.toString() !== req.user._id.toString()) {
      return next(AppError.forbidden('No tienes permiso para descargar este albarán', 'FORBIDDEN_PDF'));
    }

    if (note.signed && note.pdfUrl) {
      return res.json({ pdfUrl: note.pdfUrl });
    }

    const pdfBuffer = await generateDeliveryNotePdf(note);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="albaran-${note._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

export const signDeliveryNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await DeliveryNote.findOne({ _id: id, company: req.user.company });
    if (!note) return next(AppError.notFound('Albarán no encontrado'));
    if (note.signed) {
      return next(AppError.conflict('El albarán ya está firmado', 'ALREADY_SIGNED'));
    }
    if (!req.file) {
      return next(AppError.badRequest('No se ha subido la imagen de la firma', 'NO_FILE'));
    }

    if (isStorageEnabled()) {
      const { url } = await uploadSignatureCloud(req.file.buffer);
      note.signatureUrl = url;
    } else {
      // Fallback de desarrollo
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const ext = (req.file.mimetype.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const filename = `signature_${note._id}_${Date.now()}.${ext}`;
      await fs.mkdir('uploads', { recursive: true });
      await fs.writeFile(path.join('uploads', filename), req.file.buffer);
      note.signatureUrl = `/uploads/${filename}`;
    }

    note.signed = true;
    note.signedAt = new Date();
    await note.save();

    const populated = await DeliveryNote.findById(note._id)
      .populate('user', 'email name lastName')
      .populate('client')
      .populate('project')
      .populate('company');

    try {
      const pdfBuffer = await generateDeliveryNotePdf(populated);
      if (isStorageEnabled()) {
        const { url } = await uploadPdf(pdfBuffer, { publicId: `albaran-${note._id}` });
        note.pdfUrl = url;
        await note.save();
      } else {
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const filename = `albaran-${note._id}.pdf`;
        await fs.mkdir('uploads', { recursive: true });
        await fs.writeFile(path.join('uploads', filename), pdfBuffer);
        note.pdfUrl = `/uploads/${filename}`;
        await note.save();
      }
    } catch (pdfErr) {
      console.error('[deliverynote] No se pudo generar/subir el PDF:', pdfErr.message);
    }

    emitToCompany(req.user.company, 'deliverynote:signed', {
      id: note._id.toString(),
      signedAt: note.signedAt,
      signatureUrl: note.signatureUrl,
      pdfUrl: note.pdfUrl,
    });

    res.json({ message: 'Albarán firmado correctamente', deliveryNote: note });
  } catch (err) {
    next(err);
  }
};

export const deleteDeliveryNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await DeliveryNote.findOne({ _id: id, company: req.user.company });
    if (!note) return next(AppError.notFound('Albarán no encontrado'));
    if (note.signed) {
      return next(AppError.forbidden('No se puede borrar un albarán firmado', 'ALREADY_SIGNED'));
    }
    await note.hardDelete();
    res.json({ message: 'Albarán eliminado' });
  } catch (err) {
    next(err);
  }
};
