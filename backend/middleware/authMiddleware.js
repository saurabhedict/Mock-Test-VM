const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  // Check for token in cookies
  token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ msg: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ msg: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ msg: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin };
