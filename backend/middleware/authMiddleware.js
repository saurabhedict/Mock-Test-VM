const jwt = require("jsonwebtoken");

/**
 * Protects routes by verifying the JWT access token.
 *
 * The frontend sends the token in the Authorization header like:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 *
 * On success: sets req.user = { id: userId } and calls next()
 * On failure: returns 401 Unauthorized
 */
const protect = (req, res, next) => {
  try {
    // 1. Extract token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied — no token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify token signature and expiry using the ACCESS secret
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // 3. Attach user id to request for use in route handlers
    req.user = { id: decoded.id };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      // Frontend intercepts this 401 and calls /refresh-token automatically
      return res.status(401).json({
        success: false,
        message: "Access token expired",
        code: "TOKEN_EXPIRED", // Frontend uses this code to trigger refresh
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

module.exports = protect;
