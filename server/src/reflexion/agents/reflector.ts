import { openai, MODEL } from "../openai";
import { buildReflectorPrompt } from "../prompts/reflector";

export async function callReflector(
  question: string,
  attempt: string,
  mem: string[]
): Promise<string> {
  const { system, user } = buildReflectorPrompt(question, attempt, mem);

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return res.choices[0].message.content?.trim() ?? "";
}
