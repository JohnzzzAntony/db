import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response("Not signed in", { status: 401 });
  const { id } = await ctx.params;
  const paper = await db.questionPaper.findUnique({
    where: { id },
    select: { fileData: true, mimeType: true, fileName: true },
  });
  if (!paper) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(paper.fileData), {
    headers: {
      "Content-Type": paper.mimeType,
      "Content-Disposition": `inline; filename="${paper.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
      // The stored type was sniffed from magic bytes at upload (PDF/image only), never client-supplied.
      // No CSP sandbox here: Chrome refuses to render PDFs inside a sandboxed response.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
