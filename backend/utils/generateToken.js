const jwt = require("jsonwebtoken");

/**
 * Access Token — short lived (15 min), sent in JSON response body.
 * Frontend stores it in memory (React state), NOT localStorage.
 * Used as: Authorization: Bearer <token> on every protected request.
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId, type: "access" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
};

/**
 * Refresh Token — long lived (7 days), stored in HTTP-only cookie.
 * The browser sends it automatically; JS can never read it.
 * Used only to get a new access token when the current one expires.
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
 * httpOnly: true  → JS cannot read it (prevents XSS token theft)
 * secure: true    → only sent over HTTPS (set to false in dev)
 * sameSite: strict → not sent on cross-site requests (CSRF protection)
 */
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
};
