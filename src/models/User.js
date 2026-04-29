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

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, trim: true, default: null },
    lastName: { type: String, trim: true, default: null },
    nif: { type: String, trim: true, default: null },
    role: { type: String, enum: ['admin', 'guest'], default: 'admin' },
    status: { type: String, enum: ['pending', 'verified'], default: 'pending' },
    verificationCode: { type: String, default: null },
    verificationAttempts: { type: Number, default: 3 },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    address: addressSchema,
    refreshToken: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.verificationCode;
        delete ret.verificationAttempts;
        delete ret.deleted;
        delete ret.deletedAt;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('fullName').get(function () {
  if (this.name && this.lastName) return `${this.name} ${this.lastName}`;
  return this.name ?? null;
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ company: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });

userSchema.plugin(softDeletePlugin);

const User = mongoose.model('User', userSchema);
export default User;
