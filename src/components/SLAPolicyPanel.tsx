import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Save, History, AlertCircle } from 'lucide-react';
import { useSLAPolicies, type SLAPolicy } from '@/hooks/useSLAPolicies';
import { usePermissions } from '@/hooks/usePermissions';

interface Setor {
  id: string;
  nome: string;
  descricao?: string;
}

interface SLAPolicyPanelProps {
  setores: Setor[];
}

export const SLAPolicyPanel = ({ setores }: SLAPolicyPanelProps) => {
  const { policies, loading, updatePolicy, createPolicy, getPolicyBySetor } = useSLAPolicies();
  const { userSetores } = usePermissions();
  const [selectedSetorId, setSelectedSetorId] = useState<string>('');
  const [timeUnit, setTimeUnit] = useState<'hours' | 'days'>('hours');
  const [editedPolicy, setEditedPolicy] = useState<Partial<SLAPolicy> | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedSetor = setores.find(s => s.id === selectedSetorId);
  const currentPolicy = selectedSetorId ? getPolicyBySetor(selectedSetorId) : null;

  const handleSetorChange = (setorId: string) => {
    setSelectedSetorId(setorId);
    const policy = getPolicyBySetor(setorId);
    
    if (policy) {
      setEditedPolicy(policy);
    } else {
      // Criar política padrão
      setEditedPolicy({
        mode: 'FIXO',
        p0_hours: 4,
        p1_hours: 24,
        p2_hours: 72,
        p3_hours: 168,
        allow_superadmin_override: true,
      });
    }
  };

  const handlePolicyUpdate = (field: keyof SLAPolicy, value: any) => {
    if (!editedPolicy) return;
    
    setEditedPolicy({
      ...editedPolicy,
      [field]: value,
    });
  };

  const handleTimeChange = (level: 'p0' | 'p1' | 'p2' | 'p3', value: string) => {
    if (!editedPolicy) return;
    
    const numValue = parseInt(value) || 0;
    const hours = timeUnit === 'days' ? numValue * 24 : numValue;
    
    setEditedPolicy({
      ...editedPolicy,
      [`${level}_hours`]: hours,
    });
  };

  const convertToDisplayValue = (hours: number): number => {
    return timeUnit === 'days' ? Math.round(hours / 24) : hours;
  };

  const handleSave = async () => {
    if (!editedPolicy || !selectedSetorId) return;
    
    setSaving(true);
    try {
      if (currentPolicy) {
        await updatePolicy(currentPolicy.id, editedPolicy);
      } else {
        await createPolicy(selectedSetorId, editedPolicy);
      }
    } finally {
      setSaving(false);
    }
  };

  const isOperatorMode = editedPolicy?.mode === 'PERSONALIZADO';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Políticas de SLA por Setor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção de Setor */}
          <div className="space-y-2">
            <Label htmlFor="setor-select">Setor</Label>
            <Select value={selectedSetorId} onValueChange={handleSetorChange}>
              <SelectTrigger id="setor-select">
                <SelectValue placeholder="Selecione um setor" />
              </SelectTrigger>
              <SelectContent>
                {setores.map((setor) => (
                  <SelectItem key={setor.id} value={setor.id}>
                    {setor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editedPolicy && selectedSetor && (
            <>
              <Separator />
              
              {/* Modo de SLA */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Modo de SLA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Tipo de Prazo</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant={editedPolicy.mode === 'FIXO' ? 'default' : 'outline'}>
                          Fixo
                        </Badge>
                        <Switch
                          checked={editedPolicy.mode === 'PERSONALIZADO'}
                          onCheckedChange={(checked) =>
                            handlePolicyUpdate('mode', checked ? 'PERSONALIZADO' : 'FIXO')
                          }
                        />
                        <Badge variant={editedPolicy.mode === 'PERSONALIZADO' ? 'default' : 'outline'}>
                          Personalizado
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {editedPolicy.mode === 'FIXO' 
                        ? 'Prazos automáticos por P0-P3, definidos abaixo. Operadores não podem alterar.'
                        : 'Usuários do setor definem prazo por ticket individualmente.'
                      }
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* SLA Fixo por Criticidade */}
              {editedPolicy.mode === 'FIXO' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">SLA Fixo por Criticidade</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Label>Unidade:</Label>
                      <Select value={timeUnit} onValueChange={(value: 'hours' | 'days') => setTimeUnit(value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">Horas</SelectItem>
                          <SelectItem value="days">Dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="p0-time">P0 (Crítico)</Label>
                        <Input
                          id="p0-time"
                          type="number"
                          min="1"
                          value={convertToDisplayValue(editedPolicy.p0_hours || 4)}
                          onChange={(e) => handleTimeChange('p0', e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {editedPolicy.p0_hours || 4} horas
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="p1-time">P1 (Alto)</Label>
                        <Input
                          id="p1-time"
                          type="number"
                          min="1"
                          value={convertToDisplayValue(editedPolicy.p1_hours || 24)}
                          onChange={(e) => handleTimeChange('p1', e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {editedPolicy.p1_hours || 24} horas
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="p2-time">P2 (Médio)</Label>
                        <Input
                          id="p2-time"
                          type="number"
                          min="1"
                          value={convertToDisplayValue(editedPolicy.p2_hours || 72)}
                          onChange={(e) => handleTimeChange('p2', e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {editedPolicy.p2_hours || 72} horas
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="p3-time">P3 (Baixo)</Label>
                        <Input
                          id="p3-time"
                          type="number"
                          min="1"
                          value={convertToDisplayValue(editedPolicy.p3_hours || 168)}
                          onChange={(e) => handleTimeChange('p3', e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {editedPolicy.p3_hours || 168} horas
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Botão Salvar */}
              <Button 
                onClick={handleSave} 
                disabled={saving || loading}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Política'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};