import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { extractUrl } from "@/lib/url-utils";
import ShareClient from "@/components/share/ShareClient";

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string; title?: string }>;
}) {
  const params = await searchParams;

  // Extract URL from share intent — try `url` param first, then parse from `text`
  const sharedUrl =
    params.url?.trim() ||
    (params.text ? extractUrl(params.text) : null) ||
    null;

  if (!sharedUrl) {
    redirect("/dashboard");
  }

  const session = await getSession();

  if (!session) {
    // Pass the URL through query params — LoginContent will persist it
    redirect(`/login?next=/share&url=${encodeURIComponent(sharedUrl)}`);
  }

  return <ShareClient url={sharedUrl} />;
}
