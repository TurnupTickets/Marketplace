import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { z } from "zod";
import { PageShell } from "@/components/turnup/PageShell";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { eventDetailQuery } from "@/lib/api/queries";
import { createOrder, quoteCart } from "@/lib/api/endpoints";
import { getDomainErrorMessage, getFieldErrors } from "@/lib/api/client";
import { dialCodes } from "@/lib/dial-codes";
import type { CreateOrderRequest, SeatSelection, TicketSelection } from "@/lib/api/types";

const cartSearchSchema = z.object({
  tickets: fallback(z.record(z.string(), z.number()), {}).default({}),
  seats: fallback(z.record(z.string(), z.array(z.number())), {}).default({}),
  discount: fallback(z.string(), "").default(""),
  sms: fallback(z.union([z.literal(0), z.literal(1)]), 0).default(0),
  delivery: fallback(z.union([z.literal(0), z.literal(1)]), 0).default(0),
  ticket_as_gift: fallback(z.union([z.literal(0), z.literal(1)]), 0).default(0),
});

export const Route = createFileRoute("/wydarzenia/$tagSlug/$eventSlug_/zamowienie")({
  validateSearch: zodValidator(cartSearchSchema),
  loaderDeps: ({ search }) => ({ tickets: search.tickets }),
  loader: async ({ context, params, deps }) => {
    await context.queryClient.ensureQueryData(eventDetailQuery(params.tagSlug, params.eventSlug));
    if (Object.keys(deps.tickets).length === 0) {
      throw redirect({
        to: "/wydarzenia/$tagSlug/$eventSlug",
        params: { tagSlug: params.tagSlug, eventSlug: params.eventSlug },
      });
    }
  },
  head: () => ({
    meta: [{ title: "Zamówienie — turnup" }, { name: "robots", content: "noindex" }],
  }),
  component: OrderForm,
});

const buyerSchema = z.object({
  first_name: z.string().trim().min(2, { message: "Podaj imię" }).max(255),
  last_name: z.string().trim().min(2, { message: "Podaj nazwisko" }).max(255),
  email: z.string().trim().email({ message: "Podaj poprawny adres e-mail" }).max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9\s\-()]{6,20}$/, { message: "Podaj poprawny numer telefonu" }),
  comments: z.string().max(1000).optional(),
});

const addressSchema = z.object({
  city: z.string().trim().min(1, { message: "Podaj miasto" }).max(100),
  city_code: z.string().trim().min(1, { message: "Podaj kod pocztowy" }).max(10),
  street_number: z.string().trim().min(1, { message: "Podaj ulicę i numer domu" }).max(20),
});

function OrderForm() {
  const { tagSlug, eventSlug } = Route.useParams();
  const search = Route.useSearch();
  const { data: event } = useSuspenseQuery(eventDetailQuery(tagSlug, eventSlug));

  const tickets = search.tickets as TicketSelection;
  const seats = search.seats as SeatSelection;

  // The selection is fixed once this page loads (set on the event detail
  // page) — a plain query is enough, no debounced re-pricing needed here.
  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ["quote", event.id, search],
    queryFn: () =>
      quoteCart(event.id, {
        tickets,
        seats,
        discount: search.discount || null,
        sms: search.sms,
        delivery: search.delivery,
        ticket_as_gift: search.ticket_as_gift,
      }),
  });

  // Real `CreateOrderRequest` has no dedicated shipping-address block —
  // `delivery: 1` (collector's-ticket shipping) is the only signal that
  // city/city_code/street_number are needed.
  const needsShippingAddress = search.delivery === 1;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState(dialCodes[0]!.code);
  const [phone, setPhone] = useState("");
  const [comments, setComments] = useState("");
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [city, setCity] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const clearFieldError = (key: string) =>
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const mutation = useMutation({
    mutationFn: (input: CreateOrderRequest) => createOrder(event.id, input),
    onSuccess: (result) => {
      // The guide is explicit: `payment_url` is where the buyer goes next —
      // not an internal confirmation route. The confirmation page is
      // reached from the gateway's own return URL instead (Phase 6.2).
      window.location.href = result.payment_url;
    },
    onError: (err) => {
      const serverFieldErrors = getFieldErrors(err);
      if (serverFieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...serverFieldErrors }));
        setFormError(null);
        return;
      }
      // OrderException-shaped errors (409 PURCHASE_IN_PROGRESS/
      // ORDER_ALREADY_PAID, 422 INSUFFICIENT_TICKETS/TICKETS_SOLD_OUT/...)
      // carry a buyer-facing Polish message from the backend — show it
      // instead of one generic string for every failure mode.
      setFormError(
        getDomainErrorMessage(err) ?? "Nie udało się złożyć zamówienia. Spróbuj ponownie.",
      );
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const nextFieldErrors: Record<string, string> = {};

    const buyerParsed = buyerSchema.safeParse({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      comments: comments || undefined,
    });
    if (!buyerParsed.success) {
      for (const issue of buyerParsed.error.issues) {
        const key = String(issue.path[0]);
        if (!(key in nextFieldErrors)) nextFieldErrors[key] = issue.message;
      }
    }

    if (!consentTerms) nextFieldErrors["consent_terms"] = "Zgoda wymagana, aby kontynuować.";
    if (!consentPrivacy) nextFieldErrors["consent_privacy"] = "Zgoda wymagana, aby kontynuować.";

    let address: { city: string; city_code: string; street_number: string } | null = null;
    if (needsShippingAddress) {
      const addressParsed = addressSchema.safeParse({
        city,
        city_code: cityCode,
        street_number: streetNumber,
      });
      if (!addressParsed.success) {
        for (const issue of addressParsed.error.issues) {
          const key = String(issue.path[0]);
          if (!(key in nextFieldErrors)) nextFieldErrors[key] = issue.message;
        }
      } else {
        address = addressParsed.data;
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    if (!buyerParsed.success) return;

    setFieldErrors({});
    mutation.mutate({
      tickets,
      seats,
      discount: search.discount || null,
      sms: search.sms,
      delivery: search.delivery,
      ticket_as_gift: search.ticket_as_gift,
      // Backend has one `rodo` consent field — the UI shows separate
      // terms/privacy links (Polish e-commerce convention) but both must
      // be checked before this single combined consent is sent.
      rodo: true,
      first_name: buyerParsed.data.first_name,
      last_name: buyerParsed.data.last_name,
      email: buyerParsed.data.email,
      phone: buyerParsed.data.phone,
      dial_code: dialCode,
      comments: buyerParsed.data.comments ?? null,
      city: address?.city ?? null,
      city_code: address?.city_code ?? null,
      street_number: address?.street_number ?? null,
    });
  }

  return (
    <PageShell>
      <div className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-10">
        <div className="space-y-6">
          <div>
            <p className="section-chip">Zamówienie</p>
            <h1 className="mt-4 font-display text-2xl font-bold uppercase leading-tight md:text-4xl">
              Dane do zamówienia
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {event.name} · {event.city}
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="space-y-4 rounded-3xl border border-border bg-card p-6 md:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Imię"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearFieldError("first_name");
                }}
                error={fieldErrors["first_name"]}
                required
              />
              <Field
                label="Nazwisko"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearFieldError("last_name");
                }}
                error={fieldErrors["last_name"]}
                required
              />
            </div>

            <Field
              label="Adres e-mail"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              error={fieldErrors["email"]}
              required
            />

            <div className="grid grid-cols-[160px_1fr] gap-3">
              <DialCodeSelect value={dialCode} onChange={setDialCode} />
              <Field
                label="Numer telefonu"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError("phone");
                }}
                error={fieldErrors["phone"]}
                required
              />
            </div>

            <label className="block space-y-1.5">
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Uwagi do zakupu
              </span>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
              />
            </label>

            {needsShippingAddress && (
              <div className="space-y-4 rounded-2xl bg-secondary p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Adres wysyłki biletu kolekcjonerskiego
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Miasto"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      clearFieldError("city");
                    }}
                    error={fieldErrors["city"]}
                    required
                  />
                  <Field
                    label="Kod pocztowy"
                    value={cityCode}
                    onChange={(e) => {
                      setCityCode(e.target.value);
                      clearFieldError("city_code");
                    }}
                    error={fieldErrors["city_code"]}
                    required
                  />
                </div>
                <Field
                  label="Ulica i numer domu"
                  value={streetNumber}
                  onChange={(e) => {
                    setStreetNumber(e.target.value);
                    clearFieldError("street_number");
                  }}
                  error={fieldErrors["street_number"]}
                  required
                />
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Consent
                checked={consentTerms}
                onChange={(v) => {
                  setConsentTerms(v);
                  clearFieldError("consent_terms");
                }}
                error={fieldErrors["consent_terms"]}
                label={
                  <>
                    Akceptuję{" "}
                    <Link
                      to="/strona/$slug"
                      params={{ slug: "regulamin" }}
                      className="text-primary hover:underline"
                    >
                      regulamin
                    </Link>{" "}
                    serwisu.
                  </>
                }
              />
              <Consent
                checked={consentPrivacy}
                onChange={(v) => {
                  setConsentPrivacy(v);
                  clearFieldError("consent_privacy");
                }}
                error={fieldErrors["consent_privacy"]}
                label={
                  <>
                    Wyrażam zgodę na przetwarzanie danych osobowych zgodnie z{" "}
                    <Link
                      to="/strona/$slug"
                      params={{ slug: "polityka-prywatnosci" }}
                      className="text-primary hover:underline"
                    >
                      polityką prywatności
                    </Link>
                    .
                  </>
                }
              />
            </div>

            {formError && <p className="text-xs font-semibold text-destructive">{formError}</p>}

            <button
              type="submit"
              disabled={mutation.isPending || quoteLoading}
              className="gradient-brand flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Przejdź do płatności
            </button>
          </form>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-bold uppercase">Podsumowanie</h2>
          {quoteLoading || !quote ? (
            <p className="text-sm text-muted-foreground">Liczenie…</p>
          ) : (
            <>
              <ul className="space-y-2 divide-y divide-border text-sm">
                {quote.ticket_groups.map((group) => (
                  <li
                    key={group.ticket_group_id}
                    className="flex items-center justify-between py-2"
                  >
                    <span>
                      {group.name} × {group.quantity}
                    </span>
                    <span className="font-semibold">{group.subtotal.toFixed(2)} PLN</span>
                  </li>
                ))}
                {quote.additional_costs.sms > 0 && (
                  <li className="flex items-center justify-between py-2">
                    <span>Bilet SMS</span>
                    <span className="font-semibold">
                      +{quote.additional_costs.sms.toFixed(2)} PLN
                    </span>
                  </li>
                )}
                {quote.additional_costs.delivery > 0 && (
                  <li className="flex items-center justify-between py-2">
                    <span>Bilet kolekcjonerski z wysyłką</span>
                    <span className="font-semibold">
                      +{quote.additional_costs.delivery.toFixed(2)} PLN
                    </span>
                  </li>
                )}
                {quote.additional_costs.gift > 0 && (
                  <li className="flex items-center justify-between py-2">
                    <span>Bilet prezentowy</span>
                    <span className="font-semibold">
                      +{quote.additional_costs.gift.toFixed(2)} PLN
                    </span>
                  </li>
                )}
              </ul>
              {quote.discount && (
                <p className="text-xs font-semibold text-primary">
                  Zastosowano rabat — {quote.discount.info}
                </p>
              )}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Razem
                </span>
                <span className="font-display text-xl font-bold">{quote.total.toFixed(2)} PLN</span>
              </div>
            </>
          )}
        </aside>
      </div>
    </PageShell>
  );
}

function DialCodeSelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = dialCodes.find((d) => d.code === value);

  return (
    <div className="space-y-1.5">
      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
        Kierunkowy
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-background px-3 py-3 text-sm outline-none transition-colors focus:border-primary"
          >
            <span>{selected ? `${selected.code} ${selected.country}` : "Wybierz kraj"}</span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Szukaj kraju lub kodu…" />
            <CommandList>
              <CommandEmpty>Brak wyników.</CommandEmpty>
              <CommandGroup>
                {dialCodes.map((d) => (
                  <CommandItem
                    key={d.code}
                    value={`${d.code} ${d.country}`}
                    onSelect={() => {
                      onChange(d.code);
                      setOpen(false);
                    }}
                  >
                    <Check className={`size-4 ${d.code === value ? "opacity-100" : "opacity-0"}`} />
                    {d.code} {d.country}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Field({
  label,
  error,
  ...props
}: { label: string; error?: string | undefined } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        {...props}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary ${
          error ? "border-destructive" : "border-border"
        }`}
      />
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
    </label>
  );
}

function Consent({
  checked,
  onChange,
  label,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  error?: string | undefined;
}) {
  return (
    <div className="space-y-1">
      <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          className={`mt-0.5 size-4 shrink-0 rounded accent-primary ${
            error ? "border-destructive" : "border-border"
          }`}
        />
        <span>{label}</span>
      </label>
      {error && <p className="pl-7 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
