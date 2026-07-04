import upl from "@/assets/upleadstudio.webp";
import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border/60 bg-background/60">
      <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-3 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            © LH Import
          </p>
          <Link
            to="/privacidade"
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacidade (LGPD)
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <img
            src={upl}
            alt="UpLeadstudio"
            width="120"
            height="120"
            loading="lazy"
            decoding="async"
            className="h-30 w-30 rounded-md object-contain"
            style={{ height: "7.5rem", width: "7.5rem" }}
          />
          <p className="text-[11px] text-muted-foreground">
            Desenvolvido por <span className="font-display font-semibold text-foreground">UpLeadstudio</span> — Carlos Augusto
          </p>
        </div>
      </div>
    </footer>
  );
}