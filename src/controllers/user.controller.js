import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { notificationService } from '../services/notification.service.js';
import { sendVerificationEmail, sendInvitationEmail } from '../services/mail.service.js';
import { uploadLogo as uploadLogoCloud, isStorageEnabled } from '../services/storage.service.js';

const generateCode = () => String(Math.floor(100_000 + Math.random() * 900_000));

const signAccessToken = (userId) =>
  jwt.sign({ id: userId }, config.jwt.secret, { expiresIn: config.jwt.accessExpires });

const signRefreshToken = (userId) =>
  jwt.sign({ id: userId }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpires });

export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.status === 'verified') {
        return next(AppError.conflict('Ya existe una cuenta verificada con ese email'));
      }
      existing.password = await bcrypt.hash(password, config.bcrypt.rounds);
      existing.verificationCode = generateCode();
      existing.verificationAttempts = 3;
      const accessToken = signAccessToken(existing._id);
      const refreshToken = signRefreshToken(existing._id);
      existing.refreshToken = refreshToken;
      await existing.save();
      notificationService.emit('user:registered', { email: existing.email });
      sendVerificationEmail({ to: existing.email, code: existing.verificationCode }).catch(() => {});
      return res.status(201).json({
        user: { email: existing.email, status: existing.status, role: existing.role },
        accessToken,
        refreshToken,
      });
    }

    const hashed = await bcrypt.hash(password, config.bcrypt.rounds);
    const verificationCode = generateCode();

    const user = await User.create({
      email,
      password: hashed,
      verificationCode,
      verificationAttempts: 3,
    });

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    notificationService.emit('user:registered', { email: user.email });
    sendVerificationEmail({ to: user.email, code: verificationCode }).catch(() => {});

    res.status(201).json({
      user: { email: user.email, status: user.status, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (user.status === 'verified') {
      return res.json({ message: 'El email ya estaba verificado' });
    }

    if (user.verificationAttempts <= 0) {
      return next(AppError.tooManyRequests('Se han agotado los intentos de verificación'));
    }

    if (user.verificationCode !== code) {
      user.verificationAttempts -= 1;
      await user.save();
      if (user.verificationAttempts <= 0) {
        return next(AppError.tooManyRequests('Código incorrecto. Intentos agotados'));
      }
      return next(
        AppError.badRequest(
          `Código incorrecto. Intentos restantes: ${user.verificationAttempts}`,
          'INVALID_CODE'
        )
      );
    }

    user.status = 'verified';
    user.verificationCode = null;
    await user.save();

    notificationService.emit('user:verified', { email: user.email });

    res.json({ message: 'Email verificado correctamente' });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(AppError.unauthorized('Credenciales incorrectas'));
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return next(AppError.unauthorized('Credenciales incorrectas'));
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      user: { email: user.email, status: user.status, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

export const updatePersonalData = async (req, res, next) => {
  try {
    const { name, lastName, nif, address } = req.body;
    const user = req.user;

    user.name = name;
    user.lastName = lastName;
    user.nif = nif;
    if (address) user.address = address;
    await user.save();

    res.json({ message: 'Datos personales actualizados', user: user.toJSON() });
  } catch (err) {
    next(err);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const user = req.user;
    const data = req.body;

    let cif;
    let companyData;

    if (data.isFreelance === true) {
      if (!user.nif) {
        return next(
          AppError.badRequest('Completa primero los datos personales (NIF requerido)', 'MISSING_NIF')
        );
      }
      cif = user.nif;
      companyData = {
        name: user.name ?? user.email,
        cif,
        address: user.address,
        isFreelance: true,
      };
    } else {
      cif = data.cif;
      companyData = {
        name: data.name,
        cif,
        address: data.address,
        isFreelance: false,
      };
    }

    let company = await Company.findOne({ cif });

    if (company) {
      user.company = company._id;
      user.role = 'guest';
      await user.save();
      return res.json({
        message: 'Te has unido a una empresa existente como colaborador',
        company,
      });
    }

    company = await Company.create({ ...companyData, owner: user._id });
    user.company = company._id;
    await user.save();

    res.json({ message: 'Empresa creada correctamente', company });
  } catch (err) {
    next(err);
  }
};

export const uploadLogo = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.company) {
      return next(AppError.badRequest('El usuario no tiene empresa asociada', 'NO_COMPANY'));
    }
    if (!req.file) {
      return next(AppError.badRequest('No se ha subido ningún archivo', 'NO_FILE'));
    }
    const company = await Company.findById(user.company);
    if (!company) return next(AppError.notFound('Empresa no encontrada'));

    if (isStorageEnabled()) {
      const { url } = await uploadLogoCloud(req.file.buffer);
      company.logo = url;
    } else {
      // Modo desarrollo sin Cloudinary: guardar en disco local
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const ext = (req.file.mimetype.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const filename = `logo_${Date.now()}.${ext}`;
      await fs.mkdir('uploads', { recursive: true });
      await fs.writeFile(path.join('uploads', filename), req.file.buffer);
      company.logo = `/uploads/${filename}`;
    }
    await company.save();
    res.json({ message: 'Logo actualizado', logo: company.logo });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('company');
    if (!user) return next(AppError.notFound('Usuario no encontrado'));
    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.refreshSecret);
    } catch {
      return next(AppError.unauthorized('Refresh token inválido o expirado', 'TOKEN_INVALID'));
    }

    const user = await User.findById(payload.id);
    if (!user || user.refreshToken !== token) {
      return next(AppError.unauthorized('Refresh token no reconocido', 'TOKEN_INVALID'));
    }

    const accessToken = signAccessToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    req.user.refreshToken = null;
    await req.user.save();
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const isSoft = req.query.soft === 'true';
    const user = req.user;

    if (isSoft) {
      await user.softDelete();
    } else {
      await user.hardDelete();
    }

    notificationService.emit('user:deleted', {
      email: user.email,
      type: isSoft ? 'soft' : 'hard',
    });

    res.json({ message: `Usuario eliminado (${isSoft ? 'soft' : 'hard'})` });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return next(AppError.unauthorized('La contraseña actual es incorrecta', 'WRONG_PASSWORD'));
    }

    user.password = await bcrypt.hash(newPassword, config.bcrypt.rounds);
    user.refreshToken = null;
    await user.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    next(err);
  }
};

export const inviteUser = async (req, res, next) => {
  try {
    const { email, name, lastName } = req.body;
    const inviter = req.user;

    if (!inviter.company) {
      return next(AppError.badRequest('Debes pertenecer a una empresa para invitar', 'NO_COMPANY'));
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return next(AppError.conflict('Ya existe un usuario con ese email'));
    }

    const tempPassword = generateCode();
    const hashed = await bcrypt.hash(`${tempPassword}Aa`, config.bcrypt.rounds);
    const verificationCode = generateCode();

    const invited = await User.create({
      email,
      password: hashed,
      name: name ?? null,
      lastName: lastName ?? null,
      role: 'guest',
      company: inviter.company,
      verificationCode,
      verificationAttempts: 3,
    });

    notificationService.emit('user:invited', { email: invited.email, invitedBy: inviter.email });
    sendInvitationEmail({
      to: invited.email,
      tempPassword: `${tempPassword}Aa`,
      invitedBy: inviter.email,
    }).catch(() => {});

    res.status(201).json({
      message: 'Usuario invitado correctamente',
      user: { email: invited.email, role: invited.role },
      tempPassword: `${tempPassword}Aa`,
    });
  } catch (err) {
    next(err);
  }
};
