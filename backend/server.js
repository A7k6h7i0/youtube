const express = require("express");
const cors = require("cors");
const router = require("./Router/router");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;
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
    origin: allowedOrigins,
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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
