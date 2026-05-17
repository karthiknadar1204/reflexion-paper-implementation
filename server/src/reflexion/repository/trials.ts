import { db } from "../../db";

export function insertTrialAttempt(
  taskId: number,
  trialNumber: number,
  attempt: string
): void {
  db.query(`
    INSERT INTO trials (task_id, trial_number, attempt, passed, created_at)
    VALUES ($task_id, $trial_number, $attempt, 0, $created_at)
  `).run({
    task_id: taskId,
    trial_number: trialNumber,
    attempt,
    created_at: Date.now(),
  });
}
