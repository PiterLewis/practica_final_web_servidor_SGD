import PDFDocument from 'pdfkit';

const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatAddress = (addr) => {
  if (!addr) return '—';
  const parts = [
    [addr.street, addr.number].filter(Boolean).join(' '),
    [addr.postal, addr.city].filter(Boolean).join(' '),
    addr.province,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
};

const fetchSignatureBuffer = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
};

export const generateDeliveryNotePdf = async (note) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const company = note.company ?? {};
  const client = note.client ?? {};
  const project = note.project ?? {};
  const user = note.user ?? {};

  doc.fontSize(20).text('Albarán', { align: 'right' });
  doc.fontSize(10).fillColor('#666').text(`ID: ${note._id}`, { align: 'right' });
  doc.fillColor('#000').moveDown();

  doc.fontSize(12).text('Empresa emisora', { underline: true });
  doc.fontSize(10);
  doc.text(company.name ?? '—');
  doc.text(`CIF: ${company.cif ?? '—'}`);
  doc.text(formatAddress(company.address));
  doc.moveDown();

  doc.fontSize(12).text('Cliente', { underline: true });
  doc.fontSize(10);
  doc.text(client.name ?? '—');
  doc.text(`CIF: ${client.cif ?? '—'}`);
  doc.text(formatAddress(client.address));
  doc.moveDown();

  doc.fontSize(12).text('Proyecto', { underline: true });
  doc.fontSize(10);
  doc.text(`${project.name ?? '—'} (${project.projectCode ?? '—'})`);
  doc.text(formatAddress(project.address));
  if (project.notes) doc.text(`Notas: ${project.notes}`);
  doc.moveDown();

  doc.fontSize(12).text('Detalles del trabajo', { underline: true });
  doc.fontSize(10);
  doc.text(`Fecha: ${formatDate(note.workDate)}`);
  doc.text(`Tipo: ${note.format === 'hours' ? 'Horas trabajadas' : 'Material'}`);
  if (note.description) doc.text(`Descripción: ${note.description}`);
  doc.moveDown(0.5);

  if (note.format === 'material') {
    doc.text(`Material: ${note.material ?? '—'}`);
    doc.text(`Cantidad: ${note.quantity ?? '—'} ${note.unit ?? ''}`.trim());
  } else {
    if (note.hours != null) doc.text(`Horas totales: ${note.hours}`);
    if (Array.isArray(note.workers) && note.workers.length > 0) {
      doc.moveDown(0.3).text('Desglose por trabajador:');
      note.workers.forEach((w) => doc.text(`  - ${w.name}: ${w.hours} h`));
    }
  }

  doc.moveDown();
  doc.fontSize(10).fillColor('#666').text(`Creado por: ${user.email ?? '—'}`);
  doc.fillColor('#000').moveDown();

  if (note.signed) {
    doc.fontSize(12).text('Firma', { underline: true });
    doc.fontSize(10).text(`Firmado el ${formatDate(note.signedAt)}`);
    if (note.signatureUrl) {
      const buffer = await fetchSignatureBuffer(note.signatureUrl);
      if (buffer) {
        try {
          doc.image(buffer, { fit: [200, 100] });
        } catch {
          doc.text('(No se pudo embeber la imagen de la firma)');
        }
      } else {
        doc.text(`Firma: ${note.signatureUrl}`);
      }
    }
  } else {
    doc.fontSize(10).fillColor('#a00').text('Pendiente de firma');
  }

  doc.end();
  return done;
};
