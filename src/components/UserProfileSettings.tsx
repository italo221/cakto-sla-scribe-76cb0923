import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Upload, User, Lock, Phone, Image } from 'lucide-react';

interface UserProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserProfileSettings({ open, onOpenChange }: UserProfileSettingsProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados para os formulários
  const [profileData, setProfileData] = useState({
    nome_completo: profile?.nome_completo || '',
    telefone: user?.phone || '',
    avatar_url: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileUpdate = async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    try {
      // Atualizar dados no perfil (public.profiles)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nome_completo: profileData.nome_completo
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Atualizar telefone no auth.users
      if (profileData.telefone !== user.phone) {
        const { error: phoneError } = await supabase.auth.updateUser({
          phone: profileData.telefone
        });
        
        if (phoneError) throw phoneError;
      }

      // Refresh dos dados do perfil
      await refreshProfile();
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    // Validações
    if (!passwordData.currentPassword) {
      toast.error('Digite sua senha atual');
      return;
    }

    if (!passwordData.newPassword) {
      toast.error('Digite a nova senha');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Verificar senha atual tentando fazer login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: passwordData.currentPassword
      });

      if (signInError) {
        toast.error('⛔ A senha atual está incorreta. Tente novamente.');
        return;
      }

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      // Limpar formulário
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast.success('🔒 Senha alterada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      // Upload do arquivo para o storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sla-anexos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('sla-anexos')
        .getPublicUrl(filePath);

      // Atualizar URL do avatar no auth.users
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
      await refreshProfile();
      
      toast.success('Foto de perfil atualizada!');
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao fazer upload da foto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const userInitials = profile?.nome_completo
    ? profile.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.substring(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Configurações do Usuário
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Senha
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Foto de Perfil
                </CardTitle>
                <CardDescription>
                  Clique na foto para alterar ou faça upload de uma nova imagem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.user_metadata?.avatar_url || profileData.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Alterar Foto
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG ou GIF. Máximo 5MB.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">📛 Nome Completo</Label>
                  <Input
                    id="nome"
                    value={profileData.nome_completo}
                    onChange={(e) => setProfileData(prev => ({ ...prev, nome_completo: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">📞 Telefone</Label>
                  <Input
                    id="telefone"
                    value={profileData.telefone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="Seu número de telefone"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado através desta interface
                  </p>
                </div>

                <Button 
                  onClick={handleProfileUpdate} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🔒 Alterar Senha</CardTitle>
                <CardDescription>
                  Para sua segurança, confirme sua senha atual antes de definir uma nova
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Digite sua senha atual"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Digite a nova senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirme a nova senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Dicas de segurança:</strong>
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                    <li>Use pelo menos 6 caracteres</li>
                    <li>Combine letras, números e símbolos</li>
                    <li>Evite senhas óbvias ou informações pessoais</li>
                  </ul>
                </div>

                <Button 
                  onClick={handlePasswordChange} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}