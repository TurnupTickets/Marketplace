import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/turnup/PageShell";
import { staticPageQuery } from "@/lib/api/queries";
import { normalizeCmsHtml } from "@/lib/decode-cms-html";

export const Route = createFileRoute("/strona/$slug")({
  loader: async ({ context, params }) => {
    try {
      const page = await context.queryClient.ensureQueryData(staticPageQuery(params.slug));
      return { title: page.title };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — turnup` : "Strona niedostępna — turnup";
    const description = loaderData
      ? `${loaderData.title} w serwisie turnup — informacje dla kupujących bilety.`
      : "Ta strona jest niedostępna.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: StaticPageView,
});

function StaticPageView() {
  const { slug } = Route.useParams();
  const { data: page } = useSuspenseQuery(staticPageQuery(slug));

  return (
    <PageShell eyebrow="Informacje" title={page.title}>
      <article className="w-full min-w-0 space-y-8 rounded-3xl border border-border bg-card p-6 md:p-10">
        {page.updated_at && (
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Aktualizacja: {page.updated_at}
          </p>
        )}

        <div
          className="min-w-0 space-y-4 break-words text-sm leading-relaxed text-muted-foreground md:text-base [&_a]:text-primary [&_a]:underline [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:uppercase [&_h2]:text-foreground [&_h2]:first:mt-0 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-4 [&_strong]:text-foreground [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: normalizeCmsHtml(page.body ?? "") }}
        />

        <Link
          to="/wydarzenia"
          search={{ page: 1, q: "" }}
          className="gradient-brand inline-flex rounded-full px-6 py-3 text-sm font-bold uppercase text-primary-foreground"
        >
          Przeglądaj wydarzenia
        </Link>
      </article>
    </PageShell>
  );
}
