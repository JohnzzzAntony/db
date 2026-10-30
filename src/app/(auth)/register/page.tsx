import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 font-serif text-2xl font-semibold">Create your student account</h1>
      <p className="mb-4 text-sm text-muted">Faculty and admin roles are assigned by an administrator.</p>
      <RegisterForm />
      <p className="mt-4 text-sm text-muted">
        Already registered? <Link href="/login" className="link">Sign in</Link>
      </p>
    </>
  );
}
