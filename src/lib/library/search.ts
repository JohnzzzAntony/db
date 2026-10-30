import "server-only";
import { db } from "@/lib/db";
import { buildTsQuery } from "./query";

export type RetrievedChunk = {
  id: string;
  content: string;
  page: number | null;
  documentId: string;
  title: string;
  kind: string;
  authors: string | null;
  publisher: string | null;
  edition: string | null;
  year: number | null;
  url: string | null;
  rank: number;
};

/** Full-text search over VERIFIED library sources, optionally scoped to a subject. */
export async function searchLibrary(text: string, subjectId: string | null, limit = 10) {
  const q = buildTsQuery(text);
  if (!q) return [];
  return db.$queryRaw<RetrievedChunk[]>`
    SELECT c.id, c.content, c.page, d.id AS "documentId", d.title, d.kind::text AS kind,
           d.authors, d.publisher, d.edition, d.year, d.url,
           ts_rank_cd(to_tsvector('english', c.content), q)::float8 AS rank
    FROM "SourceChunk" c
    JOIN "SourceDocument" d ON d.id = c."documentId",
         to_tsquery('english', ${q}) q
    WHERE to_tsvector('english', c.content) @@ q
      AND d."verificationStatus" = 'VERIFIED'
      AND (${subjectId}::text IS NULL OR d."subjectId" = ${subjectId} OR d."subjectId" IS NULL)
    ORDER BY rank DESC
    LIMIT ${limit}`;
}
