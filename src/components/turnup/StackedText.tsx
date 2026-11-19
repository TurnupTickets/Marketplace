import { Fragment } from "react";

/**
 * Renders a short (already translated) phrase over several lines, the way
 * the stacked nav/promo labels are designed. The phrase stays ONE i18n key —
 * per-line keys like "wydarzenia" would collide with "Wydarzenia" in the
 * CMS's case-insensitive `langs_keys` index, and translators see the whole
 * phrase.
 *
 * - `"first-word"`: first word, then the rest ("znajdź / wydarzenie");
 * - `"each-word"`: one word per line ("Moje / nadchodzące / wydarzenia").
 */
export function StackedText({
  text,
  mode = "first-word",
}: {
  text: string;
  mode?: "first-word" | "each-word";
}) {
  const words = text.trim().split(/\s+/);
  const lines =
    mode === "each-word" || words.length <= 1 ? words : [words[0]!, words.slice(1).join(" ")];
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}
