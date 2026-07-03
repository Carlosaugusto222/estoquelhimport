import upl from "@/assets/upleadstudio.webp";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border/60 bg-background/60">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          © LH Import
        </p>
        <div className="flex items-center gap-2">
          <img
            src={upl}
            alt="UpLeadstudio"
            width="24"
            height="24"
            loading="lazy"
            decoding="async"
            className="h-6 w-6 rounded-md object-contain"
          />
          <p className="text-[11px] text-muted-foreground">
            Desenvolvido por <span className="font-display font-semibold text-foreground">UpLeadstudio</span> — Carlos Augusto
          </p>
        </div>
      </div>
    </footer>
  );
}