import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">It may have been moved or deleted.</p>
      <Link href="/dashboard" className="btn mt-6">Go to dashboard</Link>
    </main>
  );
}
