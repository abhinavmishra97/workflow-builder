import WorkspaceDashboard from "@/components/WorkspaceDashboard";

export default function AppPage() {
  // In the future, get user data from Clerk
  // const { user } = useUser();
  // const userName = user?.fullName || "User";
  
  return <WorkspaceDashboard userName="Abhinav Mishra" />;
}
