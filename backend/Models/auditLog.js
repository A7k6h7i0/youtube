const mongoose = require("mongoose");

// Audit log for all monetization events
const AuditLogSchema = new mongoose.Schema({
  event_type: {
    type: String,
    enum: ['ad_view', 'earning', 'withdrawal', 'premium_subscription', 'payout', 'balance_update'],
    required: true,
  },
  // Who initiated the action
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userData',
    required: true,
  },
  // Additional user info for fraud detection
  user_email: {
    type: String,
  },
  ip_address: {
    type: String,
  },
  user_agent: {
    type: String,
  },
  // Transaction details
  amount: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  // Reference to related documents
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoData',
  },
  transaction_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  ad_view_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdView',
  },
  // Revenue split details
  revenue_details: {
    creator_share: { type: Number, default: 0 },
    platform_share: { type: Number, default: 0 },
    cpm: { type: Number, default: 0 },
  },
  // Status
  status: {
    type: String,
    enum: ['success', 'failed', 'pending', 'flagged'],
    default: 'success',
  },
  // Failure reason if any
  failure_reason: {
    type: String,
    default: null,
  },
  // Risk assessment
  risk_score: {
    type: Number,
    default: 0,
  },
  risk_flags: [{
    type: String,
  }],
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// Index for efficient queries
AuditLogSchema.index({ event_type: 1, timestamp: -1 });
AuditLogSchema.index({ user_id: 1, timestamp: -1 });
AuditLogSchema.index({ video_id: 1, timestamp: -1 });
AuditLogSchema.index({ status: 1, timestamp: -1 });
AuditLogSchema.index({ ip_address: 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", AuditLogSchema);

module.exports = AuditLog;
