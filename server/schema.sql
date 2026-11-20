-- Run once:  psql -U postgres -d mini_saas -f schema.sql

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- A project moves through the pipeline via its `status` column.
CREATE TABLE IF NOT EXISTS projects (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(160) NOT NULL,
    client_name VARCHAR(120),
    brief       TEXT,                                   -- raw client brief (AI input)
    status      VARCHAR(20) NOT NULL DEFAULT 'lead'
                CHECK (status IN ('lead', 'active', 'completed')),
    proposal    JSONB,                                  -- saved AI proposal
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id           SERIAL PRIMARY KEY,
    project_id   INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(200) NOT NULL,
    estimate_hrs NUMERIC(5,1),
    done         BOOLEAN NOT NULL DEFAULT FALSE,
    source       VARCHAR(10) NOT NULL DEFAULT 'manual',  -- 'manual' | 'ai'
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log of every AI call (cost tracking + debugging)
CREATE TABLE IF NOT EXISTS ai_requests (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature     VARCHAR(30) NOT NULL,                   -- 'proposal' | 'tasks'
    output_json JSONB,
    tokens_used INT,
    status      VARCHAR(10) NOT NULL DEFAULT 'success',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for the queries the app actually runs
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project        ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_created      ON ai_requests(user_id, created_at DESC);
