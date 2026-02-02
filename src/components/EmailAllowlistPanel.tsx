import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Plus, Check, X, Loader2, Search, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AllowlistEmail {
  id: string;
  email: string;
  status: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export default function EmailAllowlistPanel() {
  const [emails, setEmails] = useState<AllowlistEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingEmail, setRejectingEmail] = useState<AllowlistEmail | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_allowlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar lista",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Digite um email para adicionar.",
        variant: "destructive",
      });
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast({
        title: "Email inválido",
        description: "Digite um email válido.",
        variant: "destructive",
      });
      return;
    }

    setAddingEmail(true);
    try {
      const { error } = await supabase
        .from('email_allowlist')
        .insert({
          email: newEmail.trim().toLowerCase(),
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Email já existe",
            description: "Este email já está na lista.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Email adicionado",
        description: `${newEmail} foi adicionado à lista como pendente.`,
      });
      setNewEmail("");
      fetchEmails();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAddingEmail(false);
    }
  };

  const handleApprove = async (email: AllowlistEmail) => {
    try {
      const { error } = await supabase
        .from('email_allowlist')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', email.id);

      if (error) throw error;

      toast({
        title: "Email aprovado",
        description: `${email.email} foi aprovado para cadastro.`,
      });
      fetchEmails();
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openRejectModal = (email: AllowlistEmail) => {
    setRejectingEmail(email);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingEmail) return;

    if (!rejectionReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }

    setRejecting(true);
    try {
      const { error } = await supabase
        .from('email_allowlist')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id,
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', rejectingEmail.id);

      if (error) throw error;

      toast({
        title: "Email rejeitado",
        description: `${rejectingEmail.email} foi rejeitado.`,
      });
      setRejectModalOpen(false);
      setRejectingEmail(null);
      fetchEmails();
    } catch (error: any) {
      toast({
        title: "Erro ao rejeitar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const filteredEmails = emails.filter(e => 
    e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Allowlist de Emails
        </CardTitle>
        <CardDescription>
          Gerencie quais emails podem se cadastrar no sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new email */}
        <div className="flex gap-2">
          <Input
            placeholder="Digite o email para adicionar..."
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
            className="flex-1"
          />
          <Button onClick={handleAddEmail} disabled={addingEmail}>
            {addingEmail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </>
            )}
          </Button>
        </div>

        {/* Search and refresh */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={fetchEmails} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Emails table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Aprovação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum email encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium">{email.email}</TableCell>
                    <TableCell>{getStatusBadge(email.status)}</TableCell>
                    <TableCell>
                      {email.approved_at ? (
                        format(new Date(email.approved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {email.status === 'pending' && (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(email)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRejectModal(email)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {email.status === 'rejected' && email.rejection_reason && (
                        <span className="text-xs text-muted-foreground" title={email.rejection_reason}>
                          {email.rejection_reason.slice(0, 20)}...
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total: {emails.length}</span>
          <span>Aprovados: {emails.filter(e => e.status === 'approved').length}</span>
          <span>Pendentes: {emails.filter(e => e.status === 'pending').length}</span>
          <span>Rejeitados: {emails.filter(e => e.status === 'rejected').length}</span>
        </div>
      </CardContent>

      {/* Rejection Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Email</DialogTitle>
            <DialogDescription>
              Informe o motivo para rejeitar {rejectingEmail?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Motivo da rejeição..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
                {rejecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
