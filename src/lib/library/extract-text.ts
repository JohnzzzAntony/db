import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

export class UnreadableFileError extends Error {}

/** Returns per-page text for PDFs, or a single page for plain text / markdown. */
export async function extractPages(file: File): Promise<{ pages: string[]; paginated: boolean }> {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [text];
    if (pages.join("").trim().length < 100) {
      throw new UnreadableFileError(
        "This PDF has no extractable text (it is probably scanned). Upload a text-based PDF or a .txt/.md file.",
      );
    }
    return { pages, paginated: true };
  }
  if (/\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/")) {
    return { pages: [new TextDecoder().decode(buf)], paginated: false };
  }
  throw new UnreadableFileError("Unsupported file type. Use PDF, TXT or MD.");
}
