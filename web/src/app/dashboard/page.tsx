import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard/Dashboard";
import { ThemeProvider } from "@/lib/theme";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}
