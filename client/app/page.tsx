"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_URL = "http://localhost:3003/solve/trivia";

type Trial = {
  trial: number;
  attempt?: string;
  passed?: boolean;
  reflection?: string;
};

type Done = { outcome: "passed" | "exhausted"; trials: number };

export default function Home() {
  const [question, setQuestion] = useState(
    "What profession do John Lanchester and Alan Dean Foster have in common?"
  );
  const [gold, setGold] = useState("novelist");
  const [taskId, setTaskId] = useState<number | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [done, setDone] = useState<Done | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function upsertTrial(trial: number, patch: Partial<Trial>) {
    setTrials((prev) => {
      const i = prev.findIndex((t) => t.trial === trial);
      if (i === -1) return [...prev, { trial, ...patch }];
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function handleEvent(name: string, data: any) {
    if (name === "task_started") setTaskId(data.taskId);
    else if (name === "attempt") upsertTrial(data.trial, { attempt: data.answer });
    else if (name === "verdict") upsertTrial(data.trial, { passed: data.passed });
    else if (name === "reflection")
      upsertTrial(data.trial, { reflection: data.content });
    else if (name === "done")
      setDone({ outcome: data.outcome, trials: data.trials });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTaskId(null);
    setTrials([]);
    setDone(null);
    setError(null);
    setRunning(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, gold }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() ?? "";

        for (const msg of messages) {
          let eventName = "";
          let dataStr = "";
          for (const line of msg.split("\n")) {
            if (line.startsWith("event: ")) eventName = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
          }
          if (!eventName || !dataStr) continue;
          handleEvent(eventName, JSON.parse(dataStr));
        }
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reflexion · Trivia
        </h1>
        <p className="text-muted-foreground text-sm">
          Post a question + gold answer. Watch the agent reflect across trials
          in real time.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What is the capital of France?"
                disabled={running}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gold">Correct answer</Label>
              <Input
                id="gold"
                value={gold}
                onChange={(e) => setGold(e.target.value)}
                placeholder="Paris"
                disabled={running}
                required
              />
              <p className="text-muted-foreground text-xs">
                What the agent&apos;s answer is graded against. The agent never
                sees this.
              </p>
            </div>
            <Button type="submit" disabled={running}>
              {running ? "Reflecting…" : "Solve"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="text-destructive pt-6 text-sm">
            {error}
          </CardContent>
        </Card>
      )}

      {taskId !== null && (
        <div className="text-muted-foreground text-xs">Task #{taskId}</div>
      )}

      <div className="space-y-3">
        {trials.map((t) => (
          <Card key={t.trial}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Trial {t.trial}
              </CardTitle>
              {t.passed === true && <Badge>Pass</Badge>}
              {t.passed === false && <Badge variant="destructive">Fail</Badge>}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {t.attempt && (
                <div>
                  <div className="text-muted-foreground mb-1 text-xs">
                    Attempt
                  </div>
                  <div className="font-mono">{t.attempt}</div>
                </div>
              )}
              {t.reflection && (
                <div>
                  <div className="text-muted-foreground mb-1 text-xs">
                    Reflection
                  </div>
                  <div className="italic">{t.reflection}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {done && (
        <Card
          className={
            done.outcome === "passed"
              ? "border-green-500"
              : "border-yellow-500"
          }
        >
          <CardContent className="pt-6 text-sm">
            {done.outcome === "passed"
              ? `Solved in ${done.trials} trial${done.trials === 1 ? "" : "s"}.`
              : `Exhausted after ${done.trials} trials.`}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
