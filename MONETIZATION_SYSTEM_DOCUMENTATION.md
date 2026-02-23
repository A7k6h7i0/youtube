# YouTube Clone - Monetization System Documentation

## Table of Contents
1. [Project Architecture Overview](#1-project-architecture-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Database Schema](#3-database-schema)
4. [Monetization Flow](#4-monetization-flow)
5. [Creator Requirements (1000 Subscribers + 4000 Watch Hours)](#5-creator-requirements-1000-subscribers--4000-watch-hours)
6. [Revenue Distribution](#6-revenue-distribution)
7. [Withdrawal System](#7-withdrawal-system)
8. [Frontend Components](#8-frontend-components)
9. [API Endpoints](#9-api-endpoints)
10. [Configuration](#10-configuration)

---

## 1. Project Architecture Overview

```
YouTube Clone (MERN Stack)
├── backend/                    # Node.js + Express API
│   ├── Models/                # MongoDB Schemas
│   ├── Router/                # API Routes
│   ├── Database/              # Database Connection
│   ├── lib/                  # Utilities (tokens)
│   └── server.js             # Entry Point
│
└── frontend/                  # React + Vite
    ├── src/
    │   ├── Components/        # UI Components
    │   ├── api/              # API Calls
    │   ├── Css/              # Styles
    │   └── reducer/          # Redux State
    └── index.html
```

---

## 2. User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Viewer** | Watch videos, like/comment, subscribe |
| **Creator** | Upload videos, access Studio, earn from ads, withdraw earnings |
| **Admin** | Manage users, approve withdrawals, view all analytics |

### Where Roles Are Defined

**File:** `backend/Models/user.js` (Lines 82-87)
```javascript
role: {
  type: String,
  enum: ['admin', 'creator', 'viewer'],
  default: 'viewer',
},
```

### How to Set Admin Role

Currently, there's no admin panel. To make a user admin, you need to manually update the database:

```javascript
// In MongoDB shell or Compass
db.userData.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

---

## 3. Database Schema

### 3.1 Users Collection (`userData`)

**File:** `backend/Models/user.js`

```javascript
{
  _id: ObjectId,
  name: String,           // User's name
  email: String,          // Unique email
  password: String,       // Hashed password
  profilePic: String,     // Profile image URL
  
  // MONETIZATION FIELDS
  role: 'viewer' | 'creator' | 'admin',  // User role
  wallet_balance: Number, // Current withdrawable balance
  total_earnings: Number, // Lifetime earnings
  
  // Premium Subscription
  isPremium: Boolean,
  premiumExpiryDate: Date,
  
  // Bank Details for Withdrawals (SECURITY WARNING: Not encrypted)
  bankDetails: {
    accountNumber: String,
    accountHolderName: String,
    ifscCode: String,
    bankName: String
  },
  
  // Razorpay
  razorpayCustomerId: String,
  
  hasChannel: Boolean,
  createdAt: Date
}
```

### 3.2 Videos Collection (`VideoData`)

**File:** `backend/Models/videos.js`

```javascript
{
  _id: ObjectId,
  email: String,           // Creator's email
  creator_id: ObjectId,    // Reference to userData
  
  // Monetization Settings
  cpm: Number,             // Cost per 1000 views (default: 100)
  isMonetized: Boolean,    // Is monetization enabled
  
  VideoData: [{
    thumbnailURL: String,
    uploader: String,
    videoURL: String,
    ChannelProfile: String,
    Title: String,
    Description: String,
    Tags: String,
    videoLength: Number,
    views: Number,
    uploaded_date: String,
    visibility: String,
    likes: Number,
    comments: Array,
    
    // Monetization Analytics
    total_revenue: Number,   // Total earnings from this video
    total_views: Number,    // Total video views
    monetized_views: Number  // Views that earned revenue
  }]
}
```

### 3.3 Ad Views Collection (`AdView`)

**File:** `backend/Models/adViews.js`

```javascript
{
  _id: ObjectId,
  video_id: ObjectId,           // Reference to VideoData
  viewer_id: ObjectId,           // Reference to userData (who watched)
  
  // Revenue Details
  ad_revenue_generated: Number,  // Total revenue from this ad
  creator_share: Number,         // 55% to creator
  platform_share: Number,        // 45% to platform
  cpm: Number,                   // CPM used for calculation
  
  // Fraud Prevention
  ip_address: String,
  user_agent: String,
  is_monetized: Boolean,
  
  timestamp: Date
}
```

### 3.4 Transactions Collection (`Transaction`)

**File:** `backend/Models/transactions.js`

```javascript
{
  _id: ObjectId,
  creator_id: ObjectId,         // Who earned/withdrew
  
  amount: Number,                // Transaction amount
  type: 'earning' | 'withdrawal' | 'premium_subscription',
  status: 'pending' | 'approved' | 'completed' | 'failed' | 'rejected',
  
  // For Earnings
  video_id: ObjectId,
  ad_view_id: ObjectId,
  
  // For Withdrawals
  withdrawal_details: {
    razorpay_payment_id: String,
    razorpay_withdrawal_id: String,
    bank_reference: String,
    failure_reason: String
  },
  
  // For Premium
  subscription_details: {
    subscriber_id: ObjectId,
    subscription_start: Date,
    subscription_end: Date
  },
  
  created_at: Date,
  updated_at: Date,
  approved_by: ObjectId,
  approved_at: Date
}
```

### 3.5 View Sessions Collection (`ViewSession`)

**File:** `backend/Models/viewSession.js`

```javascript
{
  _id: ObjectId,
  video_id: ObjectId,
  viewer_id: ObjectId,
  ip_address: String,
  
  session_start: Date,
  last_ad_view: Date,        // For 24-hour rule
  ads_viewed_count: Number,
  ad_shown: Boolean,
  
  // Fraud Detection
  user_agent: String,
  bot_score: Number,
  is_blocked: Boolean,
  block_reason: String
}
```

### 3.6 Audit Logs Collection (`AuditLog`)

**File:** `backend/Models/auditLog.js`

```javascript
{
  _id: ObjectId,
  event_type: 'ad_view' | 'earning' | 'withdrawal' | 'premium_subscription' | 'payout',
  user_id: ObjectId,
  user_email: String,
  ip_address: String,
  
  amount: Number,
  currency: 'INR',
  
  video_id: ObjectId,
  transaction_id: ObjectId,
  
  revenue_details: {
    creator_share: Number,
    platform_share: Number,
    cpm: Number
  },
  
  status: 'success' | 'failed' | 'pending' | 'flagged',
  risk_score: Number,
  risk_flags: Array,
  
  timestamp: Date
}
```

---

## 4. Monetization Flow

### 4.1 When User Watches a Video:

```
1. User starts watching video
   │
   ▼
2. Frontend calls: POST /api/monetization/start-view
   │
   ▼
3. Backend checks:
   ├── Is video monetized?
   ├── Is user premium? (skip ads)
   ├── Has user seen ad in last 24h?
   │
   ▼
4. Returns: shouldShowAd = true/false
   │
   ▼
5. If shouldShowAd = true:
   ├── Show ad to user
   │
   ▼
6. After ad viewed:
   ├── Frontend calls: POST /api/monetization/record-ad-view
   │
   ▼
7. Backend calculates:
   ├── revenue = CPM / 1000
   ├── creator_share = revenue × 0.55
   ├── platform_share = revenue × 0.45
   │
   ▼
8. Updates database:
   ├── creator.wallet_balance += creator_share
   ├── creator.total_earnings += creator_share
   ├── video.total_revenue += revenue
   ├── video.monetized_views += 1
   │
   ▼
9. Creates records:
   ├── AdView record
   ├── Transaction record (earning)
   ├── AuditLog record
```

### 4.2 Revenue Calculation Example:

```
CPM = ₹100 (set per video)

Revenue per view = 100 / 1000 = ₹0.10

For each ad view:
- Total Revenue: ₹0.10
- Creator gets: ₹0.10 × 0.55 = ₹0.055
- Platform gets: ₹0.10 × 0.45 = ₹0.045
```

---

## 5. Creator Requirements (1000 Subscribers + 4000 Watch Hours)

**⚠️ CURRENT STATUS: This feature is NOT YET IMPLEMENTED**

The current system allows any creator to enable monetization. You need to add:

### 5.1 Add Watch Time Tracking to User Model

**File:** `backend/Models/user.js`

```javascript
// Add these fields
watchTime: {
  total_seconds: { type: Number, default: 0 },
  last_updated: { type: Date }
},
channel_stats: {
  subscriber_count: { type: Number, default: 0 },
  total_watch_hours: { type: Number, default: 0 },
  meets_monetization_requirements: { type: Boolean, default: false }
}
```

### 5.2 Add Eligibility Check in Monetization Router

**File:** `backend/Router/monetization.js`

```javascript
// In enable-monetization endpoint, add:
const meetsRequirements = 
  user.channel_stats.subscriber_count >= 1000 &&
  user.channel_stats.total_watch_hours >= 4000;

if (!meetsRequirements) {
  return res.status(400).json({
    success: false,
    message: "Need 1000 subscribers and 4000 watch hours"
  });
}
```

### 5.3 Track Watch Time

When user watches videos, increment their watch time:

```javascript
// POST /api/monetization/track-watch-time
// Called periodically while video plays
await userData.findByIdAndUpdate(userId, {
  $inc: { "channel_stats.total_watch_hours": watchedSeconds / 3600 }
});
```

---

## 6. Revenue Distribution

### 6.1 Default Split (Configured in `.env`)

```
CREATOR_SHARE = 0.55 (55%)
PLATFORM_SHARE = 0.45 (45%)
```

### 6.2 Configuration

**File:** `backend/.env.example`

```env
# Revenue split
CREATOR_SHARE=0.55
PLATFORM_SHARE=0.45

# CPM (Cost Per 1000 views)
DEFAULT_CPM=100

# Minimum withdrawal
MIN_WITHDRAWAL_AMOUNT=1000

# Premium price
PREMIUM_PRICE_INR=199
```

---

## 7. Withdrawal System

### 7.1 Flow:

```
1. Creator goes to Studio → Monetization
   │
   ▼
2. Clicks "Withdraw" button
   │
   ▼
3. Enters amount (minimum ₹1000)
   │
   ▼
4. Backend:
   ├── Checks balance >= 1000
   ├── Checks bank details exist
   ├── Atomically deducts from wallet
   ├── Creates pending transaction
   │
   ▼
5. Transaction status = "pending"
   │
   ▼
6. Admin reviews (future: auto-approve)
   │
   ▼
7. Admin approves → status = "completed"
   │
   ▼
8. Razorpay payout triggered (TODO)
```

### 7.2 Bank Details Storage

**Where:** `userData` collection → `bankDetails` field

**File:** `backend/Models/user.js` (Lines 111-120)

```javascript
bankDetails: {
  accountNumber: String,      // ⚠️ Stored in PLAIN TEXT
  accountHolderName: String,
  ifscCode: String,
  bankName: String
}
```

**⚠️ SECURITY WARNING:** In production, use MongoDB Field Level Encryption or a key management service (AWS KMS, Azure Key Vault).

### 7.3 API Endpoints for Withdrawal

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/monetization/withdraw` | POST | Request withdrawal |
| `/api/monetization/withdrawal-history` | GET | Get all withdrawals |
| `/api/monetization/pending-withdrawals` | GET | Admin: get pending (admin only) |
| `/api/monetization/approve-withdrawal` | POST | Admin: approve/reject |
| `/api/monetization/update-bank-details` | POST | Update bank info |

---

## 8. Frontend Components

### 8.1 Monetization Dashboard

**File:** `frontend/src/Components/Studio/MonetizationDashboard.jsx`

Features:
- Wallet balance display
- Total earnings
- Total views
- Ad revenue
- Monthly earnings chart
- Top earning videos table
- Withdraw button
- Bank details management
- Enable/disable monetization toggle

### 8.2 Premium Subscription

**File:** `frontend/src/Components/PremiumSubscription.jsx`

Features:
- Premium benefits display
- ₹199/month pricing
- Razorpay checkout integration
- Premium status display
- Expiry date

### 8.3 Navigation

| Location | File | Added |
|----------|------|-------|
| Studio Menu | `LeftPanel2.jsx` | Monetization option |
| Navbar | `Navbar.jsx` | Premium button |

---

## 9. API Endpoints

### 9.1 Ad Revenue

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/monetization/start-view` | POST | User | Start view session |
| `/api/monetization/record-ad-view` | POST | User | Record ad view, distribute revenue |

### 9.2 Creator Dashboard

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/monetization/dashboard` | GET | Creator | Get earnings stats |
| `/api/monetization/video-analytics/:id` | GET | Creator | Per-video stats |

### 9.3 Withdrawals

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/monetization/withdraw` | POST | Creator | Request withdrawal |
| `/api/monetization/withdrawal-history` | GET | Creator | Get history |
| `/api/monetization/pending-withdrawals` | GET | Admin | Get pending |
| `/api/monetization/approve-withdrawal` | POST | Admin | Approve/reject |
| `/api/monetization/update-bank-details` | POST | Creator | Update bank |

### 9.4 Premium

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/monetization/create-premium-order` | POST | User | Create Razorpay order |
| `/api/monetization/verify-premium-payment` | POST | User | Verify & activate |
| `/api/monetization/premium-status` | GET | User | Check status |

### 9.5 Settings

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/monetization/enable-monetization` | POST | Creator | Toggle monetization |
| `/api/monetization/config` | GET | Public | Get Razorpay key |

---

## 10. Configuration

### 10.1 Required Environment Variables

**File:** `backend/.env`

```env
# Server
PORT=3000
SECRET_KEY=your_secret_key

# Database
MONGO_URI=your_mongodb_uri

# Email (for password reset)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
BACKEND_URL=http://localhost:3000

# ⚠️ RAZORPAY (REQUIRED FOR PAYMENTS)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Monetization Settings
DEFAULT_CPM=100
CREATOR_SHARE=0.55
PLATFORM_SHARE=0.45
MIN_WITHDRAWAL_AMOUNT=1000
PREMIUM_PRICE_INR=199
```

### 10.2 How to Get Razorpay Keys

1. Go to https://dashboard.razorpay.com/
2. Sign up/Login
3. Go to Settings → API Keys
4. Generate Key ID and Key Secret
5. Add to `.env` file

---

## Summary

| Feature | Status | Location |
|---------|--------|----------|
| User Roles | ✅ Implemented | user.js |
| Video Monetization | ✅ Implemented | videos.js |
| Ad View Tracking | ✅ Implemented | adViews.js |
| Transactions | ✅ Implemented | transactions.js |
| View Sessions (Fraud) | ✅ Implemented | viewSession.js |
| Creator Dashboard | ✅ Implemented | MonetizationDashboard.jsx |
| Premium Subscription | ✅ Implemented | PremiumSubscription.jsx |
| Withdrawal System | ✅ Implemented | monetization.js |
| Bank Details Storage | ✅ Implemented | user.js |
| 1000/4000 Requirement | ❌ NOT IMPLEMENTED | Needs to be added |
| Razorpay Payouts | ⚠️ Partial | TODO - needs business account |

---

*Document generated for YouTube Clone MERN Project*
