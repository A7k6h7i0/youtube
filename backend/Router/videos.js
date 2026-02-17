require("dotenv").config();
require("../Database/database");
const express = require("express");
const userData = require("../Models/user");
const videodata = require("../Models/videos");
const TrendingData = require("../Models/trending");
const cookieParser = require("cookie-parser");
const {
  verifyRefreshToken,
  generateAccessToken,
  getAuthCookieOptions,
} = require("../lib/tokens");
const Videos = express.Router();

Videos.use(cookieParser());

// Public endpoint to seed demo videos (no auth required)
Videos.get("/seed-demo-videos", async (req, res) => {
  try {
    // Check if demo videos already exist
    const demoVideoExists = await videodata.findOne({ 
      email: { $regex: /^demo\..*@example\.com$/ } 
    });
    
    if (demoVideoExists) {
      return res.json({ success: true, message: "Demo videos already exist" });
    }
    
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
      const numVideos = 3 + Math.floor(Math.random() * 3);
      
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
    }
    
    res.json({ success: true, message: "Demo videos seeded successfully!" });
  } catch (error) {
    console.error("Error seeding demo videos:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const ensureDebugOnly = (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ message: "Not found" });
  }
  next();
};

const ensureSeedAuthorized = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  const secret = process.env.SEED_SECRET;

  if (isProduction && !secret) {
    return res.status(404).json({ message: "Not found" });
  }

  if (secret) {
    const provided = req.get("x-seed-secret");
    if (provided !== secret) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
  }

  next();
};

Videos.post("/publish", async (req, res) => {
  try {
    const {
      videoTitle,
      videoDescription,
      tags,
      videoLink,
      thumbnailLink,
      video_duration,
      email,
      publishDate,
      Visibility,
    } = req.body;

    const refreshToken = req.cookies?.refreshToken;
    const accessToken = req.cookies?.accessToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Unauthorized access, please login again",
      });
    }
    if (!accessToken) {
      //Refresh the access token
      const userID = verifyRefreshToken(refreshToken);
      const userData = { id: userID };
      const accessToken = generateAccessToken(userData);
      res.cookie("accessToken", accessToken, {
        ...getAuthCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    const user = await userData.findOne({ email });
    let videos = await videodata.findOne({ email });

    if (user) {
      user.videos.push({ videoURL: videoLink, videoLength: video_duration });
      user.thumbnails.push({ imageURL: thumbnailLink });

      if (!videos) {
        videos = new videodata({
          email,

          VideoData: [
            {
              thumbnailURL: thumbnailLink,
              uploader: user.channelName,
              videoURL: videoLink,
              ChannelProfile: user.profilePic,
              Title: videoTitle,
              Description: videoDescription,
              Tags: tags,
              videoLength: video_duration,
              uploaded_date: publishDate,
              visibility: Visibility,
            },
          ],
        });
      } else {
        videos.VideoData.push({
          thumbnailURL: thumbnailLink,
          uploader: user.channelName,
          videoURL: videoLink,
          ChannelProfile: user.profilePic,
          Title: videoTitle,
          Description: videoDescription,
          Tags: tags,
          videoLength: video_duration,
          uploaded_date: publishDate,
          visibility: Visibility,
        });
      }

      await user.save();
      await videos.save();

      return res.status(200).json("Published");
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
});

Videos.get("/getvideos", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const videos = await videodata.find({});
    const safeVideoArray = (video) =>
      Array.isArray(video?.VideoData) ? video.VideoData : [];

    const videoURLs = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.videoURL)
    );
    const thumbnailURLs = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.thumbnailURL)
    );
    const titles = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.Title)
    );
    const Uploader = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.uploader)
    );
    const Duration = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.videoLength)
    );
    const Profile = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.ChannelProfile)
    );
    const videoID = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.id)
    );
    const comments = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.comments)
    );
    const views = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.views)
    );
    const uploadDate = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.uploaded_date)
    );
    const Likes = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.likes)
    );
    const Visibility = videos.flatMap((video) =>
      safeVideoArray(video).map((data) => data.visibility)
    );

    const videoData = videos.map((video) => {
      const obj = video.toObject();
      if (!Array.isArray(obj.VideoData)) obj.VideoData = [];
      return obj;
    });

    res.json({
      thumbnailURLs,
      videoURLs,
      titles,
      Uploader,
      Profile,
      Duration,
      videoID,
      comments,
      views,
      Likes,
      uploadDate,
      Visibility,
      videoData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});

Videos.get("/debug/videos-count", ensureDebugOnly, async (req, res) => {
  try {
    const connectionState = require("mongoose").connection.readyState;
    const totalDocs = await videodata.estimatedDocumentCount();
    const docsWithVideoData = await videodata.countDocuments({
      VideoData: { $exists: true, $ne: [] },
    });

    const videoCounts = await videodata.aggregate([
      {
        $project: {
          count: {
            $size: {
              $ifNull: ["$VideoData", []],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: "$count" },
        },
      },
    ]);
    const totalVideos = videoCounts[0]?.totalVideos || 0;

    res.json({ connectionState, totalDocs, docsWithVideoData, totalVideos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});

Videos.get("/debug/cookies", ensureDebugOnly, (req, res) => {
  res.json({ cookies: req.cookies || {} });
});

Videos.post("/dev/seed-demo-videos", ensureSeedAuthorized, async (req, res) => {
  try {
    const isoDate = new Date().toISOString();

    const videoSources = [
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      "https://www.w3schools.com/html/mov_bbb.mp4",
      "https://media.w3.org/2010/05/sintel/trailer.mp4",
    ];

    const perCategory =
      Number(req.body?.perCategory) > 0 ? Number(req.body.perCategory) : 10;
    const trendingCount =
      Number(req.body?.trendingCount) > 0 ? Number(req.body.trendingCount) : 10;

    const makeVideo = ({
      seed,
      uploader,
      channelProfile,
      title,
      description,
      tags,
      sourceIndex,
      seconds,
    }) => ({
      thumbnailURL: `https://picsum.photos/seed/${seed}/640/360`,
      uploader,
      videoURL: videoSources[sourceIndex % videoSources.length],
      ChannelProfile: channelProfile,
      Title: title,
      Description: description,
      Tags: tags,
      videoLength: seconds,
      uploaded_date: isoDate,
      visibility: "Public",
      likes: 0,
      views: 0,
      comments: [],
    });

    const demoChannels = [
      {
        tag: "Artificial Intelligence",
        email: "demo.ai@example.com",
        uploader: "AI Academy",
        profile: "https://i.pravatar.cc/150?img=12",
        extraTags: "AI, Tech, Machine Learning",
      },
      {
        tag: "Comedy",
        email: "demo.comedy@example.com",
        uploader: "Funny Hub",
        profile: "https://i.pravatar.cc/150?img=22",
        extraTags: "Funny, Standup",
      },
      {
        tag: "Gaming",
        email: "demo.gaming@example.com",
        uploader: "Gaming World",
        profile: "https://i.pravatar.cc/150?img=5",
        extraTags: "Highlights, Gameplay",
      },
      {
        tag: "Vlog",
        email: "demo.vlog@example.com",
        uploader: "Daily Vlogs",
        profile: "https://i.pravatar.cc/150?img=33",
        extraTags: "Lifestyle",
      },
      {
        tag: "Beauty",
        email: "demo.beauty@example.com",
        uploader: "Glow Studio",
        profile: "https://i.pravatar.cc/150?img=41",
        extraTags: "Skincare, Makeup",
      },
      {
        tag: "Travel",
        email: "demo.travel@example.com",
        uploader: "Travel Now",
        profile: "https://i.pravatar.cc/150?img=9",
        extraTags: "Adventure",
      },
      {
        tag: "Food",
        email: "demo.food@example.com",
        uploader: "Food Corner",
        profile: "https://i.pravatar.cc/150?img=18",
        extraTags: "Cooking, Street Food",
      },
      {
        tag: "Fashion",
        email: "demo.fashion@example.com",
        uploader: "Style Guide",
        profile: "https://i.pravatar.cc/150?img=28",
        extraTags: "Outfits, Trends",
      },
    ].filter((channel) => {
      if (!Array.isArray(req.body?.categories) || req.body.categories.length === 0) {
        return true;
      }
      return req.body.categories.includes(channel.tag);
    });

    const results = [];
    const seededForTrending = [];

    for (const channel of demoChannels) {
      const videos = Array.from({ length: perCategory }).map((_, index) => {
        const n = index + 1;
        const seed = `demo-${channel.tag.toLowerCase().replaceAll(" ", "-")}-${Date.now()}-${n}`;
        return makeVideo({
          seed,
          uploader: channel.uploader,
          channelProfile: channel.profile,
          title: `${channel.tag} Video #${n}`,
          description: `Demo ${channel.tag} video ${n}.`,
          tags: `${channel.tag}, ${channel.extraTags}`,
          sourceIndex: n,
          seconds: 60 + ((n * 13) % 240),
        });
      });

      const doc = await videodata.findOneAndUpdate(
        { email: channel.email },
        {
          $setOnInsert: { email: channel.email },
          $push: { VideoData: { $each: videos } },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const newSubdocs = doc.VideoData.slice(-videos.length);
      newSubdocs.forEach((subdoc, idx) => {
        seededForTrending.push({
          email: channel.email,
          videoid: subdoc._id.toString(),
          base: { ...videos[idx] },
        });
      });

      results.push({
        email: channel.email,
        tag: channel.tag,
        added: videos.length,
        total: doc.VideoData.length,
      });
    }

    const trendingPick = seededForTrending.slice(0, trendingCount);
    for (let i = 0; i < trendingPick.length; i++) {
      const t = trendingPick[i];
      await TrendingData.updateOne(
        { videoid: t.videoid },
        {
          $setOnInsert: {
            email: t.email,
            thumbnailURL: t.base.thumbnailURL,
            trendingNo: i + 1,
            uploader: t.base.uploader,
            videoURL: t.base.videoURL,
            ChannelProfile: t.base.ChannelProfile,
            Title: t.base.Title,
            Description: t.base.Description,
            videoid: t.videoid,
            videoLength: t.base.videoLength,
            views: 5000 - i * 250,
            uploaded_date: isoDate,
          },
        },
        { upsert: true }
      );
    }

    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    res.json({
      success: true,
      perCategory,
      trendingCount: trendingPick.length,
      channels: results,
      totalAdded,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
});

Videos.get("/getuservideos/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const video = await videodata.findOne({ email });
    if (!video) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(video.VideoData);
  } catch (error) {
    res.status(500).json({ message: "An error occurred" });
  }
});

Videos.get("/getuserimage/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await userData.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const channelIMG = user.profilePic;
    res.json({ channelIMG });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

Videos.get("/videodata/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const video = await videodata.findOne({ "VideoData._id": id });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

Videos.post("/updateview/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const video = await videodata.findOne({ "VideoData._id": id });
    const trending = await TrendingData.findOne({ videoid: id });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    const videoIndex = video.VideoData.findIndex(
      (data) => data._id.toString() === id
    );

    if (videoIndex === -1) {
      return res.status(404).json({ error: "Video not found" });
    }

    video.VideoData[videoIndex].views += 1;
    await video.save();

    if (trending) {
      trending.views += 1;
      await trending.save();
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/getlikevideos/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await userData.findOne({ email });
    if (!user) {
      return res.json("USER DOESN'T EXISTS");
    }
    const LikedData = user.likedVideos;
    if (LikedData.length > 0) {
      res.json(LikedData);
    } else {
      res.json("NO DATA");
    }
  } catch (error) {
    res.json(error.message);
  }
});

Videos.post("/watchlater/:id/:email/:email2", async (req, res) => {
  try {
    const { id, email, email2 } = req.params;

    const refreshToken = req.cookies?.refreshToken;
    const accessToken = req.cookies?.accessToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Unauthorized access, please login again",
      });
    }
    if (!accessToken) {
      //Refresh the access token
      const userID = verifyRefreshToken(refreshToken);
      const userData = { id: userID };
      const accessToken = generateAccessToken(userData);
      res.cookie("accessToken", accessToken, {
        ...getAuthCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    const video = await videodata.findOne({ "VideoData._id": id });
    const user = await userData.findOne({ email });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const videoIndex = video.VideoData.findIndex(
      (data) => data._id.toString() === id
    );

    if (videoIndex === -1) {
      return res.status(404).json({ error: "Video not found" });
    }

    const WatchLater = video.VideoData[videoIndex];

    const existingSavedVideo = user.watchLater.find(
      (savedVideo) => savedVideo.savedVideoID === WatchLater._id.toString()
    );

    if (existingSavedVideo) {
      user.watchLater = user.watchLater.filter(
        (savedVideo) => savedVideo.savedVideoID !== WatchLater._id.toString()
      );

      await user.save();
      await video.save();

      return res.json("Removed");
    }

    user.watchLater.push({
      email: email2,
      videoURL: WatchLater.videoURL,
      thumbnailURL: WatchLater.thumbnailURL,
      uploader: WatchLater.uploader,
      ChannelProfile: WatchLater.ChannelProfile,
      Title: WatchLater.Title,
      videoLength: WatchLater.videoLength,
      views: WatchLater.views,
      uploaded_date: WatchLater.uploaded_date,
      savedVideoID: WatchLater._id,
      videoprivacy: WatchLater.visibility,
    });

    await user.save();
    await video.save();
    res.json("Saved");
  } catch (error) {
    res.json(error.message);
  }
});

Videos.get("/checkwatchlater/:id/:email", async (req, res) => {
  try {
    const { id } = req.params;
    const email = req.params.email;
    const user = await userData.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const userIndex = user.watchLater.findIndex(
      (data) => data.savedVideoID.toString() === id.toString()
    );

    if (userIndex === -1) {
      return res.status(404).json({ error: "Video not found" });
    } else {
      res.json("Found");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/getwatchlater/:email", async (req, res) => {
  try {
    const { id } = req.params;
    const email = req.params.email;
    const user = await userData.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }
    const savedData = user.watchLater;

    if (savedData && savedData.length > 0) {
      res.json(savedData);
    } else {
      res.json({ savedData: "NO DATA" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/totalviews/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const video = await videodata.findOne({ email });
    if (!video) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    let totalViews = 0;

    video.VideoData.forEach((video) => {
      totalViews += video.views;
    });

    res.json(totalViews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/checktrending/:videoID/:email", async (req, res) => {
  try {
    const { videoID, email } = req.params;
    const video = await videodata.findOne({ "VideoData._id": videoID });
    if (!video) {
      return res.status(404).json({ error: "Video doesn't exist" });
    }

    const videoIndex = video.VideoData.findIndex(
      (data) => data._id.toString() === videoID
    );

    if (videoIndex === -1) {
      return res.status(404).json({ error: "Video not found" });
    }

    const mainVideo = video.VideoData[videoIndex];
    const Views = video.VideoData[videoIndex].views;
    const publish = video.VideoData[videoIndex].uploaded_date;

    const currentDate = new Date();
    const publishDate = new Date(publish);
    const timeDiffMs = currentDate - publishDate;

    const timeDiffHours = Math.round(timeDiffMs / (1000 * 60 * 60)); // Convert ms to hours

    const trendingVideo = await TrendingData.findOne({
      videoid: videoID,
    });

    if (timeDiffHours < 24 && Views >= 50 && !trendingVideo) {
      const trending = new TrendingData({
        email: email,
        thumbnailURL: mainVideo.thumbnailURL,
        uploader: mainVideo.uploader,
        videoURL: mainVideo.videoURL,
        ChannelProfile: mainVideo.ChannelProfile,
        Title: mainVideo.Title,
        Description: mainVideo.Description,
        videoLength: mainVideo.videoLength,
        views: mainVideo.views,
        uploaded_date: mainVideo.uploaded_date,
        videoid: mainVideo._id,
      });
      return await trending.save();
    }

    res.json("DONE");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/gettrendingdata/:videoID", async (req, res) => {
  try {
    const { videoID } = req.params;
    const trending = await TrendingData.findOne({ videoid: videoID });
    if (!trending) {
      return res.status(404).json(false);
    }
    res.json(true);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/gettrending", async (req, res) => {
  try {
    const trending = await TrendingData.find();
    if (trending.length > 0) {
      res.json(trending);
    } else {
      res.json("NO DATA");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/search/:data", async (req, res) => {
  try {
    const { data } = req.params;
    const video = await videodata.find();
    const users = await userData.find({}, { channelData: 1 });

    const filteredVideos = video.reduce((accumulator, element) => {
      const filteredVideoData = element.VideoData.filter((item) => {
        const includesTitle = item.Title.toLowerCase().includes(
          data.toLowerCase()
        );
        const includesTags = item.Tags.toLowerCase().includes(
          data.toLowerCase()
        );
        return includesTitle || includesTags;
      });
      if (filteredVideoData.length > 0) {
        accumulator.push(...filteredVideoData);
      }
      return accumulator;
    }, []);

    const filteredChannels = users.filter((userData) =>
      userData.channelData.some((channel) =>
        channel.channelName.toLowerCase().includes(data.toLowerCase())
      )
    );

    if (filteredVideos.length > 0 && filteredChannels.length > 0) {
      res.json({
        videoData: filteredVideos,
        channelData: filteredChannels[0].channelData,
      });
    } else if (filteredVideos.length > 0) {
      res.json({ videoData: filteredVideos });
    } else if (filteredChannels.length > 0) {
      res.json({ channelData: filteredChannels[0].channelData });
    } else {
      res.json({ videoData: "NO DATA", channelData: "NO DATA" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.post("/addplaylist/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const {
      playlist_name,
      playlist_privacy,
      playlist_date,
      playlist_owner,
      thumbnail,
      title,
      videoID,
      description,
      videolength,
      video_uploader,
      video_date,
      video_views,
      videoprivacy,
    } = req.body;

    const refreshToken = req.cookies?.refreshToken;
    const accessToken = req.cookies?.accessToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Unauthorized access, please login again",
      });
    }
    if (!accessToken) {
      //Refresh the access token
      const userID = verifyRefreshToken(refreshToken);
      const userData = { id: userID };
      const accessToken = generateAccessToken(userData);
      res.cookie("accessToken", accessToken, {
        ...getAuthCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    const user = await userData.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const myPlaylists = user.Playlists;
    myPlaylists.push({
      playlist_name,
      owner_email: email,
      playlist_privacy,
      playlist_date,
      playlist_owner,
      playlist_videos: [
        {
          thumbnail,
          title,
          videoID,
          description,
          videolength,
          video_uploader,
          video_date,
          video_views,
          videoprivacy,
        },
      ],
    });

    await user.save();

    res.json(myPlaylists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/getplaylistdata/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await userData.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const playlists = user.Playlists;

    if (playlists && playlists.length > 0) {
      res.json(playlists);
    } else {
      res.json("No playlists available...");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.post("/addvideotoplaylist/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const {
      Id,
      thumbnail,
      title,
      videoID,
      description,
      videolength,
      video_uploader,
      video_date,
      video_views,
      videoprivacy,
    } = req.body;

    const refreshToken = req.cookies?.refreshToken;
    const accessToken = req.cookies?.accessToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Unauthorized access, please login again",
      });
    }
    if (!accessToken) {
      //Refresh the access token
      const userID = verifyRefreshToken(refreshToken);
      const userData = { id: userID };
      const accessToken = generateAccessToken(userData);
      res.cookie("accessToken", accessToken, {
        ...getAuthCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    const user = await userData.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }
    const playlistToUpdate = user.Playlists.find(
      (playlist) => playlist._id.toString() === Id.toString()
    );

    if (!playlistToUpdate) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    const isVideoExists = playlistToUpdate.playlist_videos.some(
      (video) => video.videoID === videoID
    );

    if (isVideoExists) {
      return res
        .status(409)
        .json({ error: "Video already exists in the playlist" });
    }

    const newVideo = {
      thumbnail,
      title,
      videoID,
      description,
      videolength,
      video_uploader,
      video_date,
      video_views,
      videoprivacy,
    };

    playlistToUpdate.playlist_videos.push(newVideo);
    await user.save();

    res.status(200).json({ message: "Video added to the playlist" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/getvideodataplaylist/:email/:videoId", async (req, res) => {
  try {
    const { email, videoId } = req.params;
    const user = await userData.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const playlistsWithVideo = user.Playlists.filter((playlist) =>
      playlist.playlist_videos.some((video) => video.videoID === videoId)
    );

    if (playlistsWithVideo.length === 0) {
      return res.json("Video doesn't exist in any playlist");
    }

    const playlistIdsWithVideo = playlistsWithVideo.map(
      (playlist) => playlist._id
    );

    return res.json(playlistIdsWithVideo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.post("/removevideo/:email/:videoID/:playlistID", async (req, res) => {
  try {
    const { email, videoID, playlistID } = req.params;

    const refreshToken = req.cookies?.refreshToken;
    const accessToken = req.cookies?.accessToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Unauthorized access, please login again",
      });
    }
    if (!accessToken) {
      //Refresh the access token
      const userID = verifyRefreshToken(refreshToken);
      const userData = { id: userID };
      const accessToken = generateAccessToken(userData);
      res.cookie("accessToken", accessToken, {
        ...getAuthCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    const user = await userData.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const playlist = user.Playlists.find(
      (playlist) => playlist._id.toString() === playlistID.toString()
    );

    if (!playlist) {
      return res.json("Playlist not found");
    }

    const videoIndex = playlist.playlist_videos.findIndex(
      (video) => video.videoID === videoID
    );

    if (videoIndex === -1) {
      return res.json("Video doesn't exist in the playlist");
    }

    playlist.playlist_videos.splice(videoIndex, 1);

    await user.save();

    res.json("Video removed from the playlist successfully");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/getplaylists/:playlistID", async (req, res) => {
  try {
    const { playlistID } = req.params;
    const user = await userData.findOne({ "Playlists._id": playlistID });

    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const myPlaylists = user.Playlists.find(
      (item) => item._id.toString() === playlistID.toString()
    );
    const playlistVideos = myPlaylists.playlist_videos;
    if (playlistVideos && playlistVideos.length > 0) {
      res.json({ playlistVideos, myPlaylists });
    } else {
      res.json({ playlistVideos: "No Playlists Found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.post("/saveplaylist/:playlistID", async (req, res) => {
  try {
    const { playlistID } = req.params;
    const { playlist_name } = req.body;

    const refreshToken = req.cookies?.refreshToken;
    const accessToken = req.cookies?.accessToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Unauthorized access, please login again",
      });
    }
    if (!accessToken) {
      //Refresh the access token
      const userID = verifyRefreshToken(refreshToken);
      const userData = { id: userID };
      const accessToken = generateAccessToken(userData);
      res.cookie("accessToken", accessToken, {
        ...getAuthCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    const user = await userData.findOne({ "Playlists._id": playlistID });

    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const playlistIndex = user.Playlists.findIndex(
      (item) => item._id.toString() === playlistID.toString()
    );

    if (playlistIndex === -1) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    user.Playlists[playlistIndex].playlist_name = playlist_name;

    await user.save();

    res.json(user.Playlists[playlistIndex]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.post("/deleteplaylist/:playlistID", async (req, res) => {
  try {
    const { playlistID } = req.params;

    const refreshToken = req.cookies?.refreshToken;
    const accessToken = req.cookies?.accessToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Unauthorized access, please login again",
      });
    }
    if (!accessToken) {
      //Refresh the access token
      const userID = verifyRefreshToken(refreshToken);
      const userData = { id: userID };
      const accessToken = generateAccessToken(userData);
      res.cookie("accessToken", accessToken, {
        ...getAuthCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    const user = await userData.findOne({ "Playlists._id": playlistID });

    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }
    user.Playlists = user.Playlists.filter(
      (item) => item._id.toString() !== playlistID.toString()
    );
    await user.save();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.post("/saveplaylistprivacy/:playlistID", async (req, res) => {
  try {
    const { playlistID } = req.params;
    const { privacy } = req.body;

    const refreshToken = req.cookies?.refreshToken;
    const accessToken = req.cookies?.accessToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Unauthorized access, please login again",
      });
    }
    if (!accessToken) {
      //Refresh the access token
      const userID = verifyRefreshToken(refreshToken);
      const userData = { id: userID };
      const accessToken = generateAccessToken(userData);
      res.cookie("accessToken", accessToken, {
        ...getAuthCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    const user = await userData.findOne({ "Playlists._id": playlistID });

    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const playlistIndex = user.Playlists.findIndex(
      (item) => item._id.toString() === playlistID.toString()
    );

    if (playlistIndex === -1) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    user.Playlists[playlistIndex].playlist_privacy = privacy;

    await user.save();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.post("/addotherplaylist/:playlistID/:email", async (req, res) => {
  try {
    const { playlistID, email } = req.params;

    const refreshToken = req.cookies?.refreshToken;
    const accessToken = req.cookies?.accessToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Unauthorized access, please login again",
      });
    }
    if (!accessToken) {
      //Refresh the access token
      const userID = verifyRefreshToken(refreshToken);
      const userData = { id: userID };
      const accessToken = generateAccessToken(userData);
      res.cookie("accessToken", accessToken, {
        ...getAuthCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    const user = await userData.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const checkPlaylistAvailability = user.savedPlaylists.find(
      (item) => item.playlistID.toString() === playlistID.toString()
    );

    if (!checkPlaylistAvailability) {
      user.savedPlaylists.push({ playlistID: playlistID });
      await user.save();
      res.json("Saved");
    } else {
      user.savedPlaylists = user.savedPlaylists.filter(
        (item) => item.playlistID !== playlistID.toString()
      );
      await user.save();

      res.json("Removed");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/getsavedplaylist/:playlistID/:email", async (req, res) => {
  try {
    const { playlistID, email } = req.params;
    const user = await userData.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const checkPlaylistAvailability = user.savedPlaylists.find(
      (item) => item.playlistID.toString() === playlistID.toString()
    );
    if (!checkPlaylistAvailability) {
      res.json("Not Found");
    } else {
      res.json("Found");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

Videos.get("/getsavedplaylist/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await userData.findOne({ email });
    const AllUsers = await userData.find();

    if (!user) {
      return res.status(404).json({ error: "User doesn't exist" });
    }

    const savedPlaylistIDs = user.savedPlaylists.map(
      (playlist) => playlist.playlistID
    );

    const matchingPlaylists = [];

    // Iterate through all users and their playlists
    AllUsers.forEach((currentUser) => {
      const playlistsForUser = currentUser.Playlists.filter((playlist) =>
        savedPlaylistIDs.includes(playlist._id.toString())
      );
      matchingPlaylists.push(...playlistsForUser);
    });

    res.json(matchingPlaylists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = Videos;
