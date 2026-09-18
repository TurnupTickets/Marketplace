import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, LogOut, Settings, Ticket as TicketIcon, User } from "lucide-react";
import { PageShell } from "@/components/turnup/PageShell";
import { accountOrdersQuery, accountTicketsQuery, currentUserQuery } from "@/lib/api/queries";
import { changePassword, logout, updateProfile } from "@/lib/api/endpoints";
import { ApiError, getFieldErrors } from "@/lib/api/client";
import {
  TICKET_STATUS,
  type ChangePasswordRequest,
  type PaymentStatus,
  type TicketStatus,
  type UpdateProfileRequest,
  type UserResource,
} from "@/lib/api/types";

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
              {
                icon: <Settings className="size-4" />,
                label: "Ustawienia konta",
                anchor: "ustawienia",
              },
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

          <section id="ustawienia" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-xl font-bold uppercase">Ustawienia konta</h2>
            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
              <ProfileEditForm user={user} queryClient={queryClient} />
              <PasswordChangeForm />
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

type ProfileFields = {
  first_name: string;
  last_name: string;
  phone: string;
};

function ProfileEditForm({
  user,
  queryClient,
}: {
  user: UserResource;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [fields, setFields] = useState<ProfileFields>({
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    phone: user.phone ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: UpdateProfileRequest) => updateProfile(input),
    onSuccess: async () => {
      setFieldErrors({});
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err) => {
      setSaved(false);
      const serverFieldErrors = getFieldErrors(err);
      setFieldErrors(serverFieldErrors ?? {});
    },
  });

  function update(key: keyof ProfileFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      first_name: fields.first_name || null,
      last_name: fields.last_name || null,
      phone: fields.phone || null,
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="min-w-0 space-y-4 rounded-3xl border border-border bg-card p-6"
    >
      <p className="font-display text-sm font-bold uppercase">Dane konta</p>
      <SettingsField
        label="Imię"
        value={fields.first_name}
        onChange={(v) => update("first_name", v)}
        error={fieldErrors["first_name"]}
      />
      <SettingsField
        label="Nazwisko"
        value={fields.last_name}
        onChange={(v) => update("last_name", v)}
        error={fieldErrors["last_name"]}
      />
      <SettingsField
        label="Telefon"
        value={fields.phone}
        onChange={(v) => update("phone", v)}
        error={fieldErrors["phone"]}
      />
      <label className="block min-w-0 space-y-1.5">
        <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          E-mail
        </span>
        <input
          type="email"
          value={user.email}
          disabled
          className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-muted-foreground outline-none disabled:cursor-not-allowed"
        />
        <span className="block text-xs text-muted-foreground">
          Zmiana adresu e-mail jest obecnie niedostępna — wymaga procesu potwierdzenia, którego
          backend jeszcze nie udostępnia.
        </span>
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Zapisywanie…" : "Zapisz zmiany"}
        </button>
        {saved && <span className="text-xs font-semibold text-primary">Zapisano</span>}
      </div>
    </form>
  );
}

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: ChangePasswordRequest) => changePassword(input),
    onSuccess: () => {
      setFieldErrors({});
      setFormError(null);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (err) => {
      setSuccess(false);
      // `current_password`-wrong is a 422 but not the standard
      // `{ message, errors }` shape — it's `{ error: { code } }` — so
      // `getFieldErrors` won't match it; check the code explicitly.
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        (err.payload as { error?: { code?: string } } | undefined)?.error?.code ===
          "INVALID_CURRENT_PASSWORD"
      ) {
        setFieldErrors({ current_password: "Nieprawidłowe obecne hasło." });
        setFormError(null);
        return;
      }
      const serverFieldErrors = getFieldErrors(err);
      if (serverFieldErrors) {
        setFieldErrors(serverFieldErrors);
        setFormError(null);
      } else {
        setFieldErrors({});
        setFormError("Nie udało się zmienić hasła. Spróbuj ponownie.");
      }
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    mutation.mutate({ current_password: currentPassword, password: newPassword });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="min-w-0 space-y-4 rounded-3xl border border-border bg-card p-6"
    >
      <p className="font-display text-sm font-bold uppercase">Zmiana hasła</p>
      <SettingsField
        label="Obecne hasło"
        type="password"
        value={currentPassword}
        onChange={(v) => {
          setCurrentPassword(v);
          setSuccess(false);
        }}
        error={fieldErrors["current_password"]}
      />
      <SettingsField
        label="Nowe hasło"
        type="password"
        value={newPassword}
        onChange={(v) => {
          setNewPassword(v);
          setSuccess(false);
        }}
        error={fieldErrors["password"]}
      />
      {formError && <p className="text-xs font-semibold text-destructive">{formError}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Zapisywanie…" : "Zmień hasło"}
        </button>
        {success && <span className="text-xs font-semibold text-primary">Hasło zmienione</span>}
      </div>
    </form>
  );
}

function SettingsField({
  label,
  value,
  onChange,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  type?: "text" | "password";
}) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      {error && <span className="block text-xs font-semibold text-destructive">{error}</span>}
    </label>
  );
}
