import upl from "@/assets/upleadstudio.webp";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t bg-background">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-center gap-2 px-4 py-5 sm:flex-row">
        <img
          src={upl}
          alt="UpLeadstudio"
          width="28"
          height="28"
          loading="lazy"
          decoding="async"
          className="h-7 w-7 rounded-md object-contain"
        />
        <p className="text-xs text-muted-foreground">
          Desenvolvido por <span className="font-medium text-foreground">UpLeadstudio</span> — Carlos Augusto
        </p>
      </div>
    </footer>
  );
}