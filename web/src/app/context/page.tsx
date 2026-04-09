import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ContextEditor from "@/components/context/ContextEditor";

export default async function ContextPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <ContextEditor />;
}
