import { Router } from "express";
import { pool } from "../db.js";
import { serverError, parseId } from "../utils.js";

const router = Router();

router.post("/projects/:projectId/tasks", async (req, res) => {
  const projectId = parseId(req.params.projectId);
  const { tasks } = req.body;
  if (!projectId) return res.status(404).json({ error: "Project not found" });
  if (
    !Array.isArray(tasks) ||
    tasks.length === 0 ||
    tasks.length > 50 ||
    tasks.some((t) => !t.title || !String(t.title).trim())
  ) {
    return res
      .status(400)
      .json({ error: "Send 1-50 tasks, each with a title" });
  }
  try {
    const owner = await pool.query(
      "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
      [projectId, req.userId],
    );
    if (!owner.rows[0])
      return res.status(404).json({ error: "Project not found" });

    const clean = tasks.map((t) => ({
      title: String(t.title).trim().slice(0, 200),
      estimate_hrs: Number(t.estimate_hrs) || null,
      source: t.source === "ai" ? "ai" : "manual",
    }));
    const { rows } = await pool.query(
      `INSERT INTO tasks (project_id, user_id, title, estimate_hrs, source)
       SELECT $1, $2, t.title, t.estimate_hrs, t.source
       FROM jsonb_to_recordset($3::jsonb) AS t(title text, estimate_hrs numeric, source text)
       RETURNING *`,
      [projectId, req.userId, JSON.stringify(clean)],
    );
    res.status(201).json({ tasks: rows });
  } catch (err) {
    serverError(res, err);
  }
});

router.patch("/tasks/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Task not found" });
  const { done, title } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET title = COALESCE($1, title), done = COALESCE($2, done)
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [title ?? null, typeof done === "boolean" ? done : null, id, req.userId],
    );
    if (!rows[0]) return res.status(404).json({ error: "Task not found" });
    res.json({ task: rows[0] });
  } catch (err) {
    serverError(res, err);
  }
});

router.delete("/tasks/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Task not found" });
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [id, req.userId],
    );
    if (!rowCount) return res.status(404).json({ error: "Task not found" });
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
