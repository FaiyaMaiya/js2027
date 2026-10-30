# Frontend

React application built with Vite.

From this directory:

```sh
npm ci
npm run dev
```

Set `VITE_API_URL` in `.env.local` to the Flask API origin when it is hosted
separately. Leave it empty when frontend and API share an origin.

Use `npm run build` to create the production bundle and `npm run lint` to run
ESLint.
