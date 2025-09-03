import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Palette, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DashboardCustomizerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ColorScheme {
  name: string;
  colors: {
    kpiTotal: string;
    kpiOpen: string;
    kpiProgress: string;
    kpiResolved: string;
    kpiOverdue: string;
    kpiCritical: string;
    chartColor1: string;
    chartColor2: string;
    chartColor3: string;
    chartColor4: string;
    chartColor5: string;
    chartColor6: string;
  };
}

const defaultColors: ColorScheme = {
  name: 'Verde Padrão',
  colors: {
    kpiTotal: '142 76% 42%',
    kpiOpen: '138 72% 46%',
    kpiProgress: '134 68% 50%',
    kpiResolved: '130 64% 54%',
    kpiOverdue: '0 84% 60%',
    kpiCritical: '358 75% 59%',
    chartColor1: '142 76% 42%',
    chartColor2: '138 72% 46%',
    chartColor3: '134 68% 50%',
    chartColor4: '130 64% 54%',
    chartColor5: '126 60% 58%',
    chartColor6: '220 13% 91%'
  }
};

const presetSchemes: ColorScheme[] = [
  defaultColors,
  {
    name: 'Azul Corporativo',
    colors: {
      kpiTotal: '217 91% 47%',
      kpiOpen: '213 87% 51%',
      kpiProgress: '209 83% 55%',
      kpiResolved: '205 79% 59%',
      kpiOverdue: '0 84% 60%',
      kpiCritical: '358 75% 59%',
      chartColor1: '217 91% 47%',
      chartColor2: '213 87% 51%',
      chartColor3: '209 83% 55%',
      chartColor4: '205 79% 59%',
      chartColor5: '201 75% 63%',
      chartColor6: '220 13% 91%'
    }
  },
  {
    name: 'Roxo Moderno',
    colors: {
      kpiTotal: '262 83% 58%',
      kpiOpen: '258 79% 62%',
      kpiProgress: '254 75% 66%',
      kpiResolved: '250 71% 70%',
      kpiOverdue: '0 84% 60%',
      kpiCritical: '358 75% 59%',
      chartColor1: '262 83% 58%',
      chartColor2: '258 79% 62%',
      chartColor3: '254 75% 66%',
      chartColor4: '250 71% 70%',
      chartColor5: '246 67% 74%',
      chartColor6: '220 13% 91%'
    }
  }
];

export const DashboardCustomizer = ({ isOpen, onOpenChange }: DashboardCustomizerProps) => {
  const { isSuperAdmin } = useAuth();
  const [currentColors, setCurrentColors] = useState(defaultColors.colors);
  const [selectedPreset, setSelectedPreset] = useState(0);

  if (!isSuperAdmin) {
    return null;
  }

  const applyColorScheme = (scheme: ColorScheme) => {
    const root = document.documentElement;
    
    // Aplicar cores das KPIs
    root.style.setProperty('--kpi-total', scheme.colors.kpiTotal);
    root.style.setProperty('--kpi-open', scheme.colors.kpiOpen);
    root.style.setProperty('--kpi-progress', scheme.colors.kpiProgress);
    root.style.setProperty('--kpi-resolved', scheme.colors.kpiResolved);
    root.style.setProperty('--kpi-overdue', scheme.colors.kpiOverdue);
    root.style.setProperty('--kpi-critical', scheme.colors.kpiCritical);
    
    // Aplicar cores dos gráficos
    root.style.setProperty('--chart-color-1', scheme.colors.chartColor1);
    root.style.setProperty('--chart-color-2', scheme.colors.chartColor2);
    root.style.setProperty('--chart-color-3', scheme.colors.chartColor3);
    root.style.setProperty('--chart-color-4', scheme.colors.chartColor4);
    root.style.setProperty('--chart-color-5', scheme.colors.chartColor5);
    root.style.setProperty('--chart-color-6', scheme.colors.chartColor6);

    setCurrentColors(scheme.colors);
    toast.success(`Esquema de cores "${scheme.name}" aplicado com sucesso!`);
  };

  const saveConfiguration = () => {
    // Aqui seria salvo no banco de dados
    localStorage.setItem('dashboard-colors', JSON.stringify(currentColors));
    toast.success('Configurações salvas com sucesso!');
    onOpenChange(false);
  };

  const resetToDefault = () => {
    applyColorScheme(defaultColors);
    setSelectedPreset(0);
    toast.info('Cores redefinidas para o padrão');
  };

  const handleColorChange = (colorKey: keyof typeof currentColors, value: string) => {
    // Converter hex para HSL se necessário
    const hslValue = value.replace('#', '');
    const newColors = { ...currentColors, [colorKey]: hslValue };
    setCurrentColors(newColors);
    
    // Aplicar imediatamente
    document.documentElement.style.setProperty(`--${colorKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`, hslValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Personalizar Dashboard
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Esquemas Predefinidos</TabsTrigger>
            <TabsTrigger value="custom">Personalizado</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {presetSchemes.map((scheme, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedPreset === index ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedPreset(index);
                    applyColorScheme(scheme);
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{scheme.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.values(scheme.colors).slice(0, 6).map((color, colorIndex) => (
                        <div
                          key={colorIndex}
                          className="h-8 rounded-md border"
                          style={{ backgroundColor: `hsl(${color})` }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cores das Métricas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { key: 'kpiTotal', label: 'Total de Tickets' },
                    { key: 'kpiOpen', label: 'Tickets Abertos' },
                    { key: 'kpiProgress', label: 'Em Andamento' },
                    { key: 'kpiResolved', label: 'Resolvidos' },
                    { key: 'kpiOverdue', label: 'Atrasados' },
                    { key: 'kpiCritical', label: 'Críticos' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: `hsl(${currentColors[key as keyof typeof currentColors]})` }}
                        />
                        <Input
                          className="w-20 text-xs"
                          value={currentColors[key as keyof typeof currentColors]}
                          onChange={(e) => handleColorChange(key as keyof typeof currentColors, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cores dos Gráficos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { key: 'chartColor1', label: 'Cor Principal' },
                    { key: 'chartColor2', label: 'Cor Secundária' },
                    { key: 'chartColor3', label: 'Cor Terciária' },
                    { key: 'chartColor4', label: 'Cor Quaternária' },
                    { key: 'chartColor5', label: 'Cor Quinária' },
                    { key: 'chartColor6', label: 'Cor Neutra' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: `hsl(${currentColors[key as keyof typeof currentColors]})` }}
                        />
                        <Input
                          className="w-20 text-xs"
                          value={currentColors[key as keyof typeof currentColors]}
                          onChange={(e) => handleColorChange(key as keyof typeof currentColors, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={resetToDefault} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Redefinir
          </Button>
          <Button onClick={saveConfiguration} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};