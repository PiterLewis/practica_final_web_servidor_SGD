// Eventos emitidos por Socket.IO en BildyApp

export type SocketEvents = {
  'connected': { room: string };
  'client:new': { id: string; name: string; cif: string };
  'project:new': { id: string; name: string; projectCode: string };
  'deliverynote:new': {
    id: string;
    format: 'material' | 'hours';
    project: string;
    client: string;
  };
  'deliverynote:signed': {
    id: string;
    signedAt: Date;
    signatureUrl: string | null;
    pdfUrl: string | null;
  };
};

export interface SocketAuthData {
  userId: string;
  email: string;
  companyId: string;
}
