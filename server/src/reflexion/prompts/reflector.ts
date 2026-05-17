export function buildReflectorPrompt(
  question: string,
  attempt: string,
  mem: string[]
): { system: string; user: string } {
  const prevBlock = mem.length
    ? `Previous reflections:\n${mem
        .map((r, i) => `${i + 1}. ${r}`)
        .join("\n")}\n\n`
    : "";

  return {
    system:
      "You are a self-reflection assistant. The user attempted a trivia question and got it wrong. Write a SHORT (2-3 sentence) reflection explaining what went wrong and what to do differently next time. Do NOT include the correct answer — only diagnose the mistake.",
    user: `Question: ${question}\nYour previous answer: ${attempt}\n(You did not get the correct answer.)\n\n${prevBlock}Write your new reflection:`,
  };
}
