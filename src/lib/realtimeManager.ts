import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface ChannelEntry {
  channel: RealtimeChannel;
  subscribers: number;
}

const channels: Record<string, ChannelEntry> = {};

/**
 * Retrieve a shared realtime channel and subscribe to it.
 * The setup callback can register any event handlers before the
 * channel is subscribed. Returns a cleanup function that should be
 * called when the subscriber unmounts.
 */
export function subscribeToChannel(
  name: string,
  setup: (channel: RealtimeChannel) => void,
): () => void {
  let entry = channels[name];
  if (!entry) {
    entry = {
      channel: supabase.channel(name),
      subscribers: 0,
    };
    channels[name] = entry;
  }

  setup(entry.channel);

  if (entry.subscribers === 0) {
    entry.channel.subscribe();
  }
  entry.subscribers += 1;

  return () => {
    entry.subscribers -= 1;
    if (entry.subscribers <= 0) {
      supabase.removeChannel(entry.channel);
      delete channels[name];
    }
  };
}
