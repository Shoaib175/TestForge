# API Test Generator

A minimal full-stack app that generates structured API test cases plus starter snippets for Postman and RestAssured.

## Structure

- `backend/` - Express API intended for deployment on Render
- `frontend/` - Static frontend intended for deployment on Vercel

## Local development

### Backend

```bash
cd backend
npm install
npm run dev
```

The API runs on `http://localhost:4000`.

### Frontend

Open `frontend/index.html` directly, or serve it with any static file server.

The frontend reads its API base URL from `frontend/config.js`.

## Deploy

### Render

Use [render.yaml](/c:/APITestGenerator/render.yaml) or configure manually:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Your backend URL will look like:

`https://your-service-name.onrender.com`

### Vercel

- Root directory: `frontend`
- Framework preset: `Other`

Before deploying the frontend, update [config.js](/c:/APITestGenerator/frontend/config.js) to point to your deployed Render backend, for example:

```js
window.APP_CONFIG = {
  apiBaseUrl: "https://your-service-name.onrender.com"
};
```

## GitHub push

```bash
git init
git add .
git commit -m "Initial MVP"
```

Then create an empty GitHub repository and run:

```bash
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```