import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter = null;

const getTransporter = () => {
  if (!config.smtp.enabled) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  return transporter;
};

export const sendVerificationEmail = async ({ to, code }) => {
  if (!config.smtp.enabled) {
    if (config.nodeEnv !== 'test') {
      console.log(`[mail] (SMTP no configurado) Código de verificación para ${to}: ${code}`);
    }
    return { skipped: true };
  }
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto">
      <h2>Bienvenido a BildyApp</h2>
      <p>Tu código de verificación es:</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:bold">${code}</p>
      <p>Si no has solicitado este código, ignora este mensaje.</p>
    </div>
  `;
  const tx = getTransporter();
  await tx.sendMail({
    from: config.smtp.from,
    to,
    subject: 'Código de verificación — BildyApp',
    text: `Tu código de verificación es: ${code}`,
    html,
  });
  return { skipped: false };
};

export const sendInvitationEmail = async ({ to, tempPassword, invitedBy }) => {
  if (!config.smtp.enabled) {
    if (config.nodeEnv !== 'test') {
      console.log(`[mail] (SMTP no configurado) Invitación para ${to}, contraseña temporal: ${tempPassword}`);
    }
    return { skipped: true };
  }
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto">
      <h2>Te han invitado a BildyApp</h2>
      <p>${invitedBy} te ha invitado a su empresa.</p>
      <p>Tu contraseña temporal es:</p>
      <p style="font-size:22px;font-weight:bold">${tempPassword}</p>
      <p>Inicia sesión y cámbiala desde tu perfil.</p>
    </div>
  `;
  const tx = getTransporter();
  await tx.sendMail({
    from: config.smtp.from,
    to,
    subject: 'Invitación a BildyApp',
    text: `${invitedBy} te ha invitado. Tu contraseña temporal es: ${tempPassword}`,
    html,
  });
  return { skipped: false };
};
