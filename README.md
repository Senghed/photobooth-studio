# PhotoBooth Studio

A web-based photo studio where logged-in users upload photos, apply filters to them, and choose whether to publish them to a shared gallery. An admin can moderate published photos. This is a course project and uses synthetic data only.

The user interface is in Swedish.

## Features

- Registration, login and logout with cookie-based sessions
- Two roles: `user` and `admin`
- Upload of JPEG and PNG images (validated on the server)
- Photos are private by default. The owner chooses when to publish them to the gallery
- Two lists: **My photos** (all of the user's own photos) and **Gallery** (everyone's published photos)
- Search by title or username, and sorting (newest, oldest, title)
- Rename and delete your own photos
- Photo editor with filters (grayscale, sepia, invert) and an intensity slider, with live preview. The filter is saved per photo
- Admin: see all published photos, hide and show them, and delete photos
- Clear loading, empty, validation error and server error states

## Tech stack

- Backend: Node.js, Express, better-sqlite3 (SQLite)
- Frontend: plain JavaScript, HTML and CSS (no JavaScript libraries)
- Database: SQLite file at `data/photobooth.db` (created automatically)
- Uploaded images: files in `uploads/`, served only to logged-in users with the right permissions

## Setup

Requires Node.js 18 or later.

```
npm install
npm run seed
npm start
```

Then open http://localhost:3000.

`npm run seed` fills the database with demo users and five example photos. The photos are fetched from [Lorem Picsum](https://picsum.photos), so an internet connection is needed when the seed script runs (and only then). The script can be run several times without creating duplicates.

For development, `npm run dev` restarts the server when files change.

## Demo accounts

| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin123 | admin |
| anna     | anna123  | user  |
| erik     | erik123  | user  |

These are made-up accounts for demonstration and must never be used in a real environment.

## Project structure

```
server.js       The Express app and all API routes
db.js           Database connection and tables
auth.js         Password hashing, sessions and permission checks
seed.js         Creates demo users and example photos
public/         Frontend (index.html, app.js, style.css)
data/           The SQLite database (created on first start, not in git)
uploads/        Uploaded images (not in git)
```

## Database

- `users` (id, username, password_hash, role, created_at)
- `photos` (id, user_id, file_path, title, filter, filter_amount, status, published, created_at)
- `stickers` (id, photo_id, kind, content, x, y, scale)
- `sessions` (token, user_id, created_at)

`photos.published` is controlled by the owner. `photos.status` (visible/hidden) is controlled by an admin. The gallery shows photos that are both published and visible.

## API

All routes respond with JSON. Errors have the form `{ "error": "..." }`.

| Method | Path                        | Access           | Description                              |
|--------|-----------------------------|------------------|------------------------------------------|
| POST   | /api/register               | anyone           | Create an account                        |
| POST   | /api/login                  | anyone           | Log in                                   |
| POST   | /api/logout                 | logged in        | Log out                                  |
| GET    | /api/me                     | anyone           | Current user or null                     |
| POST   | /api/photos                 | logged in        | Upload a photo (raw image body)          |
| GET    | /api/photos                 | logged in        | List (`?mine=1`, `?search=`, `?sort=`)   |
| DELETE | /api/photos/:id             | owner or admin   | Delete a photo                           |
| PUT    | /api/photos/:id/published   | owner            | Publish or unpublish                     |
| PUT    | /api/photos/:id/title       | owner            | Change title                             |
| PUT    | /api/photos/:id/filter      | owner            | Save filter and intensity                |
| GET    | /uploads/:name              | see below        | Image file                               |
| GET    | /api/admin/photos           | admin            | All published photos                     |
| PUT    | /api/photos/:id/status      | admin            | Hide or show a photo                     |

An image file can be fetched by its owner, by an admin, or by any logged-in user if the photo is published and visible.

## Security

- Passwords are stored as salted scrypt hashes
- Session tokens are stored in the database and sent as an HttpOnly cookie
- All SQL queries use parameters (`?`) to prevent SQL injection
- Sorting uses a whitelist of allowed values
- Uploaded files are checked by content (JPEG/PNG), get random file names, and are served only after a permission check
- User-provided text is rendered with