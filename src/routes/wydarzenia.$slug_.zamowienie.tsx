import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
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
import { eventDetailQuery, cartTotalQuery } from "@/lib/api/queries";
import { createOrder } from "@/lib/api/endpoints";
import { getFieldErrors } from "@/lib/api/client";
import { dialCodes } from "@/lib/dial-codes";
import type { CreateOrderInput, ShippingAddress } from "@/lib/api/types";

const cartSearchSchema = z.object({
  items: fallback(z.array(z.object({ group_id: z.number(), qty: z.number() })), []).default([]),
  addon_ids: fallback(z.array(z.number()), []).default([]),
  discount_code: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/wydarzenia/$slug_/zamowienie")({
  validateSearch: zodValidator(cartSearchSchema),
  loaderDeps: ({ search }) => ({
    items: search.items,
    addon_ids: search.addon_ids,
    discount_code: search.discount_code,
  }),
  loader: async ({ context, params, deps }) => {
    await context.queryClient.ensureQueryData(eventDetailQuery(params.slug));
    if (deps.items.length === 0) {
      throw redirect({ to: "/wydarzenia/$slug", params: { slug: params.slug } });
    }
  },
  head: () => ({
    meta: [{ title: "Zamówienie — turnup" }, { name: "robots", content: "noindex" }],
  }),
  component: OrderForm,
});

const buyerSchema = z.object({
  first_name: z.string().trim().min(2, { message: "Podaj imię" }).max(100),
  last_name: z.string().trim().min(2, { message: "Podaj nazwisko" }).max(100),
  email: z.string().trim().email({ message: "Podaj poprawny adres e-mail" }).max(255),
  phone_number: z
    .string()
    .trim()
    .regex(/^[0-9]{6,12}$/, { message: "Podaj poprawny numer telefonu" }),
  notes: z.string().max(1000).optional(),
});

const addressSchema = z.object({
  city: z.string().trim().min(1, { message: "Podaj miasto" }).max(100),
  postal_code: z.string().trim().min(1, { message: "Podaj kod pocztowy" }).max(20),
  street: z.string().trim().min(1, { message: "Podaj ulicę" }).max(150),
  house_number: z.string().trim().min(1, { message: "Podaj numer domu" }).max(20),
});

function OrderForm() {
  const { slug } = Route.useParams();
  const { items, addon_ids: addonIds, discount_code: discountCode } = Route.useSearch();
  const navigate = useNavigate();
  const { data: event } = useSuspenseQuery(eventDetailQuery(slug));

  const { data: cart } = useQuery({
    ...cartTotalQuery({
      event_id: event.id,
      items,
      addon_ids: addonIds,
      discount_code: discountCode || null,
    }),
  });

  const needsShippingAddress = event.addons
    .filter((a) => addonIds.includes(a.id))
    .some((a) => a.requires_shipping_address);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(dialCodes[0]!.code);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
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
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (result) => {
      navigate({
        to: "/wydarzenia/$slug/potwierdzenie",
        params: { slug },
        search: { order: result.order_number },
      });
    },
    onError: (err) => {
      const serverFieldErrors = getFieldErrors(err);
      if (serverFieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...serverFieldErrors }));
        setFormError(null);
      } else {
        setFormError("Nie udało się złożyć zamówienia. Spróbuj ponownie.");
      }
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
      phone_number: phoneNumber,
      notes: notes || undefined,
    });
    if (!buyerParsed.success) {
      for (const issue of buyerParsed.error.issues) {
        const key = String(issue.path[0]);
        if (!(key in nextFieldErrors)) nextFieldErrors[key] = issue.message;
      }
    }

    if (!consentTerms) nextFieldErrors["consent_terms"] = "Zgoda wymagana, aby kontynuować.";
    if (!consentPrivacy) nextFieldErrors["consent_privacy"] = "Zgoda wymagana, aby kontynuować.";

    let shippingAddress: ShippingAddress | null = null;
    if (needsShippingAddress) {
      const addressParsed = addressSchema.safeParse({
        city,
        postal_code: postalCode,
        street,
        house_number: houseNumber,
      });
      if (!addressParsed.success) {
        for (const issue of addressParsed.error.issues) {
          const key = String(issue.path[0]);
          if (!(key in nextFieldErrors)) nextFieldErrors[key] = issue.message;
        }
      } else {
        shippingAddress = addressParsed.data;
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    if (!buyerParsed.success) return;

    setFieldErrors({});
    mutation.mutate({
      event_id: event.id,
      items,
      addon_ids: addonIds,
      discount_code: discountCode || null,
      buyer: {
        ...buyerParsed.data,
        notes: buyerParsed.data.notes ?? null,
        phone_country_code: phoneCountryCode,
      },
      shipping_address: shippingAddress,
      consents: { terms: consentTerms, privacy: consentPrivacy },
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
              {event.title} · {event.city}
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
              <DialCodeSelect value={phoneCountryCode} onChange={setPhoneCountryCode} />
              <Field
                label="Numer telefonu"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  clearFieldError("phone_number");
                }}
                error={fieldErrors["phone_number"]}
                required
              />
            </div>

            <label className="block space-y-1.5">
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Uwagi do zakupu
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
                    value={postalCode}
                    onChange={(e) => {
                      setPostalCode(e.target.value);
                      clearFieldError("postal_code");
                    }}
                    error={fieldErrors["postal_code"]}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <Field
                    label="Ulica"
                    value={street}
                    onChange={(e) => {
                      setStreet(e.target.value);
                      clearFieldError("street");
                    }}
                    error={fieldErrors["street"]}
                    required
                  />
                  <Field
                    label="Nr domu"
                    value={houseNumber}
                    onChange={(e) => {
                      setHouseNumber(e.target.value);
                      clearFieldError("house_number");
                    }}
                    error={fieldErrors["house_number"]}
                    required
                  />
                </div>
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
              disabled={mutation.isPending}
              className="gradient-brand flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Przejdź do płatności
            </button>
          </form>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-bold uppercase">Podsumowanie</h2>
          <ul className="space-y-2 divide-y divide-border text-sm">
            {items.map((item) => {
              const group = event.ticket_groups.find((g) => g.id === item.group_id);
              if (!group) return null;
              return (
                <li key={item.group_id} className="flex items-center justify-between py-2">
                  <span>
                    {group.name} × {item.qty}
                  </span>
                  <span className="font-semibold">{(group.price * item.qty).toFixed(2)} PLN</span>
                </li>
              );
            })}
            {event.addons
              .filter((a) => addonIds.includes(a.id))
              .map((addon) => (
                <li key={addon.id} className="flex items-center justify-between py-2">
                  <span>{addon.label}</span>
                  <span className="font-semibold">+{addon.price.toFixed(2)} PLN</span>
                </li>
              ))}
          </ul>
          {discountCode && cart?.discount_valid && (
            <p className="text-xs font-semibold text-primary">
              Zastosowano rabat — kod {discountCode}
            </p>
          )}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Razem</span>
            <span className="font-display text-xl font-bold">
              {(cart?.total ?? 0).toFixed(2)} PLN
            </span>
          </div>
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
