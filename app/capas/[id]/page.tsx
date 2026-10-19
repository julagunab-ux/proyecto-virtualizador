import CapaEditor from "@/components/CapaEditor";

export const dynamic = "force-dynamic";

export default async function CapaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CapaEditor id={id} />;
}
