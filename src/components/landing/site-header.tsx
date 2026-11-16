import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#exemplos", label: "Exemplos" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Ir para o painel</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/cadastro">Começar grátis</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
