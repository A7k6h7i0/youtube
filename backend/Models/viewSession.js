const mongoose = require("mongoose");

// Track view sessions to prevent fake views
const ViewSessionSchema = new mongoose.Schema({
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
  // IP address for fraud detection
  ip_address: {
    type: String,
    required: true,
  },
  // Session start time
  session_start: {
    type: Date,
    default: Date.now,
  },
  // Last ad view time (for 24h rule)
  last_ad_view: {
    type: Date,
    default: null,
  },
  // Number of ads viewed in this session
  ads_viewed_count: {
    type: Number,
    default: 0,
  },
  // Whether ad was shown in this session
  ad_shown: {
    type: Boolean,
    default: false,
  },
  // User agent for bot detection
  user_agent: {
    type: String,
  },
  // Bot score (0-100, higher = more likely bot)
  bot_score: {
    type: Number,
    default: 0,
  },
  // Is blocked due to suspicious activity
  is_blocked: {
    type: Boolean,
    default: false,
  },
  block_reason: {
    type: String,
    default: null,
  },
});

// Compound index for efficient queries
ViewSessionSchema.index({ video_id: 1, viewer_id: 1 });
ViewSessionSchema.index({ video_id: 1, ip_address: 1 });
ViewSessionSchema.index({ viewer_id: 1, session_start: -1 });

const ViewSession = mongoose.model("ViewSession", ViewSessionSchema);

module.exports = ViewSession;
