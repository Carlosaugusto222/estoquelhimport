/**
 * Utilitários de sanitização — camada extra além do Zod.
 * Remove caracteres de controle (invisíveis) e normaliza espaços.
 * Zod cuida do tipo/tamanho; isto cuida do "conteúdo hostil".
 */

// Caracteres de controle C0/C1 (exceto \t \n \r), zero-width e RTL/LTR overrides
const CONTROL_CHARS =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Remove chars de controle/invisíveis e faz trim. Nunca retorna null. */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).replace(CONTROL_CHARS, "").trim();
}

/** Sanitiza e devolve null quando resulta em string vazia (útil para colunas nullable). */
export function sanitizeNullable(input: string | null | undefined): string | null {
  const s = sanitizeText(input);
  return s || null;
}

/** Aceita apenas dígitos (útil para telefones/CEPs). */
export function digitsOnly(input: string | null | undefined): string {
  return (input ?? "").toString().replace(/\D+/g, "");
}