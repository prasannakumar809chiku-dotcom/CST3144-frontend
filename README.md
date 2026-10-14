# CST3144 Frontend – After School Classes

Vue 3 static frontend for the CST3144 coursework application. It uses native `fetch()` and the Vue CDN, so no frontend build step is required.

## Live application

The frontend is intended for GitHub Pages. Set the repository's Pages source to the `main` branch and root folder.

## Local use

Open `index.html` directly or run a static server:

```bash
npx serve .
```

The default backend is `https://cst3144-m01030169-backend.onrender.com`. For another backend, define `window.CST3144_API_URL` before loading `app.js`.

## Features

- Displays and sorts lessons by subject, location, price, or spaces.
- Backend lesson search with client-side fallback.
- Cart and checkout flow with name and phone validation.
- Native `fetch()` only; no secrets are stored in this repository.

## GitHub Pages

After pushing to `main`, enable **Settings → Pages → Deploy from a branch → main → /(root)**. The resulting URL is normally:

`https://prasannakumar809chiku-dotcom.github.io/CST3144-frontend/`

Student M01030169 – CST3144 Full Stack Development 2026–27
