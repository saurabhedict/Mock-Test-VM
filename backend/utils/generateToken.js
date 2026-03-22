const jwt = require("jsonwebtoken");

/**
 * Access Token — short lived (15 min), sent in JSON response body.
 * Embeds sessionVersion (sv) so the middleware can detect stale sessions.
 */
const generateAccessToken = (userId, sessionVersion = 0) => {
  return jwt.sign(
    { id: userId, type: "access", sv: sessionVersion },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
};

/**
 * Refresh Token — long lived (7 days), stored in HTTP-only cookie.
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

/**
 * Sets the refresh token as an HTTP-only cookie on the response.
 */
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
};