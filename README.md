# RealEstate Marketplace

Full-stack real-estate marketplace where visitors can browse, search, and filter listings while authenticated agents and owners can create, edit, and manage their properties. Signed-in users can favourite listings, manage their profile, and keep an up-to-date inventory.

---

## Features

- 🔐 **Authentication** – Email/password and Google OAuth with httpOnly JWT cookies.
- 🏠 **Listing management** – Create, update, and delete listings with Firebase-hosted image galleries.
- 🔎 **Powerful search** – Filter by purpose, category, location, pricing, amenities, and sort order.
- ⭐ **Saved listings** – Persisted favourites per user with optimistic UI updates.
- 📍 **Normalised locations** – Structured governorate/city data with optional suggested area capture.
- 📱 **Responsive UI** – Modern React SPA backed by Vite, Tailwind, and Swiper sliders.

---

## Technology Stack

| Layer    | Tech                                                                        |
| -------- | --------------------------------------------------------------------------- |
| Frontend | React 19, Vite, React Router, Redux Toolkit + Persist, Tailwind CSS, Swiper |
| Backend  | Node.js, Express 5, Mongoose 8, JWT, cookie-parser                          |
| Database | MongoDB Atlas (or any MongoDB instance)                                     |
| Storage  | Firebase Storage (for listing image uploads)                                |

---

## Project Structure

```
realEstate/
├── api/                 # Express REST API
│   ├── controllers/     # Route handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API route definitions
│   ├── seeds/           # Seed scripts (locations, etc.)
│   └── utils/           # Shared helpers (auth, error handling)
├── client/              # React single page application
│   ├── src/
│   │   ├── components/  # Reusable UI pieces
│   │   ├── pages/       # Route-level pages
│   │   ├── redux/       # Redux slices & store
│   │   └── firebase.js  # Firebase initialisation
├── package.json         # Root scripts and API dependencies
└── README.md
```

---

## Prerequisites

- Node.js 18+ and npm
- MongoDB connection string (Atlas or local)
- Firebase project configured for Storage uploads

---

## Environment Variables

Create the following files before running the project.

### `api/.env`

```
MONGO=<your-mongodb-uri>
JWT_SECRET=<random-long-string>
DEFAULT_LISTING_IMAGE_URL=<optional-fallback-image-url>
```

### `client/.env`

```
VITE_FIREBASE_API_KEY=<firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
VITE_FIREBASE_PROJECT_ID=<firebase-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<firebase-sender-id>
VITE_FIREBASE_APP_ID=<firebase-app-id>
VITE_FIREBASE_MEASUREMENT_ID=<optional-measurement-id>
VITE_DEFAULT_LISTING_IMAGE=<optional-client-fallback-image-url>
```

---

## Getting Started

```bash
# 1. Install dependencies (API + client)
npm install
npm install --prefix client

# 2. Seed location data (optional but recommended)
npm run seeds:locations

# 3. Start the backend (Express + MongoDB)
npm run dev

# 4. In another terminal, start the React client
npm run dev --prefix client
```

The API defaults to `http://localhost:3000`. Vite will start on `http://localhost:5173` (or the next available port) and proxies `/api` requests to the backend.

---

## Available Scripts

| Command                           | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| `npm run dev`                     | Start API with nodemon (auto-restarts on changes) |
| `npm run start`                   | Start API in production mode                      |
| `npm run seeds:locations`         | Seed MongoDB with governorate/city data           |
| `npm run dev --prefix client`     | Launch Vite dev server for the React app          |
| `npm run build --prefix client`   | Build the client for production                   |
| `npm run preview --prefix client` | Preview the built client bundle                   |

---

## API Highlights

- `POST /api/auth/signup` – Register a new user
- `POST /api/auth/signin` – Email/password login
- `POST /api/auth/google` – Google OAuth login
- `POST /api/listings/create` – Create listing (auth required)
- `GET /api/listings/get/:id` – Fetch listing by id
- `GET /api/listings/get` – Search listings with query params
- `POST /api/favorites/:listingId` – Add favourite (auth required)
- `DELETE /api/favorites/:listingId` – Remove favourite
- `GET /api/favorites/ids` – Fetch favourite ids for current user

> See `api/routes/` for the full route map and `api/controllers/` for implementation details.

---

## Contributing & Next Steps

- Add automated tests (integration & e2e) to protect core flows
- Enhance favourites with listing snapshots to avoid extra queries
- Extend filtering (e.g. governorate/city dropdowns) on the client
- Deploy strategy: host the API on a Node-friendly provider and serve the Vite build via CDN or static hosting

---

## License

This project is currently unlicensed. Add your organisation’s license information here if required.
