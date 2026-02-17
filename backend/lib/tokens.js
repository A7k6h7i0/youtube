require("dotenv").config();
const jwt = require("jsonwebtoken");

const resolveUserId = (user) => user?._id || user?.id || user;

const generateAccessToken = (user) => {
  const userId = resolveUserId(user);
  const accessToken = jwt.sign({ id: userId }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });
  return accessToken;
};

const generateRefreshToken = (user) => {
  const userId = resolveUserId(user);
  const refreshToken = jwt.sign({ id: userId }, process.env.SECRET_KEY, {
    expiresIn: "7d",
  });
  return refreshToken;
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.SECRET_KEY);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.SECRET_KEY);
};

const getAuthCookieOptions = () => {
  // Check if we're running on a production domain (not localhost)
  const isProd = process.env.NODE_ENV === "production" || 
                 process.env.RENDER_EXTERNAL_URL?.includes(".onrender.com");
  
  return {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getAuthCookieOptions,
};
