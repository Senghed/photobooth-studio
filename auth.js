const crypto = require("crypto");
const db = require("./db");

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(":");
    const attempt = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(attempt, Buffer.from(hash, "hex"));
}

function parseCookies(header = "") {
    const cookies = {};
    for (const part of header.split(";")){
        const[name, ...rest] = part.trim().split("=");
        if (name) cookies[name] = decodeURIComponent(rest.join("="));
     
    }
    return cookies;
}

function createSession(res, userId){
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
    res.setHeader("Set-Cookie", `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);

}

function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie).session;
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function loadUser(req, res, next){
    const token = parseCookies(req.headers.cookie).session;
    req.user = null;
    if (token){
        req.user = 
        db
        .prepare(
            `SELECT users.id, users.username, users.role
            FROM sessions JOIN users ON users.id  = sessions.user_id
            WHERE sessions.token = ?`
        )
        .get(token) || null;
    }
    next();
}

function requireLogin(req, res, next) {
    if (!req.user) return res.status(401).json({ error: "Du måste logga in."});
    next();
}

function requireAdmin(req, res, next){
    if (!req.user) return res.status(401).json({ error: "Du måste logga in."});
    if (req.user.role !=="admin") return res.status(403).json({ error: "Endast admin har tillgång."});
    next();
}
    module.exports = {
        hashPassword,
        verifyPassword,
        createSession,
        destroySession,
        loadUser,
        requireLogin,
        requireAdmin,
    
    };
