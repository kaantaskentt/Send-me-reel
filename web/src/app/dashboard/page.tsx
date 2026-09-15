import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard/Dashboard";
import { ThemeProvider } from "@/lib/theme";
import { headers } from "next/headers";
import { isLocalStudioRequest } from "@/lib/local-studio";

export default async function DashboardPage() {
  if (process.env.NODE_ENV === "development" && isLocalStudioRequest(await headers())) redirect("/replicate/local");
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
