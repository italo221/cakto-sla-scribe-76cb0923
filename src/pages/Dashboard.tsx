import TicketDashboard from "@/components/TicketDashboard";
import Navigation from "@/components/Navigation";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <TicketDashboard />
    </div>
  );
};

export default Dashboard;