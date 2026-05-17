import { openai, MODEL } from "../openai";
import { buildActorPrompt } from "../prompts/actor";

export async function callActor(
  question: string,
  mem: string[]
): Promise<string> {
  const { system, user } = buildActorPrompt(question, mem);

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
