import EquipmentDetailClientView from "@/components/EquipmentDetailClientView";
import { INITIAL_EQUIPMENT } from "@/lib/machineryData";

export function generateStaticParams() {
  return INITIAL_EQUIPMENT.map((eq) => ({
    id: eq.id,
  }));
}

export default async function MachineryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;
  return <EquipmentDetailClientView equipmentId={resolved.id} />;
}
