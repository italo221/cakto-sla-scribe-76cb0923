import { supabase } from '@/integrations/supabase/client';

interface CreateNotificationParams {
  userId: string;
  ticketId?: string;
  commentId?: string;
  type: 'mention' | 'comment' | 'ticket_update' | 'assignment';
  title: string;
  message: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        ticket_id: params.ticketId,
        comment_id: params.commentId,
        type: params.type,
        title: params.title,
        message: params.message
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return null;
  }
}

export async function notifyUserMention(
  mentionedUserId: string,
  mentionerName: string,
  ticketId: string,
  ticketTitle: string,
  commentId?: string
) {
  try {
    // Buscar o número do ticket
    const { data: ticket } = await supabase
      .from('sla_demandas')
      .select('ticket_number')
      .eq('id', ticketId)
      .single();

    const ticketNumber = ticket?.ticket_number || 'N/A';

    await createNotification({
      userId: mentionedUserId,
      ticketId,
      commentId,
      type: 'mention',
      title: `${mentionerName} mencionou você`,
      message: `Você foi mencionado em um comentário no ticket ${ticketNumber}: ${ticketTitle}`
    });
  } catch (error) {
    console.error('Erro ao criar notificação de menção:', error);
  }
}

export async function notifyTicketComment(
  userId: string,
  commenterName: string,
  ticketId: string,
  ticketTitle: string,
  commentId: string
) {
  try {
    // Buscar o número do ticket
    const { data: ticket } = await supabase
      .from('sla_demandas')
      .select('ticket_number')
      .eq('id', ticketId)
      .single();

    const ticketNumber = ticket?.ticket_number || 'N/A';

    await createNotification({
      userId,
      ticketId,
      commentId,
      type: 'comment',
      title: 'Novo comentário',
      message: `${commenterName} comentou no ticket ${ticketNumber}: ${ticketTitle}`
    });
  } catch (error) {
    console.error('Erro ao criar notificação de comentário:', error);
  }
}

export async function notifyTicketUpdate(
  userId: string,
  updaterName: string,
  ticketId: string,
  ticketTitle: string,
  updateType: string
) {
  try {
    // Buscar o número do ticket
    const { data: ticket } = await supabase
      .from('sla_demandas')
      .select('ticket_number')
      .eq('id', ticketId)
      .single();

    const ticketNumber = ticket?.ticket_number || 'N/A';

    await createNotification({
      userId,
      ticketId,
      type: 'ticket_update',
      title: 'Ticket atualizado',
      message: `${updaterName} ${updateType} o ticket ${ticketNumber}: ${ticketTitle}`
    });
  } catch (error) {
    console.error('Erro ao criar notificação de atualização:', error);
  }
}

// Função para detectar menções em texto (formato @usuario ou @nome)
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-ZÀ-ÿ0-9_.-]+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

// Função para buscar usuários mencionados por nome ou email
export async function findMentionedUsers(mentions: string[]): Promise<Array<{id: string, user_id: string, nome_completo: string, email: string}>> {
  if (mentions.length === 0) return [];
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, nome_completo, email')
      .or(
        mentions.map(mention => 
          `nome_completo.ilike.%${mention}%,email.ilike.%${mention}%`
        ).join(',')
      );

    if (error) {
      console.error('Erro ao buscar usuários mencionados:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar usuários mencionados:', error);
    return [];
  }
}