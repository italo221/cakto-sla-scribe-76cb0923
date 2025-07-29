import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Save, Upload, Shield } from 'lucide-react';

interface AdminUserEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onUserUpdated: () => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  nome_completo: string;
  user_type: 'administrador_master' | 'colaborador_setor';
  role: 'super_admin' | 'operador' | 'viewer';
  ativo: boolean;
  telefone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminUserEditor({ open, onOpenChange, userId, onUserUpdated }: AdminUserEditorProps) {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    user_type: 'colaborador_setor' as 'administrador_master' | 'colaborador_setor',
    role: 'viewer' as 'super_admin' | 'operador' | 'viewer',
    ativo: true,
    avatar_url: ''
  });

  useEffect(() => {
    if (userId && open) {
      fetchUserProfile();
    }
  }, [userId, open]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setUserProfile(data);
      setFormData({
        nome_completo: data.nome_completo,
        email: data.email,
        telefone: data.telefone || '',
        user_type: data.user_type,
        role: data.role,
        ativo: data.ativo,
        avatar_url: data.avatar_url || ''
      });
    } catch (error: any) {
      console.error('Erro ao buscar perfil:', error);
      toast.error('Erro ao carregar dados do usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userProfile) return;

    setLoading(true);
    try {
      // Atualizar dados no profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nome_completo: formData.nome_completo,
          telefone: formData.telefone,
          user_type: formData.user_type,
          role: formData.role,
          ativo: formData.ativo,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userProfile.user_id);

      if (profileError) throw profileError;

      // Se o email mudou, atualizar no auth.users (através de RPC se necessário)
      if (formData.email !== userProfile.email) {
        // Nota: Para alterar email via admin, seria necessário uma função RPC específica
        // Por segurança, vamos apenas atualizar no profiles por enquanto
        const { error: emailError } = await supabase
          .from('profiles')
          .update({ email: formData.email })
          .eq('user_id', userProfile.user_id);

        if (emailError) throw emailError;
      }

      toast.success('🎉 Usuário atualizado com sucesso!');
      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.user_id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sla-anexos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sla-anexos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Foto de perfil atualizada!');
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao fazer upload da foto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    return formData.nome_completo
      ? formData.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : formData.email.substring(0, 2).toUpperCase();
  };

  if (!userProfile && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Editar Usuário (Admin)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Foto de Perfil */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Foto de Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={formData.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="admin-avatar-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Alterar Foto
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="admin-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Básicas</CardTitle>
              <CardDescription>
                Altere as informações básicas do usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-nome">Nome Completo</Label>
                  <Input
                    id="admin-nome"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                    placeholder="Nome completo do usuário"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email do usuário"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-telefone">Telefone</Label>
                  <Input
                    id="admin-telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="Telefone do usuário"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-status">Status</Label>
                  <Select
                    value={formData.ativo ? 'ativo' : 'inativo'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ativo: value === 'ativo' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">✅ Ativo</SelectItem>
                      <SelectItem value="inativo">❌ Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissões e Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permissões e Acesso</CardTitle>
              <CardDescription>
                Configure o nível de acesso e permissões do usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-user-type">Tipo de Usuário</Label>
                  <Select
                    value={formData.user_type}
                    onValueChange={(value: 'administrador_master' | 'colaborador_setor') => 
                      setFormData(prev => ({ ...prev, user_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrador_master">👑 Administrador Master</SelectItem>
                      <SelectItem value="colaborador_setor">👤 Colaborador de Setor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'super_admin' | 'operador' | 'viewer') => 
                      setFormData(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">🛡️ Super Admin</SelectItem>
                      <SelectItem value="operador">⚙️ Operador</SelectItem>
                      <SelectItem value="viewer">👁️ Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Explicação dos Roles:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li><strong>Super Admin:</strong> Acesso total ao sistema, pode gerenciar usuários e configurações</li>
                  <li><strong>Operador:</strong> Pode criar, editar e gerenciar tickets</li>
                  <li><strong>Viewer:</strong> Apenas visualização, não pode editar tickets</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}