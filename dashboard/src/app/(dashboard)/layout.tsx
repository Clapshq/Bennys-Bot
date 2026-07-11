import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const displayName = session.globalName ?? session.username;

  return (
    <div className="min-h-screen">
      <Sidebar userName={displayName} userRoles={session.roles} />
      <main className="pl-64">
        <div className="bg-grid-pattern bg-[length:32px_32px]">
          <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
