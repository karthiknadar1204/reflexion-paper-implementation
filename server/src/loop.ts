import { db } from "./db";
import { callActor } from "./reflexion/agents/actor";
import { callReflector } from "./reflexion/agents/reflector";
import { evaluateTrivia } from "./reflexion/evaluators/trivia";
import {
  insertTrialAttempt,
  updateTrialVerdict,
} from "./reflexion/repository/trials";
import { insertReflection } from "./reflexion/repository/reflections";
import {
  markTaskPassed,
  markTaskExhausted,
} from "./reflexion/repository/tasks";

const MAX_TRIALS = 5;
const MEM_SIZE = 3;

export type LoopEvent =
  | { type: "attempt"; trial: number; answer: string }
  | { type: "verdict"; trial: number; passed: boolean }
  | { type: "reflection"; trial: number; content: string }
  | { type: "done"; outcome: "passed" | "exhausted"; trials: number };

export async function* runReflexionLoop(
  taskId: number,
  question: string,
  gold: string
): AsyncGenerator<LoopEvent> {
  for (let t = 0; t < MAX_TRIALS; t++) {
    // Step 1: load memory (last N, oldest-first in prompt)
    const memRows = db
      .query(`
        SELECT content FROM reflections
        WHERE task_id = $task_id
        ORDER BY trial_number DESC
        LIMIT ${MEM_SIZE}
      `)
      .all({ task_id: taskId }) as { content: string }[];
    const mem = memRows.map((r) => r.content).reverse();

    // Step 2-3: actor (build prompt + call OpenAI)
    const attempt = await callActor(question, mem);

    // Step 4: persist attempt
    insertTrialAttempt(taskId, t, attempt);
    yield { type: "attempt", trial: t, answer: attempt };

    // Step 5: evaluator (exact match) + persist verdict
    const passed = evaluateTrivia(attempt, gold);
    updateTrialVerdict(taskId, t, passed);
    yield { type: "verdict", trial: t, passed };

    // Step 6: pass → mark task and exit
    if (passed) {
      markTaskPassed(taskId);
      yield { type: "done", outcome: "passed", trials: t + 1 };
      return;
    }

    // Step 7: reflect (Reflector does NOT see gold)
    const reflection = await callReflector(question, attempt, mem);

    // Step 8: persist reflection
    insertReflection(taskId, t, reflection);
    yield { type: "reflection", trial: t, content: reflection };

    // Step 9: loop continues
  }

  // Phase C: exhausted
  markTaskExhausted(taskId);
  yield { type: "done", outcome: "exhausted", trials: MAX_TRIALS };
}
