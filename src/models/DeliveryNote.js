import mongoose from 'mongoose';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

const workerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    hours: { type: Number, min: 0, required: true },
  },
  { _id: false }
);

const deliveryNoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    format: { type: String, enum: ['material', 'hours'], required: true },
    description: { type: String, trim: true, default: null },
    workDate: { type: Date, default: () => new Date() },
    material: { type: String, trim: true, default: null },
    quantity: { type: Number, min: 0, default: null },
    unit: { type: String, trim: true, default: null },
    hours: { type: Number, min: 0, default: null },
    workers: { type: [workerSchema], default: [] },
    signed: { type: Boolean, default: false },
    signedAt: { type: Date, default: null },
    signatureUrl: { type: String, default: null },
    pdfUrl: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.deleted;
        delete ret.deletedAt;
        return ret;
      },
    },
  }
);

deliveryNoteSchema.index({ company: 1, project: 1 });
deliveryNoteSchema.index({ company: 1, client: 1 });
deliveryNoteSchema.index({ company: 1, signed: 1 });
deliveryNoteSchema.index({ company: 1, workDate: -1 });

deliveryNoteSchema.plugin(softDeletePlugin);

const DeliveryNote = mongoose.model('DeliveryNote', deliveryNoteSchema);
export default DeliveryNote;
