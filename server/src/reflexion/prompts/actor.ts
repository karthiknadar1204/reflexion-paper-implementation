export function buildActorPrompt(
  question: string,
  mem: string[]
): { system: string; user: string } {
  const memBlock = mem.length
    ? `You previously attempted this question and failed. Your reflections:\n${mem
        .map((r, i) => `${i + 1}. ${r}`)
        .join("\n")}\n\nUse these to avoid repeating the same mistakes.\n\n`
    : "";

  return {
    system:
      "You are a careful trivia assistant. Answer the question with ONLY the final answer — no explanation, no extra words.",
    user: `${memBlock}Question: ${question}\nAnswer:`,
  };
}
