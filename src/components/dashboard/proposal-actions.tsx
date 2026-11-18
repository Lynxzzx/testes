"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyPlus, Download, ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProposalActions({
  id,
  title,
  hasContent,
}: {
  id: string;
  title: string;
  hasContent: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/proposals/${id}/duplicate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível duplicar a proposta.");
      toast.success("Cópia criada como rascunho!");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Excluir a proposta "${title}"? Essa ação não pode ser desfeita.`)) return;
    setBusy(true);
    const res = await fetch(`/api/proposals/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error("Não foi possível excluir a proposta.");
    toast.success("Proposta excluída.");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={busy} aria-label="Ações">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/propostas/${id}`}>
            <ExternalLink /> Abrir e editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={duplicate}>
          <CopyPlus /> Duplicar proposta
        </DropdownMenuItem>
        {hasContent && (
          <DropdownMenuItem asChild>
            <a href={`/api/proposals/${id}/pdf`}>
              <Download /> Baixar PDF
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={remove}>
          <Trash2 /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
