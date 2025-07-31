import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CommentReactionsProps {
  commentId: string;
  className?: string;
}

interface Reaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

interface ReactionCounts {
  [key: string]: {
    count: number;
    userReacted: boolean;
  };
}

const REACTION_TYPES = [
  { type: 'thumbs_up', icon: ThumbsUp, label: 'Curtir' },
  { type: 'heart', icon: Heart, label: 'Amei' },
  { type: 'check', icon: Check, label: 'Ciente' },
  { type: 'thumbs_down', icon: ThumbsDown, label: 'Não curtir' },
];

export default function CommentReactions({ commentId, className }: CommentReactionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({});
  const [loading, setLoading] = useState(false);

  // Buscar reações do comentário
  useEffect(() => {
    fetchReactions();
  }, [commentId]);

  // Calcular contadores de reações
  useEffect(() => {
    const counts: ReactionCounts = {};
    
    REACTION_TYPES.forEach(({ type }) => {
      const typeReactions = reactions.filter(r => r.reaction_type === type);
      counts[type] = {
        count: typeReactions.length,
        userReacted: user ? typeReactions.some(r => r.user_id === user.id) : false
      };
    });
    
    setReactionCounts(counts);
  }, [reactions, user]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('comment_reactions')
        .select('*')
        .eq('comment_id', commentId);

      if (error) throw error;
      setReactions(data || []);
    } catch (error) {
      console.error('Erro ao buscar reações:', error);
    }
  };

  const toggleReaction = async (reactionType: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para reagir a comentários.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const existingReaction = reactions.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      );

      if (existingReaction) {
        // Remover reação existente
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;

        setReactions(prev => prev.filter(r => r.id !== existingReaction.id));
      } else {
        // Adicionar nova reação
        const { data, error } = await supabase
          .from('comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: reactionType
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setReactions(prev => [...prev, data]);
        }
      }
    } catch (error) {
      console.error('Erro ao reagir:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar sua reação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {REACTION_TYPES.map(({ type, icon: Icon, label }) => {
        const reactionData = reactionCounts[type] || { count: 0, userReacted: false };
        
        if (reactionData.count === 0 && !reactionData.userReacted) {
          return (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => toggleReaction(type)}
              disabled={loading}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </Button>
          );
        }

        return (
          <Button
            key={type}
            variant={reactionData.userReacted ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-8 px-2 gap-1",
              reactionData.userReacted 
                ? "text-primary bg-primary/10 hover:bg-primary/20" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => toggleReaction(type)}
            disabled={loading}
            title={label}
          >
            <Icon className="w-4 h-4" />
            {reactionData.count > 0 && (
              <span className="text-xs font-medium">{reactionData.count}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}