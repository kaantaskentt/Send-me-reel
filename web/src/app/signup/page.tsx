/*
 * /signup — wraps LoginContent with signup as the default mode.
 * Apr 26 — primary landing-page CTAs route here.
 */

import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BOT_LINK } from "@/lib/constants";
import LoginContent from "@/components/login/LoginContent";

export const metadata = {
  title: "Sign up — ContextDrop",
  description: "Start free with 50 analyses. No card needed.",
};

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const botDashboardLink = `${BOT_LINK}?start=dashboard`;

  return (
    <Suspense>
      <LoginContent botDashboardLink={botDashboardLink} defaultMode="signup" />
    </Suspense>
  );
}
