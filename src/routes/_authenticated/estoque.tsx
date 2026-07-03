import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  ShieldCheck, Eye, Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/estoque")({
  component: EstoquePage,
});

type Produto = {
  id: string;
  categoria: "tela" | "bateria";
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
  const [filtro, setFiltro] = useState<"todos" | "tela" | "bateria">("todos");
  const [busca, setBusca] = useState("");
  const [openNovo, setOpenNovo] = useState(false);
  const [historicoProduto, setHistoricoProduto] = useState<Produto | null>(null);

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

  const { data: existeAdmin = true } = useQuery({
    queryKey: ["existe-admin"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if (error) return true;
      return (count ?? 0) > 0;
    },
  });

  const virarAdmin = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sem sessão");
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userData.user.id, role: "admin" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["is-admin"] });
      qc.invalidateQueries({ queryKey: ["existe-admin"] });
      toast.success("Você agora é o administrador!");
    },
    onError: (e: Error) => toast.error(e.message),
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
    const telas = produtos.filter((p) => p.categoria === "tela");
    const baterias = produtos.filter((p) => p.categoria === "bateria");
    const soma = (arr: Produto[]) => arr.reduce((s, p) => s + p.estoque_atual, 0);
    const alertas = produtos.filter((p) => p.estoque_atual <= p.estoque_minimo).length;
    return { telas: soma(telas), baterias: soma(baterias), alertas };
  }, [produtos]);

  const movMutation = useMutation({
    mutationFn: async (input: { produto_id: string; tipo: "entrada" | "saida"; quantidade: number; observacoes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sem sessão");
      const { error } = await supabase.from("movimentacoes").insert({
        produto_id: input.produto_id,
        tipo: input.tipo,
        quantidade: input.quantidade,
        observacoes: input.observacoes ?? null,
        user_id: userData.user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      toast.success(v.tipo === "entrada" ? "Entrada registrada" : "Saída registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProduto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Peça removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleLogout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold leading-tight">Estoque LH Import</h1>
              <p className="text-xs text-muted-foreground">Telas e baterias</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> Administrador</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" /> Somente leitura</Badge>
            )}
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link to="/gerenciamento"><Users className="h-4 w-4 mr-1" /> Gerenciar</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 space-y-4">
        {!existeAdmin && !isAdmin && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Nenhum administrador cadastrado</p>
                  <p className="text-sm text-muted-foreground">Como você é o primeiro usuário, pode se tornar o administrador do sistema.</p>
                </div>
              </div>
              <Button onClick={() => virarAdmin.mutate()} disabled={virarAdmin.isPending}>
                Tornar-me administrador
              </Button>
            </CardContent>
          </Card>
        )}

        {existeAdmin && !isAdmin && (
          <Card className="border-muted-foreground/20 bg-muted/50">
            <CardContent className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Você está no modo somente leitura. Peça a um administrador para alterar o estoque.
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={<Smartphone className="h-5 w-5" />} label="Telas em estoque" value={totais.telas} />
          <StatCard icon={<BatteryCharging className="h-5 w-5" />} label="Baterias em estoque" value={totais.baterias} />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Peças em alerta" value={totais.alertas} tone={totais.alertas > 0 ? "warn" : undefined} />
        </div>

        <Card>
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
                <TabsList>
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="tela">Telas</TabsTrigger>
                  <TabsTrigger value="bateria">Baterias</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar modelo, qualidade, fornecedor, número de série…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8"
                />
              </div>
              {isAdmin && <NovoProdutoDialog open={openNovo} onOpenChange={setOpenNovo} />}
            </div>

            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Qualidade</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Compra</TableHead>
                    <TableHead>Garantia</TableHead>
                    <TableHead>Nº série</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Venda</TableHead>
                    <TableHead className="text-center">Mínimo</TableHead>
                    <TableHead className="text-center">Estoque</TableHead>
                    <TableHead className="text-center w-[180px]">{isAdmin ? "Ações" : "Histórico"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                  )}
                  {!isLoading && produtosFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                      Nenhuma peça. Clique em <b>Nova peça</b> para começar.
                    </TableCell></TableRow>
                  )}
                  {produtosFiltrados.map((p) => {
                    const baixo = p.estoque_atual <= p.estoque_minimo;
                    return (
                      <TableRow key={p.id} className={baixo ? "bg-destructive/5" : undefined}>
                        <TableCell>
                          <Badge variant={p.categoria === "tela" ? "default" : "secondary"}>
                            {p.categoria === "tela" ? "Tela" : "Bateria"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{p.modelo}</TableCell>
                        <TableCell>{p.qualidade ?? "—"}</TableCell>
                        <TableCell>{p.tier ? <Badge variant="outline">{p.tier}</Badge> : "—"}</TableCell>
                        <TableCell>{p.fornecedor ?? "—"}</TableCell>
                        <TableCell>{p.data_compra ? new Date(p.data_compra).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell>{p.tem_garantia ? "Sim" : "Não"}</TableCell>
                        <TableCell className="font-mono text-xs">{p.numero_serie ?? "—"}</TableCell>
                        <TableCell className="text-right">{fmtMoney(p.preco_custo)}</TableCell>
                        <TableCell className="text-right">{fmtMoney(p.preco_venda)}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{p.estoque_minimo}</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 font-semibold ${baixo ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>
                            {p.estoque_atual}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {isAdmin && (
                              <>
                                <Button size="icon" variant="outline" title="Registrar saída"
                                  disabled={movMutation.isPending || p.estoque_atual <= 0}
                                  onClick={() => movMutation.mutate({ produto_id: p.id, tipo: "saida", quantidade: 1 })}>
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="outline" title="Registrar entrada"
                                  disabled={movMutation.isPending}
                                  onClick={() => movMutation.mutate({ produto_id: p.id, tipo: "entrada", quantidade: 1 })}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button size="icon" variant="ghost" title="Ver histórico" onClick={() => setHistoricoProduto(p)}>
                              <History className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" title="Excluir peça">
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
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "warn" }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone === "warn" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function fmtMoney(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type NovaForm = {
  categoria: "tela" | "bateria";
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

  const criar = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sem sessão");
      if (!form.modelo.trim()) throw new Error("Informe o modelo");
      const inicial = Number(form.estoque_inicial) || 0;
      const { data: prod, error } = await supabase.from("produtos").insert({
        user_id: userData.user.id,
        categoria: form.categoria,
        modelo: form.modelo.trim(),
        qualidade: form.qualidade.trim() || null,
        tier: form.tier || null,
        fornecedor: form.fornecedor.trim() || null,
        data_compra: form.data_compra || null,
        tem_garantia: form.tem_garantia,
        numero_serie: form.numero_serie.trim() || null,
        preco_custo: form.preco_custo ? Number(form.preco_custo) : null,
        preco_venda: form.preco_venda ? Number(form.preco_venda) : null,
        estoque_minimo: Number(form.estoque_minimo) || 0,
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
      toast.success("Peça cadastrada");
      setForm(FORM_INICIAL);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Nova peça</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar nova peça</DialogTitle>
          <DialogDescription>Preencha os dados. Só o modelo é obrigatório.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <Field label="Categoria">
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as "tela" | "bateria" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tela">Tela</SelectItem>
                <SelectItem value="bateria">Bateria</SelectItem>
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={criar.isPending}>Cadastrar</Button>
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico — {produto?.modelo}</DialogTitle>
          <DialogDescription>Últimas 50 movimentações desta peça.</DialogDescription>
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
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Carregando…</TableCell></TableRow>}
              {!isLoading && movs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Sem movimentações.</TableCell></TableRow>}
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