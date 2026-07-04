import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Package, ShieldCheck, Smartphone, BatteryCharging, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/site-footer";
import logo from "@/assets/logo.webp";

const CANONICAL = "https://estoquelhimport.lovable.app/";
const OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/ihb6DqEZBDUmb4WdABCU5St5LKx2/social-images/social-1783046142317-Captura_de_Tela_2026-07-02_as_23.31.24.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estoque LH Import — Controle de telas e baterias" },
      {
        name: "description",
        content:
          "Sistema interno da LH Import para controle de estoque de telas e baterias de celular. Consulta rápida, movimentações auditadas e integração com WhatsApp.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Estoque LH Import — Controle de telas e baterias" },
      {
        property: "og:description",
        content:
          "Sistema interno da LH Import para gestão de estoque da assistência técnica: telas, baterias, movimentações e consulta via WhatsApp.",
      },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/estoque", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Logo LH Import"
              width="36"
              height="36"
              className="h-9 w-9 rounded-lg object-cover ring-1 ring-border/60"
            />
            <span className="font-display text-[15px] font-semibold tracking-tight">
              Estoque LH Import
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/auth">
                <LogIn className="mr-1.5 h-4 w-4" /> Entrar
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Uso interno — LH Import
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Controle de estoque de telas e baterias
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Sistema da assistência técnica <strong className="text-foreground">LH Import</strong>{" "}
            para consulta rápida de peças, registro auditado de entradas e saídas e envio de
            disponibilidade pelo WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Acessar o sistema</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/privacidade">Política de Privacidade</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
          <h2 className="sr-only">Recursos</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureCard icon={<Smartphone className="h-5 w-5" />} title="Telas de celular">
              Catálogo por modelo, qualidade e tier, com contagem atualizada em tempo real.
            </FeatureCard>
            <FeatureCard icon={<BatteryCharging className="h-5 w-5" />} title="Baterias">
              Controle unificado por modelo e fornecedor, com número de série opcional.
            </FeatureCard>
            <FeatureCard icon={<Package className="h-5 w-5" />} title="Movimentações auditadas">
              Toda entrada e saída registra autor, data e observação para consulta posterior.
            </FeatureCard>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-left shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.04)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
