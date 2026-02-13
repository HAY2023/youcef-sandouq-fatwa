import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_active: boolean;
  created_at: string;
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
    refetchInterval: 5000,
  });
}

export function useAddAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { password: string; message: string; type?: string }) => {
      const { data, error } = await supabase.rpc('add_announcement_authenticated', {
        p_password: params.password,
        p_message: params.message,
        p_type: params.type || 'info',
      });

      if (error) throw error;
      return data as string | null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { password: string; announcementId: string }) => {
      const { data, error } = await supabase.rpc('delete_announcement_authenticated', {
        p_password: params.password,
        p_announcement_id: params.announcementId,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}
