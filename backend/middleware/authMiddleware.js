const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protects routes by verifying the JWT access token.
 * Fetches the user from the database to ensure it still exists.
 */
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      
      // Fetch user and attach to request
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authorized — User not found" });
      }
      next();
    } catch (error) {
      console.error("Auth error:", error);
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Access token expired",
          code: "TOKEN_EXPIRED",
        });
      }
      res.status(401).json({ success: false, message: "Not authorized — token failed" });
    }
  } else {
    res.status(401).json({ success: false, message: "Not authorized — no token provided" });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ success: false, message: "Not authorized as an admin" });
  }
};

module.exports = { protect, admin };
