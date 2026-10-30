# Justin Tkatchenko Voter Database

Voter-record management application with a React/Vite frontend and a Flask API.
The Render blueprint builds the frontend and serves it from the Flask service.

## Local setup

1. Create the backend virtual environment and install its requirements:

   ```powershell
   cd election-form\backend
   python -m venv venv
   .\venv\Scripts\python.exe -m pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

2. In `election-form/backend/.env`, replace `SECRET_KEY` and `ADMIN_PASSWORD`
   with unique values before starting the backend. Generate a session secret
   with:

   ```sh
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

3. Install frontend dependencies and start the development server from
   `frontend/`:

   ```sh
   npm ci
   npm run dev
   ```

   Set `VITE_API_URL=http://localhost:8000` in `frontend/.env.local` when the
   Vite frontend is connecting to the local Flask server.

The backend uses `election-form/backend/voters.db` by default. Local databases,
backups, environment files, uploaded photos, dependency folders, and build
outputs are excluded from Git.

## Deployment

Create a Render Blueprint from `render.yaml`. Set the required environment
variables in Render, including a unique `ADMIN_PASSWORD`, `ALLOWED_ORIGINS`,
and database and Cloudinary settings as needed. Render generates `SECRET_KEY`
for the service. Never commit `.env` files, production credentials, database
files, or uploaded voter data.
