import { getSession } from "@/lib/auth";
import Dashboard from "@/components/dashboard/Dashboard";
import ConnectPrompt from "@/components/dashboard/ConnectPrompt";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    return <ConnectPrompt />;
  }

  return <Dashboard userId={session.sub} username={session.username} />;
}
