import { notFound } from "next/navigation";
import RehearsalSource from "@/components/dashboard/RehearsalSource";

export const metadata = { title: "Local rehearsal source | ContextDrop" };

export default function RehearsalSourcePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <RehearsalSource />;
}
