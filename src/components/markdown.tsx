"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeProposalMarkdown } from "@/lib/ai/prompts";
import { cn } from "@/lib/utils";

export function Markdown({
  content,
  className,
  streaming,
}: {
  content: string;
  className?: string;
  streaming?: boolean;
}) {
  return (
    <div className={cn("proposal-prose", streaming && "is-streaming", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {sanitizeProposalMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
