const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

export function evaluateTrivia(attempt: string, gold: string): boolean {
  return normalize(attempt) === normalize(gold);
}
