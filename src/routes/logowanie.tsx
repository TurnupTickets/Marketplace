import { useLayoutEffect, useRef, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { z } from "zod";
import { PageShell } from "@/components/turnup/PageShell";
import { ApiError } from "@/lib/api/client";
import { login, register } from "@/lib/api/endpoints";
import { currentUserQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/logowanie")({
  head: () => ({
    meta: [
      { title: "Logowanie i rejestracja — turnup" },
      {
        name: "description",
        content: "Zaloguj się do turnup lub załóż konto, aby zarządzać swoimi biletami.",
      },
      { property: "og:title", content: "Logowanie i rejestracja — turnup" },
      {
        property: "og:description",
        content: "Konto turnup: bilety, zamówienia i nadchodzące wydarzenia.",
      },
    ],
  }),
  // Mirror of /profil's own guard: an already-authenticated visitor hitting
  // /logowanie (direct link, bookmark, back-button) should bounce to their
  // profile instead of seeing the login form again.
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery());
    if (user) throw redirect({ to: "/profil" });
  },
  component: AuthPage,
});

type Mode = "login" | "register";

const emailSchema = z.string().trim().email({ message: "Podaj poprawny adres e-mail" }).max(255);
const passwordSchema = z.string().min(8, { message: "Hasło musi mieć min. 8 znaków" }).max(72);
const nameSchema = z.string().trim().min(2, { message: "Podaj imię i nazwisko" }).max(100);

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>();

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContentHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <PageShell>
      <div className="mx-auto grid max-w-5xl items-start gap-8 py-10 lg:grid-cols-[1fr_420px]">
        <div className="hidden flex-col justify-between rounded-3xl border border-border bg-card p-10 lg:flex">
          <div>
            <p className="section-chip">Twoje konto</p>
            <h1 className="mt-6 font-display text-4xl font-bold uppercase leading-tight">
              Wszystkie bilety
              <br />w jednym miejscu
            </h1>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Zaloguj się, aby zobaczyć nadchodzące wydarzenia, pobrać bilety i zarządzać
              zamówieniami.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {[
              "Bilety zawsze pod ręką",
              "Szybszy checkout",
              "Powiadomienia o starcie sprzedaży",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <Check className="size-4 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="mb-6 flex rounded-full bg-secondary p-1 text-xs font-bold uppercase">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full px-3 py-2 transition-colors ${
                  mode === m ? "gradient-brand text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "Logowanie" : "Rejestracja"}
              </button>
            ))}
          </div>

          <div
            className="overflow-hidden transition-[height] duration-300 ease-in-out"
            style={{ height: contentHeight }}
          >
            <div ref={contentRef}>
              {mode === "login" && <LoginForm />}
              {mode === "register" && <RegisterForm />}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}

function Submit({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="gradient-brand flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50"
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="text-xs font-semibold text-destructive">{error}</p>;
}

/** `401 { error: { code: "invalid_credentials" } }` — the one documented login failure shape. */
function isInvalidCredentials(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 401) return false;
  const payload = err.payload as { error?: { code?: string } } | null;
  return payload?.error?.code === "invalid_credentials";
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({ email: emailSchema, password: passwordSchema })
      .safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Błąd danych");
    setError(null);
    setLoading(true);
    try {
      await login(parsed.data);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await navigate({ to: "/profil" });
    } catch (err) {
      setError(
        isInvalidCredentials(err)
          ? "Nieprawidłowy e-mail lub hasło."
          : "Nie udało się zalogować. Spróbuj ponownie.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Field
        label="Hasło"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <ErrorText error={error} />
      <Submit loading={loading}>Zaloguj się</Submit>
    </form>
  );
}

function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({ name: nameSchema, email: emailSchema, password: passwordSchema })
      .safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Błąd danych");
    setError(null);
    setLoading(true);
    // Backend wants first_name/last_name, not a single "name" field — split
    // on the first space; a one-word name lands entirely in first_name.
    const [first_name, ...rest] = parsed.data.name.trim().split(/\s+/);
    const last_name = rest.join(" ") || null;
    try {
      await register({
        email: parsed.data.email,
        password: parsed.data.password,
        first_name: first_name ?? null,
        last_name,
      });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await navigate({ to: "/profil" });
    } catch {
      setError("Nie udało się utworzyć konta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Imię i nazwisko"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <Field
        label="E-mail"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />
      <Field
        label="Hasło"
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
      />
      <ErrorText error={error} />
      <Submit loading={loading}>Załóż konto</Submit>
      <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
        Rejestrując się akceptujesz{" "}
        <Link
          to="/strona/$slug"
          params={{ slug: "regulamin" }}
          className="text-primary hover:underline"
        >
          regulamin
        </Link>{" "}
        oraz{" "}
        <Link
          to="/strona/$slug"
          params={{ slug: "polityka-prywatnosci" }}
          className="text-primary hover:underline"
        >
          politykę prywatności
        </Link>
        .
      </p>
    </form>
  );
}
