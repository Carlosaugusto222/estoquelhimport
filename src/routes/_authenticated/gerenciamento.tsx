import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import logo from "@/assets/logo.webp";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listarUsuarios,
  definirAdmin,
  excluirUsuario,
  listarMovimentacoes,
} from "@/lib/gerenciamento.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck, ShieldOff, Trash2, Users, ArrowLeft, Package, LogOut,
  ArrowDownCircle, ArrowUpCircle, History,
} from "lucide-react";
import { toast } from "sonner";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/gerenciamento")({
  component: GerenciamentoPage,
});

function GerenciamentoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listar = useServerFn(listarUsuarios);
  const definir = useServerFn(definirAdmin);
  const excluir = useServerFn(excluirUsuario);
  const listarMov = useServerFn(listarMovimentacoes);

  const { data: isAdmin, isLoading: verificandoAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const { data: isOldestAdmin = false } = useQuery({
    queryKey: ["is-oldest-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data, error } = await (supabase as any).rpc("is_oldest_admin", {
        _user_id: userData.user.id,
      });
      if (error) return false;
      return !!data;
    },
    enabled: isAdmin === true,
  });

  const { data: usuarios = [], isLoading, error } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => listar(),
    enabled: isAdmin === true,
  });

  const {
    data: movimentacoes = [],
    isLoading: carregandoMov,
    error: errorMov,
  } = useQuery({
    queryKey: ["movimentacoes-admin"],
    queryFn: () => listarMov(),
    enabled: isOldestAdmin === true,
  });

  const mudarAdmin = useMutation({
    mutationFn: (v: { user_id: string; tornar_admin: boolean }) =>
      definir({ data: v }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success(v.tornar_admin ? "Usuário promovido a administrador" : "Acesso de administrador removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removerUsuario = useMutation({
    mutationFn: (user_id: string) => excluir({ data: { user_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário excluído");
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:h-16">
          <div className="flex min-w-0 items-center gap-2">
            <img src={logo} alt="LH Import" width="40" height="40" loading="lazy" decoding="async" className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-border/60" />
            <div className="min-w-0">
              <h1 className="truncate font-display text-[15px] font-semibold leading-tight tracking-tight">Gerenciamento</h1>
              <p className="truncate text-[11px] text-muted-foreground">Usuários e permissões</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" aria-label="Voltar ao estoque" className="text-muted-foreground hover:text-foreground">
              <Link to="/estoque"><ArrowLeft className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Estoque</span></Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} aria-label="Sair" className="rounded-lg">
              <LogOut className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-6 space-y-6 sm:px-6 sm:py-8">
        {verificandoAdmin && (
          <Card className="rounded-2xl"><CardContent className="p-8 text-center text-muted-foreground">Verificando permissões…</CardContent></Card>
        )}

        {!verificandoAdmin && !isAdmin && (
          <Card className="rounded-2xl border-destructive/30 bg-destructive/[0.03]">
            <CardContent className="p-6 flex items-start gap-3">
              <ShieldOff className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-display font-semibold tracking-tight">Acesso restrito</p>
                <p className="text-sm text-muted-foreground">Somente administradores podem acessar esta tela.</p>
                <Button asChild size="sm" variant="outline" className="mt-3 rounded-lg">
                  <Link to="/estoque">Voltar para o estoque</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card className="rounded-2xl border-border shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.04),0_8px_24px_-12px_oklch(0.322_0.028_258/0.08)]">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display font-semibold tracking-tight">Usuários do sistema</h2>
                  <p className="text-sm text-muted-foreground">
                    Promova ou remova administradores. Somente administradores podem alterar o estoque.
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit shrink-0 gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Package className="h-3 w-3" /> {usuarios.length} usuário{usuarios.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">E-mail</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Papel</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Criado em</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Último acesso</TableHead>
                      <TableHead className="h-10 w-[260px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                    )}
                    {error && (
                      <TableRow><TableCell colSpan={5} className="text-center text-destructive py-8">{(error as Error).message}</TableCell></TableRow>
                    )}
                    {!isLoading && !error && usuarios.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</TableCell></TableRow>
                    )}
                    {usuarios.map((u) => (
                      <TableRow key={u.id} className="border-border transition-colors hover:bg-muted/40">
                        <TableCell className="font-medium">
                          {u.email || <span className="text-muted-foreground">sem e-mail</span>}
                          {u.is_self && <Badge variant="outline" className="ml-2 rounded-md text-[10px] uppercase tracking-wide">Você</Badge>}
                        </TableCell>
                        <TableCell>
                          {u.is_admin ? (
                            <Badge className="gap-1 rounded-md text-[10px] font-semibold uppercase tracking-wide"><ShieldCheck className="h-3 w-3" /> Administrador</Badge>
                          ) : (
                            <Badge variant="secondary" className="rounded-md text-[10px] font-semibold uppercase tracking-wide">Somente leitura</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {u.is_admin ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={u.is_self || mudarAdmin.isPending}
                                onClick={() => mudarAdmin.mutate({ user_id: u.id, tornar_admin: false })}
                              >
                                <ShieldOff className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Remover admin</span><span className="sm:hidden">Remover</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled={mudarAdmin.isPending}
                                onClick={() => mudarAdmin.mutate({ user_id: u.id, tornar_admin: true })}
                              >
                                <ShieldCheck className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Tornar admin</span><span className="sm:hidden">Promover</span>
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" disabled={u.is_self} title="Excluir usuário">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Isso remove <b>{u.email}</b> permanentemente. Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => removerUsuario.mutate(u.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card className="rounded-2xl border-border shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.04),0_8px_24px_-12px_oklch(0.322_0.028_258/0.08)]">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0 flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <History className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-semibold tracking-tight">Auditoria de movimentações</h2>
                    <p className="text-sm text-muted-foreground">
                      Histórico completo de entradas e saídas, com data, hora e responsável.
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit shrink-0 gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Package className="h-3 w-3" /> {movimentacoes.length} registro{movimentacoes.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data / Hora</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                      <TableHead className="h-10 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qtd.</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Produto</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Responsável</TableHead>
                      <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carregandoMov && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando movimentações…</TableCell></TableRow>
                    )}
                    {errorMov && (
                      <TableRow><TableCell colSpan={6} className="text-center text-destructive py-8">{(errorMov as Error).message}</TableCell></TableRow>
                    )}
                    {!carregandoMov && !errorMov && movimentacoes.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada ainda.</TableCell></TableRow>
                    )}
                    {movimentacoes.map((m) => {
                      const isEntrada = m.tipo === "entrada";
                      const dt = new Date(m.created_at);
                      const produtoLabel = [m.produto_categoria, m.produto_modelo].filter(Boolean).join(" • ");
                      const detalhes = [m.produto_qualidade, m.produto_tier].filter(Boolean).join(" · ");
                      return (
                        <TableRow key={m.id} className="border-border transition-colors hover:bg-muted/40">
                          <TableCell className="whitespace-nowrap text-sm tabular-nums">
                            <div className="font-medium text-foreground">{dt.toLocaleDateString("pt-BR")}</div>
                            <div className="text-[11px] text-muted-foreground">{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                          </TableCell>
                          <TableCell>
                            {isEntrada ? (
                              <Badge className="gap-1 rounded-md bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 text-[10px] font-semibold uppercase tracking-wide">
                                <ArrowDownCircle className="h-3 w-3" /> Entrada
                              </Badge>
                            ) : (
                              <Badge className="gap-1 rounded-md bg-rose-500/15 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 text-[10px] font-semibold uppercase tracking-wide">
                                <ArrowUpCircle className="h-3 w-3" /> Saída
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            <span className={isEntrada ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
                              {isEntrada ? "+" : "−"}{m.quantidade}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-[220px]">
                            <div className="text-sm font-medium text-foreground">
                              {produtoLabel || <span className="text-muted-foreground">Produto removido</span>}
                            </div>
                            {detalhes && <div className="text-[11px] text-muted-foreground">{detalhes}</div>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {m.user_email || <span className="italic">desconhecido</span>}
                          </TableCell>
                          <TableCell className="max-w-[280px] text-sm text-muted-foreground">
                            {m.observacoes ? (
                              <span className="line-clamp-2" title={m.observacoes}>{m.observacoes}</span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}