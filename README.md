# FreelanceFlow – AI-powered client & project workflow (mini SaaS)

Track freelance projects through a pipeline (**Lead → Active → Completed**), manage tasks,
and let AI draft proposals and break projects into tasks.

**Stack:** React (Vite) · Node.js + Express · PostgreSQL · JWT auth · Google Gemini API

## Setup

### 1. Database
```bash
psql -U postgres -c "CREATE DATABASE mini_saas;"
psql -U postgres -d mini_saas -f server/schema.sql
```

### 2. Backend
```bash
cd server
cp .env.example .env     # then fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
npm install
npm run dev              # http://localhost:5000
```

### 3. Frontend
```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

## Architecture

```
React SPA ──HTTP/JSON──> Express API ──SQL──> PostgreSQL
                            │
                            └──> AI service (LLM API) ──> validated JSON ──> preview ──> user accepts ──> saved
```

- `routes/`      HTTP layer (validation, status codes)
- `middleware/`  JWT auth, applied to every non-auth route
- `services/`    AI logic isolated from HTTP (swap LLM provider by editing one file)
- `schema.sql`   tables, foreign keys, indexes