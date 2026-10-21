const express = require("express");
const db = require("./db");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {hashPassword, verifyPassword, createSession, destroySession, loadUser, requireLogin}= require("./auth");
const app = express();

app.use(express.json());
app.use(express.static("public"));
fs.mkdirSync("uploads", {recursive: true});
app.use("/uploads", express.static("uploads"));
app.use(loadUser);

app.get("/api/ping", (req, res) => res.json({ ok: true}));

app.post("/api/register", (req, res) => {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ error: "Användarnamnet måste vara 3-30 tecken"});
    }
    if (password.length < 6){
        return res.status(400).json({ error: "Lösenordet måste vara minst 6 tecken."});
    } 
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (existing) {
        return res.status(409).json({ error: "Användarnamnet är upptaget."});
    }
    const result = db
        .prepare("INSERT INTO users (username, password_hash) VALUES (?,?)")
        .run(username,hashPassword(password));

    createSession(res, result.lastInsertRowid);
    res.status(201).json({ id: Number(result.lastInsertRowid), username, role: "user"});
});

app.post("/api/login", (req, res) =>{
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    const user = db
    .prepare("SELECT id, username, password_hash, role FROM users  WHERE username = ?")
    .get(username);

    if (!user|| !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: "Fel användarnamn eller lösenord."});
    }
    createSession(res, user.id);
    res.json({ id: user.id, username: user.username, role: user.role});
});

app.get("/api/me", (req, res) => {
    res.json({ user: req.user || null });
});

app.post("/api/logout", (req, res) => {
    destroySession(req, res);
    res.json({ok: true});
});

function imageExtension(buf) {
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
   if (buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return ".png";
}

app.post("/api/photos", requireLogin, express.raw({ type: "image/*", limit: "10mb" }), (req, res) => {
    if (!Buffer.isBuffer(req.body)){ 
        return res.status(400).json({error: "Skicka en bild."});
    }
  const ext = imageExtension(req.body);
    if (!ext) {
        return res.status(400).json({ error: "Bara JPEG- och PNG-bilder tillåts." });
    }
    const fileName = crypto.randomBytes(16).toString("hex") + ext;
       fs.writeFileSync(path.join("uploads", fileName), req.body);

    const result = db
        .prepare("INSERT INTO photos (user_id, file_path, title) VALUES (?, ?, ?)")
        .run(req.user.id, "/uploads/" + fileName, "Namnlöst foto");

    res.status(201).json({
        id: Number(result.lastInsertRowid),
        file: "/uploads/" + fileName,
        bytes: req.body.length,
    });
});

app.get("/api/photos", requireLogin, (req, res) =>{
    const photos = db.prepare(`
        SELECT photos.id, photos.file_path, photos.title, photos.created_at, users.username
        FROM photos
        JOIN users ON users.id = photos.user_id
        WHERE photos.status = 'visible'
        ORDER BY photos.created_at DESC, photos.id DESC
        `)
        .all();
        res.json(photos);
});

app.listen(3000, () => console.log("http://localhost:3000"));
