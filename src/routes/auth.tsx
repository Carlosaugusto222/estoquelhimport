import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/logo.webp";
import { toast } from "sonner";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Informe sua senha").max(72),
});
const signupSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z
    .string()
    .min(8, "A senha precisa ter ao menos 8 caracteres")
    .max(72, "Senha muito longa"),
});

function traduzirErroAuth(msg: string | undefined): string {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("user already registered") || m.includes("already"))
    return "Este e-mail já está cadastrado.";
  if (m.includes("email") && m.includes("confirm"))
    return "Confirme seu e-mail antes de entrar.";
  if (m.includes("rate")) return "Muitas tentativas. Aguarde um instante.";
  return msg || "Não foi possível concluir a operação.";
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/estoque", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) return toast.error(traduzirErroAuth(error.message));
      toast.success("Bem-vindo!");
      navigate({ to: "/estoque", replace: true });
    } catch {
      toast.error("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        ...parsed.data,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) return toast.error(traduzirErroAuth(error.message));
      if (data.session) {
        toast.success("Conta criada!");
        navigate({ to: "/estoque", replace: true });
      } else {
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      }
    } catch {
      toast.error("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md rounded-2xl border-border shadow-[0_1px_2px_0_oklch(0.322_0.028_258/0.04),0_24px_48px_-24px_oklch(0.322_0.028_258/0.18)]">
        <CardHeader className="text-center space-y-3 pt-8">
          <img src={logo} alt="LH Import" width="64" height="64" fetchPriority="high" decoding="async" className="mx-auto h-16 w-16 rounded-2xl object-cover ring-1 ring-border/60 shadow-sm" />
          <CardTitle className="font-display text-2xl tracking-tight">Estoque LH Import</CardTitle>
          <CardDescription className="text-[13px]">Controle premium de telas e baterias</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="l-email">Email</Label>
                  <Input id="l-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="l-pwd">Senha</Label>
                  <Input id="l-pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>Entrar</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="s-email">Email</Label>
                  <Input id="s-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-pwd">Senha</Label>
                  <Input id="s-pwd" type="password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>Criar conta</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
      <SiteFooter />
    </div>
  );
}