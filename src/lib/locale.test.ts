import { describe, expect, it, vi } from "vitest";
import type { LanguageResource } from "@/lib/api/types";
import {
  buildSwitchUrl,
  eventsSegmentFor,
  internalizeEventsPath,
  localizeEventsPath,
  parseEventUrl,
  resolveLocale,
  splitLocalePrefix,
  stripLanguageMarker,
  withLocalePrefix,
} from "./locale";

function lang(code: string, extra: Partial<LanguageResource> = {}): LanguageResource {
  return {
    code,
    lang_code: code.slice(0, 2),
    country_code: code.slice(3),
    domain: null,
    path_prefix: null,
    events_path_segment: "wydarzenia",
    name: code,
    flag: "",
    is_default: false,
    ...extra,
  };
}

// Same data as the local CMS today: no domains at all.
const noDomains = [lang("pl_pl", { is_default: true }), lang("en_en"), lang("ua_ua")];

// The production layout described in LanguageResource: .pl for Polish,
// .eu for English, .eu/ua_ua for Ukrainian.
const withDomains = [
  lang("pl_pl", { is_default: true, domain: "turnup-tickets.pl" }),
  lang("en_en", { domain: "turnup-tickets.eu" }),
  lang("ua_ua", { domain: "turnup-tickets.eu", path_prefix: "/ua_ua" }),
];

describe("splitLocalePrefix / withLocalePrefix", () => {
  it("splits a prefixed path", () => {
    expect(splitLocalePrefix("/en_en/wydarzenia/a/b")).toEqual({
      code: "en_en",
      rest: "/wydarzenia/a/b",
    });
  });

  it("treats a bare prefix as the root", () => {
    expect(splitLocalePrefix("/en_en")).toEqual({ code: "en_en", rest: "/" });
    expect(splitLocalePrefix("/en_en/")).toEqual({ code: "en_en", rest: "/" });
  });

  it("leaves unprefixed and look-alike paths alone", () => {
    expect(splitLocalePrefix("/wydarzenia")).toEqual({ code: null, rest: "/wydarzenia" });
    expect(splitLocalePrefix("/en_enx/a")).toEqual({ code: null, rest: "/en_enx/a" });
    expect(splitLocalePrefix("/EN_EN/a")).toEqual({ code: null, rest: "/EN_EN/a" });
    expect(splitLocalePrefix("")).toEqual({ code: null, rest: "/" });
  });

  it("round-trips", () => {
    expect(withLocalePrefix("/wydarzenia", "en_en")).toBe("/en_en/wydarzenia");
    expect(withLocalePrefix("/", "en_en")).toBe("/en_en");
    expect(withLocalePrefix("/wydarzenia", null)).toBe("/wydarzenia");
  });
});

describe("resolveLocale", () => {
  it("falls back to the default language without a prefix", () => {
    expect(
      resolveLocale({ hostname: "localhost", pathname: "/", languages: noDomains })?.code,
    ).toBe("pl_pl");
  });

  it("uses a known path prefix", () => {
    expect(
      resolveLocale({ hostname: "localhost", pathname: "/en_en/x", languages: noDomains })?.code,
    ).toBe("en_en");
  });

  it("ignores an unknown prefix", () => {
    expect(
      resolveLocale({ hostname: "localhost", pathname: "/de_de/x", languages: noDomains })?.code,
    ).toBe("pl_pl");
  });

  it("prefers a domain match, longest path_prefix first", () => {
    const eu = { hostname: "turnup-tickets.eu", languages: withDomains };
    expect(resolveLocale({ ...eu, pathname: "/wydarzenia" })?.code).toBe("en_en");
    expect(resolveLocale({ ...eu, pathname: "/ua_ua/wydarzenia" })?.code).toBe("ua_ua");
    expect(resolveLocale({ ...eu, pathname: "/ua_ua" })?.code).toBe("ua_ua");
  });

  it("returns null with no languages", () => {
    expect(resolveLocale({ hostname: "x", pathname: "/", languages: [] })).toBeNull();
  });
});

describe("stripLanguageMarker", () => {
  it("strips a domain path_prefix or a locale segment", () => {
    expect(stripLanguageMarker("/ua_ua/a", withDomains[2]!)).toBe("/a");
    expect(stripLanguageMarker("/en_en/a", noDomains[1]!)).toBe("/a");
    expect(stripLanguageMarker("/a", noDomains[0]!)).toBe("/a");
  });
});

describe("buildSwitchUrl", () => {
  const local = (pathname: string, search = "") => ({
    origin: "http://localhost:8081",
    hostname: "localhost",
    pathname,
    search,
    languages: noDomains,
  });

  it("adds a prefix for a non-default language without a domain", () => {
    expect(buildSwitchUrl(noDomains[1]!, local("/wydarzenia/a/b", "?page=2"))).toBe(
      "http://localhost:8081/en_en/wydarzenia/a/b?page=2",
    );
  });

  it("swaps one prefix for another", () => {
    expect(buildSwitchUrl(noDomains[2]!, local("/en_en/wydarzenia"))).toBe(
      "http://localhost:8081/ua_ua/wydarzenia",
    );
  });

  it("drops the prefix for the default language", () => {
    expect(buildSwitchUrl(noDomains[0]!, local("/en_en/wydarzenia"))).toBe(
      "http://localhost:8081/wydarzenia",
    );
    expect(buildSwitchUrl(noDomains[0]!, local("/en_en"))).toBe("http://localhost:8081/");
  });

  it("navigates to a language's own domain (+ path_prefix)", () => {
    const fromPl = {
      origin: "https://turnup-tickets.pl",
      hostname: "turnup-tickets.pl",
      pathname: "/wydarzenia",
      search: "?q=x",
      languages: withDomains,
    };
    expect(buildSwitchUrl(withDomains[1]!, fromPl)).toBe(
      "https://turnup-tickets.eu/wydarzenia?q=x",
    );
    expect(buildSwitchUrl(withDomains[2]!, fromPl)).toBe(
      "https://turnup-tickets.eu/ua_ua/wydarzenia?q=x",
    );
    expect(buildSwitchUrl(withDomains[2]!, { ...fromPl, pathname: "/" })).toBe(
      "https://turnup-tickets.eu/ua_ua?q=x",
    );
  });

  it("leaves a domain's path_prefix when switching away from it", () => {
    expect(
      buildSwitchUrl(withDomains[0]!, {
        origin: "https://turnup-tickets.eu",
        hostname: "turnup-tickets.eu",
        pathname: "/ua_ua/wydarzenia",
        search: "",
        languages: withDomains,
      }),
    ).toBe("https://turnup-tickets.pl/wydarzenia");
  });
});

describe("events path segment", () => {
  it("uses the backend segment; the internal name only without a language", () => {
    expect(eventsSegmentFor(lang("en_ua", { events_path_segment: "events" }))).toBe("events");
    expect(eventsSegmentFor(null)).toBe("wydarzenia");
  });

  it("reports a contract violation instead of silently translating", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { ...lang("ua_ua"), events_path_segment: null } as unknown as LanguageResource;
    expect(eventsSegmentFor(broken)).toBe("wydarzenia");
    expect(eventsSegmentFor(lang("ua_ua", { events_path_segment: "a/b" }))).toBe("wydarzenia");
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  it("maps only a whole first segment, both ways", () => {
    expect(internalizeEventsPath("/events/rock/x", "events")).toBe("/wydarzenia/rock/x");
    expect(internalizeEventsPath("/events", "events")).toBe("/wydarzenia");
    expect(internalizeEventsPath("/eventsx/a", "events")).toBe("/eventsx/a");
    expect(internalizeEventsPath("/profil", "events")).toBe("/profil");
    expect(localizeEventsPath("/wydarzenia/rock/x", "events")).toBe("/events/rock/x");
    expect(localizeEventsPath("/wydarzenia", "events")).toBe("/events");
    expect(localizeEventsPath("/wydarzenia/a", "wydarzenia")).toBe("/wydarzenia/a");
  });

  it("translates the segment when switching language", () => {
    const languages = [
      lang("pl_pl", { is_default: true, events_path_segment: "wydarzenia" }),
      lang("en_en", { events_path_segment: "events" }),
      lang("ua_ua", { events_path_segment: "podiyi" }),
    ];
    const at = (pathname: string) => ({
      origin: "http://localhost:8081",
      hostname: "localhost",
      pathname,
      search: "",
      languages,
    });
    expect(buildSwitchUrl(languages[1]!, at("/wydarzenia/inne/x"))).toBe(
      "http://localhost:8081/en_en/events/inne/x",
    );
    expect(buildSwitchUrl(languages[0]!, at("/en_en/events/inne/x"))).toBe(
      "http://localhost:8081/wydarzenia/inne/x",
    );
    expect(buildSwitchUrl(languages[2]!, at("/en_en/events"))).toBe(
      "http://localhost:8081/ua_ua/podiyi",
    );
  });
});

describe("parseEventUrl", () => {
  const languages = [
    lang("pl_pl", { is_default: true, events_path_segment: "wydarzenia" }),
    lang("en_ua", { events_path_segment: "events" }),
  ];

  it("turns the backend url into route params for the active language", () => {
    expect(parseEventUrl("/wydarzenia/inne/x", languages[0]!)).toEqual({
      tagSlug: "inne",
      eventSlug: "x",
    });
    expect(parseEventUrl("/en_ua/events/inne/x", languages[1]!)).toEqual({
      tagSlug: "inne",
      eventSlug: "x",
    });
  });

  it("strips a domain path_prefix", () => {
    const ua = lang("ua_ua", {
      domain: "turnup-tickets.eu",
      path_prefix: "/ua_ua",
      events_path_segment: "podiyi",
    });
    expect(parseEventUrl("/ua_ua/podiyi/rock/y", ua)).toEqual({ tagSlug: "rock", eventSlug: "y" });
  });

  it("rejects null and foreign-shaped urls", () => {
    expect(parseEventUrl(null, languages[0]!)).toBeNull();
    expect(parseEventUrl("/inne/x", languages[0]!)).toBeNull();
    expect(parseEventUrl("/en_ua/other/inne/x", languages[1]!)).toBeNull();
  });
});
