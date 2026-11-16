"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERRORS: Record<string, string> = {
  CredentialsSignin: "Email ou senha incorretos.",
  OAuthSignin: "Não foi possível conectar ao Google.",
  OAuthCallback: "Falha no retorno do Google. Tente novamente.",
  OAuthAccountNotLinked: "Este email já está vinculado a outro método de login.",
  AccessDenied: "Acesso negado.",
  Default: "Não foi possível entrar. Tente novamente.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function AuthForm({
  mode,
  googleEnabled,
  callbackUrl,
  initialError,
}: {
  mode: "login" | "register";
  googleEnabled: boolean;
  callbackUrl: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"form" | "google" | null>(null);
  const [error, setError] = useState(initialError ? ERRORS[initialError] ?? ERRORS.Default : "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading("form");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fd.get("name"), email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erro ao criar conta");
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) throw new Error(ERRORS[result?.error ?? "Default"] ?? ERRORS.CredentialsSignin);

      if (mode === "register") toast.success("Conta criada! Vamos configurar sua empresa.");
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "login" ? "Entrar na sua conta" : "Crie sua conta grátis"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-brand hover:underline">
              Cadastre-se
            </Link>
          </>
        ) : (
          <>
            Já tem uma conta?{" "}
            <Link href="/login" className="font-medium text-brand hover:underline">
              Entrar
            </Link>
          </>
        )}
      </p>

      {googleEnabled && (
        <>
          <Button
            type="button"
            variant="outline"
            className="mt-8 w-full"
            size="lg"
            disabled={!!loading}
            onClick={() => {
              setLoading("google");
              signIn("google", { callbackUrl });
            }}
          >
            {loading === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            Continuar com Google
          </Button>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou com email <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className={googleEnabled ? "space-y-4" : "mt-8 space-y-4"}>
        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="Seu nome" required minLength={2} autoComplete="name" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="voce@empresa.com.br" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={mode === "register" ? "Mínimo de 8 caracteres" : "••••••••"}
            required
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={!!loading}>
          {loading === "form" && <Loader2 className="animate-spin" />}
          {mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
      </form>
    </div>
  );
}
