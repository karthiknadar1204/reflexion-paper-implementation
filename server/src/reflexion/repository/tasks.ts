import { db } from "../../db";

export function markTaskPassed(taskId: number): void {
  db.query(`
    UPDATE tasks SET status = 'passed', finished_at = $finished_at
    WHERE id = $id
  `).run({ finished_at: Date.now(), id: taskId });
}

export function markTaskExhausted(taskId: number): void {
  db.query(`
    UPDATE tasks SET status = 'exhausted', finished_at = $finished_at
    WHERE id = $id
  `).run({ finished_at: Date.now(), id: taskId });
}
