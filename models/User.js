// Modèle User
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 15,
    },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    coverUrl: { type: String, default: '' },
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    dashboardTokenHash: { type: String, required: true },
    dashboardTokenPrefix: { type: String, index: true },
  },
  { timestamps: true }
);

// Ne jamais exposer le hash/prefix par défaut
UserSchema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.dashboardTokenHash;
    delete ret.dashboardTokenPrefix;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);
