# StudioSpace API

Express serves the studio directory, image uploads, authentication and bookings. The client uses the same API paths locally and on Netlify. JavaScript modules in src/ are grouped by feature.

## Local setup

1. Install Node 22.13+ and run `npm ci`.
2. Run `npm run setup` to create `.env` with fresh secrets. Use MongoDB Atlas or run `docker compose up -d --wait` for the included local replica set. Booking transactions require a replica set.
3. For Atlas, edit the database settings in `.env` to match your cluster. The local Docker configuration works with the generated defaults.
4. Set the Google OAuth and ImgBB keys to enable social login and file uploads. Direct image URLs work independently of uploads.
5. Run `npm run seed` once, then `npm run dev`. Local API port is 4000. The Next development server on port 3000 forwards /api here.
6. Run `npm test` for the rule checks. The root README includes the integration checks and Netlify instructions.

## Route map

| Method | Path | Who can use it |
| --- | --- | --- |
| GET | /api/health, /api/config | Everyone |
| GET, POST | /api/auth/* | Better Auth email and Google flows |
| POST, DELETE | /api/session/access | Issue a signed HttpOnly access cookie from a valid session, or clear it |
| GET | /api/studios, /api/studios/:id, /api/studios/:id/availability?day=YYYY-MM-DD | Public directory, details and busy intervals |
| GET | /api/studios/mine | Signed-in host |
| POST | /api/studios | Signed-in host |
| PUT, DELETE | /api/studios/:id | Owner only |
| POST | /api/uploads | Signed-in member, max 2 MB per image |
| GET, POST | /api/bookings | Guest’s reservations or a new request |
| GET | /api/bookings?role=host | Host’s incoming reservations |
| PATCH | /api/bookings/:id | Guest or host, according to booking state |
| POST | /api/newsletter | Public email subscription |

## Booking rules

The directory uses whole-hour slots between 06:00 and 23:00 in Bangladesh time (UTC+6). Rates are in USD. A reservation takes a snapshot of the rental price and refundable deposit. The total is an estimate and no payment is collected.

Creation touches the studio document in a MongoDB transaction before it queries overlapping active bookings. Two concurrent requests for the same studio contend on that write. The losing transaction retries and sees the winning hold. The overlap test is `existing.start < requested.end && existing.end > requested.start`, so adjacent sessions are valid.

Pending and Confirmed bookings both hold time. Guests can cancel Pending bookings. Hosts confirm future Pending bookings, cancel requests, and complete Confirmed bookings after the session. An active reservation prevents a studio from being deleted. Historical booking snapshots survive listing edits or removal.

## Updating the Netlify copy

The deployed client installs this server as a local npm tarball. After changing runtime code, increase the package version, run `npm pack --pack-destination ../client/vendor`, then install the new filename in the client with `npm install ./vendor/studiospace-api-VERSION.tgz`. Remove the superseded tarball and commit both repositories. The client Netlify project redeploys on its next push.
