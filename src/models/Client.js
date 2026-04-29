import mongoose from 'mongoose';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    number: { type: String, trim: true },
    postal: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true },
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true, trim: true },
    cif: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: null },
    phone: { type: String, trim: true, default: null },
    address: addressSchema,
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

// Un mismo CIF no puede repetirse dentro de una compañía
clientSchema.index({ company: 1, cif: 1, deleted: 1 }, { unique: true });
clientSchema.index({ company: 1, name: 1 });

clientSchema.plugin(softDeletePlugin);

const Client = mongoose.model('Client', clientSchema);
export default Client;
