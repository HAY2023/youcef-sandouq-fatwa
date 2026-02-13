import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Settings {
  id: string;
  is_box_open: boolean;
  next_session_date: string | null;
  video_url: string | null;
  video_title: string | null;
  show_countdown: boolean;
  show_question_count: boolean;
  show_install_page: boolean;
  countdown_style: number | null;
  countdown_bg_color: string | null;
  countdown_text_color: string | null;
  countdown_border_color: string | null;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('id, is_box_open, next_session_date, video_url, video_title, show_countdown, show_question_count, show_install_page, countdown_style, countdown_bg_color, countdown_text_color, countdown_border_color')
        .maybeSingle();

      if (error) throw error;
      return data as Settings | null;
    },
    refetchInterval: 5000,
  });
}

export function useVerifyAdminPassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await supabase.rpc('verify_admin_password', {
        input_password: password
      });

      if (error) throw error;
      return data as boolean;
    },
  });
}

export function useUpdateSettingsAuthenticated() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      password: string;
      is_box_open?: boolean;
      next_session_date?: string;
      video_url?: string;
      video_title?: string;
      show_countdown?: boolean;
      show_question_count?: boolean;
      show_install_page?: boolean;
      countdown_style?: number;
      countdown_bg_color?: string;
      countdown_text_color?: string;
      countdown_border_color?: string;
    }) => {
      const { data, error } = await supabase.rpc('update_settings_authenticated', {
        p_password: params.password,
        p_is_box_open: params.is_box_open,
        p_next_session_date: params.next_session_date,
        p_video_url: params.video_url,
        p_video_title: params.video_title,
        p_show_countdown: params.show_countdown,
        p_show_question_count: params.show_question_count,
        p_show_install_page: params.show_install_page,
        p_countdown_style: params.countdown_style,
        p_countdown_bg_color: params.countdown_bg_color,
        p_countdown_text_color: params.countdown_text_color,
        p_countdown_border_color: params.countdown_border_color,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useGetQuestionsCountAuthenticated() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await supabase.rpc('get_questions_count_authenticated', {
        p_password: password
      });

      if (error) throw error;
      return data as number;
    },
  });
}

export function useDeleteAllQuestionsAuthenticated() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await supabase.rpc('delete_all_questions_authenticated', {
        p_password: password,
      });
      if (error) throw error;
      return data as boolean;
    },
  });
}

export function useDeleteSelectedQuestionsAuthenticated() {
  return useMutation({
    mutationFn: async (params: { password: string; questionIds: string[] }) => {
      const { data, error } = await supabase.rpc('delete_selected_questions_authenticated', {
        p_password: params.password,
        p_question_ids: params.questionIds,
      });
      if (error) throw error;
      return data as boolean;
    },
  });
}

export function useUpdateAdminPassword() {
  return useMutation({
    mutationFn: async (params: { oldPassword: string; newPassword: string }) => {
      const { data, error } = await supabase.rpc('update_admin_password', {
        p_old_password: params.oldPassword,
        p_new_password: params.newPassword,
      });

      if (error) throw error;
      return data as boolean;
    },
  });
}

// Hook for notification settings
export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      password: string;
      notify_on_question?: boolean;
      notify_every_n_questions?: number;
    }) => {
      // First verify password
      const { data: isValid, error: verifyError } = await supabase.rpc('verify_admin_password', {
        input_password: params.password
      });

      if (verifyError || !isValid) {
        throw new Error('Invalid password');
      }

      // Update notification settings
      const { error } = await supabase
        .from('notification_settings')
        .update({
          notify_on_question: params.notify_on_question,
          notify_every_n_questions: params.notify_every_n_questions,
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.from('notification_settings').select('id').single()).data?.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_settings'] });
    },
  });
}

// Block user by IP or fingerprint
export function useBlockUser() {
  return useMutation({
    mutationFn: async (params: {
      password: string;
      ip_address?: string;
      fingerprint_id?: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('block_user_authenticated', {
        p_password: params.password,
        p_ip_address: params.ip_address || null,
        p_fingerprint_id: params.fingerprint_id || null,
        p_reason: params.reason || null
      });

      if (error) throw error;
      return !!data;
    },
  });
}

// Unblock user
export function useUnblockUser() {
  return useMutation({
    mutationFn: async (params: { password: string; id: string }) => {
      const { data, error } = await supabase.rpc('unblock_user_authenticated', {
        p_password: params.password,
        p_blocked_id: params.id
      });

      if (error) throw error;
      return !!data;
    },
  });
}

// Get blocked users list
export function useGetBlockedUsers() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await supabase.rpc('get_blocked_users_authenticated', {
        p_password: password
      });

      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        ip_address: string | null;
        fingerprint_id: string | null;
        reason: string | null;
        blocked_at: string;
        blocked_by: string;
      }>;
    },
  });
}
