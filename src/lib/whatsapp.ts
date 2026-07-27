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
  // Trunca mensagem para caber com folga no limite da URL do wa.me
  const safeMessage = (message ?? "").slice(0, 1000);
  const text = encodeURIComponent(safeMessage);
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

export type ProdutoEstoque = {
  categoria: string | null;
  modelo: string;
  qualidade?: string | null;
  tier?: string | null;
  estoque_atual: number;
};

const CATEGORIA_NOMES: Record<string, string> = {
  tela: "Telas",
  bateria: "Baterias",
  camera: "Câmeras",
  tampa_traseira: "Tampas traseiras",
  conector_carga: "Conectores de carga",
};

/** Monta uma mensagem-resumo do estoque atual, agrupada por categoria. */
export function mensagemEstoque(
  produtos: ProdutoEstoque[],
  opts?: { titulo?: string; incluirZerados?: boolean },
): string {
  const titulo = opts?.titulo ?? "Estoque atual — LH Import";
  const incluirZerados = opts?.incluirZerados ?? false;
  const lista = produtos.filter((p) => incluirZerados || p.estoque_atual > 0);

  if (lista.length === 0) {
    return `*${titulo}*\n\nNo momento não há peças disponíveis em estoque.`;
  }

  const grupos = new Map<string, ProdutoEstoque[]>();
  for (const p of lista) {
    const key = p.categoria ?? "outros";
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(p);
  }

  const data = new Date().toLocaleDateString("pt-BR");
  const linhas: string[] = [`*${titulo}*`, `_Atualizado em ${data}_`, ``];
  let total = 0;

  for (const [cat, itens] of grupos) {
    linhas.push(`*${CATEGORIA_NOMES[cat] ?? cat}*`);
    itens
      .sort((a, b) => a.modelo.localeCompare(b.modelo))
      .forEach((p) => {
        const spec = [p.qualidade, p.tier].filter(Boolean).join(" · ");
        const detalhe = spec ? ` (${spec})` : "";
        linhas.push(`• ${p.modelo}${detalhe} — *${p.estoque_atual}* un.`);
        total += p.estoque_atual;
      });
    linhas.push(``);
  }

  linhas.push(`_Total: ${total} peça${total === 1 ? "" : "s"} em ${lista.length} item(ns)._`);
  return linhas.join("\n");
}