import Link from "next/link";
import type { Dorama } from "@/types/catalog";
import { cn } from "@/lib/utils";
import { Artwork } from "./Artwork";

/** Capa clicável de um dorama (usada em carrosséis e grades). */
export function DoramaCard({ dorama, className }: { dorama: Dorama; className?: string }) {
  return (
    <Link
      href={`/dorama/${dorama.slug}`}
      className={cn("group block focus-visible:outline-none", className)}
      title={dorama.title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ink-800 ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:ring-brand-500/70 group-hover:shadow-[0_18px_40px_-14px] group-hover:shadow-brand-600/60 group-focus-visible:ring-2 group-focus-visible:ring-brand-400">
        <Artwork
          seed={dorama.artSeed}
          title={dorama.title}
          imageUrl={dorama.posterUrl}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {dorama.isNew && (
          <span className="absolute top-2 left-2 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase shadow-lg">
            Novo
          </span>
        )}
      </div>
    </Link>
  );
}
