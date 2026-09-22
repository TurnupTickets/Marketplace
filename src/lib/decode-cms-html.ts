import { decode } from "html-entities";

/**
 * Some old-CMS WYSIWYG fields (event description, content-page body) were
 * saved already HTML-entity-escaped in the DB — `&lt;p&gt;&lt;strong&gt;`
 * instead of `<p><strong>` — so feeding them straight into
 * `dangerouslySetInnerHTML` rendered the escaped markup as literal visible
 * text ("<strong>PL</strong>" on the page) instead of parsing it as HTML.
 * Real (already-unescaped) HTML has no reason to contain a literal "&lt;",
 * so that's the detection signal for which shape a given record is in —
 * decode once for the escaped case, pass real HTML through unchanged.
 */
export function normalizeCmsHtml(html: string): string {
  return html.includes("&lt;") ? decode(html) : html;
}
