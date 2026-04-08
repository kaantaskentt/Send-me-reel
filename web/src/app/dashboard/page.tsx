import { getSession } from "@/lib/auth";
import ConnectPrompt from "@/components/dashboard/ConnectPrompt";
import Dashboard from "@/components/dashboard/Dashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    return <ConnectPrompt />;
  }
  return <Dashboard />;
}
