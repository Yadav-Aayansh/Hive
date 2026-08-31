# Hive

Campus club and event management. One college is one tenant.

Students create and join clubs, clubs run events, attendees check in, and everyone who
attended gets a certificate anyone can verify from its serial. Campus admins approve the
official clubs.

## Repo

```
Hive/
  server/                  Express 5 + TypeScript API   (server/README.md)
  client/                  React 19 + Vite web app      (client/README.md)
  docker-compose.yml       Postgres 18 and Redis 8, for development
  docker-compose.prod.yml  the API container, for a deployed VM
  server/Dockerfile        multi-stage build of that container
```

## Requirements

- Node 24 or newer
- Docker
- A Cloudflare R2 bucket with a public URL
- An SMTP account and a Razorpay test key pair

## Run it

```bash
git clone git@github.com:Yadav-Aayansh/Hive.git
cd Hive
```

**1.** Create `server/.env` from the template. Every variable is listed in
[`server/README.md`](server/README.md#environment).

```bash
cp server/.env.example server/.env      # then fill in JWT_SECRET, R2, SMTP and Razorpay
```

**2.** Start the databases.

```bash
docker compose up -d
```

**3.** Start the API.

```bash
cd server
npm install
npm run dev                   # http://localhost:3003/api/v1/health
```

**4.** Start the web app, in a second terminal.

```bash
cd client
npm install
cp .env.example .env
npm run dev                   # http://localhost:5173
```

The database schema is created by migrations, which run automatically at API startup.

## First run

1. Sign up as **campus admin** with your college email.
2. Onboard the college. The domain has to match your own email domain.
3. Sign up as a **student** on that same domain. The college is matched automatically.
4. Create a club. Unofficial clubs are live at once, official ones wait for approval.
5. Create an event under a club you lead, publish it, open check-in, mark attendance, publish
   results. An approved official club mints certificates at that point.

The event lifecycle is gated on the clock, so to walk all of step 5 in one sitting give the
event a start time **within the next 24 hours**: check-in opens no earlier than 24 hours
before the start, and results cannot be published until the start has passed.

A new college is on the free plan, which caps it at 3 clubs and 10 events. Lift it under
College settings; Razorpay runs in test mode, so no real money moves.

## Roles

| Role | How you get it | Can do |
|---|---|---|
| Campus admin | sign up, then onboard a college. One per college | approve official clubs, read their rosters and announcements, see college stats, upgrade the plan |
| Student | sign up on a registered college domain | create and join clubs, register for events, collect certificates |
| Club leader | a membership row, one per club | everything about their club and its events |
| Event organizer | set by the leader, must be an approved member | run the event: roster, check-in, attendance, results |

Leadership is a `ClubMembership` row, so transferring it moves every permission in one write.

## Stack

| | |
|---|---|
| API | Node 24, Express 5, TypeORM 1.1, Postgres 18, Redis 8, Zod 4 |
| Storage | Cloudflare R2, sharp for images, pdfkit and qrcode for certificates |
| Email and payments | nodemailer over SMTP, Razorpay in test mode |
| Auth | JWT in an httpOnly cookie, Redis session allowlist, bcryptjs |
| Web | React 19, Vite 8, TanStack Router and Query, react-hook-form, Tailwind v4, shadcn |

## Scripts

Same names on both sides.

| | `server/` | `client/` |
|---|---|---|
| `npm run dev` | nodemon + ts-node | vite dev server |
| `npm run build` | clears `dist/`, then `tsc` | `tsc -b` then `vite build` |
| `npm start` | `node dist/index.js` | — |
| `npm run preview` | — | serve the built `dist/` |
| `npm run typecheck` | `tsc --noEmit` | `tsc -b` |
| `npm run lint` | eslint | eslint |

`server/` also has `migration:generate`, `migration:run` and `migration:revert`. See
[`server/README.md`](server/README.md#scripts).

## Contract

The API returns one envelope for everything.

```json
{ "success": true, "data": { "club": {} } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid input", "details": [] } }
```

The client has one fetch wrapper that unwraps it and one renderer for `details`, so every
field error looks the same wherever it came from.

Tenancy is structural. `collegeId` is a JWT claim, lookups are `(collegeId, key)`, and
foreign keys point at composite uniques, so a row from another college cannot be referenced.

## Deploying

Postgres and Redis are managed services in production, not containers. The API is one
container behind a reverse proxy that terminates TLS; the client is static files on a CDN.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

That builds `server/Dockerfile` and publishes the API on `127.0.0.1:3000` only, so nothing but
the proxy on that host can reach it. Migrations run at startup, so a fresh database needs no
extra step. Point `DATABASE_URL` and `REDIS_URL` at the managed instances, and set
`CORS_ORIGIN` and `APP_URL` to the deployed client.

The session cookie is `SameSite=Strict`, so the client and the API must share a registrable
domain — `hive.example.com` with `api.hive.example.com`. A platform's default domain such as
`*.pages.dev` is its own registrable domain, so the cookie would never be sent.

## License

Private. Not licensed for redistribution.
