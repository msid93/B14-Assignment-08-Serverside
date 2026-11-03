# B14-Assignment-08-Serverside

StudioSpace

StudioSpace helps a creator rent a production room by the hour. A host can publish a space, review incoming bookings and manage the studio’s calendar. The first directory contains six fictional spaces in Bangladesh with locally bundled photographs, USD rates and Bangladesh-local booking hours.

## What to open

| Item | What it contains |
| --- | --- |
| client/ | Next.js pages, UI components, styles, images and the Netlify setup |
| server/ | Editable Express API, Better Auth, MongoDB queries, seed accounts and tests |
| design/StudioSpace-UI.svg | Six editable design plates covering the desktop homepage, mobile homepage, dark directory, listing, booking dialog and brand. Open the SVG in a browser and zoom in, or import it into a vector editor |
| DEPLOYMENT.md | Step-by-step instructions for pushing the repositories and deploying the complete application on Netlify |
| history/ | Git bundles that restore the separate client and server commit histories |
| client/README.md | The examiner-facing overview, login credentials and live URL field |
| server/README.md | API endpoints, booking rules and how to release a server change |

## How the project fits together

| Step | Start reading here | What happens |
| --- | --- | --- |
| 1. Design the directory | design/StudioSpace-UI.svg, client/app/globals.css, client/app/catalog.css, client/app/desk.css | The Studio Index pairs a full-width campaign photograph with Manrope and italic Newsreader headings. Cobalt marks search actions and the active route. |
| 2. Find a space | client/components/Explore.jsx, server/src/studios.js | A category click fills the URL query. Express filters by category and text. The home page uses a separate sorted query capped with limit(6). |
| 3. Identify the member | client/components/AuthForm.jsx, client/components/Session.jsx, server/src/auth.js | Better Auth checks the email/password or Google login. On refresh, private pages wait for the session. Protected API calls also need a short-lived signed HttpOnly JWT. |
| 4. Publish a space | client/components/StudioForm.jsx, server/src/validation.js | A host submits the listing and gallery. Express validates it and attaches the owner ID from the active session. The browser cannot choose who owns a studio. |
| 5. Request the hours | client/components/BookingPanel.jsx, server/src/bookings.js | The modal shows local hours, rental and deposit. The server reads the current rate and checks overlapping active bookings inside a MongoDB transaction before writing Pending. |
| 6. Manage the booking | client/components/Reservations.jsx, server/src/bookings.js | The creator can cancel a pending request. The host can confirm it and mark a finished session complete. The desk refreshes every 20 seconds while visible and when you return to the tab. |
| 7. Deliver the website | client/netlify.toml, client/netlify/functions/studio.mjs | Netlify serves Next.js and routes /api/* to Express under the same domain. The API connects to Atlas. |

