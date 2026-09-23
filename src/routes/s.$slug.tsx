import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const getPublicSite = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(4).max(64) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: site } = await supabaseAdmin
      .from("generated_sites")
      .select("title, preview_html, is_public")
      .eq("share_slug", data.slug)
      .maybeSingle();
    if (!site || !site.is_public) return null;
    return { title: site.title as string, html: site.preview_html as string };
  });

export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params }) => {
    const site = await getPublicSite({ data: { slug: params.slug } });
    if (!site) throw notFound();
    return site;
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Site indisponível" }, { name: "robots", content: "noindex" }],
      };
    const title = `${loaderData.title} — site criado por KaduDev`;
    const description = `Pré-visualização do site ${loaderData.title}, criado no KaduDev Prompt Engine.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: SiteUnavailable,
  component: PublicSitePage,
});

function SiteUnavailable() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div>
        <h1 className="font-display text-2xl italic">Este link não está disponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O site pode ter sido despublicado pelo autor.
        </p>
      </div>
    </div>
  );
}

function PublicSitePage() {
  const site = Route.useLoaderData();
  return (
    <iframe
      title={site.title}
      srcDoc={site.html}
      sandbox="allow-scripts allow-forms allow-popups"
      className="fixed inset-0 h-full w-full border-0 bg-white"
    />
  );
}
