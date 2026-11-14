"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { setFavorite } from "@/lib/favorites-actions";

/**
 * Botão "Minha Lista" — salva no banco.
 * Muda na tela na hora e desfaz se o servidor recusar.
 */
export function MyListButton({
  doramaId,
  initial = false,
  size = "md",
  className,
}: {
  doramaId: string;
  initial?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await setFavorite(doramaId, next);
      if (!res.ok) setSaved(!next);
    });
  };

  return (
    <Button
      variant="ghost"
      size={size}
      className={className}
      aria-pressed={saved}
      aria-busy={pending}
      onClick={toggle}
    >
      {saved ? <Check className="text-brand-300" /> : <Plus />}
      {saved ? "Na minha lista" : "Minha Lista"}
    </Button>
  );
}
