# AqarDot API

Backend service for the AqarDot marketplace. This Express application exposes authentication, listing management, favorites, locations, and contact endpoints, and is meant to be deployed independently (e.g., on Render) with MongoDB Atlas and Firebase Storage as backing services.

---

## Key Features

- 🔐 **Authentication & sessions** – Email/password and Google OAuth powered by JWT httpOnly cookies with optional email verification & password reset flows via Resend.
- 🏠 **Listing CRUD** – Normalised residential/commercial schemas, phone validation, Firebase Storage cleanup, and location-aware search filters.
- ⭐ **Favorites** – Lightweight collection per user with optimistic IDs endpoint for the client.
- 📍 **Location normalization** – Governorate/city/area data seeded from Mongo, plus “suggested areas” capture when users type custom values.
- ✉️ **Contact form relay** – Resend integration for website contact submissions.

---

## Tech Stack

| Layer        | Tech                                                                |
| ------------ | ------------------------------------------------------------------- |
| Runtime      | Node.js 18+, Express 5, Mongoose 8                                   |
| Auth & Email | JWT (httpOnly cookies), bcryptjs, Google OAuth, Resend              |
| Data         | MongoDB Atlas (listings, users, favorites, locations)               |
| Storage      | Firebase Storage (listing images + avatar uploads)                  |
| Tooling      | Nodemon (dev), seed scripts, modular controllers/routes/middlewares |

---

## Repository Layout

```
realEstate-api/
├── controllers/        # Route handlers (auth, listings, users, etc.)
├── middlewares/        # Auth guards and shared middleware
├── models/             # Mongoose schemas (Listing, User, Favorite, Location…)
├── routes/             # Express routers mounted under /api/*
├── seeds/              # Data loaders (governorates/cities)
├── utils/              # Helpers (JWT, Firebase storage cleanup, errors)
├── index.js            # Express bootstrap + Mongo connection
└── README.md
```

---

## Prerequisites

- Node.js **18 or newer** and npm
- Hosted MongoDB instance (Atlas recommended)
- Firebase project/service account with Storage enabled
- Resend account (or update `contact.route.js` to your e-mail provider)

---

## Environment Variables (`.env`)

```
NODE_ENV=development
PORT=3000
MONGO=<mongodb+srv://...>
JWT_SECRET=<random-long-string>
ACCESS_TOKEN_TTL=30m
ACCESS_TOKEN_MAXAGE_MS=1800000
CLIENT_URL=https://aqardot.com            # used for redirect after email verify/reset
API_BASE_URL=https://api.aqardot.com      # public base URL used inside e-mails
EMAIL_FROM="AqarDot <no-reply@aqardot.com>"
RESEND_API_KEY=<resend-api-key>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
DEFAULT_LISTING_IMAGE_URL=<optional-fallback-image>

# Firebase Admin SDK
FIREBASE_PROJECT_ID=<firebase-project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
```

> Never commit secrets. Use Render’s dashboard (or your platform of choice) to store them securely.

---

## Local Development

```bash
# Install backend dependencies
npm install

# (Optional) seed governorates/cities
npm run seeds:locations

# Start the API with auto-reload
npm run dev
```

The server listens on `http://localhost:3000` by default, exposes `/api/*` routes, and serves a `/api/health` endpoint for liveness checks.

---

## npm Scripts

| Command               | Description                                               |
| --------------------- | --------------------------------------------------------- |
| `npm run dev`         | Start Express with nodemon and auto-connect to Mongo      |
| `npm start`           | Production start (uses `node index.js`)                   |
| `npm run seeds:locations` | Populate MongoDB with governorate/city fixtures      |

There are no automated tests yet—add unit/integration suites before scaling traffic.

---

## Core Endpoints

- `POST /api/auth/signup` – Create an account (email/password).
- `POST /api/auth/signin` – Issue JWT cookie for existing users.
- `POST /api/auth/google` – Google OAuth login/sign-up.
- `POST /api/auth/send-verification` & `GET /api/auth/verify-email` – Email verification flow.
- `POST /api/listings/create` – Create listing (auth required).
- `PATCH /api/listings/update/:id` / `DELETE /api/listings/delete/:id` – Manage owned listings.
- `GET /api/listings/get` – Filter/search listings with query params.
- `GET /api/locations/governorates` – Retrieve normalized location data.
- `POST /api/favorites/:listingId` – Toggle favorites for the signed-in user.
- `POST /api/contact` – Send web contact form submissions via Resend.

Refer to the files inside `routes/` and `controllers/` for the full request/response contracts.

---

## Deployment (Render example)

1. **Create a Web Service** on Render pointing to this repo (or its mirror).  
2. **Environment**: Node 18+, Build Command `npm install`, Start Command `npm start`.  
3. **Environment Variables**: add all keys listed above (Render’s `ENV VARS` tab).  
4. **MongoDB / Firebase**: supply hosted connection strings and service account values.  
5. **Scaling**: enable persistent connections (Render automatically keeps the instance warm); set health check path to `/api/health`.  
6. **CORS**: update `allowList` in `index.js` whenever domains change (`https://aqardot.com`, staging domains, etc.).

Roll out using your usual Git workflow—Render builds on push to the selected branch.

---

## Maintenance Checklist

- Rotate the Firebase service-account key regularly and keep it out of git.
- Monitor MongoDB performance (indexes exist on purpose/category/location/price).
- Configure structured logging/alerting (e.g., Render logs + LogDNA, APM, uptime monitors).
- Back up the `locations` data or regenerate it with `npm run seeds:locations` when needed.

---

## License

Pending final decision. Add your organisation’s license text here if required.
