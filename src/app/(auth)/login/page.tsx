import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mb-4 font-serif text-2xl font-semibold">Sign in</h1>
      <LoginForm next={next} />
      <p className="mt-4 text-sm text-muted">
        New student? <Link href="/register" className="link">Create an account</Link>
      </p>
    </>
  );
}
