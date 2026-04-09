import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BOT_LINK } from "@/lib/constants";
import LoginContent from "@/components/login/LoginContent";

export const metadata = {
  title: "Sign in — ContextDrop",
  description: "Sign in to your ContextDrop dashboard",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const botDashboardLink = `${BOT_LINK}?start=dashboard`;

  return (
    <Suspense>
      <LoginContent botDashboardLink={botDashboardLink} />
    </Suspense>
  );
}
