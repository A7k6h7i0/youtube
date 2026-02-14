require("dotenv").config();
const mongoose = require("mongoose");

const DB_HOST = process.env.DB_host || "cluster0.lmednm5.mongodb.net";
const DB_USER = process.env.DB_user;
const DB_PASSWORD = process.env.DB_password;
const DB_NAME = process.env.DB_name || "youtubeClone";

const uri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  (DB_USER && DB_PASSWORD
    ? `mongodb+srv://${encodeURIComponent(DB_USER)}:${encodeURIComponent(
        DB_PASSWORD
      )}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`
    : null);

if (!uri) {
  console.error(
    "MongoDB connection string missing. Set MONGODB_URI (or DB_user/DB_password)."
  );
} else {
  mongoose
    .connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("Connected"))
    .catch((err) => console.error(err));
}
