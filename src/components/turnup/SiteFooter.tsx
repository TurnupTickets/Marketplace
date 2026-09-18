import { Facebook, Handshake, Instagram, Music2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { resolveMenuLink } from "@/lib/api/endpoints";
import { menuQuery } from "@/lib/api/queries";
import type { MenuItem } from "@/lib/api/types";

function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 text-foreground ${className}`}>
      <a href="#" aria-label="Instagram">
        <Instagram className="size-7" strokeWidth={1.5} />
      </a>
      <a href="#" aria-label="Facebook">
        <Facebook className="size-7" strokeWidth={1.5} />
      </a>
      <a href="#" aria-label="TikTok">
        <Music2 className="size-7" strokeWidth={1.5} />
      </a>
    </div>
  );
}

function FooterNavLink({ item }: { item: MenuItem }) {
  const resolved = resolveMenuLink(item);
  if (!resolved) return <span className="text-muted-foreground">{item.title}</span>;
  if (resolved.kind === "internal") {
    return (
      <Link
        to={resolved.to}
        search={resolved.search}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {item.title}
      </Link>
    );
  }
  return (
    <a
      href={resolved.href}
      target={resolved.target}
      rel={resolved.target === "_blank" ? "noopener noreferrer" : undefined}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {item.title}
    </a>
  );
}

export function SiteFooter() {
  const { data: menu } = useQuery(menuQuery("footer"));

  return (
    <footer
      className="mt-8 rounded-t-3xl bg-black px-6 py-10 text-white"
      style={
        {
          "--foreground": "oklch(0.98 0 0)",
          "--muted-foreground": "oklch(0.72 0.01 285)",
          "--border": "oklch(0.3 0.01 285)",
        } as React.CSSProperties
      }
    >
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-8 md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6">
        <button className="gradient-brand flex w-fit items-center gap-4 rounded-full px-6 py-3 md:justify-self-start">
          <span className="font-display text-sm font-bold uppercase leading-tight text-primary-foreground">
            Sprzedawaj
            <br />
            bilety u nas!
          </span>
          <Handshake className="size-7 text-primary-foreground" strokeWidth={1.5} />
        </button>

        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
          {(menu?.items ?? []).map((item) => (
            <FooterNavLink key={item.id} item={item} />
          ))}
        </nav>

        <SocialLinks className="hidden md:flex md:justify-self-end" />
      </div>

      <div className="mx-auto mt-10 grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 md:mt-6 md:flex md:justify-center">
        <SocialLinks className="md:hidden" />
        <p className="justify-self-center whitespace-nowrap text-xs uppercase tracking-widest text-muted-foreground">
          Turnup 2026
        </p>
        <div aria-hidden className="md:hidden" />
      </div>
    </footer>
  );
}
