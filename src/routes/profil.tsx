import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, LogOut, Settings, Ticket as TicketIcon, User } from "lucide-react";
import { PageShell } from "@/components/turnup/PageShell";
import { myUpcomingQuery } from "@/lib/api/queries";
import { mockOrder, mockUser } from "@/lib/api/mock";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mój profil — bilety i zamówienia | turnup" },
      {
        name: "description",
        content:
          "Panel użytkownika turnup: nadchodzące wydarzenia, historia zamówień i dane konta.",
      },
      { property: "og:title", content: "Mój profil — turnup" },
      { property: "og:description", content: "Zarządzaj biletami, zamówieniami i danymi konta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: upcoming } = useSuspenseQuery(myUpcomingQuery());
  const user = mockUser;

  return (
    <PageShell>
      <div className="grid min-w-0 gap-6 py-8 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit min-w-0 space-y-5 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-28">
          <div className="flex min-w-0 items-center gap-4">
            <div className="gradient-brand flex size-14 items-center justify-center rounded-full">
              <User className="size-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <nav className="space-y-1 text-sm">
            {[
              { icon: <TicketIcon className="size-4" />, label: "Moje bilety" },
              { icon: <CalendarDays className="size-4" />, label: "Nadchodzące wydarzenia" },
              { icon: <Settings className="size-4" />, label: "Ustawienia konta" },
            ].map((item) => (
              <button
                key={item.label}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>

          <Link
            to="/logowanie"
            className="flex items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-xs font-bold uppercase text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-4" /> Wyloguj się
          </Link>
        </aside>

        <div className="min-w-0 space-y-8">
          <section className="space-y-4">
            <h1 className="font-display text-2xl font-bold uppercase md:text-3xl">
              Nadchodzące wydarzenia
            </h1>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {upcoming.map((event) => (
                <Link
                  key={event.id}
                  to="/wydarzenia/$slug"
                  params={{ slug: event.slug }}
                  className="group overflow-hidden rounded-3xl border border-border bg-card transition-colors hover:border-primary"
                >
                  <img
                    src={event.cover_url}
                    alt={event.title}
                    width={800}
                    height={600}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="space-y-1 p-4">
                    <p className="font-display text-sm font-bold uppercase">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.city} · {event.starts_at}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold uppercase">Moje bilety</h2>
            <ul className="divide-y divide-border rounded-3xl border border-border bg-card px-6">
              {mockOrder.tickets.map((ticket) => (
                <li key={ticket.id} className="flex items-center gap-4 py-4">
                  <img
                    src={ticket.event.cover_url}
                    alt=""
                    width={96}
                    height={96}
                    loading="lazy"
                    className="size-12 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold uppercase">
                      {ticket.event.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.group_name} · {ticket.code}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[0.6rem] font-bold uppercase ${
                      ticket.status === "valid"
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {ticket.status === "valid" ? "Ważny" : "Wykorzystany"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid min-w-0 gap-4 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2">
            <Detail label="Imię i nazwisko" value={user.name} />
            <Detail label="E-mail" value={user.email} />
            <Detail label="Numer zamówienia (ostatnie)" value={mockOrder.number} />
            <Detail label="Telefon" value={mockOrder.phone_hint ?? "—"} />
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary p-4">
      <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}
