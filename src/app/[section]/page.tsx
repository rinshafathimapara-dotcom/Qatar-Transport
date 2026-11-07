import MobilityApp from "@/components/mobility-app";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "plan",
      "explore",
      "conditions",
      "comfort",
      "demand",
      "parking",
      "saved",
      "profile",
      "auth",
    ].includes(section)
  )
    notFound();
  return <MobilityApp initialSection={section} />;
}
