// Modèle Message
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, maxlength: 1000 },
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true },
    sourceIpHash: { type: String },
  },
  { timestamps: false }
);

// Index composé pour tri efficace
MessageSchema.index({ userId: 1, createdAt: -1 });
// TTL sur expiresAt (expire à l’instant exact)
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', MessageSchema);
