import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-center font-serif text-xl font-semibold text-brand-strong">
        Koshys Nursing Academic Intelligence
      </Link>
      <div className="card">{children}</div>
    </main>
  );
}
