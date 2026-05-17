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

export function updateTrialVerdict(
  taskId: number,
  trialNumber: number,
  passed: boolean
): void {
  db.query(`
    UPDATE trials SET passed = $passed
    WHERE task_id = $task_id AND trial_number = $trial_number
  `).run({
    passed: passed ? 1 : 0,
    task_id: taskId,
    trial_number: trialNumber,
  });
}
