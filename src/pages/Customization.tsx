import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Palette, Save, RotateCcw, Clock, AlertTriangle, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import { cn } from "@/lib/utils";

interface ColorData {
  hsl: string;
  hex: string;
  name: string;
}

interface ColorCombination {
  id: string;
  primary_color_hsl: string;
  primary_color_hex: string;
  secondary_color_hsl: string;
  secondary_color_hex: string;
  combination_name: string;
  used_at: string;
}

export default function Customization() {
  return <WhitelabelCustomization />;
}

function WhitelabelCustomization() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('viewer');
  const [currentColor, setCurrentColor] = useState<ColorData>({
    hsl: "142 86% 28%",
    hex: "#16a34a", 
    name: "Verde Padrão"
  });
  const [currentSecondaryColor, setCurrentSecondaryColor] = useState<ColorData>({
    hsl: "262 83% 58%",
    hex: "#8b5cf6",
    name: "Roxo Padrão"
  });
  const [previewColor, setPreviewColor] = useState<ColorData>(currentColor);
  const [previewSecondaryColor, setPreviewSecondaryColor] = useState<ColorData>(currentSecondaryColor);
  const [colorCombinations, setColorCombinations] = useState<ColorCombination[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadUserRole();
    loadCurrentSettings();
    loadColorCombinations();
  }, [user]);

  useEffect(() => {
    setHasChanges(
      previewColor.hex !== currentColor.hex || 
      previewSecondaryColor.hex !== currentSecondaryColor.hex
    );
  }, [previewColor, currentColor, previewSecondaryColor, currentSecondaryColor]);

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
      // Carregar cor primária
      const { data: primaryData, error: primaryError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'primary_color')
        .single();

      if (primaryError) throw primaryError;
      
      if (primaryData) {
        const colorData = primaryData.setting_value as unknown as ColorData;
        setCurrentColor(colorData);
        setPreviewColor(colorData);
        applyPreviewColors(colorData.hsl, previewSecondaryColor.hsl);
      }

      // Carregar cor secundária
      const { data: secondaryData, error: secondaryError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'secondary_color')
        .single();

      if (secondaryError) throw secondaryError;
      
      if (secondaryData) {
        const colorData = secondaryData.setting_value as unknown as ColorData;
        setCurrentSecondaryColor(colorData);
        setPreviewSecondaryColor(colorData);
        applyPreviewColors(previewColor.hsl, colorData.hsl);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadColorCombinations = async () => {
    try {
      const { data, error } = await supabase
        .from('color_combinations')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setColorCombinations(data || []);
    } catch (error) {
      console.error('Erro ao carregar combinações:', error);
    }
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

  const applyPreviewColors = (primaryHsl: string, secondaryHsl: string) => {
    document.documentElement.style.setProperty('--primary', primaryHsl);
    document.documentElement.style.setProperty('--secondary', secondaryHsl);
  };

  const handlePrimaryColorChange = (hex: string) => {
    const hsl = hexToHsl(hex);
    const newColor = {
      hsl,
      hex,
      name: 'Cor Primária Personalizada'
    };
    setPreviewColor(newColor);
    applyPreviewColors(hsl, previewSecondaryColor.hsl);
  };

  const handleSecondaryColorChange = (hex: string) => {
    const hsl = hexToHsl(hex);
    const newColor = {
      hsl,
      hex,
      name: 'Cor Secundária Personalizada'
    };
    setPreviewSecondaryColor(newColor);
    applyPreviewColors(previewColor.hsl, hsl);
  };

  const saveColors = async () => {
    if (!user || userRole !== 'super_admin') return;
    
    setSaving(true);
    try {
      // Salvar cor primária
      const { error: primaryError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'primary_color',
          setting_value: previewColor as any,
          updated_by: user.id
        }, {
          onConflict: 'setting_key'
        });

      if (primaryError) throw primaryError;

      // Salvar cor secundária
      const { error: secondaryError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'secondary_color',
          setting_value: previewSecondaryColor as any,
          updated_by: user.id
        }, {
          onConflict: 'setting_key'
        });

      if (secondaryError) throw secondaryError;

      // Adicionar combinação ao histórico
      const { error: combinationError } = await supabase
        .from('color_combinations')
        .insert({
          primary_color_hsl: previewColor.hsl,
          primary_color_hex: previewColor.hex,
          secondary_color_hsl: previewSecondaryColor.hsl,
          secondary_color_hex: previewSecondaryColor.hex,
          combination_name: `${previewColor.name} + ${previewSecondaryColor.name}`,
          used_by: user.id
        });

      if (combinationError) throw combinationError;

      setCurrentColor(previewColor);
      setCurrentSecondaryColor(previewSecondaryColor);
      setHasChanges(false);
      await loadColorCombinations();
      
      toast.success("✅ Cores salvas com sucesso!", {
        description: "As novas cores foram aplicadas ao sistema."
      });
    } catch (error) {
      console.error('Erro ao salvar cores:', error);
      toast.error("Erro ao salvar cores", {
        description: "Tente novamente."
      });
    } finally {
      setSaving(false);
    }
  };

  const revertColors = () => {
    setPreviewColor(currentColor);
    setPreviewSecondaryColor(currentSecondaryColor);
    applyPreviewColors(currentColor.hsl, currentSecondaryColor.hsl);
    setHasChanges(false);
  };

  const selectCombination = (combination: ColorCombination) => {
    const primaryData = {
      hsl: combination.primary_color_hsl,
      hex: combination.primary_color_hex,
      name: 'Cor Primária do Histórico'
    };
    const secondaryData = {
      hsl: combination.secondary_color_hsl,
      hex: combination.secondary_color_hex,
      name: 'Cor Secundária do Histórico'
    };
    setPreviewColor(primaryData);
    setPreviewSecondaryColor(secondaryData);
    applyPreviewColors(primaryData.hsl, secondaryData.hsl);
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
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="p-6">
          <div className="max-w-4xl mx-auto text-center mt-20">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Apenas Super Administradores podem acessar as configurações de personalização.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Palette className="h-8 w-8" />
              Personalização do Sistema
            </h1>
            <p className="text-muted-foreground">
              Customize as cores primária e secundária do seu SaaS. As mudanças são aplicadas em tempo real.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Painel de Configuração */}
            <div className="space-y-6">
              {/* Cor Primária */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Cor Primária
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color-picker">Selecionar Cor Primária</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="primary-color-picker"
                        type="color"
                        value={previewColor.hex}
                        onChange={(e) => handlePrimaryColorChange(e.target.value)}
                        className="w-20 h-12 p-1 border rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <Input
                          value={previewColor.hex}
                          onChange={(e) => handlePrimaryColorChange(e.target.value)}
                          placeholder="#16a34a"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          HSL: {previewColor.hsl}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cor Secundária */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Cor Secundária (Gradients)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="secondary-color-picker">Selecionar Cor Secundária</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="secondary-color-picker"
                        type="color"
                        value={previewSecondaryColor.hex}
                        onChange={(e) => handleSecondaryColorChange(e.target.value)}
                        className="w-20 h-12 p-1 border rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <Input
                          value={previewSecondaryColor.hex}
                          onChange={(e) => handleSecondaryColorChange(e.target.value)}
                          placeholder="#8b5cf6"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          HSL: {previewSecondaryColor.hsl}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Controles */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <Button 
                      onClick={saveColors}
                      disabled={!hasChanges || saving}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={revertColors}
                      disabled={!hasChanges}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reverter
                    </Button>
                  </div>

                  {hasChanges && (
                    <div className="text-center text-sm text-muted-foreground mt-4">
                      ⚠️ Você tem alterações não salvas
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Combinações Recentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Combinações Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {colorCombinations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma combinação salva ainda
                      </p>
                    ) : (
                      colorCombinations.map((combination) => (
                        <div
                          key={combination.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors border"
                          onClick={() => selectCombination(combination)}
                        >
                          <div className="flex gap-1">
                            <div 
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: combination.primary_color_hex }}
                            />
                            <div 
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: combination.secondary_color_hex }}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{combination.combination_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {combination.primary_color_hex} + {combination.secondary_color_hex}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {new Date(combination.used_at).toLocaleDateString('pt-BR')}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview do Sistema */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>👁️ Preview em Tempo Real</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Botões com Gradiente</Label>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                        >
                          Botão Gradiente
                        </Button>
                        <Button size="sm">Botão Principal</Button>
                        <Button size="sm" variant="outline">Outline</Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Badges e Tags</Label>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge className="bg-primary">Primária</Badge>
                        <Badge className="bg-secondary">Secundária</Badge>
                        <Badge className="bg-gradient-to-r from-primary to-secondary text-white">Gradiente</Badge>
                        <Badge variant="outline" className="border-primary">Contorno</Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Cards com Destaque</Label>
                      <div className="space-y-2 mt-2">
                        <Card className="border-l-4 border-l-primary">
                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm">Card Primário</h4>
                            <p className="text-xs text-muted-foreground">
                              Com borda da cor primária
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-secondary">
                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm">Card Secundário</h4>
                            <p className="text-xs text-muted-foreground">
                              Com borda da cor secundária
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm">Card Gradiente</h4>
                            <p className="text-xs text-muted-foreground">
                              Com fundo gradiente sutil
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Links e Textos</Label>
                      <div className="mt-2 space-y-1">
                        <div>
                          <a href="#" className="text-primary hover:underline text-sm">
                            Link com cor primária
                          </a>
                        </div>
                        <div>
                          <a href="#" className="text-secondary hover:underline text-sm">
                            Link com cor secundária
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ℹ️ Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Cor Primária Atual:</strong> {currentColor.name}</p>
                  <p><strong>Cor Secundária Atual:</strong> {currentSecondaryColor.name}</p>
                  <p><strong>Preview Primário:</strong> {previewColor.name}</p>
                  <p><strong>Preview Secundário:</strong> {previewSecondaryColor.name}</p>
                  <p className="text-muted-foreground">
                    💡 As alterações são aplicadas instantaneamente no preview. 
                    Use gradientes e combinações para criar um visual moderno e elegante.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}