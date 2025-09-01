import React, { useState } from 'react';
import { TeamTagSelector } from '@/components/ui/team-tag-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function TagDemo() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formTags, setFormTags] = useState<string[]>([]);

  const handleSave = () => {
    toast.success(`Tags salvas: ${selectedTags.join(', ')}`);
  };

  const handleFormSave = () => {
    toast.success(`Ticket criado com tags: ${formTags.join(', ')}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Sistema de Tags Organizadas</h1>
        <p className="text-muted-foreground">
          Demonstração do novo sistema de tags organizadas por Time/Setor
        </p>
      </div>

      <Tabs defaultValue="selector" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="selector">Seletor Básico</TabsTrigger>
          <TabsTrigger value="form">Formulário de Ticket</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="selector" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seletor de Tags Básico</CardTitle>
              <CardDescription>
                Selecione um time primeiro, depois escolha as tags daquele time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TeamTagSelector
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                placeholder="Selecione tags..."
                maxTags={5}
                allowCreateTag={true}
              />
              
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tags Selecionadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.length > 0 ? (
                      selectedTags.map(tag => (
                        <Badge key={tag} variant="default">{tag}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhuma tag selecionada</span>
                    )}
                  </div>
                </div>
                
                <Button onClick={handleSave} disabled={selectedTags.length === 0}>
                  Salvar Tags
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulação de Criação de Ticket</CardTitle>
              <CardDescription>
                Como seria a seleção de tags em um formulário real de ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título do Ticket</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Conta bloqueada após transferência"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição</label>
                  <textarea 
                    placeholder="Descreva o problema..."
                    className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                  />
                </div>

                <TeamTagSelector
                  selectedTags={formTags}
                  onTagsChange={setFormTags}
                  placeholder="Categorize este ticket..."
                  maxTags={3}
                  allowCreateTag={true}
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleFormSave}>
                  Criar Ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>✅ Funcionalidades Implementadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>• Seleção obrigatória de Time antes das tags</div>
                <div>• Opção GERAL para visualizar todas as tags</div>
                <div>• Tags organizadas por Time/Setor</div>
                <div>• Criação de novas tags dentro do time selecionado</div>
                <div>• Compatibilidade total com sistema antigo</div>
                <div>• Tags globais visíveis em todos os times</div>
                <div>• Interface responsiva e acessível</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔄 Compatibilidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>• Todas as tags existentes foram migradas</div>
                <div>• Tags antigas aparecem como globais</div>
                <div>• Sistema antigo continua funcionando</div>
                <div>• Nenhum ticket foi afetado</div>
                <div>• Transição gradual possível</div>
                <div>• Zero quebras de funcionalidade</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🎯 Como Usar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>1.</strong> Selecione um Time (obrigatório)</div>
                <div><strong>2.</strong> Escolha "GERAL" para ver todas as tags</div>
                <div><strong>3.</strong> Ou escolha um time específico</div>
                <div><strong>4.</strong> Selecione as tags daquele time</div>
                <div><strong>5.</strong> Crie novas tags se necessário</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⚙️ Administração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>• Admins podem criar tags em qualquer time</div>
                <div>• Usuários só criam tags nos seus times</div>
                <div>• Tags podem ser organizadas por setor</div>
                <div>• Sistema de permissões respeitado</div>
                <div>• Logs de auditoria mantidos</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}