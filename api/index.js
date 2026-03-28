const express = require("express");
const backendApp = require("../backend/server.js");

const app = express();

// Support both direct and rewritten API paths on Vercel.
app.use(backendApp);
app.use("/api", backendApp);

module.exports = app;
