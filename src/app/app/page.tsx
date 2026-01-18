import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import WorkspaceDashboard from "@/components/WorkspaceDashboard";

export default async function AppPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/');
  }

  const userName = user.firstName 
    ? `${user.firstName} ${user.lastName || ''}`.trim() 
    : 'User';
  
  return <WorkspaceDashboard userName={userName} />;
}
