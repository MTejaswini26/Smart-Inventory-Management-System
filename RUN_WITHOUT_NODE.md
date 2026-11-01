# Running WITHOUT Node.js / npm (Windows CMD)

Target machine needs ONLY: Python 3.11+, MySQL 8, and this repo.
No Node.js, no npm, no `npm run dev`, no port 5173.

## 1. One-time setup (CMD)

```cmd
cd /d C:\path\to\SmartInventorySystem
py -3.11 -m venv backend\venv
backend\venv\Scripts\activate
pip install -r backend\requirements.txt
```

## 2. Database

Create/import `smart_inventory` (see `database\smart_inventory (1).sql`),
then copy `backend\.env.example` to `backend\.env` and fill in
`DB_PASSWORD`, `JWT_SECRET`, and mail settings. `APP_URL` must be
`http://localhost:5001` (Flask serves the UI itself).

## 3. Run (CMD, no Node)

```cmd
cd /d C:\path\to\SmartInventorySystem\backend
C:\path\to\SmartInventorySystem\backend\venv\Scripts\python app.py
```

Open `http://localhost:5001` — Login, Dashboard, Products, Inventory,
Suppliers, Purchases, Sales, Invoices, AI Stock Prediction,
Low Stock Alerts, Reports, Forgot Password, and Voice Assistant are all
served from the checked-in `frontend/dist` bundle on this single port.

## 4. Developer note (Node still needed ONLY to rebuild the UI)

Node/npm/Vite are a BUILD-TIME tool only. Runtime needs none of it.
If you edit `frontend/src`, rebuild once on a dev machine:

```cmd
cd frontend
npm install
npm run build
```

then commit the refreshed `frontend/dist`. Target machines never run npm.

## 5. Rollback

Work is on branch `no-node-review` (backups: `no-node-flask-static`,
stashes `no-node-wip-freeze`, `pre-no-node-worktree-backup`).
`git checkout main` restores the old two-server (`:5173` + `:5001`) setup.
No file was deleted: `package.json`, `vite.config.js`, `node_modules`,
`backend/server.js` are all untouched.
