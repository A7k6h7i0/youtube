const express = require("express");
const cors = require("cors");
const router = require("./Router/router");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");
const videodata = require("./Models/videos");
const TrendingData = require("./Models/trending");

const app = express();
const initialPort = Number(process.env.PORT) || 3000;
app.set("trust proxy", 1);

// ✅ Enable CORS (ONLY ONCE)
const allowedOrigins = (
  process.env.FRONTEND_ORIGINS ||
  "http://localhost:5173,https://shubho-youtube-mern.netlify.app"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      // Also allow requests from the allowed list
      if (!origin || allowedOrigins.some(allowed => origin.includes(allowed))) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(null, true); // Allow all for now
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ✅ Parse JSON
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));

// View engine
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use(router);

// Auto-seed demo videos on startup if database is empty
const seedDemoVideos = async () => {
  try {
    // Check if demo videos already exist (by checking for demo email pattern)
    const demoVideoExists = await videodata.findOne({ 
      email: { $regex: /^demo\..*@example\.com$/ } 
    });
    
    if (demoVideoExists) {
      console.log("Demo videos already exist in database, skipping seed.");
      return;
    }
    
    console.log("No demo videos found in database. Seeding demo videos...");
    
    const isoDate = new Date().toISOString();
    const videoSources = [
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      "https://www.w3schools.com/html/mov_bbb.mp4",
      "https://media.w3.org/2010/05/sintel/trailer.mp4",
    ];
    
    const demoChannels = [
      { tag: "Artificial Intelligence", email: "demo.ai@example.com", uploader: "AI Academy", profile: "https://i.pravatar.cc/150?img=12", extraTags: "AI, Tech, Machine Learning" },
      { tag: "Comedy", email: "demo.comedy@example.com", uploader: "Funny Hub", profile: "https://i.pravatar.cc/150?img=22", extraTags: "Funny, Standup" },
      { tag: "Gaming", email: "demo.gaming@example.com", uploader: "Gaming World", profile: "https://i.pravatar.cc/150?img=5", extraTags: "Highlights, Gameplay" },
      { tag: "Vlog", email: "demo.vlog@example.com", uploader: "Daily Vlogs", profile: "https://i.pravatar.cc/150?img=33", extraTags: "Lifestyle" },
      { tag: "Beauty", email: "demo.beauty@example.com", uploader: "Glow Studio", profile: "https://i.pravatar.cc/150?img=41", extraTags: "Skincare, Makeup" },
      { tag: "Travel", email: "demo.travel@example.com", uploader: "Travel Now", profile: "https://i.pravatar.cc/150?img=9", extraTags: "Adventure" },
      { tag: "Food", email: "demo.food@example.com", uploader: "Food Corner", profile: "https://i.pravatar.cc/150?img=18", extraTags: "Cooking, Street Food" },
      { tag: "Fashion", email: "demo.fashion@example.com", uploader: "Style Guide", profile: "https://i.pravatar.cc/150?img=25", extraTags: "Trends, Outfits" },
    ];
    
    const titles = [
      "Amazing Things You Need to See!", "Top 10 List That Will Blow Your Mind", "Tutorial: Complete Guide", "Review: Is It Worth It?",
      "Behind the Scenes", "Q&A: Your Questions Answered", "Vlog: A Day in My Life", "Challenge: 24 Hours"
    ];
    
    const descriptions = [
      "Check out this amazing content! Don't forget to like and subscribe.",
      "This is the ultimate guide you've been looking for. Leave a comment below!",
      "Thanks for watching! Let me know what you think in the comments.",
      "NEW video every week! Turn on notifications so you don't miss it."
    ];
    
    for (const channel of demoChannels) {
      const videos = [];
      const numVideos = 3 + Math.floor(Math.random() * 3); // 3-5 videos per channel
      
      for (let i = 0; i < numVideos; i++) {
        const seed = `${channel.tag}-${i}-${Date.now()}`;
        videos.push({
          thumbnailURL: `https://picsum.photos/seed/${seed}/640/360`,
          uploader: channel.uploader,
          videoURL: videoSources[i % videoSources.length],
          ChannelProfile: channel.profile,
          Title: `${channel.tag}: ${titles[i % titles.length]}`,
          Description: descriptions[i % descriptions.length],
          Tags: channel.extraTags,
          videoLength: 60 + Math.floor(Math.random() * 300),
          uploaded_date: isoDate,
          visibility: "Public",
          likes: Math.floor(Math.random() * 1000),
          views: Math.floor(Math.random() * 10000),
          comments: [],
        });
      }
      
      await videodata.create({ email: channel.email, VideoData: videos });
      console.log(`Seeded ${videos.length} videos for ${channel.uploader}`);
    }
    
    // Seed trending data
    console.log("Seeding trending data...");
    const allVideos = await videodata.find({});
    const allVideoData = allVideos.flatMap(v => v.VideoData || []).slice(0, 10);
    
    for (let i = 0; i < allVideoData.length; i++) {
      const video = allVideoData[i];
      await TrendingData.create({
        email: video.email || "demo@example.com",
        videoid: video._id,
        thumbnailURL: video.thumbnailURL,
        videoURL: video.videoURL,
        uploader: video.uploader,
        views: Math.floor(Math.random() * 5000) + 100,
        trendingNo: i + 1,
      });
    }
    console.log("Trending data seeded!");
    
    console.log("Demo videos seeding completed!");
  } catch (error) {
    console.error("Error seeding demo videos:", error.message);
  }
};

// Start server and seed if needed
const startServer = (port) => {
  const server = http.createServer(app);

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use. Retrying on port ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error("Server startup error:", error);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
    // Seed demo videos after a short delay to ensure DB is connected
    setTimeout(seedDemoVideos, 2000);
  });
};

startServer(initialPort);
