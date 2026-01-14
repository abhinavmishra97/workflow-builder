import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function WorkflowPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Workflow Builder</h1>
      <p className="text-sm text-gray-600">
        Authenticated access confirmed. Workflow canvas coming next.
      </p>
    </main>
  );
}
