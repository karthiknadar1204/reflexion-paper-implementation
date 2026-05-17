import { db } from "../../db";

export function insertReflection(
  taskId: number,
  trialNumber: number,
  content: string
): void {
  db.query(`
    INSERT INTO reflections (task_id, trial_number, content, created_at)
    VALUES ($task_id, $trial_number, $content, $created_at)
  `).run({
    task_id: taskId,
    trial_number: trialNumber,
    content,
    created_at: Date.now(),
  });
}
