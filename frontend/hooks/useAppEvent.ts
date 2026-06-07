import { useEffect } from 'react';
import { useChatContext } from '@/context/ChatContext';

/**
 * A hook that listens for real-time WebSocket events from the global App/Chat context.
 * 
 * @param targetEvent The event type string to listen for (e.g. "new_notification", "task_update", "data_refresh")
 * @param callback The function to execute when the event is received. It receives the event's data payload.
 */
export function useAppEvent(targetEvent: string, callback: (data: any) => void) {
  const { lastEvent } = useChatContext();

  useEffect(() => {
    if (lastEvent && lastEvent.event === targetEvent) {
      callback(lastEvent.data);
    }
  }, [lastEvent, targetEvent, callback]);
}
