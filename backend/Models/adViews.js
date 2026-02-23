const mongoose = require("mongoose");
const validator = require("validator");

// Track ad views for monetization
const AdViewSchema = new mongoose.Schema({
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoData',
    required: true,
  },
  viewer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userData',
    required: true,
  },
  // Revenue generated from this ad view
  ad_revenue_generated: {
    type: Number,
    required: true,
  },
  // Creator's share (55%)
  creator_share: {
    type: Number,
    required: true,
  },
  // Platform's share (45%)
  platform_share: {
    type: Number,
    required: true,
  },
  // CPM used for calculation
  cpm: {
    type: Number,
    required: true,
  },
  // IP address for fraud prevention
  ip_address: {
    type: String,
  },
  // User agent for bot detection
  user_agent: {
    type: String,
  },
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Whether this view counted for monetization
  is_monetized: {
    type: Boolean,
    default: true,
  },
});

// Index for efficient queries
AdViewSchema.index({ video_id: 1, viewer_id: 1, timestamp: -1 });
AdViewSchema.index({ viewer_id: 1, timestamp: -1 });

const AdView = mongoose.model("AdView", AdViewSchema);

module.exports = AdView;
