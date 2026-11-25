const express = require("express");
const session = require("express-session");
const { Redis } = require("@upstash/redis");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.JWT_SECRET || "CHANGE_THIS_LOCAL_DEVELOPMENT_SECRET",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 86400000 }
}));
app.use(express.static(path.join(__dirname, "public")));

function requireRedis(req, res, next) {
  if (!redis) return res.status(503).json({ error: "Database is not configured. Add Upstash REST URL and token in Render Environment." });
  next();
}
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Please log in first." });
  next();
}
app.get("/api/health", async (req, res) => {
  try {
    if (redis) await redis.ping();
    res.json({ ok: true, database: redis ? "connected" : "not_configured" });
  } catch (e) { res.status(503).json({ ok: false, error: "Database connection failed" }); }
});
app.post("/api/register", requireRedis, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ error: "Name, email and password (minimum 8 characters) are required." });
    const normalized = String(email).trim().toLowerCase();
    const key = `user:${normalized}`;
    if (await redis.exists(key)) return res.status(409).json({ error: "An account with this email already exists." });
    const user = { name: String(name).trim(), email: normalized, passwordHash: await bcrypt.hash(password, 12), createdAt: new Date().toISOString() };
    await redis.set(key, JSON.stringify(user));
    req.session.user = { name: user.name, email: user.email };
    res.json({ ok: true, user: req.session.user });
  } catch (e) { res.status(500).json({ error: "Registration failed." }); }
});
app.post("/api/login", requireRedis, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await redis.get(`user:${email}`);
    if (!user || !await bcrypt.compare(req.body.password || "", user.passwordHash)) return res.status(401).json({ error: "Incorrect email or password." });
    req.session.user = { name: user.name, email: user.email };
    res.json({ ok: true, user: req.session.user });
  } catch (e) { res.status(500).json({ error: "Login failed." }); }
});
app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));
app.get("/api/projects", requireRedis, requireLogin, async (req, res) => {
  const projects = await redis.get(`projects:${req.session.user.email}`) || [];
  res.json({ projects });
});
app.post("/api/projects", requireRedis, requireLogin, async (req, res) => {
  const { name, runtime } = req.body || {};
  if (!name || !["python", "node"].includes(runtime)) return res.status(400).json({ error: "Project name and supported runtime are required." });
  const key = `projects:${req.session.user.email}`;
  const projects = await redis.get(key) || [];
  const project = { id: Date.now().toString(36), name: String(name).slice(0, 60), runtime, status: "uploaded-not-running", createdAt: new Date().toISOString() };
  projects.unshift(project);
  await redis.set(key, projects);
  res.json({ ok: true, project });
});
app.listen(PORT, () => console.log(`ARX HOSTING listening on ${PORT}`));
