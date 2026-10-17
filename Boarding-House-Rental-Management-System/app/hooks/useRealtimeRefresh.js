import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from '../utils/supabase';

/** Refresh the current screen's data after matching Supabase table changes. */
export default function useRealtimeRefresh(channelName, subscriptions, onChange, enabled = true) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const subscriptionsKey = JSON.stringify(subscriptions
    .map(({ table, event = '*', filter = '' }) => ({ table, event, filter }))
    .sort((left, right) => left.table.localeCompare(right.table)));

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase) return undefined;

    const requestedSubscriptions = JSON.parse(subscriptionsKey)
      .map(({ table, event, filter }) => ({ table, event, filter: filter || undefined }));

    let channel = supabase.channel(channelName);
    requestedSubscriptions.forEach(({ table, event, filter }) => {
      channel = channel.on('postgres_changes', {
        event,
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      }, (payload) => onChangeRef.current?.(payload));
    });

    channel = channel.subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`Realtime connection for ${channelName} is unavailable (${status}):`, error?.message || error || 'No server error details were provided.');
      }
    });

    const appStateSubscription = Platform.OS === 'web'
      ? null
      : AppState.addEventListener('change', (state) => {
        if (state === 'active') onChangeRef.current?.();
      });

    return () => {
      appStateSubscription?.remove();
      supabase.removeChannel(channel);
    };
  }, [channelName, enabled, subscriptionsKey]);
}
