const WINDOW_MS = 60_000;
const MAX_REQUESTS = 4;
const requests = new Map<string, number[]>();

export function enforceAiRateLimit(userId: string) {
  const now = Date.now();
  const recent = (requests.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    throw new Error(
      "Você atingiu o limite temporário de gerações. Aguarde um minuto e tente novamente.",
    );
  }
  recent.push(now);
  requests.set(userId, recent);
}
