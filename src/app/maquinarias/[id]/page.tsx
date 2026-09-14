import EquipmentDetailClientView from "@/components/EquipmentDetailClientView";
import { INITIAL_EQUIPMENT } from "@/lib/machineryData";

export function generateStaticParams() {
  const customSlots = Array.from({ length: 50 }, (_, i) => ({ id: `equipo-${i + 1}` }));
  return [
    ...INITIAL_EQUIPMENT.map((eq) => ({
      id: eq.id,
    })),
    ...customSlots,
  ];
}

export default async function MachineryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;
  return <EquipmentDetailClientView equipmentId={resolved.id} />;
}
