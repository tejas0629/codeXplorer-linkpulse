// Owner: Chirag | Task: CHI-P1-1 | Priority: P1
import "server-only";

// TODO (CHI-P1-1): Implement random short code generation with collision retry via nanoid
export async function generateShortCode(length: number = 7): Promise<string> {
  void length;
  throw new Error("NOT_IMPLEMENTED: CHI-P1-1");
}

// TODO (CHI-P1-1): Implement alias validation (length, allowed characters, reserved words)
export function isValidAlias(alias: string): { valid: boolean; error?: string } {
  void alias;
  throw new Error("NOT_IMPLEMENTED: CHI-P1-1");
}
