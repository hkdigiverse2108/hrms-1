import { useEffect, useRef } from 'react';
import { useChatContext } from '@/context/ChatContext';

/**
 * A hook that listens for real-time WebSocket events from the global App/Chat context.
 * 
 * @param targetEvent The event type string to listen for (e.g. "new_notification", "task_update", "data_refresh")
 * @param callback The function to execute when the event is received. It receives the event's data payload.
 */
export function useAppEvent(targetEvent: string, callback: (data: any) => void) {
  const { lastEvent } = useChatContext();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Track the last processed event sequence to prevent double triggers on re-renders
  const processedEventSeqRef = useRef<any>(null);

  useEffect(() => {
    if (lastEvent && lastEvent.event === targetEvent) {
      const seq = lastEvent._seq;
      if (seq && processedEventSeqRef.current !== seq) {
        processedEventSeqRef.current = seq;
        callbackRef.current(lastEvent.data);
      }
    }
  }, [lastEvent, targetEvent]);
}
