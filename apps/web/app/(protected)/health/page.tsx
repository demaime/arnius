import { createSupabaseServer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PortalHealth {
  slug: string;
  name: string;
  bad_runs: number;
  last_run_at: string | null;
}

interface ScrapeRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  articles_new: number;
}

const STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  partial: "parcial",
  failed: "falló",
  running: "en curso",
};

export default async function HealthPage() {
  const supabase = await createSupabaseServer();

  const [healthRes, runsRes] = await Promise.all([
    supabase.from("portal_health").select("slug, name, bad_runs, last_run_at").order("name"),
    supabase
      .from("scrape_runs")
      .select("id, started_at, finished_at, status, articles_new")
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  const portals = (healthRes.data ?? []) as PortalHealth[];
  const runs = (runsRes.data ?? []) as ScrapeRun[];

  return (
    <main className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Estado de los portales</h1>
        <p className="text-sm text-gray-600">
          Un portal se considera con problemas cuando sus últimas 3 corridas no trajeron ninguna
          noticia (señal de que cambió su página y hay que actualizar el scraper).
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-400 text-left">
              <th className="py-2 pr-4 font-medium">Portal</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 font-medium">Última corrida</th>
            </tr>
          </thead>
          <tbody>
            {portals.map((portal) => (
              <tr key={portal.slug} className="border-b border-gray-200">
                <td className="py-2 pr-4">{portal.name}</td>
                <td className="py-2 pr-4">
                  {portal.bad_runs >= 3 ? (
                    <span className="font-bold">CON PROBLEMAS</span>
                  ) : portal.bad_runs > 0 ? (
                    `${portal.bad_runs} corrida(s) con fallas`
                  ) : (
                    "OK"
                  )}
                </td>
                <td className="py-2 text-gray-600">
                  {portal.last_run_at ? formatDateTime(portal.last_run_at) : "sin corridas"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Últimas corridas del scraper</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-400 text-left">
              <th className="py-2 pr-4 font-medium">Inicio</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 font-medium">Noticias nuevas</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-gray-200">
                <td className="py-2 pr-4">{formatDateTime(run.started_at)}</td>
                <td className="py-2 pr-4">{STATUS_LABEL[run.status] ?? run.status}</td>
                <td className="py-2">{run.articles_new}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
