"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">The error has been logged. Please try again.</p>
      <button onClick={reset} className="btn mt-6">Try again</button>
    </main>
  );
}
