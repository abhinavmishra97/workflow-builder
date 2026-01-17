import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import WorkflowCanvas from "@/components/WorkflowCanvas";

interface WorkflowPageProps {
  params: {
    id: string;
  };
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // For now, just render the canvas
  // TODO: Load workflow data from database using params.id
  return <WorkflowCanvas />;
}
