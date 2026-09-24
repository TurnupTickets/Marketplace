import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Check, Loader2 } from "lucide-react";
import { z } from "zod";
import { PageShell } from "@/components/turnup/PageShell";
import { ApiError } from "@/lib/api/client";
import { resetPassword } from "@/lib/api/endpoints";

const searchSchema = z.object({
  token: fallback(z.string(), "").default(""),
  email: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Ustaw nowe hasło — turnup" },
      { name: "description", content: "Ustaw nowe hasło do swojego konta turnup." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const passwordSchema = z.string().min(8, { message: "Hasło musi mieć min. 8 znaków" }).max(72);

function ResetPasswordPage() {
  const { token, email } = Route.useSearch();

  return (
    <PageShell
      eyebrow="Konto"
      title="Ustaw nowe hasło"
      lead="Link działa tylko raz i wygasa 60 minut po jego wysłaniu."
    >
      <div className="mx-auto max-w-md pb-10">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
          {!token || !email ? <InvalidLinkNotice /> : <ResetForm token={token} email={email} />}
        </div>
      </div>
    </PageShell>
  );
}

function InvalidLinkNotice() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        Ten link jest nieprawidłowy lub wygasł. Poproś o nową wiadomość z linkiem do resetu hasła.
      </p>
      <Link
        to="/logowanie"
        className="gradient-brand inline-flex rounded-full px-6 py-3 text-sm font-bold uppercase text-primary-foreground"
      >
        Wróć do logowania
      </Link>
    </div>
  );
}

function ResetForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Błąd danych");
    if (password !== confirm) return setError("Hasła nie są identyczne");
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ email, token, password: parsed.data });
      setDone(true);
    } catch (err) {
      // The API returns the same 422 { error: { code: "invalid_or_expired_token" } }
      // for every failure cause (wrong/expired token, unknown email) — one
      // fixed message, no attempt to distinguish which.
      if (err instanceof ApiError && err.status === 422) {
        setError("Ten link jest nieprawidłowy lub wygasł. Poproś o nowy.");
      } else {
        setError("Nie udało się ustawić nowego hasła. Spróbuj ponownie.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="gradient-brand mx-auto flex size-12 items-center justify-center rounded-full">
          <Check className="size-6 text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Hasło zostało zmienione. Możesz się teraz zalogować.
        </p>
        <Link
          to="/logowanie"
          className="gradient-brand inline-flex rounded-full px-6 py-3 text-sm font-bold uppercase text-primary-foreground"
        >
          Zaloguj się
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
          Nowe hasło
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
          Powtórz nowe hasło
        </span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
        />
      </label>
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="gradient-brand flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        Ustaw nowe hasło
      </button>
    </form>
  );
}
