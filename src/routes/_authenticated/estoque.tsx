import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import logo from "@/assets/logo.webp";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, Minus, Search, Trash2, LogOut, Package, AlertTriangle, Smartphone, BatteryCharging, History,
  ShieldCheck, Eye, Users, MessageCircle, Camera, Shield, Cable, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { WhatsappSettingsDialog } from "@/components/whatsapp-settings-dialog";
import {
  getStoredWhatsappNumber, mensagemConsulta, openWhatsapp,
} from "@/lib/whatsapp";
import { sanitizeText, sanitizeNullable } from "@/lib/sanitize";

type Categoria = "tela" | "bateria" | "camera" | "tampa_traseira" | "conector_carga";

const CATEGORIAS: { value: Categoria; label: string; short: string }[] = [
  { value: "tela", label: "Telas", short: "Tela" },
  { value: "bateria", label: "Baterias", short: "Bateria" },
  { value: "camera", label: "Câmeras", short: "Câmera" },
  { value: "tampa_traseira", label: "Tampas traseiras", short: "Tampa" },
  { value: "conector_carga", label: "Conectores de carga", short: "Conector" },
];

const CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIAS.map((c) => [c.value, c.short]),
);

export const Route = createFileRoute("/_authenticated/estoque")({
  component: EstoquePage,
});

type Produto = {
  id: string;
  categoria: Categoria | string;
  modelo: string;
  qualidade: string | null;
  tier: "ecoline" | "premium" | null;
  fornecedor: string | null;
  data_compra: string | null;
  tem_garantia: boolean;
  numero_serie: string | null;
  preco_custo: number | null;
  preco_venda: number | null;
  estoque_minimo: number;
  estoque_atual: number;
  observacoes: string | null;
};

type Movimentacao = {
  id: string;
  produto_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  observacoes: string | null;
  created_at: string;
};

function EstoquePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<"todos" | Categoria>("todos");
  const [busca, setBusca] = useState("");
  const [openNovo, setOpenNovo] = useState(false);
  const [historicoProduto, setHistoricoProduto] = useState<Produto | null>(null);
  const [editProduto, setEditProduto] = useState<Produto | null>(null);
  const [waSettingsOpen, setWaSettingsOpen] = useState(false);

  function consultarNoWhatsapp(p: Produto) {
    const numero = getStoredWhatsappNumber();
    if (!numero) {
      toast.info("Configure o número do WhatsApp da loja primeiro.");
      setWaSettingsOpen(true);
      return;
    }
    openWhatsapp(numero, mensagemConsulta(p));
  }

  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("categoria")
        .order("modelo");
      if (error) throw error;
      return data as Produto[];
    },
  });

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      if (filtro !== "todos" && p.categoria !== filtro) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return (
          p.modelo.toLowerCase().includes(q) ||
          (p.qualidade ?? "").toLowerCase().includes(q) ||
          (p.fornecedor ?? "").toLowerCase().includes(q) ||
          (p.numero_serie ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [produtos, filtro, busca]);

  const totais = useMemo(() => {
    const soma = (cat: string) =>
      produtos.filter((p) => p.categoria === cat).reduce((s, p) => s + p.estoque_atual, 0);
    const alertas = produtos.filter((p) => p.estoque_atual <= p.estoque_minimo).length;
    return {
      telas: soma("tela"),
      baterias: soma("bateria"),
      outras: soma("camera") + soma("tampa_traseira") + soma("conector_carga"),
      alertas,
    };
  }, [produtos]);

  const movMutation = useMutation({
    mutationFn: async (input: { produto_id: string; tipo: "entrada" | "saida"; quantidade: number; observacoes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sem sessão");
      if (!Number.isInteger(input.quantidade) || input.quantidade <= 0) {
        throw new Error("Quantidade inválida");
      }
      if (input.tipo !== "entrada" && input.tipo !== "saida") {
        throw new Error("Tipo de movimentação inválido");
      }
      const { error } = await supabase.from("movimentacoes").insert({
        produto_id: input.produto_id,
        tipo: input.tipo,
        quantidade: input.quantidade,
        observacoes: input.observacoes
          ? sanitizeText(input.observacoes).slice(0, 500) || null
          : null,
        user_id: userData.user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes-admin"] });
      toast.success(v.tipo === "entrada" ? "+1 no estoque — pronto para vender" : "Venda registrada — estoque atualizado");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível registrar a movimentação."),
  });

  const deleteProduto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Peça removida do catálogo");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível excluir a peça."),
  });

  async function handleLogout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1400px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:h-16">
          <div className="flex min-w-0 items-center gap-2">
            <img src={logo} alt="LH Import" width="40" height="40" loading="lazy" decoding="async" className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-border/60" />
            <div className="min-w-0">
              <h1 className="truncate font-display text-[15px] font-semibold leading-tight tracking-tight">Controle Total <span className="text-muted-foreground">• LH Import</span></h1>
              <p className="truncate text-[11px] text-muted-foreground">Nunca perca uma venda por falta de peça</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isAdmin ? (
              <Badge className="hidden gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline-flex" variant="secondary"><ShieldCheck className="h-3 w-3" /> Acesso total</Badge>
            ) : (
              <Badge variant="secondary" className="hidden gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline-flex"><Eye className="h-3 w-3" /> Visualização</Badge>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWaSettingsOpen(true)}
              aria-label="Configurar WhatsApp"
              title="Configurar WhatsApp da loja"
              className="text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            {isAdmin && (
              <Button asChild variant="ghost" size="sm" aria-label="Gerenciar usuários" className="text-muted-foreground hover:text-foreground">
                <Link to="/gerenciamento"><Users className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Gerenciar</span></Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} aria-label="Sair" className="rounded-lg">
              <LogOut className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 space-y-6 sm:px-6 sm:py-8">
        {!isAdmin && (
          <Card className="rounded-2xl border-border bg-muted/40 shadow-none">
            <CardContent className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Você está apenas visualizando. Para movimentar o estoque, peça acesso ao administrador.
            </CardContent>
          </Card>
        )}

        <BentoStats telas={totais.telas} baterias={totais.baterias} outras={totais.outras} alertas={totais.alertas} totalPecas={produtos.length} />

        <Card className="rounded-2xl border-border shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.04),0_8px_24px_-12px_oklch(0.322_0.028_258/0.08)]">
          <CardContent className="p-3 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)} className="w-full md:w-auto">
                <TabsList className="w-full flex-wrap rounded-lg bg-muted p-1 md:w-auto">
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  {CATEGORIAS.map((c) => (
                    <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Encontre em segundos: modelo, qualidade, fornecedor ou nº de série"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8 rounded-lg bg-muted/40 border-border focus-visible:ring-primary/20"
                />
              </div>
              {isAdmin && <NovoProdutoDialog open={openNovo} onOpenChange={setOpenNovo} />}
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Modelo</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qualidade</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tier</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fornecedor</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Compra</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Garantia</TableHead>
                    <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nº série</TableHead>
                    <TableHead className="h-10 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Custo</TableHead>
                    <TableHead className="h-10 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Venda</TableHead>
                    <TableHead className="h-10 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mínimo</TableHead>
                    <TableHead className="h-10 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estoque</TableHead>
                    <TableHead className="h-10 w-[180px] text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{isAdmin ? "Ações" : "Histórico"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">Preparando seu estoque…</TableCell></TableRow>
                  )}
                  {!isLoading && produtosFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                      Seu estoque está vazio — e cada dia sem cadastro é uma venda que pode escapar. Comece agora em <b>Nova peça</b>.
                    </TableCell></TableRow>
                  )}
                  {produtosFiltrados.map((p) => {
                    const baixo = p.estoque_atual <= p.estoque_minimo;
                    return (
                      <TableRow key={p.id} className={`border-border transition-colors ${baixo ? "bg-destructive/[0.04] hover:bg-destructive/[0.06]" : "hover:bg-muted/40"}`}>
                        <TableCell>
                          <Badge variant={p.categoria === "tela" ? "default" : "secondary"} className="rounded-md text-[10px] font-semibold uppercase tracking-wide">
                            {CATEGORIA_LABEL[p.categoria] ?? p.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{p.modelo}</TableCell>
                        <TableCell>{p.qualidade ?? "—"}</TableCell>
                        <TableCell>{p.tier ? <Badge variant="outline" className="rounded-md text-[10px] uppercase tracking-wide">{p.tier}</Badge> : "—"}</TableCell>
                        <TableCell>{p.fornecedor ?? "—"}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{p.data_compra ? new Date(p.data_compra).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell>{p.tem_garantia ? "Sim" : "Não"}</TableCell>
                        <TableCell className="font-mono text-xs">{p.numero_serie ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{fmtMoney(p.preco_custo)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{fmtMoney(p.preco_venda)}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{p.estoque_minimo}</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex min-w-[2.25rem] justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${baixo ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground"}`}>
                            {p.estoque_atual}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {isAdmin && (
                              <>
                                <Button size="icon" variant="outline" title="Registrar saída" className="h-8 w-8 rounded-md"
                                  disabled={movMutation.isPending || p.estoque_atual <= 0}
                                  onClick={() => movMutation.mutate({ produto_id: p.id, tipo: "saida", quantidade: 1 })}>
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="outline" title="Registrar entrada" className="h-8 w-8 rounded-md"
                                  disabled={movMutation.isPending}
                                  onClick={() => movMutation.mutate({ produto_id: p.id, tipo: "entrada", quantidade: 1 })}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button size="icon" variant="ghost" title="Ver histórico" className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground" onClick={() => setHistoricoProduto(p)}>
                              <History className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button size="icon" variant="ghost" title="Editar peça" className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground" onClick={() => setEditProduto(p)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Consultar no WhatsApp"
                              className="h-8 w-8 rounded-md text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                              onClick={() => consultarNoWhatsapp(p)}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" title="Excluir peça" className="h-8 w-8 rounded-md">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir peça?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Isso remove <b>{p.modelo}</b> e todo o histórico dessa peça.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteProduto.mutate(p.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <HistoricoDialog produto={historicoProduto} onClose={() => setHistoricoProduto(null)} />
      <EditarProdutoDialog produto={editProduto} onClose={() => setEditProduto(null)} />
      <WhatsappSettingsDialog open={waSettingsOpen} onOpenChange={setWaSettingsOpen} />
      <SiteFooter />
    </div>
  );
}

function BentoStats({ telas, baterias, outras, alertas, totalPecas }: { telas: number; baterias: number; outras: number; alertas: number; totalPecas: number }) {
  const totalUnidades = telas + baterias + outras;
  const pctTelas = totalUnidades > 0 ? Math.round((telas / totalUnidades) * 100) : 0;
  return (
    <div className="grid grid-cols-12 gap-3 sm:gap-4">
      {/* Hero tile — Telas */}
      <Card className="col-span-12 rounded-2xl border-border shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.04),0_8px_24px_-12px_oklch(0.322_0.028_258/0.08)] transition-shadow hover:shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.06),0_16px_40px_-16px_oklch(0.322_0.028_258/0.14)] md:col-span-6 lg:col-span-7">
        <CardContent className="flex flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Telas prontas para vender</p>
              <h3 className="mt-2 font-display text-4xl font-semibold tracking-tight tabular-nums">{telas}</h3>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Smartphone className="h-6 w-6" />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Participação no estoque</span>
              <span className="tabular-nums font-medium text-foreground">{pctTelas}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pctTelas}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Small tile — Baterias */}
      <Card className="col-span-6 rounded-2xl border-border shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.04)] transition-shadow hover:shadow-[0_8px_24px_-12px_oklch(0.322_0.028_258/0.10)] md:col-span-3 lg:col-span-2">
        <CardContent className="flex h-full flex-col justify-between gap-3 p-5">
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Baterias</p>
            <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{baterias}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BatteryCharging className="h-3.5 w-3.5" /> {totalPecas} peça{totalPecas === 1 ? "" : "s"} no catálogo
          </div>
        </CardContent>
      </Card>

      {/* Small tile — Outras peças */}
      <Card className="col-span-12 rounded-2xl border-border shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.04)] transition-shadow hover:shadow-[0_8px_24px_-12px_oklch(0.322_0.028_258/0.10)] md:col-span-6 lg:col-span-12">
        <CardContent className="flex h-full flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Câmeras, tampas e conectores</p>
            <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{outras}</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Câmera</span>
            <span className="inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Tampa</span>
            <span className="inline-flex items-center gap-1"><Cable className="h-3.5 w-3.5" /> Conector</span>
          </div>
        </CardContent>
      </Card>

      {/* Dark tile — Vendas em risco */}
      <Card className={`col-span-6 rounded-2xl border-transparent shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.06),0_12px_32px_-12px_oklch(0.322_0.028_258/0.30)] md:col-span-3 lg:col-span-3 ${alertas > 0 ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground border-border"}`}>
        <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
          <div>
            <p className={`font-display text-[11px] font-semibold uppercase tracking-widest ${alertas > 0 ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {alertas > 0 ? "Vendas em risco" : "Tudo sob controle"}
            </p>
            <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{alertas}</h3>
          </div>
          <div className={`flex items-center gap-2 text-[11px] ${alertas > 0 ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {alertas > 0 ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400"></span>
                </span>
                Ação necessária agora
              </>
            ) : (
              <>
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                Nenhum item abaixo do mínimo
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function fmtMoney(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type NovaForm = {
  categoria: Categoria;
  modelo: string;
  qualidade: string;
  tier: "" | "ecoline" | "premium";
  fornecedor: string;
  data_compra: string;
  tem_garantia: boolean;
  numero_serie: string;
  preco_custo: string;
  preco_venda: string;
  estoque_minimo: string;
  estoque_inicial: string;
};

const FORM_INICIAL: NovaForm = {
  categoria: "tela", modelo: "", qualidade: "", tier: "", fornecedor: "",
  data_compra: "", tem_garantia: false, numero_serie: "",
  preco_custo: "", preco_venda: "", estoque_minimo: "1", estoque_inicial: "0",
};

function NovoProdutoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<NovaForm>(FORM_INICIAL);

  const novoProdutoSchema = z.object({
    categoria: z.enum(["tela", "bateria", "camera", "tampa_traseira", "conector_carga"]),
    modelo: z.string().trim().min(1, "Informe o modelo").max(120, "Modelo muito longo"),
    qualidade: z.string().trim().max(80).optional(),
    tier: z.enum(["", "ecoline", "premium"]),
    fornecedor: z.string().trim().max(120).optional(),
    numero_serie: z.string().trim().max(80).optional(),
    preco_custo: z.number().min(0).max(1_000_000).nullable(),
    preco_venda: z.number().min(0).max(1_000_000).nullable(),
    estoque_minimo: z.number().int().min(0).max(100_000),
    estoque_inicial: z.number().int().min(0).max(100_000),
  });

  function parseMoney(v: string): number | null {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function parseInt0(v: string): number {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }

  const criar = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sem sessão");
      const parsed = novoProdutoSchema.safeParse({
        categoria: form.categoria,
        modelo: sanitizeText(form.modelo),
        qualidade: sanitizeText(form.qualidade),
        tier: form.tier,
        fornecedor: sanitizeText(form.fornecedor),
        numero_serie: sanitizeText(form.numero_serie),
        preco_custo: parseMoney(form.preco_custo),
        preco_venda: parseMoney(form.preco_venda),
        estoque_minimo: parseInt0(form.estoque_minimo),
        estoque_inicial: parseInt0(form.estoque_inicial),
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      }
      const p = parsed.data;
      const inicial = p.estoque_inicial;
      const { data: prod, error } = await supabase.from("produtos").insert({
        user_id: userData.user.id,
        categoria: p.categoria,
        modelo: p.modelo,
        qualidade: sanitizeNullable(p.qualidade),
        tier: p.tier || null,
        fornecedor: sanitizeNullable(p.fornecedor),
        data_compra: form.data_compra || null,
        tem_garantia: form.tem_garantia,
        numero_serie: sanitizeNullable(p.numero_serie),
        preco_custo: p.preco_custo,
        preco_venda: p.preco_venda,
        estoque_minimo: p.estoque_minimo,
      }).select().single();
      if (error) throw error;
      if (inicial > 0 && prod) {
        const { error: e2 } = await supabase.from("movimentacoes").insert({
          user_id: userData.user.id,
          produto_id: prod.id,
          tipo: "entrada",
          quantidade: inicial,
          observacoes: "Estoque inicial",
        });
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Peça no ar — pronta para gerar receita");
      setForm(FORM_INICIAL);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível cadastrar a peça."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full rounded-lg shadow-[0_8px_24px_-12px_oklch(0.322_0.028_258/0.5)] md:w-auto"><Plus className="h-4 w-4 mr-1" /> Nova peça</Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Nova peça, nova oportunidade de venda</DialogTitle>
          <DialogDescription>Leva menos de 30 segundos. Só o modelo é obrigatório — o resto é bônus.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <Field label="Categoria">
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as Categoria })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Modelo *">
            <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="ex.: iPhone 12, Galaxy A54" required />
          </Field>
          <Field label="Qualidade">
            <Input value={form.qualidade} onChange={(e) => setForm({ ...form, qualidade: e.target.value })} placeholder="Original, Incell, AAA…" />
          </Field>
          <Field label="Tier">
            <Select value={form.tier || "nenhum"} onValueChange={(v) => setForm({ ...form, tier: v === "nenhum" ? "" : (v as "ecoline" | "premium") })}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">—</SelectItem>
                <SelectItem value="ecoline">Ecoline</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fornecedor">
            <Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
          </Field>
          <Field label="Data da compra">
            <Input type="date" value={form.data_compra} onChange={(e) => setForm({ ...form, data_compra: e.target.value })} />
          </Field>
          <Field label="Número de série">
            <Input value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} />
          </Field>
          <div className="flex items-center gap-2 mt-6">
            <Checkbox id="garantia" checked={form.tem_garantia} onCheckedChange={(v) => setForm({ ...form, tem_garantia: !!v })} />
            <Label htmlFor="garantia" className="cursor-pointer">Tem garantia</Label>
          </div>
          <Field label="Preço de custo (R$)">
            <Input type="number" step="0.01" min="0" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} />
          </Field>
          <Field label="Preço de venda (R$)">
            <Input type="number" step="0.01" min="0" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
          </Field>
          <Field label="Estoque mínimo (alerta)">
            <Input type="number" min="0" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
          </Field>
          <Field label="Estoque inicial">
            <Input type="number" min="0" value={form.estoque_inicial} onChange={(e) => setForm({ ...form, estoque_inicial: e.target.value })} />
          </Field>
          <DialogFooter className="sm:col-span-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Agora não</Button>
            <Button type="submit" disabled={criar.isPending}>{criar.isPending ? "Salvando…" : "Cadastrar e liberar venda"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function EditarProdutoDialog({ produto, onClose }: { produto: Produto | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [modelo, setModelo] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("tela");

  useMemo(() => {
    if (produto) {
      setModelo(produto.modelo);
      setCategoria((produto.categoria as Categoria) ?? "tela");
    }
  }, [produto]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!produto) return;
      const nome = sanitizeText(modelo).slice(0, 120);
      if (!nome) throw new Error("Informe o modelo");
      const { error } = await supabase
        .from("produtos")
        .update({ modelo: nome, categoria })
        .eq("id", produto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Peça atualizada");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar a peça."),
  });

  return (
    <Dialog open={!!produto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Editar peça</DialogTitle>
          <DialogDescription>Ajuste o nome e a categoria da peça.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }}
          className="space-y-3"
        >
          <Field label="Modelo">
            <Input value={modelo} onChange={(e) => setModelo(e.target.value)} required />
          </Field>
          <Field label="Categoria">
            <Select value={categoria} onValueChange={(v) => setCategoria(v as Categoria)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HistoricoDialog({ produto, onClose }: { produto: Produto | null; onClose: () => void }) {
  const { data: movs = [], isLoading } = useQuery({
    queryKey: ["movimentacoes", produto?.id],
    enabled: !!produto,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("produto_id", produto!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Movimentacao[];
    },
  });

  return (
    <Dialog open={!!produto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle>Tudo o que aconteceu com {produto?.modelo}</DialogTitle>
          <DialogDescription>As 50 últimas movimentações — total rastreabilidade, zero achismo.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Obs.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Buscando o histórico…</TableCell></TableRow>}
              {!isLoading && movs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Ainda sem movimentações — registre a primeira entrada ou saída.</TableCell></TableRow>}
              {movs.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{new Date(m.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge variant={m.tipo === "entrada" ? "default" : "secondary"}>
                      {m.tipo === "entrada" ? "Entrada" : "Saída"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{m.tipo === "entrada" ? "+" : "-"}{m.quantidade}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.observacoes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}