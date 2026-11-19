import { describe, expect, it } from "vitest";
import {
  interpolate,
  parseStoredTranslations,
  STOREFRONT_GROUP,
  TranslationStore,
} from "./i18n-store";

// Shape of TurnupCms `GET /api/v1/translations`: values decoded, group names
// and keys still HTML-entity-encoded.
const EN = {
  "Strona - Zam&oacute;w": { "Do zapłaty": "To pay", "Zam&oacute;wienie": "Order" },
  [STOREFRONT_GROUP]: { "Zaloguj się": "Log in" },
  Panel: { "Zaloguj się": "Sign in (admin)", Anuluj: "Cancel" },
  Pozostałe: { "Wybrano %s z %s": "Selected %s of %s", Puste: "" },
};

function storeWith(locale = "en_en", bundle: Record<string, Record<string, string>> = EN) {
  const store = new TranslationStore();
  store.set(locale, bundle, 1_000);
  return store;
}

describe("TranslationStore.translate", () => {
  it("translates by key in the requested language", () => {
    expect(storeWith().translate("Anuluj", "en_en")).toBe("Cancel");
  });

  it("falls back to the key (Polish source) when missing", () => {
    const store = storeWith();
    expect(store.translate("Nieznany tekst", "en_en")).toBe("Nieznany tekst");
    expect(store.translate("Anuluj", "ua_ua")).toBe("Anuluj");
    expect(store.translate("Anuluj", null)).toBe("Anuluj");
  });

  it("treats an empty translation as missing", () => {
    expect(storeWith().translate("Puste", "en_en")).toBe("Puste");
  });

  it("prefers the storefront group over other groups", () => {
    expect(storeWith().translate("Zaloguj się", "en_en")).toBe("Log in");
  });

  it("prefers a real translation over the backend's default-language fill", () => {
    const store = storeWith("ua_ua", {
      Pozostałe: { "Zaloguj się": "Zaloguj się", Zatwierdź: "Zatwierdź" },
      "Strona - U&zdot;ytkownicy": { "Zaloguj się": "Увійти" },
      Moduły: { Zatwierdź: "Підтвердити" },
    });
    expect(store.translate("Zaloguj się", "ua_ua")).toBe("Увійти");
    expect(store.translate("Zatwierdź", "ua_ua")).toBe("Підтвердити");
  });

  it("prefers a Strona - group between two real translations", () => {
    const store = storeWith("en_en", {
      Panel: { Anuluj: "Abort" },
      "Strona - Wydarzenia": { Anuluj: "Cancel" },
    });
    expect(store.translate("Anuluj", "en_en")).toBe("Cancel");
  });

  it("restricts lookup to an explicit group", () => {
    const store = storeWith();
    expect(store.translate("Zaloguj się", "en_en", { group: "Panel" })).toBe("Sign in (admin)");
    expect(store.translate("Anuluj", "en_en", { group: STOREFRONT_GROUP })).toBe("Anuluj");
  });

  it("decodes entity-encoded group names and keys", () => {
    const store = storeWith();
    expect(store.translate("Zamówienie", "en_en")).toBe("Order");
    expect(store.translate("Do zapłaty", "en_en", { group: "Strona - Zamów" })).toBe("To pay");
  });

  it("interpolates params into the translation and into the fallback", () => {
    const store = storeWith();
    expect(store.translate("Wybrano %s z %s", "en_en", { params: [2, 5] })).toBe("Selected 2 of 5");
    expect(store.translate("Rząd %s", "en_en", { params: ["B"] })).toBe("Rząd B");
  });

  it("keeps languages separate", () => {
    const store = storeWith();
    store.set("ua_ua", { [STOREFRONT_GROUP]: { "Zaloguj się": "Увійти" } });
    expect(store.translate("Zaloguj się", "ua_ua")).toBe("Увійти");
    expect(store.translate("Zaloguj się", "en_en")).toBe("Log in");
  });
});

describe("TranslationStore freshness", () => {
  it("is fresh within the TTL and stale after it", () => {
    const store = storeWith();
    expect(store.isFresh("en_en", 500, 1_400)).toBe(true);
    expect(store.isFresh("en_en", 500, 1_500)).toBe(false);
    expect(store.isFresh("ua_ua", 500, 1_000)).toBe(false);
  });

  it("returns the raw bundle for persistence", () => {
    expect(storeWith().get("en_en")).toEqual({ locale: "en_en", savedAt: 1_000, translations: EN });
    expect(storeWith().get("ua_ua")).toBeNull();
  });
});

describe("interpolate", () => {
  it("supports %s, %d, positional %1$s and literal %%", () => {
    expect(interpolate("%s i %d", ["a", 3])).toBe("a i 3");
    expect(interpolate("%2$s, %1$s", ["a", "b"])).toBe("b, a");
    expect(interpolate("100%% %s", ["ok"])).toBe("100% ok");
  });

  it("leaves placeholders without a param untouched", () => {
    expect(interpolate("%s i %s", ["a"])).toBe("a i %s");
    expect(interpolate("bez %s", [])).toBe("bez %s");
  });
});

describe("parseStoredTranslations", () => {
  it("round-trips the stored shape", () => {
    const raw = JSON.stringify({ en_en: { locale: "en_en", savedAt: 5, translations: EN } });
    expect(parseStoredTranslations(raw)).toEqual({
      en_en: { locale: "en_en", savedAt: 5, translations: EN },
    });
  });

  it("drops corrupt input and malformed entries", () => {
    expect(parseStoredTranslations(null)).toEqual({});
    expect(parseStoredTranslations("{not json")).toEqual({});
    expect(
      parseStoredTranslations(JSON.stringify({ en_en: { savedAt: "x" }, ua_ua: null })),
    ).toEqual({});
  });
});
