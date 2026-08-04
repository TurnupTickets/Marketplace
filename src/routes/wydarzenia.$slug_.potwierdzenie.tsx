import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Check } from "lucide-react";
import { z } from "zod";
import { PageShell } from "@/components/turnup/PageShell";

const searchSchema = z.object({
  order: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/wydarzenia/$slug_/potwierdzenie")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ order: search.order }),
  loader: ({ params, deps }) => {
    if (!deps.order) {
      throw redirect({ to: "/wydarzenia/$slug", params: { slug: params.slug } });
    }
  },
  head: () => ({
    meta: [{ title: "Dziękujemy za zamówienie — turnup" }, { name: "robots", content: "noindex" }],
  }),
  component: Confirmation,
});

function Confirmation() {
  const { slug } = Route.useParams();
  const { order } = Route.useSearch();

  return (
    <PageShell>
      <div className="mx-auto max-w-lg space-y-6 py-16 text-center">
        <div className="gradient-brand mx-auto flex size-16 items-center justify-center rounded-full">
          <Check className="size-8 text-primary-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold uppercase md:text-3xl">
          Dziękujemy za zamówienie
        </h1>
        <p className="text-sm text-muted-foreground">
          Numer zamówienia: <span className="font-semibold text-foreground">{order}</span>
        </p>
        <Link
          to="/wydarzenia/$slug"
          params={{ slug }}
          className="inline-block text-xs font-bold uppercase tracking-wide text-primary hover:underline"
        >
          Wróć do wydarzenia
        </Link>
      </div>
    </PageShell>
  );
}
