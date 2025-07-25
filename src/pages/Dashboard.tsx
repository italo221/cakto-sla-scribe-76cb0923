import ModernTicketDashboard from "@/components/ModernTicketDashboard";
import Navigation from "@/components/Navigation";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <ModernTicketDashboard />
    </div>
  );
};

export default Dashboard;