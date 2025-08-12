import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Monitor, PanelLeft } from 'lucide-react';
import { useNavbarSettings, NavbarSettings } from '@/hooks/useNavbarSettings';

export default function NavbarCustomization() {
  const { settings, updateSettings, loading } = useNavbarSettings();
  const [previewSettings, setPreviewSettings] = useState<NavbarSettings>({
    navbar_position: 'top',
    navbar_glass: false,
  });

  // Update preview settings when settings change
  useEffect(() => {
    setPreviewSettings(settings);
  }, [settings]);

  const handlePositionChange = (position: 'top' | 'left') => {
    setPreviewSettings(prev => ({ ...prev, navbar_position: position }));
  };

  const handleGlassChange = (enabled: boolean) => {
    setPreviewSettings(prev => ({ ...prev, navbar_glass: enabled }));
  };

  const handleSave = () => {
    updateSettings(previewSettings);
  };

  const hasChanges = 
    previewSettings.navbar_position !== settings.navbar_position ||
    previewSettings.navbar_glass !== settings.navbar_glass;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Customização da Navbar</h3>
        <p className="text-sm text-muted-foreground">
          Configure a posição e o efeito visual da barra de navegação.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Position Selection */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Posição da Navegação</Label>
            <p className="text-sm text-muted-foreground">
              Escolha onde exibir a barra de navegação
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Navigation */}
            <Card 
              className={`p-4 cursor-pointer transition-all ${
                previewSettings.navbar_position === 'top' 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handlePositionChange('top')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  <span className="font-medium">Topo</span>
                </div>
                {previewSettings.navbar_position === 'top' && (
                  <Badge variant="default">Atual</Badge>
                )}
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-primary/20 rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-16 bg-muted/50 rounded"></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Barra horizontal no topo da página
              </p>
            </Card>

            {/* Left Sidebar */}
            <Card 
              className={`p-4 cursor-pointer transition-all ${
                previewSettings.navbar_position === 'left' 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handlePositionChange('left')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PanelLeft className="h-5 w-5" />
                  <span className="font-medium">Esquerda</span>
                </div>
                {previewSettings.navbar_position === 'left' && (
                  <Badge variant="default">Atual</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <div className="w-8 bg-primary/20 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-8 bg-muted rounded"></div>
                  <div className="h-16 bg-muted/50 rounded"></div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sidebar compacta com expansão ao hover
              </p>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Glass Effect */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Efeito Visual</Label>
            <p className="text-sm text-muted-foreground">
              Ative o efeito glassmorphism para um visual translúcido
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="glass-effect">Glassmorphism</Label>
              <p className="text-sm text-muted-foreground">
                Fundo translúcido com efeito de desfoque
              </p>
            </div>
            <Switch
              id="glass-effect"
              checked={previewSettings.navbar_glass}
              onCheckedChange={handleGlassChange}
            />
          </div>

          {/* Glass Effect Preview */}
          <Card className="p-4">
            <div className="text-sm font-medium mb-3">Preview do Efeito</div>
            <div className="relative h-20 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg overflow-hidden">
              <div 
                className={`absolute inset-4 rounded border transition-all ${
                  previewSettings.navbar_glass 
                    ? 'bg-background/80 backdrop-blur-md border-border/40' 
                    : 'bg-background border-border'
                }`}
              >
                <div className="p-3">
                  <div className="h-3 bg-foreground/20 rounded w-1/2"></div>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {previewSettings.navbar_glass 
                ? 'Com glassmorphism: fundo translúcido e desfoque' 
                : 'Sem glassmorphism: fundo sólido'
              }
            </p>
          </Card>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || loading}
            className="min-w-[100px]"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </Card>
    </div>
  );
}