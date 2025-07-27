import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Palette, 
  Save, 
  RotateCcw, 
  Upload, 
  Eye, 
  Monitor, 
  Smartphone,
  Type,
  Image as ImageIcon,
  Settings,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorData {
  hsl: string;
  hex: string;
  name: string;
}

interface WhitelabelConfig {
  systemName: string;
  logoUrl: string;
  primaryColor: ColorData;
  secondaryColor: ColorData;
  backgroundColor: ColorData;
  textColor: ColorData;
  dashboards: {
    overview: boolean;
    metrics: boolean;
    kanban: boolean;
    analytics: boolean;
  };
}

export default function WhitelabelCustomization() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('viewer');
  const [config, setConfig] = useState<WhitelabelConfig>({
    systemName: 'Sistema SLA',
    logoUrl: '',
    primaryColor: { hsl: "142 86% 28%", hex: "#16a34a", name: "Verde Padrão" },
    secondaryColor: { hsl: "262 83% 58%", hex: "#8b5cf6", name: "Roxo Padrão" },
    backgroundColor: { hsl: "0 0% 100%", hex: "#ffffff", name: "Branco" },
    textColor: { hsl: "0 0% 9%", hex: "#171717", name: "Preto" },
    dashboards: {
      overview: true,
      metrics: true,
      kanban: true,
      analytics: false
    }
  });
  const [previewConfig, setPreviewConfig] = useState<WhitelabelConfig>(config);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadUserRole();
    loadCurrentSettings();
  }, [user]);

  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(previewConfig));
    applyPreviewSettings();
  }, [previewConfig, config]);

  const loadUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, user_type')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data.role === 'super_admin' || data.user_type === 'administrador_master') {
        setUserRole('super_admin');
      } else {
        setUserRole('viewer');
      }
    } catch (error) {
      console.error('Erro ao carregar role do usuário:', error);
    }
  };

  const loadCurrentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['whitelabel_config', 'primary_color', 'secondary_color']);

      if (error) throw error;
      
      const settings = data?.reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as any) || {};

      if (settings.whitelabel_config) {
        const whitelabelData = settings.whitelabel_config as WhitelabelConfig;
        setConfig(whitelabelData);
        setPreviewConfig(whitelabelData);
      }

      // Aplicar cores existentes se não houver config whitelabel
      if (settings.primary_color) {
        setConfig(prev => ({ ...prev, primaryColor: settings.primary_color }));
        setPreviewConfig(prev => ({ ...prev, primaryColor: settings.primary_color }));
      }

      if (settings.secondary_color) {
        setConfig(prev => ({ ...prev, secondaryColor: settings.secondary_color }));
        setPreviewConfig(prev => ({ ...prev, secondaryColor: settings.secondary_color }));
      }

    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyPreviewSettings = () => {
    document.documentElement.style.setProperty('--primary', previewConfig.primaryColor.hsl);
    document.documentElement.style.setProperty('--secondary', previewConfig.secondaryColor.hsl);
    document.documentElement.style.setProperty('--background', previewConfig.backgroundColor.hsl);
    document.documentElement.style.setProperty('--foreground', previewConfig.textColor.hsl);
    
    // Atualizar título da página
    document.title = previewConfig.systemName;
  };

  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleColorChange = (colorType: keyof Pick<WhitelabelConfig, 'primaryColor' | 'secondaryColor' | 'backgroundColor' | 'textColor'>, hex: string) => {
    const hsl = hexToHsl(hex);
    const newColor = {
      hsl,
      hex,
      name: `${colorType} Personalizada`
    };
    
    setPreviewConfig(prev => ({
      ...prev,
      [colorType]: newColor
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sla-anexos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('sla-anexos')
        .getPublicUrl(fileName);

      setPreviewConfig(prev => ({
        ...prev,
        logoUrl: urlData.publicUrl
      }));

      toast.success("Logo carregado com sucesso!");
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      toast.error("Erro ao carregar logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveSettings = async () => {
    if (!user || userRole !== 'super_admin') return;
    
    setSaving(true);
    try {
      // Salvar configuração whitelabel completa
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'whitelabel_config',
          setting_value: previewConfig as any,
          updated_by: user.id
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      setConfig(previewConfig);
      setHasChanges(false);
      
      toast.success("✅ Configurações salvas com sucesso!", {
        description: "O sistema foi personalizado conforme suas configurações."
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error("Erro ao salvar configurações", {
        description: "Tente novamente."
      });
    } finally {
      setSaving(false);
    }
  };

  const revertSettings = () => {
    setPreviewConfig(config);
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando personalização...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'super_admin') {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center mt-20">
          <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Apenas Super Administradores podem acessar as configurações de personalização.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Palette className="h-8 w-8" />
            Personalização Whitelabel
          </h1>
          <p className="text-muted-foreground">
            Configure o visual e funcionalidades do seu sistema.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={saveSettings}
            disabled={!hasChanges || saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button 
            variant="outline"
            onClick={revertSettings}
            disabled={!hasChanges}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reverter
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding" className="gap-2">
            <Type className="h-4 w-4" />
            Marca
          </TabsTrigger>
          <TabsTrigger value="colors" className="gap-2">
            <Palette className="h-4 w-4" />
            Cores
          </TabsTrigger>
          <TabsTrigger value="dashboards" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboards
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Identidade da Marca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="system-name">Nome do Sistema</Label>
                <Input
                  id="system-name"
                  value={previewConfig.systemName}
                  onChange={(e) => setPreviewConfig(prev => ({
                    ...prev,
                    systemName: e.target.value
                  }))}
                  placeholder="Digite o nome do seu sistema"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo-upload">Logo do Sistema</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="flex-1"
                  />
                  {previewConfig.logoUrl && (
                    <div className="w-20 h-20 border rounded-lg overflow-hidden">
                      <img 
                        src={previewConfig.logoUrl} 
                        alt="Logo preview" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
                {uploadingLogo && (
                  <p className="text-sm text-muted-foreground">Carregando logo...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cor Primária</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    type="color"
                    value={previewConfig.primaryColor.hex}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="w-20 h-12 p-1"
                  />
                  <Input
                    value={previewConfig.primaryColor.hex}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cor Secundária</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    type="color"
                    value={previewConfig.secondaryColor.hex}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    className="w-20 h-12 p-1"
                  />
                  <Input
                    value={previewConfig.secondaryColor.hex}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cor de Fundo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    type="color"
                    value={previewConfig.backgroundColor.hex}
                    onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                    className="w-20 h-12 p-1"
                  />
                  <Input
                    value={previewConfig.backgroundColor.hex}
                    onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cor do Texto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    type="color"
                    value={previewConfig.textColor.hex}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    className="w-20 h-12 p-1"
                  />
                  <Input
                    value={previewConfig.textColor.hex}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboards Disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overview"
                    checked={previewConfig.dashboards.overview}
                    onCheckedChange={(checked) => 
                      setPreviewConfig(prev => ({
                        ...prev,
                        dashboards: { ...prev.dashboards, overview: !!checked }
                      }))
                    }
                  />
                  <Label htmlFor="overview">Visão Geral</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metrics"
                    checked={previewConfig.dashboards.metrics}
                    onCheckedChange={(checked) => 
                      setPreviewConfig(prev => ({
                        ...prev,
                        dashboards: { ...prev.dashboards, metrics: !!checked }
                      }))
                    }
                  />
                  <Label htmlFor="metrics">Métricas SLA</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="kanban"
                    checked={previewConfig.dashboards.kanban}
                    onCheckedChange={(checked) => 
                      setPreviewConfig(prev => ({
                        ...prev,
                        dashboards: { ...prev.dashboards, kanban: !!checked }
                      }))
                    }
                  />
                  <Label htmlFor="kanban">Kanban</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="analytics"
                    checked={previewConfig.dashboards.analytics}
                    onCheckedChange={(checked) => 
                      setPreviewConfig(prev => ({
                        ...prev,
                        dashboards: { ...prev.dashboards, analytics: !!checked }
                      }))
                    }
                  />
                  <Label htmlFor="analytics">Analytics Avançado</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview em Tempo Real
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Sistema: {previewConfig.systemName}</h3>
                  {previewConfig.logoUrl && (
                    <img src={previewConfig.logoUrl} alt="Logo" className="h-12" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Cores Aplicadas:</h4>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: previewConfig.primaryColor.hex }}
                      />
                      <span className="text-sm">Primária</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: previewConfig.secondaryColor.hex }}
                      />
                      <span className="text-sm">Secundária</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Dashboards Ativos:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(previewConfig.dashboards)
                      .filter(([_, enabled]) => enabled)
                      .map(([dashboard, _]) => (
                        <Badge key={dashboard} variant="secondary">
                          {dashboard === 'overview' ? 'Visão Geral' :
                           dashboard === 'metrics' ? 'Métricas SLA' :
                           dashboard === 'kanban' ? 'Kanban' :
                           'Analytics Avançado'}
                        </Badge>
                      ))
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-card border rounded-lg shadow-lg p-4">
          <div className="text-center text-sm text-muted-foreground">
            ⚠️ Você tem alterações não salvas
          </div>
        </div>
      )}
    </div>
  );
}