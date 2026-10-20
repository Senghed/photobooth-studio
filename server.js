const express = require("express");
const db = require("./db");
const {hashPassword, verifyPassword, createSession, destroySession, loadUser, requireLogin}= require("./auth");
const app = express();

app.use(express.json());
app.use(express.static("public"));
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

app.post("/api/photos", requireLogin, express.raw({ type: "image/*", limit: "10mb" }), (req, res) => {
    if (!Buffer.isBuffer(req.body)){ 
        return res.status(400).json({error: "Skicka en bild."});
    }
    res.status(201).json({ bytes: req.body.length});
});

app.listen(3000, () => console.log("http://localhost:3000"));
