import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShieldCheck, X } from "lucide-react";

const STORAGE_KEY = "lh-lgpd-notice-ack-v1";

export function LgpdNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const ack = window.localStorage.getItem(STORAGE_KEY);
      if (!ack) {
        // Pequeno atraso para não competir com a primeira pintura
        const t = window.setTimeout(() => setVisible(true), 400);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function aceitar() {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de privacidade"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-border/70 bg-background/95 p-4 shadow-[0_24px_48px_-16px_oklch(0.25_0.02_258/0.28)] backdrop-blur-md sm:inset-x-auto sm:right-4 sm:left-auto sm:bottom-4 sm:w-[calc(100vw-2rem)] sm:max-w-lg"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold tracking-tight">
            Sua privacidade importa
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Usamos apenas armazenamento local <strong>estritamente necessário</strong>{" "}
            (sessão, tema e preferências) para você operar o estoque. Não usamos
            cookies de rastreamento nem compartilhamos dados com terceiros para
            marketing. Leia nossa{" "}
            <Link
              to="/privacidade"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Política de Privacidade
            </Link>
            .
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={aceitar} className="rounded-lg">
              Entendi
            </Button>
            <Button asChild size="sm" variant="ghost" className="rounded-lg text-muted-foreground">
              <Link to="/privacidade">Ver detalhes</Link>
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={aceitar}
          aria-label="Fechar aviso"
          className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}