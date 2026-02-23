const mongoose = require("mongoose");

// Track all financial transactions
const TransactionSchema = new mongoose.Schema({
  creator_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userData',
    required: true,
  },
  // Transaction amount
  amount: {
    type: Number,
    required: true,
  },
  // Transaction type: 'earning' (from ad views) or 'withdrawal'
  type: {
    type: String,
    enum: ['earning', 'withdrawal', 'premium_subscription'],
    required: true,
  },
  // Transaction status: 'pending', 'approved', 'completed', 'failed'
  status: {
    type: String,
    enum: ['pending', 'approved', 'completed', 'failed', 'rejected'],
    default: 'pending',
  },
  // Reference to video if earning
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoData',
  },
  // Reference to ad view if earning
  ad_view_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdView',
  },
  // Withdrawal details
  withdrawal_details: {
    razorpay_payment_id: { type: String, default: null },
    razorpay_withdrawal_id: { type: String, default: null },
    bank_reference: { type: String, default: null },
    failure_reason: { type: String, default: null },
  },
  // Premium subscription details
  subscription_details: {
    subscriber_id: { type: mongoose.Schema.Types.ObjectId, ref: 'userData' },
    subscription_start: { type: Date },
    subscription_end: { type: Date },
    razorpay_subscription_id: { type: String },
    razorpay_payment_id: { type: String },
  },
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  // Admin who approved withdrawal
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userData',
  },
  approved_at: {
    type: Date,
  },
});

// Index for efficient queries
TransactionSchema.index({ creator_id: 1, created_at: -1 });
TransactionSchema.index({ type: 1, status: 1 });

const Transaction = mongoose.model("Transaction", TransactionSchema);

module.exports = Transaction;
