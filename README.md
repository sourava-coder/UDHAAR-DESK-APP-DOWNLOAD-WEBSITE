# Udhaar Desk — App Download Portal

React/Vite public website and Node.js/Express admin API for the Udhaar Desk Android application.

## Technology

- Frontend: React 18, Vite, CSS
- Backend: Node.js, Express
- Database and storage: Supabase
- Authentication: bcrypt password hash and signed JWT
- Deployment: Vercel frontend plus a Node-hosted backend

## Security rules

Never commit real secrets. Keep these files local and ignored by Git:

- `backend/.env`
- `frontend/.env`

The Supabase `service_role` key belongs only in the backend environment. Never place it in `VITE_*` variables or React code.

## 1. Local setup

```powershell
node --version
npm --version
cd frontend
npm install
cd ..\backend
npm install
```

Create the environment files from their examples:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

## 2. Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Open `supabase/schema.sql`, copy it, and run the complete SQL.
4. Open **Storage** and create:
   - `app-assets`, public bucket
   - `app-downloads`, private bucket
5. Open **Project Settings → API**.
6. Copy the **Project URL** and **service_role** key.

Do not enable public browser policies for private tables. The Express backend uses the service-role key for controlled database operations.

## 3. Backend environment

Set `backend/.env`:

```env
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_ASSETS_BUCKET=app-assets
SUPABASE_DOWNLOADS_BUCKET=app-downloads
JWT_SECRET=generate-a-random-secret-of-at-least-32-characters
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD_HASH=
ADMIN_PASSWORD=
IP_HASH_SALT=
```

Generate a secure JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create a password hash:

```powershell
cd backend
npm run hash-password -- "YourStrongPassword"
```

Paste the generated bcrypt value into `ADMIN_PASSWORD_HASH`. Remove or leave `ADMIN_PASSWORD` empty. Never put the plain password in a committed file.

Start the backend:

```powershell
cd backend
npm run dev
```

The API runs at `http://localhost:4000`.

## 4. Frontend environment

Set `frontend/.env` for local development:

```env
VITE_API_URL=http://localhost:4000
```

Start the frontend:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`. `/admin` is the private login route.

## 5. Admin usage

1. Open `/admin`.
2. Sign in with the `ADMIN_EMAIL` and password configured in `backend/.env`.
3. Update app details.
4. Upload screenshots and the app icon.
5. Upload a release file.
6. Approve or reject submitted reviews.

Public visitors do not see the admin link in the footer.

## 6. Production environment

Use these environment variables in the Vercel project:

```env
PORT=4000
NODE_ENV=production
FRONTEND_ORIGIN=https://YOUR_FRONTEND_DOMAIN.vercel.app
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_ASSETS_BUCKET=app-assets
SUPABASE_DOWNLOADS_BUCKET=app-downloads
JWT_SECRET=your-random-production-secret
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD_HASH=your-bcrypt-hash
ADMIN_PASSWORD=
IP_HASH_SALT=your-random-ip-hash-salt
```

## 7. Deploy frontend and backend together on Vercel

1. Push the project to GitHub or GitLab.
2. Open Vercel and choose **Add New → Project**.
3. Import the repository.
4. Set **Root Directory** to the project root.
5. Leave framework preset as **Other** or use the root `vercel.json`.
6. Add all backend environment variables in Vercel.
7. Add `VITE_API_URL=` as an empty same-origin value.
8. Deploy.

The root `vercel.json` builds `frontend` and sends `/api/*` requests to `api/index.js`.

For local development, set `VITE_API_URL=http://localhost:4000`.

For Vercel production, do not set `VITE_API_URL`. The frontend uses a same-origin `/api` request when it is empty.

After deployment:

```text
https://YOUR_PROJECT.vercel.app/
https://YOUR_PROJECT.vercel.app/admin
https://YOUR_PROJECT.vercel.app/api/health
```

Set `FRONTEND_ORIGIN` to:

```text
https://YOUR_PROJECT.vercel.app
```

## 9. Supabase Storage

1. `app-assets`: public bucket.
2. `app-downloads`: private bucket.
3. The backend streams private release files through `/api/download`.
4. Supabase RLS remains enabled for all tables.
5. Browser code must not use the service-role key.

## 10. Production verification

Check in this order:

1. Supabase SQL tables and buckets exist.
2. `/api/health` returns `{ "ok": true }`.
3. Vercel `/` loads.
4. Vercel `/admin` loads.
5. API requests work without CORS errors.
6. Admin login succeeds.
7. APK upload, screenshot upload and release download work.
8. Review submission and moderation work.

## 11. Build

```powershell
cd frontend
npm run build
```
