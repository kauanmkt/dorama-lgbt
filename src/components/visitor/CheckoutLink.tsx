"use client";

import { useEffect, useState } from "react";
import { withUtm } from "./utm";

/** <a> para o checkout que já leva as UTMs do anúncio. */
export function CheckoutLink({
  href,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const [url, setUrl] = useState(href);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- as UTMs ficam no navegador (sessionStorage)
  useEffect(() => setUrl(withUtm(href)), [href]);
  return (
    <a
      {...rest}
      href={url}
      onClick={(e) => {
        // garante as UTMs mesmo se o clique vier antes do efeito rodar
        e.currentTarget.href = withUtm(href);
        rest.onClick?.(e);
      }}
    />
  );
}
