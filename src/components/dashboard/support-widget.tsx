"use client";

import { useState } from "react";
import { LifeBuoy, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "";

export function SupportWidget({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);

  function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setFeedback("");
      setOpen(false);
      toast.success("Obrigado pelo seu feedback! Nossa equipe vai analisar.");
    }, 350);
  }

  const whatsHref = SUPPORT_WHATSAPP
    ? `https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Preciso de ajuda no PropostaAI${userEmail ? ` (${userEmail})` : ""}.`
      )}`
    : `https://wa.me/?text=${encodeURIComponent(
        `Olá! Preciso de suporte no PropostaAI${userEmail ? ` (${userEmail})` : ""}.`
      )}`;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open ? (
        <div className="w-80 rounded-2xl border bg-background p-4 shadow-xl">
          <div className="flex items-center justify-between border-b pb-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LifeBuoy className="size-4 text-brand" />
              Suporte & Feedback
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={submitFeedback} className="mt-3 space-y-2.5">
            <p className="text-xs text-muted-foreground">
              Tem alguma sugestão de melhoria ou encontrou algum problema?
            </p>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Escreva sua sugestão ou dúvida..."
              rows={3}
              className="text-xs"
            />
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 flex-1 text-xs"
                asChild
              >
                <a href={whatsHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-3.5 text-emerald-600" />
                  WhatsApp
                </a>
              </Button>
              <Button
                type="submit"
                variant="brand"
                size="sm"
                className="h-8 flex-1 text-xs"
                disabled={!feedback.trim() || sending}
              >
                <Send className="size-3.5" />
                Enviar
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border bg-background/95 px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-md backdrop-blur transition-all hover:border-brand/40 hover:text-foreground"
        >
          <LifeBuoy className="size-3.5 text-brand" />
          <span>Suporte</span>
        </button>
      )}
    </div>
  );
}
