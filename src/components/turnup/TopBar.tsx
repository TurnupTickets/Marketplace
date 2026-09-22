import { useState } from "react";
import { LogIn, Search, Ticket, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { currentUserQuery, menuQuery } from "@/lib/api/queries";
import { resolveMenuLink } from "@/lib/api/endpoints";
import type { MenuItem } from "@/lib/api/types";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { SearchModal } from "./SearchModal";

function MainNavLink({ item }: { item: MenuItem }) {
  const resolved = resolveMenuLink(item);
  if (!resolved) return <span className="text-white/60">{item.title}</span>;
  if (resolved.kind === "internal") {
    const linkClassName = "transition-colors hover:text-primary";
    return resolved.to === "/wydarzenia" ? (
      <Link to={resolved.to} search={resolved.search} className={linkClassName}>
        {item.title}
      </Link>
    ) : (
      <Link to={resolved.to} params={resolved.params} className={linkClassName}>
        {item.title}
      </Link>
    );
  }
  return (
    <a
      href={resolved.href}
      target={resolved.target}
      rel={resolved.target === "_blank" ? "noopener noreferrer" : undefined}
      className="transition-colors hover:text-primary"
    >
      {item.title}
    </a>
  );
}

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  // Loading and logged-out both render the same "log in" affordance — only a
  // confirmed session swaps it for the profile link, on mobile and desktop alike.
  const { data: user } = useQuery(currentUserQuery());
  const { data: mainMenu } = useQuery(menuQuery("main"));

  return (
    <header
      className="sticky top-0 z-50 rounded-b-3xl bg-black text-white md:rounded-b-[2rem]"
      style={
        {
          "--background": "black",
          "--foreground": "oklch(0.98 0 0)",
          "--muted-foreground": "oklch(0.72 0.01 285)",
          "--border": "oklch(0.3 0.01 285)",
        } as React.CSSProperties
      }
    >
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--brand-violet)" />
            <stop offset="100%" stopColor="var(--brand-pink)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 px-3 py-3 md:gap-4 md:px-6">
        <LanguageSwitcher variant="mobile" />

        <Link to="/" className="hidden md:block">
          <Logo />
        </Link>

        <Link to="/" className="min-w-0 shrink md:hidden">
          <Logo width={90} height={25} />
        </Link>

        <SearchCluster className="hidden md:flex" onSearch={() => setSearchOpen(true)} />

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <LanguageSwitcher variant="desktop" />
          {user ? (
            <Link
              to="/profil"
              aria-label="Profil"
              className="flex items-center rounded-full p-1 transition-opacity hover:opacity-70"
            >
              <User className="size-5 md:size-6" strokeWidth={1.5} />
              <span className="hidden text-xs font-semibold uppercase tracking-wide md:ml-1.5 md:inline">
                Profil
              </span>
            </Link>
          ) : (
            <Link
              to="/logowanie"
              aria-label="Zaloguj się"
              className="rounded-full p-1 transition-opacity hover:opacity-70"
            >
              <LogIn className="size-5 md:size-6" strokeWidth={1.5} />
            </Link>
          )}
        </div>
      </div>

      <div className="px-3 pb-4 md:hidden">
        <SearchCluster className="flex" onSearch={() => setSearchOpen(true)} />
      </div>

      {mainMenu && mainMenu.items.length > 0 && (
        <nav className="hidden max-w-[1600px] flex-wrap justify-center gap-x-6 gap-y-2 px-6 pb-3 text-xs font-semibold uppercase tracking-wide text-white/85 md:mx-auto md:flex">
          {mainMenu.items.map((item) => (
            <MainNavLink key={item.id} item={item} />
          ))}
        </nav>
      )}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

function SearchCluster({ className = "", onSearch }: { className?: string; onSearch: () => void }) {
  return (
    <div className={`w-full items-center gap-2 md:w-auto md:gap-3 ${className}`}>
      <button
        onClick={onSearch}
        className="gradient-brand-soft flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full px-4 py-2.5 text-left md:w-56 md:flex-none md:gap-3 md:px-5"
      >
        <span className="text-xs font-semibold leading-tight text-primary-foreground md:text-sm">
          znajdź
          <br />
          wydarzenie
        </span>
        <Search className="size-4 shrink-0 text-primary-foreground md:size-5" strokeWidth={2.5} />
      </button>

      <Link
        to="/znajdz-bilet"
        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-white px-4 py-2.5 text-left md:w-56 md:flex-none md:gap-3 md:px-5"
      >
        <span className="gradient-brand bg-clip-text text-xs font-semibold leading-tight text-transparent md:text-sm">
          wyszukaj
          <br />
          swój bilet
        </span>
        <Ticket
          className="size-4 shrink-0 -rotate-12 md:size-5"
          strokeWidth={2}
          style={{ stroke: "url(#brand-gradient)" }}
        />
      </Link>
    </div>
  );
}
