import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FileUploader from "@/components/FileUploader";
import { Lightbulb, Building2 } from "lucide-react";

interface MelhoriaTicketCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Setor {
  id: string;
  nome: string;
}

export default function MelhoriaTicketCreator({ open, onOpenChange, onSuccess }: MelhoriaTicketCreatorProps) {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    setor_id: "",
    titulo: "",
    descricao: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSetores();
      resetForm();
    }
  }, [open]);

  const loadSetores = async () => {
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os setores.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      setor_id: "",
      titulo: "",
      descricao: "",
    });
    setUploadedFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.setor_id || !formData.titulo || !formData.descricao) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const setorSelecionado = setores.find(s => s.id === formData.setor_id);
      
      const ticketData = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        setor_id: formData.setor_id,
        time_responsavel: setorSelecionado?.nome || "",
        solicitante: profile?.email || user?.email || "",
        tipo_ticket: "feedback_sugestao",
        status: "aberto",
        nivel_criticidade: "P3",
        pontuacao_financeiro: 0,
        pontuacao_cliente: 0,
        pontuacao_reputacao: 0,
        pontuacao_urgencia: 0,
        pontuacao_operacional: 0,
        pontuacao_total: 0,
        anexos: uploadedFiles.length > 0 ? uploadedFiles : null,
      };

      const { data, error } = await supabase
        .from('sla_demandas')
        .insert([ticketData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Ticket de melhoria criado com sucesso.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o ticket de melhoria.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Criar Ticket de Melhoria
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="setor">
              A qual setor está relacionado este ticket? *
            </Label>
            <Select 
              value={formData.setor_id} 
              onValueChange={(value) => setFormData({ ...formData, setor_id: value })}
            >
              <SelectTrigger id="setor">
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {setores.map((setor) => (
                  <SelectItem key={setor.id} value={setor.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {setor.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              placeholder="Digite o título da melhoria"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva a melhoria, sugestão ou feedback"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Anexos (opcional)</Label>
            <FileUploader
              files={uploadedFiles}
              onFilesChange={setUploadedFiles}
              maxFiles={5}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Ticket de Melhoria"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
