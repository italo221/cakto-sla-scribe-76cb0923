import SLAChat from "@/components/SLAChat";
import Navigation from "@/components/Navigation";
import SupabaseStatus from "@/components/SupabaseStatus";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {!isSupabaseConfigured && (
          <div className="mb-6">
            <SupabaseStatus />
          </div>
        )}
        <SLAChat />
      </div>
    </div>
  );
};

export default Index;
