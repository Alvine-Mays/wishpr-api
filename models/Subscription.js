// Modèle Subscription (Web Push)
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    userAgent: { type: String },
    lastSeenAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Unicité de l'endpoint par utilisateur
SubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });
SubscriptionSchema.index({ userId: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
