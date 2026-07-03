import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import logo from "@/assets/logo.webp";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listarUsuarios,
  definirAdmin,
  excluirUsuario,
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
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/gerenciamento")({
  component: GerenciamentoPage,
});

function GerenciamentoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listar = useServerFn(listarUsuarios);
  const definir = useServerFn(definirAdmin);
  const excluir = useServerFn(excluirUsuario);

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

  const { data: usuarios = [], isLoading, error } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => listar(),
    enabled: isAdmin === true,
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
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="mx-auto max-w-[1200px] flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="LH Import" width="40" height="40" loading="lazy" decoding="async" className="h-10 w-10 rounded-lg object-cover" />
            <div>
              <h1 className="font-semibold leading-tight">Gerenciamento</h1>
              <p className="text-xs text-muted-foreground">Usuários e permissões</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/estoque"><ArrowLeft className="h-4 w-4 mr-1" /> Estoque</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-6 space-y-4">
        {verificandoAdmin && (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Verificando permissões…</CardContent></Card>
        )}

        {!verificandoAdmin && !isAdmin && (
          <Card className="border-destructive/40">
            <CardContent className="p-6 flex items-start gap-3">
              <ShieldOff className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium">Acesso restrito</p>
                <p className="text-sm text-muted-foreground">Somente administradores podem acessar esta tela.</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link to="/estoque">Voltar para o estoque</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardContent className="p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium">Usuários do sistema</h2>
                  <p className="text-sm text-muted-foreground">
                    Promova ou remova administradores. Somente administradores podem alterar o estoque.
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Package className="h-3 w-3" /> {usuarios.length} usuário{usuarios.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Último acesso</TableHead>
                      <TableHead className="text-right w-[260px]">Ações</TableHead>
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
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.email || <span className="text-muted-foreground">sem e-mail</span>}
                          {u.is_self && <Badge variant="outline" className="ml-2">Você</Badge>}
                        </TableCell>
                        <TableCell>
                          {u.is_admin ? (
                            <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> Administrador</Badge>
                          ) : (
                            <Badge variant="secondary">Somente leitura</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {u.is_admin ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={u.is_self || mudarAdmin.isPending}
                                onClick={() => mudarAdmin.mutate({ user_id: u.id, tornar_admin: false })}
                              >
                                <ShieldOff className="h-4 w-4 mr-1" /> Remover admin
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled={mudarAdmin.isPending}
                                onClick={() => mudarAdmin.mutate({ user_id: u.id, tornar_admin: true })}
                              >
                                <ShieldCheck className="h-4 w-4 mr-1" /> Tornar admin
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
      </main>
    </div>
  );
}