# Return Processing System — Backend

Express + MongoDB API powering Qurvii's returns and reverse-logistics workflow: importing marketplace return data, a warehouse scan-and-accept flow, channel attribution for unmatched scans, and role-based user accounts.

## Tech Stack

- Node.js / Express 4
- MongoDB via Mongoose
- JWT auth (`jsonwebtoken`) + password hashing (`bcryptjs`)
- `dotenv` for configuration

## Getting Started

```bash
npm install
npm run dev     # node --watch index.js
npm start       # node index.js
```

The server listens on `PORT` (default `3000`) and expects MongoDB to be reachable at `MONGODB_URI`.

### Environment Variables (`.env`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | HTTP port (default `3000`) |
| `NODE_ENV` | `development` enables stack traces in error responses |
| `CORS_ORIGIN` | Allowed CORS origin(s) for the frontend |
| `JWT_SECRET` | Secret used to sign session tokens — **change from the checked-in default before deploying** |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `INITIAL_ADMIN_USERNAME` | Username for the auto-seeded first admin |
| `INITIAL_ADMIN_PASSWORD` | Password for the auto-seeded first admin |

### First Run / Bootstrap Admin

On startup, if the `users` collection is empty, the server automatically creates one admin account from `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` and prints the credentials to the console. Log in with those, then create real accounts (and change/remove that bootstrap account) from the Users page — it only fires once, the first time there are zero users.

## Authentication & Authorization

- `POST /api/auth/login` is the only public endpoint besides `/health`; everything else under `/api` requires `Authorization: Bearer <token>`.
- Tokens are signed JWTs containing `{ sub, username, role }`.
- `requireAdmin` middleware gates admin-only actions: user management (`/api/users/*`), deleting a return session log, and deleting an unmatched scan.
- Safety guards on user management: you can't delete your own logged-in account, and the last remaining admin can't be deleted or demoted.

## Project Structure

```
backend/
├── config/           # env config (index.js) + Mongo connection (db.js)
├── controllers/       # request handlers, one file per resource
├── middleware/         # authMiddleware (JWT verify), requireAdmin, globalErrorHandler
├── models/            # Mongoose schemas
├── routes/            # Express routers, mounted in routes/index.js
├── utils/             # ApiError/ApiResponse/asyncHandler, CSV helpers, channel-prefix resolver, admin seeding
└── index.js           # app bootstrap: connect DB → seed admin → listen
```

## Data Models

| Model | Purpose |
|---|---|
| `User` | username, bcrypt password hash, role (`admin`/`staff`) |
| `ReturnRecord` | one imported marketplace return line item (order/invoice/SKU/channel/qty/etc.) |
| `ReturnSession` | a scanning session; `endedAt: null` means it's the currently active session |
| `ReturnAcceptance` | a return accepted during a session — denormalizes the source `ReturnRecord`'s fields so it stays accurate even after that record is later replaced by a bulk import |
| `ProductStyle` | style number → product image URLs, used to show a photo next to a SKU |
| `Channel` | known sales channel names (Myntra, Nykaa, Ajio, Shopify, Tatacliq, ...) |
| `ChannelPrefixMapping` | order/tracking-id prefix → channel (e.g. `MYSC` → `Myntra`), used to auto-resolve unmatched scans |
| `UnmatchedScan` | a scan that didn't match any `ReturnRecord`; only persisted once a channel is known (via mapping or manual pick) |

## API Reference

All paths are relative to `/api`. 🔒 = requires a valid token. 🔒👑 = requires an admin token.

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{ username, password }` → `{ token, user }` |
| GET | `/auth/me` 🔒 | current user from the token |

### Users 🔒👑 (all routes)
| Method | Path | Notes |
|---|---|---|
| GET | `/users` | list all accounts (no password hashes) |
| POST | `/users` | `{ username, password, role }` |
| PATCH | `/users/:id` | update username/role/password |
| DELETE | `/users/:id` | blocked for self or the last admin |

### Returns 🔒
| Method | Path | Notes |
|---|---|---|
| GET | `/returns/all?page=&limit=` | paginated listing, newest first |
| GET | `/returns?field=value&...` | fuzzy (substring, case-insensitive) OR-search across searchable fields |
| GET | `/returns/scan/:value` | **exact** match across searchable fields — used by the scan workflow |
| GET | `/returns/search/:field/:value` | fuzzy match on a single named field |
| GET | `/returns/:field/:value` | alias of the above |
| POST | `/returns` | create one record, or bulk-replace (send an array / `{ records: [...] }` — **wipes the collection first**); rows with an excluded `order_status` (Cancelled Return Received / Packed / New) are skipped |
| POST | `/returns/bulk` | same handler as `POST /returns` |

### Product Styles 🔒
| Method | Path | Notes |
|---|---|---|
| GET | `/product-styles?codes=a,b,c` | images for the given style numbers |
| POST | `/product-styles/bulk` | upsert `{ style_number, images: [] }[]`, images are merged via `$addToSet` |

### Return Sessions (Scan & Accept) 🔒
| Method | Path | Notes |
|---|---|---|
| GET | `/return-sessions/active` | current open session + its accepted records (auto-creates one if none) |
| POST | `/return-sessions/active/accept` | `{ return_record_id, good_qty, bad_qty, return_type, return_comments? }` — validates qty against the record's sent qty, blocks double-accepting the same return in one session |
| POST | `/return-sessions/active/end` | closes the active session |
| GET | `/return-sessions` | list closed sessions (logs) with record counts |
| GET | `/return-sessions/:id` | one session + its accepted records |
| GET | `/return-sessions/:id/csv` | `BulkAcceptReturns&CreateCreditNotes.csv` for that session |
| DELETE | `/return-sessions/:id` 👑 | deletes the session and its records |

### Channels 🔒
| Method | Path | Notes |
|---|---|---|
| GET | `/channels` | list (auto-seeds Myntra/Nykaa/Ajio/Shopify/Tatacliq on first call) |
| POST | `/channels` | `{ name }`, idempotent |

### Channel Mappings 🔒
| Method | Path | Notes |
|---|---|---|
| GET | `/channel-mappings` | list all prefix→channel mappings |
| POST | `/channel-mappings/bulk` | upsert `{ prefix, channel }[]`, also registers any new channel names |
| PATCH | `/channel-mappings/:id` | edit prefix and/or channel; rejects a rename onto a prefix already in use |
| DELETE | `/channel-mappings/:id` | remove a mapping |

### Unmatched Scans 🔒
| Method | Path | Notes |
|---|---|---|
| POST | `/unmatched-scans` | `{ scanned_id, channel? }` — resolves channel via mapping if not given; **does not persist** until a channel is known, in which case it returns `{ pending: true }` |
| GET | `/unmatched-scans?page=&limit=` | paginated list |
| PATCH | `/unmatched-scans/:id` | `{ channel }` — assign/change the channel |
| DELETE | `/unmatched-scans/:id` 👑 | remove a record |
| GET | `/unmatched-scans/export` | CSV of every unmatched scan |
| POST | `/unmatched-scans/match` | `{ scanned_ids: [] }` → JSON preview (`matchedCount`/`total`/per-id results), no download |
| POST | `/unmatched-scans/match/csv` | same input, streams the CSV for download |
