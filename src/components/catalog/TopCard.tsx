import Link from "next/link";
import type { Dorama } from "@/types/catalog";
import { Artwork } from "./Artwork";

/** Card do "Top 10" com o número grande ao lado da capa. */
export function TopCard({ dorama, rank }: { dorama: Dorama; rank: number }) {
  return (
    <Link href={`/dorama/${dorama.slug}`} className="group flex items-end" title={dorama.title}>
      <span
        aria-hidden
        className="font-display relative z-0 -mr-[0.12em] shrink-0 text-[clamp(6.5rem,24vw,10rem)] leading-[0.72] font-extrabold tracking-[-0.1em] text-transparent select-none"
        style={{ WebkitTextStroke: "3px #bf4dff", textShadow: "0 0 30px rgb(143 0 204 / .55)" }}
      >
        {rank}
      </span>
      <div className="relative z-10 aspect-[2/3] w-[58%] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:ring-brand-500/70">
        <Artwork seed={dorama.artSeed} title={dorama.title} imageUrl={dorama.posterUrl} />
      </div>
    </Link>
  );
}
