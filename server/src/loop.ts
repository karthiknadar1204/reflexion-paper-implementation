import OpenAI from "openai";
import { db } from "./db";

const openai = new OpenAI();
const MODEL = "gpt-4.1";
const MAX_TRIALS = 5;
const MEM_SIZE = 3;

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

async function callActor(question: string, mem: string[]): Promise<string> {
  const memBlock = mem.length
    ? `You previously attempted this question and failed. Your reflections:\n${mem
        .map((r, i) => `${i + 1}. ${r}`)
        .join("\n")}\n\nUse these to avoid repeating the same mistakes.\n\n`
    : "";

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "You are a careful trivia assistant. Answer the question with ONLY the final answer — no explanation, no extra words.",
      },
      { role: "user", content: `${memBlock}Question: ${question}\nAnswer:` },
    ],
  });
  return res.choices[0].message.content?.trim() ?? "";
}

async function callReflector(
  question: string,
  attempt: string,
  mem: string[]
): Promise<string> {
  const prevBlock = mem.length
    ? `Previous reflections:\n${mem
        .map((r, i) => `${i + 1}. ${r}`)
        .join("\n")}\n\n`
    : "";

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "You are a self-reflection assistant. The user attempted a trivia question and got it wrong. Write a SHORT (2-3 sentence) reflection explaining what went wrong and what to do differently next time. Do NOT include the correct answer — only diagnose the mistake.",
      },
      {
        role: "user",
        content: `Question: ${question}\nYour previous answer: ${attempt}\n(You did not get the correct answer.)\n\n${prevBlock}Write your new reflection:`,
      },
    ],
  });
  return res.choices[0].message.content?.trim() ?? "";
}

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
    // Step 1: load memory (last 3, oldest-first in prompt)
    const memRows = db
      .query(`
        SELECT content FROM reflections
        WHERE task_id = $task_id
        ORDER BY trial_number DESC
        LIMIT ${MEM_SIZE}
      `)
      .all({ task_id: taskId }) as { content: string }[];
    const mem = memRows.map((r) => r.content).reverse();

    // Step 2-3: actor
    const attempt = await callActor(question, mem);

    // Step 4: persist attempt
    db.query(`
      INSERT INTO trials (task_id, trial_number, attempt, passed, created_at)
      VALUES ($task_id, $trial_number, $attempt, 0, $created_at)
    `).run({
      task_id: taskId,
      trial_number: t,
      attempt,
      created_at: Date.now(),
    });
    yield { type: "attempt", trial: t, answer: attempt };

    // Step 5: evaluator
    const passed = normalize(attempt) === normalize(gold);
    db.query(`
      UPDATE trials SET passed = $passed
      WHERE task_id = $task_id AND trial_number = $trial_number
    `).run({ passed: passed ? 1 : 0, task_id: taskId, trial_number: t });
    yield { type: "verdict", trial: t, passed };

    // Step 6: pass → exit
    if (passed) {
      db.query(`
        UPDATE tasks SET status = 'passed', finished_at = $finished_at
        WHERE id = $id
      `).run({ finished_at: Date.now(), id: taskId });
      yield { type: "done", outcome: "passed", trials: t + 1 };
      return;
    }

    // Step 7-8: reflect + persist (Reflector does NOT see gold)
    const reflection = await callReflector(question, attempt, mem);
    db.query(`
      INSERT INTO reflections (task_id, trial_number, content, created_at)
      VALUES ($task_id, $trial_number, $content, $created_at)
    `).run({
      task_id: taskId,
      trial_number: t,
      content: reflection,
      created_at: Date.now(),
    });
    yield { type: "reflection", trial: t, content: reflection };
  }

  // Phase C: exhausted
  db.query(`
    UPDATE tasks SET status = 'exhausted', finished_at = $finished_at
    WHERE id = $id
  `).run({ finished_at: Date.now(), id: taskId });
  yield { type: "done", outcome: "exhausted", trials: MAX_TRIALS };
}
