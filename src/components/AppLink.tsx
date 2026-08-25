import type { AnchorHTMLAttributes } from "react";
import { assetPath } from "@/lib/asset-path";

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

/** Prefix-aware hard navigation is reliable on static GitHub Pages hosting. */
export function AppLink({ href, ...props }: AppLinkProps) {
  return <a href={assetPath(href)} {...props} />;
}
