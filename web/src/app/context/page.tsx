import { getSession } from "@/lib/auth";
import ConnectPrompt from "@/components/dashboard/ConnectPrompt";
import ContextEditor from "@/components/context/ContextEditor";

export default async function ContextPage() {
  const session = await getSession();

  if (!session) {
    return <ConnectPrompt />;
  }

  return <ContextEditor />;
}
