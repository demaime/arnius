import { GoogleButton } from "./google-button";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-black px-6 py-12 text-center">
      {/* Video de fondo a viewport completo. fixed (no absolute): sigue cubriendo
          todo cuando la barra del navegador móvil se colapsa/expande. */}
      <video
        className="fixed inset-0 h-full w-full object-cover motion-reduce:hidden"
        src="/login.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      {/* Máscara oscura + viñeta que oscurece hacia los bordes. */}
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div
        className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)]"
        aria-hidden="true"
      />

      <div className="relative flex w-full max-w-xl flex-col items-center gap-10 sm:gap-12">
        <header className="flex flex-col items-center gap-3 sm:gap-4">
          {/* Halo celeste: despega el azul del wordmark (colores del header)
              de la máscara oscura. */}
          <h1 className="font-black lowercase leading-none tracking-tight text-accent-fg [font-size:clamp(4.5rem,19vw,8.5rem)] [text-shadow:0_0_60px_rgba(117,170,219,0.55),0_2px_20px_rgba(117,170,219,0.4)]">
            arnius<span className="text-highlight">.</span>
          </h1>
          <p className="font-semibold lowercase tracking-wide text-white/90 [font-size:clamp(1.125rem,4.5vw,1.5rem)]">
            tu portal de noticias argentinas
          </p>
        </header>

        <section className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 px-6 py-8 backdrop-blur-xl [box-shadow:0_25px_60px_-15px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] sm:px-10 sm:py-10">
          <h2 className="text-2xl font-bold text-white">Ingresá</h2>
          <p className="mt-2 text-base text-white/70">
            con tu cuenta de Google, y armá tu feed con tus palabras clave
          </p>
          <div className="mt-8 flex justify-center">
            <GoogleButton />
          </div>
        </section>
      </div>
    </main>
  );
}
