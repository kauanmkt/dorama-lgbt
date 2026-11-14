"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Botão "Minha Lista".
 * Hoje só muda na tela; na Etapa 4 passa a salvar no Supabase.
 */
export function MyListButton({
  slug,
  initial = false,
  size = "md",
  className,
}: {
  slug: string;
  initial?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const [saved, setSaved] = useState(initial);

  return (
    <Button
      variant="ghost"
      size={size}
      className={className}
      aria-pressed={saved}
      data-slug={slug}
      onClick={() => setSaved((s) => !s)}
    >
      {saved ? <Check className="text-brand-300" /> : <Plus />}
      {saved ? "Na minha lista" : "Minha Lista"}
    </Button>
  );
}
