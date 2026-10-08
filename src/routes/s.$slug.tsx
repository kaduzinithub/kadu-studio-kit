import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function injectTracking(html: string, tracking: Record<string, unknown> | null): string {
  if (!tracking) return html;
  const id = (key: string) => String(tracking[key] ?? '').trim();
  const block = (name: string, content: string) => `<!-- KADUDEV_TRACKING:${name}:START -->${content}<!-- KADUDEV_TRACKING:${name}:END -->`;
  const remove = (name: string) => html.replace(new RegExp(`<!-- KADUDEV_TRACKING:${name}:START -->[\\s\\S]*?<!-- KADUDEV_TRACKING:${name}:END -->`, 'g'), '');
  for (const name of ['GA4', 'GTM', 'META_PIXEL', 'TIKTOK_PIXEL', 'EVENTS', 'UTM', 'CUSTOM_HEAD', 'CUSTOM_BODY']) html = remove(name);
  const head: string[] = [];
  const body: string[] = [];
  const ga4 = id('ga4_measurement_id');
  const gtm = id('google_tag_manager_id');
  const meta = id('meta_pixel_id');
  const tiktok = id('tiktok_pixel_id');
  if (ga4 && tracking.track_page_views !== false) head.push(block('GA4', `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4}',{anonymize_ip:true});</script>`));
  if (gtm) {
    head.push(block('GTM', `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${gtm}');</script>`));
    body.push(block('GTM', `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`));
  }
  if (meta) head.push(block('META_PIXEL', `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');</script>`));
  if (tiktok) head.push(block('TIKTOK_PIXEL', `<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var e=0;e<ttq.methods.length;e++)ttq.setAndDefer(ttq,ttq.methods[e]);ttq.load=function(e){var i='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{};ttq._i[e]=[];ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]={};var o=d.createElement('script');o.type='text/javascript';o.async=!0;o.src=i+'?sdkid='+e+'&lib='+t;var a=d.getElementsByTagName('script')[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktok}');ttq.page()}(window,document,'ttq');</script>`));
  const events: string[] = [];
  if (tracking.track_whatsapp_clicks !== false) events.push("document.addEventListener('click',function(e){var a=e.target.closest('a[href*=' + JSON.stringify('wa.me') + '],a[href*=' + JSON.stringify('whatsapp') + '],a[href*=' + JSON.stringify('api.whatsapp') + ']');if(a&&window.gtag)gtag('event','whatsapp_click');if(a&&window.fbq)fbq('track','Contact',{method:'whatsapp'})})");
  if (tracking.track_phone_clicks !== false) events.push("document.addEventListener('click',function(e){var a=e.target.closest('a[href^=' + JSON.stringify('tel:') + ']');if(a&&window.gtag)gtag('event','phone_click');if(a&&window.fbq)fbq('track','Contact',{method:'phone'})})");
  if (tracking.track_form_submissions !== false) events.push("document.addEventListener('submit',function(){if(window.gtag)gtag('event','form_submit');if(window.fbq)fbq('track','Lead')})");
  if (events.length) head.push(block('EVENTS', `<script>(function(){${events.join(';')}})();</script>`));
  const source = id('utm_source_default'), medium = id('utm_medium_default'), campaign = id('utm_campaign_default');
  if (source || medium || campaign) head.push(block('UTM', `<script>(function(){var p=new URLSearchParams(location.search),u={source:p.get('utm_source')||'${source}',medium:p.get('utm_medium')||'${medium}',campaign:p.get('utm_campaign')||'${campaign}'};try{sessionStorage.setItem('kadudev_utm',JSON.stringify(u))}catch(e){}})();</script>`));
  const customHead = id('custom_head_script'), customBody = id('custom_body_script');
  if (customHead) head.push(block('CUSTOM_HEAD', `<script>${customHead.replaceAll('</script','<\\/script')}</script>`));
  if (customBody) body.push(block('CUSTOM_BODY', `<script>${customBody.replaceAll('</script','<\\/script')}</script>`));
  if (head.length) html = html.includes('</head>') ? html.replace('</head>', head.join('') + '</head>') : head.join('') + html;
  if (body.length) html = html.includes('</body>') ? html.replace('</body>', body.join('') + '</body>') : html + body.join('');
  return html;
}

const getPublicSite = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(4).max(64) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: site } = await supabaseAdmin
      .from("generated_sites")
      .select("id, title, preview_html, is_public")
      .eq("share_slug", data.slug)
      .maybeSingle();
    if (!site || !site.is_public) return null;

    const { data: tracking } = await supabaseAdmin
      .from("site_tracking" as never)
      .select("ga4_measurement_id, google_tag_manager_id, meta_pixel_id, tiktok_pixel_id, custom_head_script, custom_body_script, utm_source_default, utm_medium_default, utm_campaign_default, track_page_views, track_whatsapp_clicks, track_phone_clicks, track_form_submissions")
      .eq("site_id", site.id)
      .maybeSingle();

    return {
      title: site.title as string,
      html: injectTracking(site.preview_html as string, tracking),
    };
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
