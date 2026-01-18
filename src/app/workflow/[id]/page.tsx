import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import WorkflowCanvas from "@/components/WorkflowCanvas";

interface WorkflowPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    redirect("/sign-in");
  }

  // pass the ID to the canvas if needed, or just let it load
  // For now, just render the canvas
  return <WorkflowCanvas />;
}
