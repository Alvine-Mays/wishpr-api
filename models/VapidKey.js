// Modèle VapidKey — stocke une paire de clés VAPID si absente de l'env
const mongoose = require('mongoose');

const VapidKeySchema = new mongoose.Schema(
  {
    publicKey: { type: String, required: true },
    privateKey: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

VapidKeySchema.index({ createdAt: 1 });

module.exports = mongoose.model('VapidKey', VapidKeySchema);
