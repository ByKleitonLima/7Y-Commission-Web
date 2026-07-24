"use client";

import { useState } from "react";
import { FileText, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function getErrorMessage(code: string) {
  switch (code) {
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente mais tarde.";
    default:
      return "Não foi possível entrar. Tente novamente.";
  }
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      router.push("/home");
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      setError(getErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-[#2d2d2d] flex-col justify-center px-40">
        <FileText className="w-20 h-20 text-white mb-9" strokeWidth={1.5} />

        <div className="mb-9">
          <p className="text-4xl font-semibold text-white leading-tight">
            Olá, Seja
          </p>
          <p className="text-4xl font-semibold text-white leading-tight">
            Bem vindo
          </p>
        </div>

        <p className="text-[18px] text-[#ffffff] max-w-sm leading-relaxed">
          7Y Hub é uma plataforma de gestão de comissões, que usa tecnologia
          para facilitar suas promoções e oferecer todas ferramentas
          necessária para facilitar o controle.
        </p>
      </div>

      <div className="flex w-full lg:w-1/2 bg-[#F9F9F9] items-center justify-center px-6">
        <div className="w-full max-w-sm mb-9">
          <div className="flex justify-center mb-9">
            <Image
              src={"/img/logo.png"}
              width={100}
              height={80}
              alt="logo"
              priority
              style={{ width: "120px", height: "auto" }}
            />
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mb-9">
              <label className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                E-mail
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent shadow-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                Senha
              </label>

              <div className="relative mb-9">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="text-right mb-9">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
                Esqueceu a senha ?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#2d2d2d] py-3 text-sm font-medium text-white hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}