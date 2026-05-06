import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileSetup from "@/components/context/ProfileSetup";

export default async function ContextPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <ProfileSetup />;
}
