require("dotenv").config();
const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
  const accessToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });
  return accessToken;
};

const generateRefreshToken = (user) => {
  const refreshToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
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
  // Determine if we're in production (not localhost)
  const isProduction = process.env.NODE_ENV === "production";
  
  // Use SameSite=None and Secure for production (required for cross-origin cookies)
  // Use SameSite=Lax for development
  return {
    httpOnly: false,
    sameSite: isProduction ? "None" : "Lax",
    secure: isProduction,
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
