export function softDeletePlugin(schema) {
  schema.add({
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  });

  // Por defecto las queries excluyen los documentos archivados
  const filterDeleted = function () {
    if (this.getFilter().deleted === undefined) {
      this.where({ deleted: false });
    }
  };

  schema.pre('find', filterDeleted);
  schema.pre('findOne', filterDeleted);
  schema.pre('findOneAndUpdate', filterDeleted);
  schema.pre('countDocuments', filterDeleted);

  schema.methods.softDelete = async function () {
    this.deleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = async function () {
    this.deleted = false;
    this.deletedAt = null;
    return this.save();
  };

  schema.methods.hardDelete = async function () {
    return this.constructor.deleteOne({ _id: this._id });
  };

  schema.statics.findDeleted = function (filter = {}) {
    return this.find({ ...filter, deleted: true });
  };

  schema.statics.findWithDeleted = function (filter = {}) {
    return this.find({ ...filter, deleted: { $in: [true, false] } });
  };
}
