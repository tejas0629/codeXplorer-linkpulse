// Owner: Chirag | Task: CHI-P2-3 | Priority: P2
import "server-only";

// TODO (CHI-P2-3): Calculate risk score (LOW, MEDIUM, HIGH) based on domain heuristics
export async function calculateRiskScore(url: string): Promise<"LOW" | "MEDIUM" | "HIGH"> {
  void url;
  throw new Error("NOT_IMPLEMENTED: CHI-P2-3");
}
