"use client";

import { useEffect, useId, useState } from "react";

/** Draws an AI-written Mermaid diagram; falls back to a plain message if the source is invalid. */
export function Diagram({ source, title }: { source: string; title: string }) {
  const id = `d${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        // "strict" sanitises labels and blocks click handlers in model-written diagrams.
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          suppressErrorRendering: true,
          theme: dark ? "dark" : "neutral",
          fontFamily: "inherit",
        });
        // Validate first so a broken diagram never leaves Mermaid's error graphic in the page.
        await mermaid.parse(source);
        const { svg } = await mermaid.render(id, source);
        if (!cancelled) setSvg(svg);
      } catch {
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (failed) {
    return <p className="rounded-md bg-warn-bg px-3 py-2 text-xs text-warn-fg">This diagram could not be drawn. The written explanation above covers the same points.</p>;
  }
  if (!svg) return <div className="h-40 animate-pulse rounded-lg bg-brand-soft" aria-label={`Loading diagram: ${title}`} />;
  return (
    <div
      role="img"
      aria-label={title}
      className="overflow-x-auto rounded-lg border border-border bg-surface p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // Output of mermaid.render with securityLevel "strict".
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
