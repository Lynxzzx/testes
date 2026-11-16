import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.
        </p>
      </div>
      <div className="relative hidden overflow-hidden border-l bg-muted/40 lg:block">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/20 blur-[100px]" />
        <div className="relative flex h-full flex-col justify-center p-16">
          <blockquote className="max-w-md">
            <p className="text-2xl font-medium leading-snug tracking-tight">
              &ldquo;Eu levava uma tarde inteira para montar cada proposta. Hoje envio no mesmo dia da reunião — e fechei 2
              contratos a mais no primeiro mês.&rdquo;
            </p>
            <footer className="mt-6 text-sm text-muted-foreground">
              Marina Duarte · Fundadora, Estúdio Norte
            </footer>
          </blockquote>
          <Link href="/" className="mt-12 text-sm text-brand hover:underline">
            ← Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}
