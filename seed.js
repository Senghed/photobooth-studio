const db = require("./db");
const { hashPassword} = require("./auth");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const users = [
    {username: "admin", password: "admin123", role: "admin"},
    {username: "anna", password: "anna123", role: "user"},
    {username: "erik", password: "erik123", role: "user"},
];

const insert = db.prepare(
    "INSERT OR IGNORE INTO users(username,password_hash, role) VALUES (?, ?, ?)"
);

for (const user of users){
    const result = insert.run(user.username, hashPassword(user.password), user.role);
    console.log(user.username, result.changes ? "skapad": "fanns redan");
}

const photos = [
  { owner: "anna", title: "Solnedgång", published: 1, filter: "sepia", amount: 0.7 },
  { owner: "anna", title: "Havsbris", published: 1, filter: "none", amount: 0 },
  { owner: "anna", title: "Privat skiss", published: 0, filter: "grayscale", amount: 1 },
  { owner: "erik", title: "Skogspromenad", published: 1, filter: "invert", amount: 0.4 },
  { owner: "erik", title: "Födelsedagsfest", published: 1, filter: "none", amount: 0 },
];

fs.mkdirSync("uploads", { recursive: true });

const findUser = db.prepare("SELECT id FROM users WHERE username = ?");
const findPhoto = db.prepare("SELECT id FROM photos WHERE user_id = ? AND title = ?");
const insertPhoto = db.prepare(
  "INSERT INTO photos (user_id, file_path, title, filter, filter_amount, published) VALUES (?, ?, ?, ?, ?, ?)"
);

async function seedPhotos() {
  for (const photo of photos) {
    const user = findUser.get(photo.owner);
    if (!user) {
      console.log("Hittar inte användaren", photo.owner);
      continue;
    }
    if (findPhoto.get(user.id, photo.title)) {
      console.log(photo.title, "fanns redan");
      continue;
    }

    const url = `https://picsum.photos/800/600.jpg?random=${Date.now()}${photo.title}`;
    const response = await fetch(url).catch(() => null);
    if (!response || !response.ok) {
      console.log("Kunde inte hämta bilden för", photo.title);
      continue;
    }
    const jpg = Buffer.from(await response.arrayBuffer());

    const fileName = crypto.randomBytes(16).toString("hex") + ".jpg";
    fs.writeFileSync(path.join("uploads", fileName), jpg);
    insertPhoto.run(user.id, "/uploads/" + fileName, photo.title, photo.filter, photo.amount, photo.published);
    console.log(photo.title, "skapad");
  }
}

seedPhotos();