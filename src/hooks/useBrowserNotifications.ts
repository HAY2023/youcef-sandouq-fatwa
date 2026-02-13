import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useBrowserNotifications() {
  const previousBoxState = useRef<boolean | null>(null);

  useEffect(() => {
    // طلب إذن الإشعارات
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

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
            sendNotification(newState.is_box_open);
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

  const sendNotification = (isBoxOpen: boolean) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = isBoxOpen ? '📬 تم فتح صندوق الأسئلة!' : '📪 تم إغلاق صندوق الأسئلة';
      const body = isBoxOpen
        ? 'يمكنك الآن إرسال سؤالك الشرعي'
        : 'سيتم الإعلان عن موعد الفتح القادم';

      new Notification(title, {
        body,
        icon: '/icon-mosque.png',
        tag: 'box-status',
      });
    }
  };
}
