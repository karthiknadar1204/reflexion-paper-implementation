import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { db } from "../db";
import { runReflexionLoop } from "../loop";

const trivia = new Hono();

trivia.post("/", async (c) => {
  const { question, gold } = await c.req.json<{
    question: string;
    gold: string;
  }>();

  if (!question || !gold) {
    return c.json({ error: "question and gold are required" }, 400);
  }

  // Phase A: setup — create task row
  const row = db
    .query(`
      INSERT INTO tasks (question, gold_answer, created_at)
      VALUES ($question, $gold_answer, $created_at)
      RETURNING id
    `)
    .get({
      question,
      gold_answer: gold,
      created_at: Date.now(),
    }) as { id: number };
  const taskId = row.id;

  // Phase B: stream the loop as SSE
  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: "task_started",
      data: JSON.stringify({ taskId }),
    });

    for await (const evt of runReflexionLoop(taskId, question, gold)) {
      await stream.writeSSE({
        event: evt.type,
        data: JSON.stringify(evt),
      });
    }
  });
});

export default trivia;
