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

const projectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    name: { type: String, required: true, trim: true },
    projectCode: { type: String, required: true, trim: true },
    address: addressSchema,
    email: { type: String, trim: true, lowercase: true, default: null },
    notes: { type: String, trim: true, default: null },
    active: { type: Boolean, default: true },
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

// projectCode único por compañía
projectSchema.index({ company: 1, projectCode: 1, deleted: 1 }, { unique: true });
projectSchema.index({ company: 1, client: 1 });
projectSchema.index({ company: 1, active: 1 });

projectSchema.plugin(softDeletePlugin);

const Project = mongoose.model('Project', projectSchema);
export default Project;
