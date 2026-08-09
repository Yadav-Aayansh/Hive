# Hive API

Backend for Hive, a campus club and event management platform.

One college, one tenant. Students find clubs, join them, run events, and walk away
with a verifiable certificate. Campus admins keep the official side honest.

Everything below is the whole server. No other docs needed.

---

## 1. Quick start

```bash
docker compose up -d      # postgres + redis, run from the repo root
cd server
npm install
# fill in server/.env, every variable in section 2 is checked at boot
npm run dev               # http://localhost:3003/api/v1/health
```

| Script | Does |
|---|---|
| `npm run dev` | nodemon + ts-node, restarts on save |
| `npm run typecheck` | `tsc --noEmit`, must be clean |
| `npm run lint` | eslint, must be clean |
| `npm run build` | compiles to `dist/` |
| `npm start` | runs `dist/index.js` |

Tables are created by TypeORM `synchronize: true`. No migrations yet, so the schema
follows the entity files automatically.

The server refuses to boot if Postgres or Redis is unreachable. That is on purpose.
A half alive API is worse than a dead one.

---

## 2. Environment

All of it lives in `server/.env`. It is parsed by one Zod schema at import time, so a
missing or malformed value crashes the process immediately with a readable message.

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `3000` | dev runs on `3003` |
| `POSTGRES_HOST` | required | |
| `POSTGRES_PORT` | required | |
| `POSTGRES_USER` | required | also read by docker compose |
| `POSTGRES_PASSWORD` | required | also read by docker compose |
| `POSTGRES_DB` | required | also read by docker compose |
| `REDIS_URL` | `redis://localhost:6379` | sessions only, not a cache |
| `JWT_SECRET` | required, 32+ chars | |
| `JWT_TTL_DAYS` | `7` | |
| `COOKIE_NAME` | `hive_token` | |
| `CORS_ORIGIN` | `http://localhost:5173` | browser origin allowed to call the API |
| `APP_URL` | `http://localhost:5173` | frontend base, baked into certificate QR codes |
| `R2_ACCOUNT_ID` | required | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | required | |
| `R2_SECRET_ACCESS_KEY` | required | |
| `R2_BUCKET_NAME` | required | |
| `R2_PUBLIC_URL` | required | public bucket domain |

`CORS_ORIGIN` and `APP_URL` usually hold the same value but mean different things.
One is a security boundary the browser enforces, the other is a link you print inside
a PDF. Keep them separate.

---

## 3. Stack

```
Node 24  ·  TypeScript strict  ·  Express 5
Postgres 18 via TypeORM        (entities, no migrations)
Redis 8 via ioredis            (session allowlist only)
Zod 4                          (all input validation)
Cloudflare R2 + sharp + multer (images)
pdfkit + qrcode                (certificates)
bcryptjs, jsonwebtoken, pino, helmet
```

---

## 4. The shape of a request

```
   cookie
     |
     v
 helmet -> cors -> json(100kb) -> cookieParser -> pino
     |
     v
 /api/v1  ->  <module>.routes.ts
                 |
                 |  authenticate      is this a real, unrevoked session?
                 |  requireRole        is this the right kind of user?
                 |  requireOnboarded   does this user have a college yet?
                 |  validate           is the input well formed? (Zod)
                 v
              controller     thin, no logic, calls exactly one service function
                 |
                 v
              service        all the thinking: queries, rules, transactions
                 |
                 v
              DTO mapper     entities never go out on the wire
                 |
                 v
           sendSuccess / throw AppError -> errorHandler
```

Every module is exactly four files and nothing else:

```
modules/club/
  club.routes.ts       who can call what
  club.schema.ts       what the input must look like
  club.controller.ts   HTTP in, HTTP out
  club.service.ts      the actual rules
```

Read a routes file top to bottom and you know the entire permission story for that
feature. That is the point of the layout.

---

## 5. Philosophy

Six ideas explain most of the code.

**1. The database is the last line of defense.**
Rules are not just service checks. They are `CHECK` constraints, unique indexes, and
partial unique indexes. One campus admin per college. One approved leader per club.
One certificate per registration. If the code forgets, Postgres remembers.

**2. Tenancy is structural, not a `WHERE` clause you hope someone wrote.**
`collegeId` is a claim inside the JWT. Lookups are always `(collegeId, key)`, and
foreign keys point at composite uniques, so a row belonging to another college is not
just filtered out, it is impossible to reference. A forgotten filter becomes a
constraint error instead of a data leak.

**3. Fail closed, leak nothing.**
Crossing a college boundary gives you `404`, never `403`, because `403` admits the
thing exists. Unknown email and wrong password give the identical error. Redis down
during a session check gives `503`, never a quiet bypass.

**4. Store keys, not URLs.**
Entities keep R2 object keys. Public URLs are built at response time. Change the
bucket domain and nothing in the database needs touching.

**5. Side effects are ordered on purpose.**
Slow work (bcrypt, R2, PDF rendering) stays outside transactions. Uploads attach the
new object, save the row, and only then delete the old object. An orphaned file beats
a broken image. A failed cleanup never fails the request.

**6. One enumeration, one definition.**
A `const` array is the single source. The Zod enum derives from it and the SQL `CHECK`
is generated from it. They cannot drift apart.

---

## 6. Who is who

Two roles, and one thing that behaves like a third.

| Actor | How you get it | Can do |
|---|---|---|
| **Student** | signs up with a college email, tenant resolved from the domain | join clubs, create clubs, register for events, collect certificates |
| **Campus admin** | signs up, then onboards a college | approve or reject official clubs, read official club rosters, see college stats |
| **Club leader** | not a role, a membership | one approved leader per club, holds every club and event power |
| **Event organizer** | optional, set by the leader | same event powers as the leader, must be an approved member |

Leader is a `ClubMembership` row, not a user role. Transfer leadership and every
permission moves with it in one write.

---

## 7. Auth, in short

- One JWT in an httpOnly cookie. No Bearer headers, no localStorage, no refresh tokens.
- Claims are `sub`, `role`, `collegeId`, `jti`.
- Redis holds `sess:<userId>:<jti>` as an allowlist, so any session can be killed.
- The token is rotated on safe methods only, so a swap cannot race a write.
- If a claim changes (like `collegeId` after onboarding), a fresh cookie is issued.

Onboarding gate: a campus admin who signs up has no college yet. Every route with
`requireOnboarded` answers `403 ONBOARDING_REQUIRED` until they create one. That code
is separate from plain `FORBIDDEN` so the frontend can redirect instead of scolding.

---

## 8. Club lifecycle

```
 student creates a club
        |
        +---- type: unofficial ----> approved instantly
        |
        +---- type: official ------> pending
                                        |
                        campus admin decides
                          /                \
                    approved              rejected
```

Only approved clubs can be joined or run events.

Joining:

```
 student -> POST members -> pending -> leader decides -> approved
                                                      \-> rejected (can re-apply)
```

The leader cannot leave. Transfer leadership first. That rule exists so a club can
never end up ownerless.

---

## 9. Event lifecycle

```
  draft  ------------> published ------------> check-in open ------------> results
    |                      |                        |                         |
 editable            registrations            roster frozen             podium public
 deletable              open                  attendance marked        certificates minted
                          |
                          +--> cancelled (registrants notified)
```

Step by step:

1. Leader or organizer creates the event as a `draft`.
2. `PATCH /events/:slug/status` with `published` opens registration and notifies club members.
3. Students register. Capacity is enforced with a row lock, so two people cannot take the last seat.
4. `POST /events/:slug/checkin` freezes the roster and opens attendance.
5. `PATCH /events/:slug/registrations/:userId` marks each attendee as `checked_in`.
6. `PUT /events/:slug/results` writes the podium, locks the event, and mints certificates.

Notes worth knowing:

- `participant` is never stored. A checked in row with no result renders as one.
- Check-in never writes a result, so re-scanning a badge cannot wipe someone's award.
- Results publish once. Repeating it returns `409`, because it already minted credentials.
- The podium is public. The attendee list is not.

---

## 10. Certificates

Certificates are minted, not requested. Publishing results inserts one row per checked
in registration, in the same transaction.

- Only **approved official** clubs mint. Issuing a credential carries institutional
  weight, and an unofficial club does not have it. Unofficial clubs still run the full
  event and still publish results, they just produce no certificate.
- The serial looks like `HIVE-2026-XXXXXXXXXXXXXX` (14 random Crockford base32 chars).
  It is the credential itself, which is why verification is public and untenanted.
- The PDF is drawn on first read, uploaded, and the key stored. First open takes about
  1.7 seconds, every open after that is milliseconds.
- The wallet listing never renders. Otherwise one page of 20 certificates would trigger
  20 PDF renders.
- Three designs, keyed off the result: winner, runner up, participant.

`GET /certificates/:serial` is the only route in the whole API with no authentication
and no college scoping. That is deliberate. A recruiter with the serial can verify it.

---

## 11. Announcements

The club wall. Leaders write, members read.

- Reads are gated exactly like the member list: approved members, plus campus admins on
  official clubs.
- The byline stays with the original author even after leadership transfers.
- A bare `GET /announcements` is your own feed across all your clubs. Add `?club=slug`
  to narrow it.
- Notifications fire on create only. An edit is not news.

---

## 12. Notifications

Quiet, best effort, never blocking. A failed notification write logs a warning and the
action that caused it still succeeds. They are written after the state change, outside
the transaction, so a 500 person fan out never holds a lock.

| Type | Goes to |
|---|---|
| `club_approved` / `club_rejected` | the club leader |
| `join_requested` | the club leader |
| `join_approved` / `join_rejected` | the applicant |
| `event_published` | approved club members, minus the actor |
| `event_cancelled` | everyone still registered |
| `results_published` | everyone still registered |
| `announcement_posted` | approved club members, minus the author |

One event, one ping. Results do not send a second notification for the certificate.

`link` is frontend relative, like `/events/my-event`, so the API never has to know your
domain.

---

## 13. Uploads

Two phases, always.

```
1. POST /uploads  (file + purpose)
       sharp normalises to WebP at a per purpose size
       lands in staging/<userId>/<purpose>/<uploadId>.webp
       returns { uploadId }

2. send that uploadId to the create or update call that owns the image
       the object moves out of staging and the key is saved on the row
```

The `uploadId` is a capability token. Ownership is enforced by how the key is derived,
so you cannot attach someone else's upload.

Limits: 5MB, one file per request, images only.
Purposes: `avatar`, `college_logo`, `club_logo`, `event_banner`.

---

## 14. Response contract

This never changes. Clients can parse it blindly.

Success:

```json
{ "success": true, "data": { "club": { } } }
```

`201` on create, `204` with no body on delete, `200` otherwise.

Lists are always shaped the same way:

```json
{ "success": true,
  "data": { "clubs": [], "total": 42, "page": 1, "limit": 20 } }
```

Error:

```json
{ "success": false,
  "error": { "code": "VALIDATION_ERROR",
             "message": "Invalid input",
             "details": [ { "field": "email", "message": "Not a valid email" } ] } }
```

`details` is omitted when empty. Field level problems always arrive this way, so the
frontend needs exactly one error renderer.

| Code | Status | Means |
|---|---|---|
| `VALIDATION_ERROR` | 400 | bad input, check `details` |
| `UNAUTHENTICATED` | 401 | no cookie, bad cookie, or revoked session |
| `FORBIDDEN` | 403 | signed in, not allowed |
| `ONBOARDING_REQUIRED` | 403 | campus admin has no college yet |
| `NOT_FOUND` | 404 | missing, or belongs to another college |
| `CONFLICT` | 409 | slug taken, already registered, wrong lifecycle state |
| `RATE_LIMITED` | 429 | reserved, not wired up yet |
| `SERVICE_UNAVAILABLE` | 503 | Redis unreachable during a session check |
| `INTERNAL` | 500 | something broke, details are in the logs only |

---

## 15. API reference

Base URL: `/api/v1`. Auth is a cookie, so nothing needs a header.

"Onboarded" means signed in and holding a `collegeId`.

### Health

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/health` | anyone | uptime and database status |

### Auth

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/auth/signup` | anyone | create account, sets cookie, returns `{user}` |
| POST | `/auth/login` | anyone | sets cookie, returns `{user}` |
| POST | `/auth/logout` | signed in | revokes the session, clears the cookie |

Signup body: `role` (`student` or `campus_admin`), `email`, `password` (8 to 72 chars),
`fullName`. A student's college is resolved from the email domain.

### Users

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/users/me` | signed in | your profile, including onboarding state |
| PATCH | `/users/me` | signed in | update `fullName`, `avatarUploadId`, `rollNo`, `branch`, `bio` |
| GET | `/users/:id` | onboarded | public profile of someone in your college |

Roll numbers are unique per college.

### Colleges

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/colleges` | campus admin | onboard: `name`, `slug`, `domain`, optional `description`, `logoUploadId`. Reissues the cookie |
| GET | `/colleges/stats` | campus admin, onboarded | club, event, member and certificate counts |
| PATCH | `/colleges/:slug` | campus admin, onboarded | update `name`, `description`, `logoUploadId` |

`stats` returns:

```json
{ "clubs": { "total": 18, "pending": 4 },
  "events": { "total": 23, "published": 20 },
  "members": 512, "certificates": 87 }
```

### Clubs

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/clubs` | student | create. `official` starts pending, `unofficial` is approved at once. Creator becomes leader |
| GET | `/clubs` | onboarded | directory, see filters below |
| GET | `/clubs/:slug` | onboarded | detail with your membership state |
| PATCH | `/clubs/:slug` | club leader | update `name`, `category`, `description`, `logoUploadId` |
| PATCH | `/clubs/:slug/status` | campus admin | decide an official club: `{status: "approved" \| "rejected"}` |
| PUT | `/clubs/:slug/leader` | club leader | hand over: `{userId}`. Target must be an approved member |
| POST | `/clubs/:slug/members` | student | request to join, creates a `pending` row |
| GET | `/clubs/:slug/members` | approved member, or campus admin on official clubs | roster |
| PATCH | `/clubs/:slug/members/:userId` | club leader | decide a request: `{status: "approved" \| "rejected"}` |
| DELETE | `/clubs/:slug/members/:userId` | leader (kick) or yourself (leave) | 204. Leaders must transfer first |

Filters on `GET /clubs`: `search`, `category`, `type`, `status`, `mine=true`,
`sort` (`name` default, or `newest`), `page`, `limit` (max 50).

Categories: `technical`, `cultural`, `sports`, `academic`, `arts`, `literary`,
`entrepreneurship`, `social_service`.

### Events

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/events` | club leader | create as draft under `clubSlug` |
| GET | `/events` | onboarded | directory, see filters below |
| GET | `/events/:slug` | onboarded | detail with your registration state |
| PATCH | `/events/:slug` | leader or organizer | update fields, including `organizerUserId` |
| PATCH | `/events/:slug/status` | leader or organizer | `{status: "published" \| "cancelled"}` |
| DELETE | `/events/:slug` | leader or organizer | drafts only, 204 |
| POST | `/events/:slug/registrations` | student | register yourself |
| DELETE | `/events/:slug/registrations` | student | cancel your own registration, 204 |
| GET | `/events/:slug/registrations` | leader or organizer | roster, filter by `search`, `status`, `result` |
| POST | `/events/:slug/checkin` | leader or organizer | freeze roster, open attendance |
| PATCH | `/events/:slug/registrations/:userId` | leader or organizer | `{status: "checked_in"}` |
| PUT | `/events/:slug/results` | leader or organizer | `{winnerUserId, runnerUpUserIds[]}`, one shot |

Filters on `GET /events`: `search`, `category`, `club`, `from`, `to`, `status`,
`manage=true`, `registered=true`, `available=true`,
`sort` (`soonest` default, `latest`, `newest`), `page`, `limit` (max 50).

`available=true` means you could register right now: check-in has not opened and there
are seats left. No `capacity` means unlimited.

Categories: `workshop`, `competition`, `seminar`, `cultural`, `sports`, `hackathon`.

### Announcements

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/announcements` | club leader | `{clubSlug, title, body}` |
| GET | `/announcements` | onboarded | your feed, or one club with `?club=slug` |
| GET | `/announcements/:id` | club audience | single announcement |
| PATCH | `/announcements/:id` | club leader | update `title` or `body` |
| DELETE | `/announcements/:id` | club leader | 204 |

Keyed by uuid, not slug. Filters: `search`, `club`, `page`, `limit`.

### Certificates

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/certificates` | student | your wallet. `fileUrl` is null until you open one |
| GET | `/certificates/:serial` | **anyone, no auth** | public verification, renders the PDF on first read |

### Notifications

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/notifications` | onboarded | feed plus an `unread` count. `?unread=true` narrows it |
| POST | `/notifications/read-all` | onboarded | returns `{updated}` |
| PATCH | `/notifications/:id/read` | onboarded | mark one, idempotent |

### Uploads

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/uploads` | signed in | multipart `file` plus `purpose`, returns `{uploadId}` |

---

## 16. Layout

```
server/src/
  index.ts        middleware chain, startup, graceful shutdown
  routes.ts       mounts every module under /api/v1
  config/         env, data-source, logger, redis, r2
  middlewares/    authenticate, requireRole, requireOnboarded, validate, upload, error
  entity/         10 entities, snake_case tables, the real spec
  modules/        auth user college club event announcement certificate notification upload
  utils/          AppError, response, jwt, session, cookie, password, storage, email, certificate
  types/          express request augmentation
```

Entity relationships:

```
College
  |-- User (campus_admin | student)
  |     |-- Student profile
  |     '-- Notification (the one table with no college_id)
  '-- Club
        |-- ClubMembership (pending | approved | rejected, one approved leader)
        |-- Announcement
        '-- Event
              '-- EventRegistration (registered | checked_in | cancelled)
                    '-- Certificate (one per registration)
```
