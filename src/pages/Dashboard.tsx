import React, { useState } from 'react';
import { EmergencyDashboard } from '@/components/EmergencyDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const [useEmergencyMode, setUseEmergencyMode] = useState(true);

  if (useEmergencyMode) {
    return <EmergencyDashboard />;
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-orange-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <div>
                <p className="font-medium">Sistema em Modo de Emergência</p>
                <p className="text-sm">Ativando dashboard simplificado para garantir funcionamento</p>
              </div>
            </div>
            <Button 
              onClick={() => setUseEmergencyMode(true)}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Ativar Modo Emergência
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;