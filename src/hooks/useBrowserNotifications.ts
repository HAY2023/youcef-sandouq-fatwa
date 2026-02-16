import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isPermissionGranted, requestPermission, sendNotification as sendTauriNotification } from '@tauri-apps/plugin-notification';

/**
 * Hook for handling notifications.
 * Switches between browser notifications and Tauri native notifications based on the environment.
 */
export const useBrowserNotifications = () => {
  const previousBoxState = useRef<boolean | null>(null);
  const [hasNativePermission, setHasNativePermission] = useState<boolean>(false);

  // Initialize native notifications
  const initNativeNotifications = async () => {
    try {
      let permission = await isPermissionGranted();
      if (!permission) {
        const permissionRes = await requestPermission();
        permission = permissionRes === 'granted';
      }
      setHasNativePermission(permission);
      return permission;
    } catch (error) {
      console.error('Failed to initialize native notifications:', error);
      return false;
    }
  };

  const sendNotification = async (isBoxOpen: boolean) => {
    const title = isBoxOpen ? '📬 تم فتح صندوق الأسئلة!' : '📪 تم إغلاق صندوق الأسئلة';
    const body = isBoxOpen
      ? 'يمكنك الآن إرسال سؤالك الشرعي'
      : 'سيتم الإعلان عن موعد الفتح القادم';

    // Try native notification first (Tauri)
    try {
      if (hasNativePermission || await initNativeNotifications()) {
        sendTauriNotification({
          title,
          body,
          icon: 'icon-mosque', // Uses the bundled icon named icon-mosque
        });
        return;
      }
    } catch (e) {
      console.warn('Native notification failed, falling back to browser API:', e);
    }

    // Fallback to Browser Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-mosque.png',
        tag: 'box-status',
      });
    }
  };

  useEffect(() => {
    // Initial permission request
    initNativeNotifications();

    // Listen to settings changes for box status
    const channel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'settings',
        },
        (payload) => {
          const newState = payload.new as { is_box_open: boolean };

          if (previousBoxState.current !== null && previousBoxState.current !== newState.is_box_open) {
            sendNotification(newState.is_box_open);
          }

          previousBoxState.current = newState.is_box_open;
        }
      )
      .subscribe();

    // Fetch initial state
    const fetchInitialState = async () => {
      const { data } = await supabase
        .from('settings')
        .select('is_box_open')
        .single();

      if (data) {
        previousBoxState.current = data.is_box_open;
      }
    };

    fetchInitialState();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { initNativeNotifications };
};
