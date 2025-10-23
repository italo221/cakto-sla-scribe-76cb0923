import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNavbarSettings, NavbarSettings } from '@/hooks/useNavbarSettings';

export default function NavbarCustomization() {
  const { settings, updateSettings, loading } = useNavbarSettings();
  const [previewSettings, setPreviewSettings] = useState<NavbarSettings>({
    navbar_glass: false,
  });

  // Update preview settings when settings change
  useEffect(() => {
    setPreviewSettings(settings);
  }, [settings]);

  const handleGlassChange = (enabled: boolean) => {
    setPreviewSettings(prev => ({ ...prev, navbar_glass: enabled }));
  };

  const handleSave = () => {
    updateSettings(previewSettings);
  };

  const hasChanges = previewSettings.navbar_glass !== settings.navbar_glass;

  return (
    <div className="space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold">Customização da Navbar</h3>
        <p className="text-sm text-muted-foreground">
          Configure o efeito visual da barra de navegação lateral.
        </p>
      </div>

      <Card className="p-6 space-y-6">
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
        <div className="sticky bottom-0 bg-card pt-4 border-t border-border/40">
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || loading}
              className="min-w-[100px]"
            >
              {loading ? 'Salvando...' : 'Salvar'}
              {!hasChanges && <span className="ml-2 text-xs">(Sem alterações)</span>}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}