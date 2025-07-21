import SLADashboard from "@/components/SLADashboard";
import Navigation from "@/components/Navigation";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SLADashboard />
    </div>
  );
};

export default Dashboard;