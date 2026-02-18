import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { sendNotification as sendTauriNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

export const useRealtimeNotifications = () => {
    const { toast } = useToast();

    useEffect(() => {
        const channel = supabase
            .channel('public-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notification_history',
                },
                async (payload) => {
                    const newNotif = payload.new as { title: string; body: string };

                    // 1. Show toast in app
                    toast({
                        title: newNotif.title,
                        description: newNotif.body,
                    });

                    // 2. Try native/browser notification
                    try {
                        const hasPermission = await isPermissionGranted();
                        if (hasPermission) {
                            sendTauriNotification({
                                title: newNotif.title,
                                body: newNotif.body,
                            });
                        } else {
                            const permission = await requestPermission();
                            if (permission === 'granted') {
                                sendTauriNotification({
                                    title: newNotif.title,
                                    body: newNotif.body,
                                });
                            } else if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification(newNotif.title, { body: newNotif.body });
                            }
                        }
                    } catch (e) {
                        console.error('Failed to show native notification', e);
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification(newNotif.title, { body: newNotif.body });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [toast]);
};
