import { Facebook, Handshake, Instagram, Music2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

const links: { label: string; slug: string }[] = [
  { label: "Regulamin", slug: "regulamin" },
  { label: "Polityka prywatności", slug: "polityka-prywatnosci" },
  { label: "Support", slug: "kontakt" },
  { label: "Sposoby płatności", slug: "sposoby-platnosci" },
  { label: "Kontakt", slug: "kontakt" },
];

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

export function SiteFooter() {
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
          {links.map(({ label, slug }) => (
            <Link
              key={label}
              to="/strona/$slug"
              params={{ slug }}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
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
