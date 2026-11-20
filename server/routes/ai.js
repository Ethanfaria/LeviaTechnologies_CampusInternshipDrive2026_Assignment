import { Router } from "express";
import { pool } from "../db.js";
import { generateProposal, generateTasks } from "../services/ai.js";
import { parseId } from "../utils.js";

const router = Router();

async function handleAi(req, res, feature, generator) {
  const projectId = parseId(req.body.projectId);
  if (!projectId)
    return res.status(400).json({ error: "projectId is required" });

  const { rows } = await pool.query(
    "SELECT title, client_name, brief FROM projects WHERE id = $1 AND user_id = $2",
    [projectId, req.userId],
  );
  const project = rows[0];
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!project.brief || project.brief.trim().length < 20) {
    return res
      .status(400)
      .json({
        error: "Add a client brief (20+ characters) to this project first",
      });
  }

  try {
    const { data, tokens } = await generator(project);
    await pool.query(
      "INSERT INTO ai_requests (user_id, feature, output_json, tokens_used) VALUES ($1, $2, $3, $4)",
      [req.userId, feature, JSON.stringify(data), tokens],
    );
    res.json({ result: data });
  } catch (err) {
    console.error("AI error:", err.message);
    await pool.query(
      "INSERT INTO ai_requests (user_id, feature, status) VALUES ($1, $2, 'failed')",
      [req.userId, feature],
    );
    res.status(502).json({ error: "The AI request failed. Please try again." });
  }
}

router.post("/proposal", (req, res) =>
  handleAi(req, res, "proposal", generateProposal),
);
router.post("/tasks", (req, res) => handleAi(req, res, "tasks", generateTasks));

export default router;
