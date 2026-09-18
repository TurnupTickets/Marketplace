import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, LogOut, Settings, Ticket as TicketIcon, User } from "lucide-react";
import { PageShell } from "@/components/turnup/PageShell";
import { accountOrdersQuery, accountTicketsQuery, currentUserQuery } from "@/lib/api/queries";
import { logout } from "@/lib/api/endpoints";
import { TICKET_STATUS, type PaymentStatus, type TicketStatus } from "@/lib/api/types";

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
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery());
    if (!user) throw redirect({ to: "/logowanie" });
  },
  component: ProfilePage,
});

/** `App\Enums\Statuses\PaymentStatus`: -1 CANCELLED, 0 PENDING, 1 PAID_MANUAL, 2 PAID. */
const ORDER_STATUS_LABEL: Record<PaymentStatus, string> = {
  [-1]: "Anulowane",
  0: "Oczekuje na płatność",
  1: "Opłacone",
  2: "Opłacone",
};

const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  [TICKET_STATUS.CANCELLED]: "Anulowany",
  [TICKET_STATUS.ACTIVE]: "Ważny",
  [TICKET_STATUS.DRAFT]: "Wersja robocza",
  [TICKET_STATUS.RESERVED]: "Zarezerwowany",
  [TICKET_STATUS.USED]: "Wykorzystany",
};

function ProfilePage() {
  const { data: user } = useSuspenseQuery(currentUserQuery());
  const { data: orders } = useSuspenseQuery(accountOrdersQuery());
  const { data: tickets } = useSuspenseQuery(accountTicketsQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // The loader already redirects when signed out; this only guards the
  // brief window before that loader has run on a client-side navigation.
  if (!user) return null;

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;

  async function handleLogout() {
    await logout();
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    await navigate({ to: "/logowanie" });
  }

  return (
    <PageShell>
      <div className="grid min-w-0 gap-6 py-8 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit min-w-0 space-y-5 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-28">
          <div className="flex min-w-0 items-center gap-4">
            <div className="gradient-brand flex size-14 items-center justify-center rounded-full">
              <User className="size-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <nav className="space-y-1 text-sm">
            {[
              { icon: <TicketIcon className="size-4" />, label: "Moje bilety", anchor: "bilety" },
              {
                icon: <CalendarDays className="size-4" />,
                label: "Zamówienia",
                anchor: "zamowienia",
              },
              // No settings form yet (profile edit / password change) — inert until that lands.
              { icon: <Settings className="size-4" />, label: "Ustawienia konta", anchor: null },
            ].map((item) => (
              <button
                key={item.label}
                disabled={!item.anchor}
                onClick={
                  item.anchor
                    ? () =>
                        document
                          .getElementById(item.anchor as string)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    : undefined
                }
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-xs font-bold uppercase text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-4" /> Wyloguj się
          </button>
        </aside>

        <div className="min-w-0 space-y-8">
          <section id="zamowienia" className="scroll-mt-28 space-y-4">
            <h1 className="font-display text-2xl font-bold uppercase md:text-3xl">Zamówienia</h1>
            {orders.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nie masz jeszcze żadnych zamówień.</p>
            ) : (
              <ul className="divide-y divide-border rounded-3xl border border-border bg-card px-6">
                {orders.data.map((order) => (
                  <li key={order.id} className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold uppercase">
                        {order.event_name ?? "Wydarzenie"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.payment_code ?? `#${order.id}`} · {order.total.toFixed(2)}{" "}
                        {order.currency ?? ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[0.6rem] font-bold uppercase ${
                        order.status === 2 || order.status === 1
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="bilety" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-xl font-bold uppercase">Moje bilety</h2>
            {tickets.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nie masz jeszcze żadnych biletów.</p>
            ) : (
              <ul className="divide-y divide-border rounded-3xl border border-border bg-card px-6">
                {tickets.data.map((ticket) => (
                  <li key={ticket.id} className="flex items-center gap-4 py-4">
                    <img
                      src={`data:image/png;base64,${ticket.qr_code}`}
                      alt="Kod QR biletu"
                      width={48}
                      height={48}
                      loading="lazy"
                      className="size-12 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold uppercase">
                        {ticket.event.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ticket.ticket_group.name} · {ticket.price} {ticket.currency ?? ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[0.6rem] font-bold uppercase ${
                        ticket.status === TICKET_STATUS.ACTIVE
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {TICKET_STATUS_LABEL[ticket.status as TicketStatus] ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid min-w-0 gap-4 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2">
            <Detail label="Imię i nazwisko" value={displayName} />
            <Detail label="E-mail" value={user.email} />
            <Detail label="Telefon" value={user.phone ?? "—"} />
            <Detail label="Miasto" value={user.city ?? "—"} />
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
