import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isPermissionGranted, requestPermission, sendNotification as sendTauriNotification } from '@tauri-apps/plugin-notification';
import { useToast } from '@/components/ui/use-toast'; // Assuming this path for useToast

export const useBrowserNotifications = () => {
  const previousBoxState = useRef<boolean | null>(null);
  const { toast } = useToast();
  const [soundEnabled, setSoundEnabled] = useState(true); // This state is new, but its usage is not provided in the snippet.

  const initNotifications = async () => {
    let permission = await isPermissionGranted();
    if (!permission) {
      const permissionRes = await requestPermission();
      permission = permissionRes === 'granted';
    }
    return permission;
  };

  const sendNativeNotification = async (title: string, body: string) => {
    const hasPermission = await initNotifications();
    if (hasPermission) {
      sendTauriNotification({
        title,
        body,
        icon: 'icon-mosque', // Uses app icon automatically or specific bundled asset
      });
    }
  };

  useEffect(() => {
    // Request permission for Tauri notifications on component mount
    initNotifications();

    // الاستماع لتغييرات الإعدادات
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

          // إذا تغيرت حالة الصندوق
          if (previousBoxState.current !== null && previousBoxState.current !== newState.is_box_open) {
            const title = newState.is_box_open ? '📬 تم فتح صندوق الأسئلة!' : '📪 تم إغلاق صندوق الأسئلة';
            const body = newState.is_box_open
              ? 'يمكنك الآن إرسال سؤالك الشرعي'
              : 'سيتم الإعلان عن موعد الفتح القادم';

            sendNativeNotification(title, body);
          }

          previousBoxState.current = newState.is_box_open;
        }
      )
      .subscribe();

    // جلب الحالة الأولية
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
};
