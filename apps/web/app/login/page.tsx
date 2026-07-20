import { GoogleButton } from "./google-button";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold lowercase tracking-tight">
        arnius<span className="text-accent">.</span>
      </h1>
      <p className="text-muted">
        Noticias de agenda: seguí tus palabras clave en los principales portales argentinos.
      </p>
      <GoogleButton />
    </main>
  );
}
