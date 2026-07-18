import { LoginButton } from "./login-button";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold">arnius</h1>
      <p className="text-gray-600">
        Noticias de agenda: seguí tus palabras clave en los principales portales argentinos.
      </p>
      <LoginButton />
    </main>
  );
}
