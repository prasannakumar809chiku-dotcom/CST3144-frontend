# CST3144 Frontend (Vue 3)

Frontend coursework project for an after-school classes booking site.

## Live links (replace placeholders)
- Frontend (GitHub Pages): `https://prasannakumar809chiku-dotcom.github.io/CST3144-frontend/`
- Backend (Render): `https://cst3144-m01030169-backend.onrender.com`

## Local parent-folder layout

```text
CST3144-project/
├── CST3144-frontend/
└── CST3144-backend/
```

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Environment

Copy `.env.example` to `.env` if you need local overrides.

- `VITE_API_BASE_URL` defaults to `https://cst3144-m01030169-backend.onrender.com`
- `VITE_BASE_PATH` defaults to `/CST3144-frontend/` for GitHub Pages

## Features implemented

- Lessons fetched from `GET /lessons` and rendered with `v-for`
- Sorting by subject, location, price, spaces (ascending/descending)
- Search + teacher filtering through query params (`search`, `teacher`)
- Add-to-cart button always visible and disabled when spaces are 0
- Cart quantities, remove action, and local space restoration
- Checkout validation with regex:
  - Name: letters and spaces only
  - Phone: numbers only
- Order submission with native `fetch()`:
  - `POST /orders`
  - `PUT /lessons/:id` to persist updated lesson spaces
- Enrolment lookup with `GET /enrolment/:lessonid`
- Loading, empty, error, and success states
- Responsive and accessible UI controls using Vue methods, `computed`, `v-model`, and event handling

## API contract used

### `GET /lessons`
Returns an array of lesson objects. Used fields:
- `_id` or `id`
- `subject`
- `location`
- `price`
- `spaces`
- `image` or `icon`
- `description`
- `teacher`

Optional query parameters used by the frontend:
- `search`
- `teacher`

### `POST /orders`
Request body sent:

```json
{
  "name": "Student Name",
  "phone": "07123456789",
  "items": [
    { "lessonId": "abc123", "subject": "Math", "quantity": 1, "price": 20 }
  ],
  "total": 20
}
```

### `PUT /lessons/:id`
Request body sent:

```json
{
  "spaces": 9
}
```

### `GET /enrolment/:lessonid`
Returns enrolment information for a lesson where supported by the backend.

## Deployment notes (GitHub Pages)

- Vite base path is configured in `vite.config.js`
- Build output is generated in `dist/`
- Do not commit secrets or credentials

## Security and secrets

- Native `fetch()` is used; no Axios/XMLHttpRequest
- `.gitignore` excludes `node_modules` and `.env*` secrets (except `.env.example`)
