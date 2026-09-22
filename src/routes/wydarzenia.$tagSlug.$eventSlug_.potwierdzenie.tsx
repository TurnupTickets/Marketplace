import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Check, Clock, XCircle } from "lucide-react";
import { z } from "zod";
import { PageShell } from "@/components/turnup/PageShell";
import { getOrderStatus } from "@/lib/api/endpoints";
import type { PaymentStatus } from "@/lib/api/types";

const searchSchema = z.object({
  code: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/wydarzenia/$tagSlug/$eventSlug_/potwierdzenie")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ code: search.code }),
  loader: ({ params, deps }) => {
    if (!deps.code) {
      throw redirect({
        to: "/wydarzenia/$tagSlug/$eventSlug",
        params: { tagSlug: params.tagSlug, eventSlug: params.eventSlug },
      });
    }
  },
  head: () => ({
    meta: [{ title: "Status zamówienia — turnup" }, { name: "robots", content: "noindex" }],
  }),
  component: Confirmation,
});

/** `App\Enums\Statuses\PaymentStatus`: -1 CANCELLED, 0 PENDING, 1 PAID_MANUAL, 2 PAID — no "refunded" case exists. */
const STATUS_COPY: Record<
  PaymentStatus,
  { icon: React.ReactNode; title: string; description: string }
> = {
  [-1]: {
    icon: <XCircle className="size-8 text-primary-foreground" />,
    title: "Zamówienie anulowane",
    description: "To zamówienie zostało anulowane. Skontaktuj się z nami, jeśli to pomyłka.",
  },
  0: {
    icon: <Clock className="size-8 text-primary-foreground" />,
    title: "Oczekujemy na płatność",
    description: "Sprawdzamy status Twojej płatności — ta strona odświeży się automatycznie.",
  },
  1: {
    icon: <Check className="size-8 text-primary-foreground" />,
    title: "Dziękujemy za zamówienie",
    description: "Płatność zaakceptowana ręcznie — bilety wysłaliśmy na podany adres e-mail.",
  },
  2: {
    icon: <Check className="size-8 text-primary-foreground" />,
    title: "Dziękujemy za zamówienie",
    description: "Płatność zaakceptowana — bilety wysłaliśmy na podany adres e-mail.",
  },
};

function Confirmation() {
  const { tagSlug, eventSlug } = Route.useParams();
  const { code } = Route.useSearch();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-status", code],
    queryFn: () => getOrderStatus(code),
    refetchInterval: (query) => (query.state.data?.status === 0 ? 3000 : false),
  });

  const copy = order ? STATUS_COPY[order.status] : null;

  return (
    <PageShell>
      <div className="mx-auto max-w-lg space-y-6 py-16 text-center">
        {isLoading || !copy ? (
          <p className="text-sm text-muted-foreground">Sprawdzamy status zamówienia…</p>
        ) : (
          <>
            <div className="gradient-brand mx-auto flex size-16 items-center justify-center rounded-full">
              {copy.icon}
            </div>
            <h1 className="font-display text-2xl font-bold uppercase md:text-3xl">{copy.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.description}</p>
            <p className="text-sm text-muted-foreground">
              Numer zamówienia: <span className="font-semibold text-foreground">{code}</span>
            </p>
          </>
        )}
        <Link
          to="/wydarzenia/$tagSlug/$eventSlug"
          params={{ tagSlug, eventSlug }}
          className="inline-block text-xs font-bold uppercase tracking-wide text-primary hover:underline"
        >
          Wróć do wydarzenia
        </Link>
      </div>
    </PageShell>
  );
}
