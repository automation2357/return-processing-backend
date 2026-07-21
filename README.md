# Pending Orders — Backend

Express + MongoDB API powering Qurvii's Pending Orders workflow: scanning an order, checking fabric stock, and routing it through Pending → Ready for Cutting / Ready for Process → Shipped (or Cancel Requests).

This backend was forked from the Return Processing System backend, so it also still carries that project's full returns/reverse-logistics API under `/api/*` (JWT-protected). That surface is **not used by the Pending Orders frontend** in this repo — it's inherited, unused code kept for reference. See [Pending Orders API](#pending-orders-api-root-level-unauthenticated) below for what actually powers this app, and [Legacy Returns API](#legacy-returns-api-api-jwt-protected) for the rest.

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
| `NOCODB_URL` / `NOCODB_TABLE_ID` / `NOCODB_VIEW_ID` / `NOCODB_TOKEN` | NocoDB table holding the source order data (order_id, style_number, size, channel, order_date, color, ...) — looked up when an order is scanned |
| `FAST_API_URL` | Employee directory API (`{ id, user_name, locations }[]`) used for login and to record who scanned/moved an order |

### First Run / Bootstrap Admin

On startup, if the `users` collection is empty, the server automatically creates one admin account from `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` and prints the credentials to the console. Log in with those, then create real accounts (and change/remove that bootstrap account) from the Users page — it only fires once, the first time there are zero users.

## Authentication & Authorization

- `/pending-orders/*` and the root-level `/product-styles/*` (what the frontend uses) have **no auth middleware at all** — anyone who can reach the server can call them. Login on the frontend is just an employee-id lookup (`GET /pending-orders/nocodb/user/:employee_id`) stored in `localStorage`, not a real session.
- `POST /api/auth/login` is the only public endpoint besides `/health`; everything else under `/api` requires `Authorization: Bearer <token>`. (This whole `/api` surface is the unused legacy Returns API — see above.)
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
| `PendingOrders` | **The core model.** One scanned order: `style_number`, `order_id`, `size`, `channel`, `order_date`, `employee_id`/`employee_name` (who last touched it), `reason`, `isProcessed`, `isCancelApproval`, `isShipped`. Auto-deleted 30 days after creation (TTL index on `createdAt`) |
| `User` | username, bcrypt password hash, role (`admin`/`staff`) |
| `ReturnRecord` | one imported marketplace return line item (order/invoice/SKU/channel/qty/etc.) |
| `ReturnSession` | a scanning session; `endedAt: null` means it's the currently active session |
| `ReturnAcceptance` | a return accepted during a session — denormalizes the source `ReturnRecord`'s fields so it stays accurate even after that record is later replaced by a bulk import |
| `ProductStyle` | style number → product image URLs, used to show a photo next to a SKU |
| `Channel` | known sales channel names (Myntra, Nykaa, Ajio, Shopify, Tatacliq, ...) |
| `ChannelPrefixMapping` | order/tracking-id prefix → channel (e.g. `MYSC` → `Myntra`), used to auto-resolve unmatched scans |
| `UnmatchedScan` | a scan that didn't match any `ReturnRecord`; only persisted once a channel is known (via mapping or manual pick) |

## Pending Orders Workflow

An order isn't stored anywhere in this backend until someone **scans it** on the frontend's Scan Order page. From there it moves through one pipeline, tracked entirely by fields on the same `PendingOrders` document (there's no separate status field — the frontend derives the current stage from `reason` / `isProcessed` / `isCancelApproval` / `isShipped` plus live fabric stock; see `categorizeOrdersWithStockInfo` in the frontend):

1. **Scan** — order_id is looked up in NocoDB (`GET /pending-orders/nocodb/:order_id`) for its style/size/channel/date, fabric stock for that style is checked against an external stock API, and the order is saved via `POST /pending-orders`.
2. **Pending** — not enough fabric in stock yet (or manually forced back here). Sits until stock arrives or someone manually moves it.
3. **Ready for Cutting** — enough fabric is in stock (checked live, not stored), or it was manually moved here from Pending.
4. **Ready for Process** — flagged `Alter` or `Return Found` instead of a normal stock-driven route (set via the "Move to Process / Cancel" page).
5. **Shipped** — `isShipped: true`, set from the Ship Order page. Terminal.
6. **Cancel Requests** — flagged `Cancel Request` (`isCancelApproval: true`) from the "Move to Process / Cancel" page. Awaiting manual review/edit.

Every transition goes through `PUT /pending-orders/:id`, updating `reason`, `isProcessed`, `isCancelApproval`, or `isShipped` — the backend has no dedicated "move to X" endpoints, it's one generic update.

## Pending Orders API (root-level, unauthenticated)

These are the routes the frontend actually calls. Unlike everything under `/api`, they are **not** behind `authMiddleware` — no token required.

| Method | Path | Notes |
|---|---|---|
| GET | `/pending-orders?page=&limit=` | paginated list, sorted oldest first by `order_date` |
| POST | `/pending-orders` | create one order, or bulk-insert (send an array) |
| PUT | `/pending-orders/:id` | update any field(s) — this is how an order moves between stages |
| GET | `/pending-orders/nocodb/:order_id` | look up an order's source data in NocoDB by `order_id` |
| GET | `/pending-orders/nocodb/user/:employee_id` | look up an employee by id (via `FAST_API_URL`) — used for login and to stamp who did an action |
| GET | `/product-styles?codes=a,b,c` | product images for the given style numbers (root-level copy of the `/api` version below) |
| POST | `/product-styles/bulk` | upsert `{ style_number, images: [] }[]` |

## Legacy Returns API (`/api`, JWT-protected)

All paths below are relative to `/api`. 🔒 = requires a valid token. 🔒👑 = requires an admin token. **Not used by the Pending Orders frontend** — kept here for reference since the code still lives in this repo.

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
