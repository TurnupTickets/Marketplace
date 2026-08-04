import { useLayoutEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { PageShell } from "@/components/turnup/PageShell";
import { login, register, requestPasswordReset, resetPassword } from "@/lib/api/endpoints";

export const Route = createFileRoute("/logowanie")({
  head: () => ({
    meta: [
      { title: "Logowanie i rejestracja — turnup" },
      {
        name: "description",
        content: "Zaloguj się do turnup, załóż konto lub zresetuj hasło, aby zarządzać swoimi biletami.",
      },
      { property: "og:title", content: "Logowanie i rejestracja — turnup" },
      { property: "og:description", content: "Konto turnup: bilety, zamówienia i nadchodzące wydarzenia." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "register" | "reset";

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
              Zaloguj się, aby zobaczyć nadchodzące wydarzenia, pobrać bilety i zarządzać zamówieniami.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {["Bilety zawsze pod ręką", "Szybszy checkout", "Powiadomienia o starcie sprzedaży"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <Check className="size-4 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="mb-6 flex rounded-full bg-secondary p-1 text-xs font-bold uppercase">
            {(["login", "register", "reset"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full px-3 py-2 transition-colors ${
                  mode === m ? "gradient-brand text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "Logowanie" : m === "register" ? "Rejestracja" : "Reset"}
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
              {mode === "reset" && <ResetForm />}
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

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.object({ email: emailSchema, password: passwordSchema }).safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Błąd danych");
    setError(null);
    setLoading(true);
    try {
      await login(parsed.data);
      setDone(true);
    } catch {
      setError("Nie udało się zalogować. Sprawdź dane.");
    } finally {
      setLoading(false);
    }
  }

  if (done)
    return (
      <Success title="Zalogowano" text="Twoje konto jest gotowe.">
        <Link to="/profil" className="text-xs font-bold uppercase text-primary hover:underline">
          Przejdź do profilu
        </Link>
      </Success>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({ name: nameSchema, email: emailSchema, password: passwordSchema })
      .safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Błąd danych");
    setError(null);
    setLoading(true);
    try {
      await register(parsed.data);
      setDone(true);
    } catch {
      setError("Nie udało się utworzyć konta.");
    } finally {
      setLoading(false);
    }
  }

  if (done)
    return <Success title="Konto utworzone" text="Sprawdź skrzynkę e-mail i potwierdź rejestrację." />;

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
        <Link to="/strona/$slug" params={{ slug: "regulamin" }} className="text-primary hover:underline">
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

/** 2-krokowy reset hasła: 1) e-mail -> kod, 2) kod + nowe hasło. */
function ResetForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Błąd danych");
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(parsed.data);
      setStep(2);
    } catch {
      setError("Nie udało się wysłać kodu.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({ code: z.string().trim().min(4, { message: "Podaj kod z wiadomości" }).max(10), password: passwordSchema })
      .safeParse({ code, password });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Błąd danych");
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ email, ...parsed.data });
      setDone(true);
    } catch {
      setError("Kod jest nieprawidłowy lub wygasł.");
    } finally {
      setLoading(false);
    }
  }

  if (done) return <Success title="Hasło zmienione" text="Możesz zalogować się nowym hasłem." />;

  return (
    <div className="space-y-5">
      <Steps current={step} labels={["E-mail", "Nowe hasło"]} />

      {step === 1 ? (
        <form onSubmit={sendCode} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Podaj adres e-mail przypisany do konta — wyślemy kod weryfikacyjny.
          </p>
          <Field
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <ErrorText error={error} />
          <Submit loading={loading}>Wyślij kod</Submit>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-4">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="size-4 text-primary" /> Kod wysłaliśmy na {email}
          </p>
          <Field
            label="Kod weryfikacyjny"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <Field
            label="Nowe hasło"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <ErrorText error={error} />
          <Submit loading={loading}>Ustaw nowe hasło</Submit>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Zmień adres e-mail
          </button>
        </form>
      )}
    </div>
  );
}

export function Steps({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="flex items-center gap-3">
      {labels.map((label, i) => {
        const step = i + 1;
        const active = step <= current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active ? "gradient-brand text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {step}
            </span>
            <span
              className={`truncate text-[0.65rem] font-bold uppercase tracking-widest ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Success({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-secondary p-6 text-center">
      <div className="gradient-brand mx-auto flex size-12 items-center justify-center rounded-full">
        <Check className="size-6 text-primary-foreground" />
      </div>
      <p className="font-display text-lg font-bold uppercase">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}
