import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/forms";
import { SelectField } from "@/components/fields";
import { setUserRole } from "../actions";

export const metadata: Metadata = { title: "Users" };

const ROLE_OPTIONS = [["STUDENT", "Student"], ["FACULTY", "Faculty"], ["ADMIN", "Admin"]] as const;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole("ADMIN");
  const { q } = await searchParams;
  const users = await db.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { studyDocuments: true } } },
  });
  return (
    <>
      <PageHeader title="Users" description="Faculty can verify papers and edit subject content. Admins also manage universities, syllabus structure and roles." />
      <form className="mb-4 flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search users" className="input max-w-sm" />
        <button className="btn-secondary">Search</button>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Docs</th><th>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.createdAt.toLocaleDateString("en-IN")}</td>
                <td>{u._count.studyDocuments}</td>
                <td>
                  <ActionForm action={setUserRole} submitLabel="Set" className="flex items-end gap-2" submitClassName="btn-secondary px-3 py-1.5">
                    <input type="hidden" name="userId" value={u.id} />
                    <SelectField name="role" label="Role" options={ROLE_OPTIONS} defaultValue={u.role} />
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
