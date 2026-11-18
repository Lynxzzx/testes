"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Eraser, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function formatCpfCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export type SignatureResult = {
  signerName: string;
  signerDocument: string;
  signatureImage: string;
  signedAt: string;
  signerIp: string;
};

export function SignatureModal({
  open,
  onClose,
  proposalId,
  proposalTitle,
  defaultName = "",
  brandColor = "#4f46e5",
  totalFormatted,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  proposalId: string;
  proposalTitle: string;
  defaultName?: string;
  brandColor?: string;
  totalFormatted?: string | null;
  onSuccess: (res: SignatureResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [signerName, setSignerName] = useState(defaultName);
  const [signerDocument, setSignerDocument] = useState("");
  const [email, setEmail] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Configura o canvas em alta resolução ao abrir o modal
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#0f172a";
    }, 30);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  function getPoint(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDraw(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function moveDraw(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = signerDocument.replace(/\D/g, "");
    if (signerName.trim().length < 3) {
      return toast.error("Informe o seu nome completo.");
    }
    if (digits.length !== 11 && digits.length !== 14) {
      return toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
    }
    if (!hasDrawn || !canvasRef.current) {
      return toast.error("Desenhe a sua assinatura no quadro antes de confirmar.");
    }

    const signatureImage = canvasRef.current.toDataURL("image/png");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/proposals/${proposalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signerDocument: signerDocument.trim(),
          signatureImage,
          email: email.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível registrar a assinatura.");
      }

      toast.success("Proposta aprovada e assinada digitalmente!");
      onSuccess({
        signerName: data.signerName || signerName.trim(),
        signerDocument: data.signerDocument || signerDocument.trim(),
        signatureImage: data.signatureImage || signatureImage,
        signedAt: data.signedAt || new Date().toISOString(),
        signerIp: data.signerIp || "",
      });
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <ShieldCheck className="size-4" /> Assinatura digital com registro de auditoria
            </span>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Formalizar aprovação da proposta
            </h3>
            <p className="text-xs text-slate-500">
              {proposalTitle}
              {totalFormatted ? ` · ${totalFormatted}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="signer-name">Nome completo do aprovador *</Label>
            <Input
              id="signer-name"
              required
              minLength={3}
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Ex.: Dr. Paulo Henrique Soares"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="signer-doc">CPF ou CNPJ *</Label>
              <Input
                id="signer-doc"
                required
                value={signerDocument}
                onChange={(e) => setSignerDocument(formatCpfCnpj(e.target.value))}
                placeholder="000.000.000-00"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signer-email">E-mail (opcional)</Label>
              <Input
                id="signer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Assinatura na tela *</Label>
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                <Eraser className="size-3.5" /> Limpar
              </button>
            </div>
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50">
              <canvas
                ref={canvasRef}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={moveDraw}
                onTouchEnd={endDraw}
                className="h-40 w-full cursor-crosshair touch-none bg-white"
              />
              {!hasDrawn && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                  Assine aqui com o dedo ou mouse
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Ao confirmar, serão registrados sua assinatura, CPF/CNPJ, data/hora exata e endereço IP no certificado do documento.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: brandColor }}
              className="text-white hover:opacity-95"
            >
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Confirmar e Assinar Proposta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
