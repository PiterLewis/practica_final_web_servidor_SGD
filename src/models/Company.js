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

const companySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    cif: { type: String, required: true, trim: true, unique: true },
    address: addressSchema,
    logo: { type: String, default: null },
    isFreelance: { type: Boolean, default: false },
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

companySchema.plugin(softDeletePlugin);

const Company = mongoose.model('Company', companySchema);
export default Company;
