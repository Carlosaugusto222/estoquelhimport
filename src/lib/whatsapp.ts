/**
 * WhatsApp helpers — link-based ("wa.me") flow.
 * No backend, no bot. Opens the WhatsApp app/web with a prefilled message.
 */

const STORAGE_KEY = "lh-whatsapp-number";

/** Normalize a phone number to digits only. Adds Brazil DDI 55 if missing. */
export function normalizeWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  // Assume Brazilian number if 10 or 11 digits (DDD + número)
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function getStoredWhatsappNumber(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredWhatsappNumber(value: string) {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeWhatsappNumber(value);
    if (normalized) localStorage.setItem(STORAGE_KEY, normalized);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Format a stored E.164 (Brazil) number back to human-friendly display. */
export function formatWhatsappDisplay(number: string): string {
  const d = normalizeWhatsappNumber(number);
  if (!d) return "";
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    const mid = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4);
    const end = rest.length === 9 ? rest.slice(5) : rest.slice(4);
    return `+55 (${ddd}) ${mid}-${end}`;
  }
  return `+${d}`;
}

export function buildWhatsappUrl(number: string, message: string): string {
  const n = normalizeWhatsappNumber(number);
  const text = encodeURIComponent(message);
  return n ? `https://wa.me/${n}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function openWhatsapp(number: string, message: string) {
  const url = buildWhatsappUrl(number, message);
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}

export type ProdutoConsulta = {
  categoria: string | null;
  modelo: string;
  qualidade?: string | null;
  tier?: string | null;
  estoque_atual?: number;
};

export function mensagemConsulta(p: ProdutoConsulta): string {
  const cat = p.categoria === "bateria" ? "Bateria" : p.categoria === "tela" ? "Tela" : "Peça";
  const detalhes = [p.qualidade, p.tier].filter(Boolean).join(" · ");
  const linhas = [
    `Olá! Gostaria de consultar disponibilidade da seguinte peça:`,
    ``,
    `• *Tipo:* ${cat}`,
    `• *Modelo:* ${p.modelo}`,
  ];
  if (detalhes) linhas.push(`• *Especificação:* ${detalhes}`);
  linhas.push(``, `Vocês têm em estoque? Qual o valor e prazo?`);
  return linhas.join("\n");
}