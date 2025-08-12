import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Save, RotateCcw, Sparkles, AlertTriangle, Upload, Image, Type, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


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

export default function WhitelabelCustomization() {
  const { user, profile } = useAuth();
  const { systemName, systemLogo, updateSystemName, updateSystemLogo, updateColors, clearCache } = useSystemConfig();
  const [currentColor, setCurrentColor] = useState<ColorData>({ hsl: '142 76% 36%', hex: '#16a34a', name: 'Verde Padrão' });
  const [currentSecondaryColor, setCurrentSecondaryColor] = useState<ColorData>({ hsl: '262 83% 58%', hex: '#8b5cf6', name: 'Roxo Padrão' });
  const [previewColor, setPreviewColor] = useState<ColorData>({ hsl: '', hex: '', name: '' });
  const [previewSecondaryColor, setPreviewSecondaryColor] = useState<ColorData>({ hsl: '', hex: '', name: '' });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [colorCombinations, setColorCombinations] = useState<ColorCombination[]>([]);
  
  // Estados para personalização
  const [newSystemName, setNewSystemName] = useState('Manhattan');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (user && profile) {
      setUserRole(profile.role);
      loadCurrentColors();
      loadColorCombinations();
      setLoading(false);
    }
  }, [user, profile]);

  // Sincronizar newSystemName com systemName do hook
  useEffect(() => {
    setNewSystemName(systemName);
    setLogoPreview(systemLogo);
  }, [systemName, systemLogo]);

  const loadCurrentColors = async () => {
    try {
      const [primaryResponse, secondaryResponse, nameResponse, logoResponse] = await Promise.all([
        supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'primary_color')
          .single(),
        supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'secondary_color')
          .single(),
        supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'system_name')
          .single(),
        supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'system_logo')
          .single()
      ]);

      if (primaryResponse.data?.setting_value) {
        const primaryColorData = primaryResponse.data.setting_value as unknown as ColorData;
        setCurrentColor(primaryColorData);
        setPreviewColor(primaryColorData);
        applyPreviewColors(primaryColorData.hsl, currentSecondaryColor.hsl);
      }

      if (secondaryResponse.data?.setting_value) {
        const secondaryColorData = secondaryResponse.data.setting_value as unknown as ColorData;
        setCurrentSecondaryColor(secondaryColorData);
        setPreviewSecondaryColor(secondaryColorData);
        applyPreviewColors(currentColor.hsl, secondaryColorData.hsl);
      }

      if (nameResponse.data?.setting_value) {
        const nameValue = nameResponse.data.setting_value as string;
        setNewSystemName(nameValue);
      }

      if (logoResponse.data?.setting_value) {
        const logoValue = logoResponse.data.setting_value as string;
        setLogoPreview(logoValue);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do sistema:', error);
    }
  };

  const loadColorCombinations = async () => {
    try {
      const { data, error } = await supabase
        .from('lib_color_combinations')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(10);

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
    if (hex.startsWith('#') && hex.length === 7) {
      const hsl = hexToHsl(hex);
      const newColor = { hsl, hex, name: 'Cor Personalizada' };
      setPreviewColor(newColor);
      applyPreviewColors(hsl, previewSecondaryColor.hsl);
      setHasChanges(true);
    }
  };

  const handleSecondaryColorChange = (hex: string) => {
    if (hex.startsWith('#') && hex.length === 7) {
      const hsl = hexToHsl(hex);
      const newColor = { hsl, hex, name: 'Cor Secundária Personalizada' };
      setPreviewSecondaryColor(newColor);
      applyPreviewColors(previewColor.hsl, hsl);
      setHasChanges(true);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        toast.error("Erro", {
          description: "Por favor, selecione apenas arquivos de imagem."
        });
        return;
      }

      // Verificar tamanho do arquivo (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Erro", {
          description: "A imagem deve ter no máximo 2MB."
        });
        return;
      }

      setLogoFile(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSystemSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Aplicar mudanças imediatamente no CSS para feedback visual instantâneo
      if (previewColor.hsl) {
        document.documentElement.style.setProperty('--primary', previewColor.hsl);
      }
      if (previewSecondaryColor.hsl) {
        document.documentElement.style.setProperty('--secondary', previewSecondaryColor.hsl);
      }

      const saveOperations = [];

      // Salvar cor primária
      if (previewColor.hsl) {
        saveOperations.push(
          supabase
            .from('system_settings')
            .upsert({
              setting_key: 'primary_color',
              setting_value: previewColor as any,
              updated_by: user.id
            }, {
              onConflict: 'setting_key'
            })
        );
      }

      // Salvar cor secundária
      if (previewSecondaryColor.hsl) {
        saveOperations.push(
          supabase
            .from('system_settings')
            .upsert({
              setting_key: 'secondary_color',
              setting_value: previewSecondaryColor as any,
              updated_by: user.id
            }, {
              onConflict: 'setting_key'
            })
        );
      }

      // Salvar nome do sistema se mudou
      if (newSystemName !== systemName) {
        saveOperations.push(
          supabase
            .from('system_settings')
            .upsert({
              setting_key: 'system_name',
              setting_value: newSystemName,
              updated_by: user.id
            }, {
              onConflict: 'setting_key'
            })
        );
        
        // Atualizar contexto global imediatamente  
        updateSystemName(newSystemName);
      }

      // Upload da logo se houver arquivo
      let logoUrl = logoPreview;
      if (logoFile) {
        setUploadingLogo(true);
        try {
          const fileExt = logoFile.name.split('.').pop();
          const fileName = `logo-${Date.now()}.${fileExt}`;
          
          // Primeiro, fazer upload do arquivo
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('sla-anexos')
            .upload(`system/${fileName}`, logoFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Erro no upload:', uploadError);
            throw new Error(`Erro ao fazer upload da logo: ${uploadError.message}`);
          }

          // Obter URL pública
          const { data: urlData } = supabase.storage
            .from('sla-anexos')
            .getPublicUrl(`system/${fileName}`);

          if (!urlData.publicUrl) {
            throw new Error('Erro ao obter URL pública da logo');
          }

          logoUrl = urlData.publicUrl;
          console.log('Logo uploaded successfully:', logoUrl);

          // Salvar URL da logo
          saveOperations.push(
            supabase
              .from('system_settings')
              .upsert({
                setting_key: 'system_logo',
                setting_value: logoUrl,
                updated_by: user.id
              }, {
                onConflict: 'setting_key'
              })
          );
          
          // Atualizar contexto global imediatamente
          updateSystemLogo(logoUrl);
          
        } catch (logoError) {
          console.error('Erro completo no upload da logo:', logoError);
          setUploadingLogo(false);
          toast.error("Erro no upload da logo", {
            description: `Erro: ${logoError instanceof Error ? logoError.message : 'Erro desconhecido'}`
          });
          return; // Não continuar se o upload falhou
        }
        setUploadingLogo(false);
      }

      // Executar todas as operações em paralelo
      const results = await Promise.all(saveOperations);
      
      // Verificar erros
      for (const result of results) {
        if (result.error) throw result.error;
      }

      // Adicionar combinação de cores ao histórico (não bloquear o save principal)
      if (hasChanges && previewColor.hsl && previewSecondaryColor.hsl) {
        supabase
          .from('lib_color_combinations')
          .insert({
            primary_color_hsl: previewColor.hsl,
            primary_color_hex: previewColor.hex,
            secondary_color_hsl: previewSecondaryColor.hsl,
            secondary_color_hex: previewSecondaryColor.hex,
            combination_name: `${previewColor.name} + ${previewSecondaryColor.name}`,
            used_by: user.id
          })
          .then(() => loadColorCombinations());
      }

      // Atualizar estados locais e contexto global
      setCurrentColor(previewColor);
      setCurrentSecondaryColor(previewSecondaryColor);
      updateColors(previewColor, previewSecondaryColor);
      setHasChanges(false);
      setLogoFile(null);
      
      // Não precisamos mais limpar cache - o contexto global gerencia tudo
      // clearCache();
      
      toast.success("Configurações salvas com sucesso!", {
        description: "As mudanças foram aplicadas instantaneamente para todos os usuários."
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error("Erro ao salvar configurações", {
        description: "Tente novamente."
      });
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };

  const revertColors = () => {
    setPreviewColor(currentColor);
    setPreviewSecondaryColor(currentSecondaryColor);
    setNewSystemName(systemName);
    setLogoPreview(systemLogo);
    setLogoFile(null);
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
    setHasChanges(true);
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
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Palette className="h-8 w-8" />
              Personalização do Sistema
            </h1>
            <p className="text-muted-foreground">
              Customize o nome, logo e cores do seu sistema. As mudanças são aplicadas em tempo real.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Painel de Configuração */}
            <div className="space-y-6">
              {/* Nome do Sistema */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    Nome do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="system-name">Nome Personalizado</Label>
                    <Input
                      id="system-name"
                      value={newSystemName}
                      onChange={(e) => {
                        setNewSystemName(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="Ex: Minha Empresa"
                      className="font-medium"
                    />
                    <p className="text-xs text-muted-foreground">
                      Este nome aparecerá no header e em todo o sistema
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Logo do Sistema */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Logo do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo-upload">Upload da Logo</Label>
                    <div className="flex items-center gap-4">
                      {logoPreview && (
                        <img 
                          src={logoPreview} 
                          alt="Preview da logo" 
                          className="w-16 h-16 object-contain border rounded-lg p-2" 
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG ou SVG. Máximo 2MB.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                      onClick={saveSystemSettings}
                      disabled={!hasChanges || saving || uploadingLogo}
                      className="flex-1"
                    >
                      {(saving || uploadingLogo) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Salvando...' : uploadingLogo ? 'Enviando logo...' : 'Salvar Alterações'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={revertColors}
                      disabled={!hasChanges || saving}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reverter
                    </Button>
                  </div>
                  {!hasChanges && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Nenhuma alteração pendente
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Combinações Recentes */}
              {colorCombinations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Combinações Recentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {colorCombinations.slice(0, 5).map((combination) => (
                        <div
                          key={combination.id}
                          className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => selectCombination(combination)}
                        >
                          <div className="flex items-center gap-3">
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
                            <span className="text-sm">{combination.combination_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(combination.used_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Preview do Sistema */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preview do Sistema</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Veja como suas personalizações ficam em tempo real
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Informações Atuais */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Configuração Atual</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Nome:</span>
                          <span className="ml-2 font-medium">{systemName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Cores:</span>
                          <div className="flex gap-1">
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: currentColor.hex }}
                            />
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: currentSecondaryColor.hex }}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Preview</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Nome:</span>
                          <span className="ml-2 font-medium">{newSystemName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Cores:</span>
                          <div className="flex gap-1">
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: previewColor.hex }}
                            />
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: previewSecondaryColor.hex }}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Preview de Componentes */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Componentes com Nova Identidade</h4>
                    
                    {/* Simulação do Header */}
                    <div className="p-4 border rounded-lg bg-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {logoPreview && (
                            <img 
                              src={logoPreview} 
                              alt="Logo preview" 
                              className="h-6 w-6 object-contain" 
                            />
                          )}
                          <span className="font-bold text-lg">{newSystemName}</span>
                        </div>
                        <Badge>Sistema Tickets</Badge>
                      </div>
                    </div>

                    {/* Botões Preview */}
                    <div className="space-y-2">
                      <Button className="w-full">Botão Primário</Button>
                      <Button variant="outline" className="w-full">Botão Secundário</Button>
                    </div>

                    {/* Badges Preview */}
                    <div className="flex gap-2 flex-wrap">
                      <Badge>P0 - Crítico</Badge>
                      <Badge variant="secondary">Em Andamento</Badge>
                      <Badge variant="outline">Resolvido</Badge>
                    </div>

                    {/* Card Preview */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Card de Exemplo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          Este é um exemplo de como os cards ficam com a nova identidade visual.
                        </p>
                      </CardContent>
                    </Card>

                    {/* Link Preview */}
                    <div className="p-4 border rounded-lg">
                      <a href="#" className="text-primary hover:underline font-medium">
                        Link com cor primária
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}