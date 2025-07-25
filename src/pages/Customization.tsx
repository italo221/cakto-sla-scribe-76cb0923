import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Palette, Save, RotateCcw, Clock, AlertTriangle } from "lucide-react";
import Navigation from "@/components/Navigation";
import { cn } from "@/lib/utils";

interface ColorData {
  hsl: string;
  hex: string;
  name: string;
}

interface ColorHistoryItem {
  id: string;
  color_hsl: string;
  color_hex: string;
  color_name: string;
  used_at: string;
}

export default function Customization() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('viewer');
  const [currentColor, setCurrentColor] = useState<ColorData>({
    hsl: "142 86% 28%",
    hex: "#16a34a", 
    name: "Verde Padrão"
  });
  const [previewColor, setPreviewColor] = useState<ColorData>(currentColor);
  const [colorHistory, setColorHistory] = useState<ColorHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadUserRole();
    loadCurrentSettings();
    loadColorHistory();
  }, [user]);

  useEffect(() => {
    setHasChanges(previewColor.hex !== currentColor.hex);
  }, [previewColor, currentColor]);

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
        .select('setting_value')
        .eq('setting_key', 'primary_color')
        .single();

      if (error) throw error;
      
      if (data) {
        const colorData = data.setting_value as unknown as ColorData;
        setCurrentColor(colorData);
        setPreviewColor(colorData);
        // Aplicar cor atual no preview
        applyPreviewColor(colorData.hsl);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadColorHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('color_history')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setColorHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
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

  const applyPreviewColor = (hslColor: string) => {
    document.documentElement.style.setProperty('--primary', hslColor);
  };

  const handleColorChange = (hex: string) => {
    const hsl = hexToHsl(hex);
    const newColor = {
      hsl,
      hex,
      name: `Cor Personalizada`
    };
    setPreviewColor(newColor);
    applyPreviewColor(hsl);
  };

  const saveColor = async () => {
    if (!user || userRole !== 'super_admin') return;
    
    setSaving(true);
    try {
      // Salvar configuração principal
      const { error: settingsError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'primary_color',
          setting_value: previewColor as any,
          updated_by: user.id
        });

      if (settingsError) throw settingsError;

      // Adicionar ao histórico
      const { error: historyError } = await supabase
        .from('color_history')
        .insert({
          color_hsl: previewColor.hsl,
          color_hex: previewColor.hex,
          color_name: previewColor.name,
          used_by: user.id
        });

      if (historyError) throw historyError;

      setCurrentColor(previewColor);
      setHasChanges(false);
      await loadColorHistory();
      
      toast.success("✅ Cor salva com sucesso!", {
        description: "A nova cor primária foi aplicada ao sistema."
      });
    } catch (error) {
      console.error('Erro ao salvar cor:', error);
      toast.error("Erro ao salvar cor", {
        description: "Tente novamente."
      });
    } finally {
      setSaving(false);
    }
  };

  const revertColor = () => {
    setPreviewColor(currentColor);
    applyPreviewColor(currentColor.hsl);
    setHasChanges(false);
  };

  const selectHistoryColor = (historyItem: ColorHistoryItem) => {
    const colorData = {
      hsl: historyItem.color_hsl,
      hex: historyItem.color_hex,
      name: historyItem.color_name
    };
    setPreviewColor(colorData);
    applyPreviewColor(colorData.hsl);
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
              🎨 Personalização do Sistema
            </h1>
            <p className="text-muted-foreground">
              Customize as cores e o visual do seu SaaS. As mudanças são aplicadas em tempo real.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Painel de Configuração */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Cor Primária
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="color-picker">Selecionar Cor</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="color-picker"
                        type="color"
                        value={previewColor.hex}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-20 h-12 p-1 border rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <Input
                          value={previewColor.hex}
                          onChange={(e) => handleColorChange(e.target.value)}
                          placeholder="#16a34a"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          HSL: {previewColor.hsl}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={saveColor}
                      disabled={!hasChanges || saving}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={revertColor}
                      disabled={!hasChanges}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reverter
                    </Button>
                  </div>

                  {hasChanges && (
                    <div className="text-center text-sm text-muted-foreground">
                      ⚠️ Você tem alterações não salvas
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Histórico de Cores */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Cores Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {colorHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma cor salva ainda
                      </p>
                    ) : (
                      colorHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => selectHistoryColor(item)}
                        >
                          <div 
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: item.color_hex }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.color_name}</p>
                            <p className="text-xs text-muted-foreground">{item.color_hex}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {new Date(item.used_at).toLocaleDateString('pt-BR')}
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
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Botões Primários</Label>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm">Botão Principal</Button>
                        <Button size="sm" variant="outline">Outline</Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Badges e Tags</Label>
                      <div className="flex gap-2 mt-2">
                        <Badge>Ativo</Badge>
                        <Badge variant="secondary">Secundário</Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Links e Textos</Label>
                      <div className="mt-2">
                        <a href="#" className="text-primary hover:underline text-sm">
                          Link com cor primária
                        </a>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Cards</Label>
                      <Card className="mt-2 border-l-4 border-l-primary">
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm">Card de Exemplo</h4>
                          <p className="text-xs text-muted-foreground">
                            Este card mostra como fica com a nova cor
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ℹ️ Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Cor Atual:</strong> {currentColor.name}</p>
                  <p><strong>Preview:</strong> {previewColor.name}</p>
                  <p className="text-muted-foreground">
                    💡 As alterações são aplicadas instantaneamente no preview, 
                    mas só afetam todo o sistema após salvar.
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