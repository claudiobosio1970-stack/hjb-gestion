import CampoClientView from "@/components/CampoClientView";

export function generateStaticParams() {
  return [
    { campo: "aguilera" },
    { campo: "tambo" },
    { campo: "racca" },
    { campo: "kitty" },
    { campo: "keuneke" },
  ];
}

export default async function CampoPage({
  params,
}: {
  params: Promise<{ campo: string }>;
}) {
  const resolved = await params;
  return <CampoClientView campoSlug={resolved.campo} />;
}
