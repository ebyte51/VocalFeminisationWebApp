import AppShell from "@/components/AppShell";
import TechniquePage from "@/components/pages/TechniquePage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell><TechniquePage id={id} /></AppShell>;
}
