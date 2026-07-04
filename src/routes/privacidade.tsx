import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.webp";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Estoque LH Import" },
      {
        name: "description",
        content:
          "Como a LH Import trata seus dados pessoais em conformidade com a LGPD: dados coletados, base legal, retenção, direitos do titular e canal de contato.",
      },
      { property: "og:title", content: "Política de Privacidade — Estoque LH Import" },
      {
        property: "og:description",
        content:
          "Transparência total sobre coleta, uso e proteção dos seus dados no sistema de estoque da LH Import.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://estoquelhimport.lovable.app/privacidade" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Política de Privacidade — Estoque LH Import" },
    ],
    links: [
      { rel: "canonical", href: "https://estoquelhimport.lovable.app/privacidade" },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  const atualizadoEm = "04 de julho de 2026";
  const dpoEmail = "lhimportpe2@gmail.com";
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto grid max-w-[900px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:h-16">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={logo}
              alt="LH Import"
              width="40"
              height="40"
              loading="lazy"
              decoding="async"
              className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-border/60"
            />
            <div className="min-w-0">
              <h1 className="truncate font-display text-[15px] font-semibold leading-tight tracking-tight">
                Política de Privacidade
              </h1>
              <p className="truncate text-[11px] text-muted-foreground">LGPD — Lei nº 13.709/2018</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Início</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 sm:py-12">
        <Card className="rounded-2xl border-border shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.04),0_8px_24px_-12px_oklch(0.322_0.028_258/0.08)]">
          <CardContent className="prose prose-sm max-w-none p-6 sm:p-10 dark:prose-invert prose-headings:font-display prose-headings:tracking-tight prose-h2:mt-8 prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
            <div className="not-prose mb-6 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-display text-sm font-semibold tracking-tight">
                  Esta página é mantida pela LH Import
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Descreve nossas práticas atuais de tratamento de dados no sistema de
                  estoque. Última atualização: <strong>{atualizadoEm}</strong>. Não constitui
                  certificação ou parecer jurídico.
                </p>
              </div>
            </div>

            <h2>1. Quem somos (Controlador)</h2>
            <p>
              <strong>LH Import</strong> é a controladora dos dados pessoais tratados neste
              sistema, conforme o art. 5º, VI da LGPD. Para exercer seus direitos de titular,
              use o canal indicado no item 9.
            </p>

            <h2>2. Dados que coletamos</h2>
            <p>Coletamos o mínimo necessário para operar o sistema:</p>
            <ul>
              <li>
                <strong>E-mail</strong> — para autenticação e vínculo com sua conta.
              </li>
              <li>
                <strong>Senha</strong> — armazenada em forma <em>hash</em> pelo provedor de
                autenticação (nunca em texto claro).
              </li>
              <li>
                <strong>Metadados de acesso</strong> — data de criação da conta e data do
                último acesso, usados para auditoria.
              </li>
              <li>
                <strong>Registros operacionais</strong> — entradas e saídas de estoque
                registradas por você, com data/hora e autor.
              </li>
            </ul>
            <p>
              <strong>Não coletamos</strong> dados sensíveis (art. 5º, II da LGPD), não fazemos
              perfilamento comportamental, não compartilhamos dados com terceiros para fins
              publicitários e não utilizamos cookies de rastreamento ou ferramentas de
              analytics de terceiros.
            </p>

            <h2>3. Base legal (art. 7º da LGPD)</h2>
            <ul>
              <li>
                <strong>Execução de contrato</strong> (art. 7º, V) — para prover o serviço
                contratado de gestão de estoque.
              </li>
              <li>
                <strong>Legítimo interesse</strong> (art. 7º, IX) — para segurança do sistema,
                prevenção a fraude e auditoria de movimentações.
              </li>
              <li>
                <strong>Cumprimento de obrigação legal</strong> (art. 7º, II) — quando exigido
                por autoridade competente.
              </li>
            </ul>

            <h2>4. Armazenamento local no seu navegador</h2>
            <p>
              Usamos o <code>localStorage</code> do navegador apenas para itens{" "}
              <strong>estritamente necessários</strong>, dispensando consentimento prévio:
            </p>
            <ul>
              <li>
                <strong>Sessão autenticada</strong> — token gerenciado pelo provedor de auth,
                para manter você logado entre visitas.
              </li>
              <li>
                <strong>Preferência de tema</strong> (claro/escuro) — puramente visual.
              </li>
              <li>
                <strong>Número de WhatsApp da loja</strong> — configurado por você para os
                atalhos de consulta; fica somente no seu navegador.
              </li>
            </ul>
            <p>
              Você pode limpar esses dados a qualquer momento nas configurações do seu
              navegador ou saindo da conta.
            </p>

            <h2>5. Compartilhamento com operadores</h2>
            <p>
              Para operar, utilizamos os seguintes prestadores (operadores, art. 5º, VII),
              que tratam dados apenas conforme nossas instruções:
            </p>
            <ul>
              <li>
                <strong>Supabase / Lovable Cloud</strong> — banco de dados e autenticação.
              </li>
              <li>
                <strong>Cloudflare</strong> — hospedagem e entrega da aplicação.
              </li>
              <li>
                <strong>WhatsApp (Meta)</strong> — <em>apenas</em> quando você clica no botão
                "Consultar no WhatsApp"; nesse momento a mensagem é aberta no aplicativo/site
                oficial do WhatsApp e passa a ser regida pela política deles.
              </li>
            </ul>

            <h2>6. Retenção</h2>
            <ul>
              <li>
                <strong>Conta e e-mail</strong> — mantidos enquanto sua conta estiver ativa.
              </li>
              <li>
                <strong>Movimentações</strong> — mantidas para fins de auditoria enquanto a
                conta existir ou por prazo legal aplicável.
              </li>
              <li>Após exclusão da conta, os dados vinculados são apagados.</li>
            </ul>

            <h2>7. Segurança</h2>
            <p>Aplicamos as medidas de proteção que o sistema oferece:</p>
            <ul>
              <li>Conexão criptografada em trânsito (HTTPS/TLS).</li>
              <li>Senhas armazenadas com <em>hash</em> pelo provedor de autenticação.</li>
              <li>
                Controle de acesso por papel: usuários comuns só visualizam; apenas administradores
                podem alterar dados.
              </li>
              <li>
                <em>Row-Level Security</em> no banco de dados, garantindo que cada consulta
                respeite as permissões do usuário logado.
              </li>
              <li>Auditoria completa das movimentações de estoque com autor e data/hora.</li>
            </ul>

            <h2>8. Seus direitos (art. 18 da LGPD)</h2>
            <p>Como titular, você pode a qualquer momento solicitar:</p>
            <ul>
              <li>Confirmação da existência de tratamento;</li>
              <li>Acesso aos seus dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>Portabilidade;</li>
              <li>Eliminação dos dados tratados com base no consentimento;</li>
              <li>Informação sobre com quem compartilhamos seus dados;</li>
              <li>Revogação de consentimento.</li>
            </ul>

            <h2>9. Como falar conosco</h2>
            <p>
              Para exercer qualquer direito, tirar dúvidas ou reportar um incidente de
              segurança, entre em contato com o Encarregado de Proteção de Dados (DPO) da
              LH Import pelo e-mail{" "}
              <a href={`mailto:${dpoEmail}`}>
                <strong>{dpoEmail}</strong>
              </a>
              . Responderemos no menor prazo possível, observados os prazos previstos na LGPD.
            </p>

            <h2>10. Alterações desta política</h2>
            <p>
              Podemos atualizar esta política para refletir mudanças na legislação ou nas
              práticas do sistema. Quando houver alteração relevante, a data de atualização
              no topo será modificada.
            </p>
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}