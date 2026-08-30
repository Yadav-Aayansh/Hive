# Hive API

Express + TypeScript backend for Hive. One college is one tenant.

## Requirements

- Node 24 or newer
- Docker, for Postgres and Redis
- A Cloudflare R2 bucket with a public URL

## Setup

Copy `.env.example` to `.env` and fill it in; every variable is in the table below.

```bash
docker compose up -d          # from the repo root
cd server
npm install
npm run dev                   # http://localhost:3003/api/v1/health
```

Tables are created by migrations, not by `synchronize`, which is off. `migrationsRun: true`
applies anything pending at startup, before the server listens, so a fresh database needs no
manual step.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | nodemon + ts-node |
| `npm run build` | clears `dist/`, then `tsc` into it |
| `npm start` | `node dist/index.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .` |
| `npm run migration:generate -- src/migration/<Name>` | diff the entities against the database and write the SQL |
| `npm run migration:run` | apply pending migrations by hand |
| `npm run migration:revert` | roll the last one back |

`build` clears `dist/` first because `tsc` never deletes stale output, and a migration left
behind there would still be executed at startup.

After changing an entity, run `migration:generate`, read the SQL, and commit it. "No changes
in database schema were found" means the entities and the database already agree.

## Environment

One Zod schema parses `process.env` at import time, so a bad value stops the process at
startup.

| Variable | Required | Default |
|---|---|---|
| `NODE_ENV` | no | `development` |
| `PORT` | no | `3000` |
| `DATABASE_URL` | no | `postgres://hive:hive@localhost:5432/hive` |
| `REDIS_URL` | no | `redis://localhost:6379` |
| `JWT_SECRET` | yes, 32 chars minimum | |
| `JWT_TTL_DAYS` | no | `7` |
| `COOKIE_NAME` | no | `hive_token` |
| `CORS_ORIGIN` | no | `http://localhost:5173` |
| `APP_URL` | no | `http://localhost:5173` |
| `R2_ACCOUNT_ID` | yes | |
| `R2_ACCESS_KEY_ID` | yes | |
| `R2_SECRET_ACCESS_KEY` | yes | |
| `R2_BUCKET_NAME` | yes | |
| `R2_PUBLIC_URL` | yes | |

`CORS_ORIGIN` is the browser origin allowed to call the API. `APP_URL` is the frontend base
printed into certificate QR codes.

TLS for Postgres is requested through the URL, not a driver setting: append `?sslmode=require`
(managed providers hand you a string that already has it). Locally it is left off. Use
`rediss://` for a managed Redis, since `redis://` sends the password in cleartext.

## Stack

Express 5, TypeORM 1.1, Postgres 18, Redis 8 for the session allowlist, Zod 4, Cloudflare R2
with sharp, bcryptjs, jsonwebtoken, pino, helmet, pdfkit and qrcode.

## Layout

```
src/
  index.ts        helmet, cors, json(100kb), cookieParser, pinoHttp, /api/v1, 404, errors
  routes.ts       mounts every module and /health
  config/         env, data-source, logger, redis, r2
  middlewares/    authenticate, requireRole, requireOnboarded, validate, upload, error
  entity/         10 entities, snake_case tables
  migration/      generated, committed, applied at startup
  modules/<name>/ routes, schema, controller, service
  utils/          AppError, response, jwt, session, cookie, password, storage, email, certificate
```

Every module is four files. Routes wire the middleware, schemas hold the Zod validation,
controllers call one service function, services hold the rules and the DTO mappers.
Entities never go out on the wire.

## Data model

```
College
  User (campus_admin | student)
    Student (profile, roll no unique per college)
  Club (official | unofficial)
    ClubMembership (pending | approved | rejected)
    Announcement
    Event (draft | published | cancelled)
      EventRegistration (registered | checked_in | cancelled)
        Certificate
Notification (scoped by user_id)
```

Invariants are `CHECK` constraints and unique indexes: one campus admin per college, one
approved leader per club, one roll number per college, one certificate per registration.
Foreign keys point at composite uniques, so a row from another college cannot be
referenced. Event capacity is held by a `pessimistic_write` lock on the event row.

## Auth

One JWT in an httpOnly cookie, claims `sub`, `role`, `collegeId`, `jti`. Redis holds
`sess:<userId>:<jti>` as an allowlist, so a session can be revoked. The token is rotated on
GET, HEAD and OPTIONS past half its lifetime, and reissued whenever a claim changes. Rotation
expires the previous `jti` to 60 seconds rather than deleting it, so a request already in
flight with the old cookie does not fail.

A student's college comes from their email domain at signup. A campus admin signs up with no
college and gets `403 ONBOARDING_REQUIRED` until they create one.

Crossing a college boundary returns 404. Unknown email and wrong password return the same
error.

## Response contract

```json
{ "success": true, "data": { "club": {} } }
```

201 on create, 204 on delete, 200 otherwise. Lists are `{ items, total, page, limit }` under
a named key.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [{ "field": "email", "message": "Not a valid email" }]
  }
}
```

| Code | Status |
|---|---|
| `VALIDATION_ERROR` | 400 |
| `UNAUTHENTICATED` | 401 |
| `FORBIDDEN` | 403 |
| `ONBOARDING_REQUIRED` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `RATE_LIMITED` | 429 |
| `SERVICE_UNAVAILABLE` | 503 |
| `INTERNAL` | 500 |

## API

Base URL `/api/v1`. Auth is the cookie. "Onboarded" means signed in with a `collegeId`.

### Health

| Method | Path | Access |
|---|---|---|
| GET | `/health` | public |

### Auth

| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/auth/signup` | public | `{role, email, password, fullName}` |
| POST | `/auth/login` | public | `{email, password}` |
| POST | `/auth/logout` | signed in | |

`role` is `student` or `campus_admin`. Password 8 to 72 characters. Signup and login set the
cookie. A student signup fails if no college matches their email domain.

### Users

| Method | Path | Access | Body |
|---|---|---|---|
| GET | `/users/me` | signed in | |
| PATCH | `/users/me` | signed in | `fullName`, `avatarUploadId`, `rollNo`, `branch`, `bio` |
| GET | `/users/:id` | onboarded | |

`rollNo`, `branch` and `bio` are student only. Send `null` to clear a field.

### Colleges

| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/colleges` | campus admin | `{name, slug, domain, description?, logoUploadId?}` |
| GET | `/colleges/stats` | campus admin, onboarded | |
| GET | `/colleges/:slug` | public | |
| PATCH | `/colleges/:slug` | campus admin, onboarded | `name`, `description`, `logoUploadId` |

`domain` must match the admin's own email domain. Onboarding reissues the cookie. `PATCH`
works on your own college only. `stats` returns
`{clubs: {total, pending}, events: {total, published}, members, certificates}`.

### Clubs

| Method | Path | Access |
|---|---|---|
| POST | `/clubs` | student |
| GET | `/clubs` | onboarded |
| GET | `/clubs/:slug` | onboarded |
| PATCH | `/clubs/:slug` | club leader |
| PATCH | `/clubs/:slug/status` | campus admin |
| PUT | `/clubs/:slug/leader` | leader, or campus admin on an official club |
| POST | `/clubs/:slug/members` | student |
| GET | `/clubs/:slug/members` | approved member, or campus admin on an official club |
| PATCH | `/clubs/:slug/members/:userId` | club leader |
| DELETE | `/clubs/:slug/members/:userId` | leader kicks, or yourself to leave |

Create takes `{name, slug, category, type, description?, logoUploadId?}` and makes the
creator the leader. Official clubs start `pending` and need a campus admin decision;
unofficial clubs are approved at once. Only approved clubs can be joined or run events.

Both decision routes take `{status: "approved" | "rejected"}`. Leader transfer takes
`{userId}` and the target must be an approved member. An approved leader cannot be removed
until leadership moves. A rejected applicant can apply again. Leaving or being kicked also
cancels that student's registrations for the club's events that have not opened check-in; a
frozen roster is attendance history and is left alone.

`GET /clubs` query: `search`, `category`, `type`, `status`, `mine`, `sort` (`name` or
`newest`), `page`, `limit` (max 50). Without `mine` the list is approved clubs only, and
`status` applies to campus admins. Leaders and admins also see pending rows in the member
list.

Categories: `technical`, `cultural`, `sports`, `academic`, `arts`, `literary`,
`entrepreneurship`, `social_service`.

### Events

| Method | Path | Access |
|---|---|---|
| POST | `/events` | club leader |
| GET | `/events` | onboarded |
| GET | `/events/:slug` | onboarded |
| PATCH | `/events/:slug` | club leader |
| PATCH | `/events/:slug/status` | club leader |
| DELETE | `/events/:slug` | club leader, drafts only |
| POST | `/events/:slug/registrations` | student |
| DELETE | `/events/:slug/registrations` | student |
| GET | `/events/:slug/registrations` | leader or organizer |
| POST | `/events/:slug/checkin` | leader or organizer |
| PATCH | `/events/:slug/registrations/:userId` | leader or organizer |
| PUT | `/events/:slug/results` | leader or organizer |

Editing, publishing, cancelling and deleting are leader only. The organizer shares the
running of the event: roster, check-in, attendance, results.

```
draft -> published -> check-in opened -> results published
```

- `startsAt` must be in the future when it is set, and still in the future at publish.
  Publishing needs `endsAt` too. A cancelled event cannot be republished.
- Check-in opens no earlier than 24 hours before `startsAt`. Results cannot be published
  before `startsAt` has passed. Attendance needs check-in to be open, so it inherits both.
- The organizer cannot register for their own event, and a student holding a live seat
  cannot be made organizer.
- Once published, only `description`, `venue`, `organizerUserId` and `bannerUploadId` can
  change. Publishing results locks the event.
- Registering needs an approved membership, a published event, check-in not yet opened and a
  free seat. `capacity: null` is unlimited.
- Cancelling your own seat stops working once check-in opens.
- `participant` is never stored. A checked in row with no result reads as one.
- `{winnerUserId, runnerUpUserIds}` must all be checked in, and neither the organizer nor the
  club leader may be on the podium. At most 10 runners up, no duplicates, winner excluded.
  Repeating the call returns 409.

`GET /events` query: `search`, `category`, `club`, `status`, `from`, `to`, `manage`,
`registered`, `available`, `sort` (`soonest`, `latest`, `newest`), `page`, `limit` (max 50).
Published only by default. `manage` narrows to events you lead or organize and is where
`status` applies. `registered` shows events you hold a live seat for. `available` means you
could register right now.

Roster query: `search`, `status`, `result`, `page`, `limit` (max 100).

Categories: `workshop`, `competition`, `seminar`, `cultural`, `sports`, `hackathon`.

### Announcements

| Method | Path | Access |
|---|---|---|
| POST | `/announcements` | club leader |
| GET | `/announcements` | onboarded |
| GET | `/announcements/:id` | club audience |
| PATCH | `/announcements/:id` | club leader |
| DELETE | `/announcements/:id` | club leader |

Keyed by uuid. Create takes `{clubSlug, title, body}`. A bare `GET` is the feed across your
approved clubs, or every official club for a campus admin. Query: `search`, `club`, `page`,
`limit`. The byline stays with the original author after a leadership transfer.

### Certificates

| Method | Path | Access |
|---|---|---|
| GET | `/certificates` | student |
| GET | `/certificates/:serial` | public |

`PUT /events/:slug/results` mints one certificate per checked in registration, in the same
transaction, and only for an approved official club. The serial is
`HIVE-<year>-<14 Crockford base32 characters>`, which is why verification is public and
carries no college scoping. It and `GET /colleges/:slug` are the only two unauthenticated
routes.

The PDF is drawn on first read, uploaded to R2, and the key stored. The wallet listing does
not render, so `fileUrl` is null there until someone opens that certificate. Three designs:
winner, runner up, participant.

### Notifications

| Method | Path | Access |
|---|---|---|
| GET | `/notifications` | onboarded |
| POST | `/notifications/read-all` | onboarded |
| PATCH | `/notifications/:id/read` | onboarded |

The feed carries an `unread` count. `?unread=true` narrows it. Notifications are written
after the state change and outside its transaction, so a failure is logged rather than
raised.

| Type | Goes to |
|---|---|
| `club_approved`, `club_rejected` | the club leader |
| `join_requested` | the club leader |
| `join_approved`, `join_rejected` | the applicant |
| `event_published` | approved club members, minus the actor |
| `event_cancelled` | everyone holding a live seat |
| `results_published` | everyone holding a live seat |
| `announcement_posted` | approved club members, minus the author |

`link` is frontend relative, for example `/events/my-event`.

### Uploads

| Method | Path | Access |
|---|---|---|
| POST | `/uploads` | signed in |

Multipart `file` plus `purpose`, returns `{uploadId}`. sharp normalises the image to WebP
into `staging/<userId>/<purpose>/<uploadId>.webp`. Send that `uploadId` to the create or
update call that owns the image and the object moves out of staging. The staging key is
derived from the user, so you cannot attach someone else's upload.

JPEG, PNG and WebP. 5MB, one file per request.

| Purpose | Output |
|---|---|
| `avatar` | 256x256 |
| `college_logo` | 512x512 |
| `club_logo` | 512x512 |
| `event_banner` | 1280x720 |

Entities store R2 object keys. Public URLs are built from `R2_PUBLIC_URL` at response time.
