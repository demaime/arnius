import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { KeywordsModal, type Keyword } from "./keywords-modal";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase.from("user_keywords").select("id, keyword").order("keyword");
  const keywords = (data ?? []) as Keyword[];

  return (
    <div className="mx-auto max-w-3xl px-4">
      <header className="flex items-center justify-between border-b border-gray-300 py-4">
        <Link href="/" className="text-xl font-bold">
          arnius
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="underline-offset-4 hover:underline">
            Noticias
          </Link>
          <Link href="/health" className="underline-offset-4 hover:underline">
            Estado
          </Link>
          <KeywordsModal keywords={keywords} />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded border border-gray-400 px-3 py-1 hover:bg-gray-100"
            >
              Salir
            </button>
          </form>
        </nav>
      </header>
      <div className="py-6">{children}</div>
    </div>
  );
}
