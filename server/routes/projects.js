import { Router } from "express";
import { pool } from "../db.js";
import { serverError, parseId } from "../utils.js";

const router = Router();
const STATUSES = ["lead", "active", "completed"];

router.get("/", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.client_name, p.status, p.created_at,
              COUNT(t.id)::int AS task_count,
              COUNT(t.id) FILTER (WHERE t.done)::int AS done_count
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.user_id = $1 AND ($2::text IS NULL OR p.status = $2)
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $3 OFFSET $4`,
      [req.userId, status, limit, (page - 1) * limit],
    );
    res.json({ projects: rows, page, limit });
  } catch (err) {
    serverError(res, err);
  }
});

router.post("/", async (req, res) => {
  const { title, client_name, brief } = req.body;
  if (!title || !title.trim())
    return res.status(400).json({ error: "Title is required" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO projects (user_id, title, client_name, brief)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.userId, title.trim(), client_name || null, brief || null],
    );
    res.status(201).json({ project: rows[0] });
  } catch (err) {
    serverError(res, err);
  }
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Project not found" });
  try {
    const project = await pool.query(
      "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
      [id, req.userId],
    );
    if (!project.rows[0])
      return res.status(404).json({ error: "Project not found" });
    const tasks = await pool.query(
      "SELECT * FROM tasks WHERE project_id = $1 ORDER BY id",
      [id],
    );
    res.json({ project: project.rows[0], tasks: tasks.rows });
  } catch (err) {
    serverError(res, err);
  }
});

router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Project not found" });
  const { title, client_name, brief, status, proposal } = req.body;
  if (status && !STATUSES.includes(status))
    return res.status(400).json({ error: "Invalid status" });
  try {
    const { rows } = await pool.query(
      `UPDATE projects SET
         title = COALESCE($1, title),
         client_name = COALESCE($2, client_name),
         brief = COALESCE($3, brief),
         status = COALESCE($4, status),
         proposal = COALESCE($5::jsonb, proposal),
         updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        title ?? null,
        client_name ?? null,
        brief ?? null,
        status ?? null,
        proposal ? JSON.stringify(proposal) : null,
        id,
        req.userId,
      ],
    );
    if (!rows[0]) return res.status(404).json({ error: "Project not found" });
    res.json({ project: rows[0] });
  } catch (err) {
    serverError(res, err);
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Project not found" });
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM projects WHERE id = $1 AND user_id = $2",
      [id, req.userId],
    );
    if (!rowCount) return res.status(404).json({ error: "Project not found" });
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
