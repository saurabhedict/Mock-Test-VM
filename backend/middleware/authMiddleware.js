const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      const user = await User.findById(decoded.id)
        .select("_id role sessionVersion")
        .lean();
      if (!user) {
        return res.status(401).json({ success: false, message: "Not authorized — user not found" });
      }

      // ── Single session check ───────────────────────────────
      if (decoded.sv !== undefined && decoded.sv !== user.sessionVersion) {
        return res.status(401).json({
          success: false,
          message: "Session expired — you logged in from another device",
          code: "SESSION_INVALIDATED",
        });
      }
      // ──────────────────────────────────────────────────────

      req.user = {
        _id: user._id,
        id: String(user._id),
        role: user.role,
        sessionVersion: user.sessionVersion || 0,
      };
      next();
    } catch (error) {
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
