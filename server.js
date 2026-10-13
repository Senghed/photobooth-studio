const express = require("express");
const db = require("./db");
const app = express();

app.use(express.json());
app.use(express.static("public"));

app.get("/api/ping", (req, res) => res.json({ ok: true}));

app.listen(3000, () => console.log("http://localhost:3000"));