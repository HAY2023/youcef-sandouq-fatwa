import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Video {
  id: string;
  title: string;
  url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export function useVideos() {
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Video[];
    },
    refetchInterval: 5000,
  });
}

export function useAddVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { password: string; title: string; url: string }) => {
      const { data, error } = await supabase.rpc('add_video_authenticated', {
        p_password: params.password,
        p_title: params.title,
        p_url: params.url,
      });

      if (error) throw error;
      return data as string | null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

// Assuming 'useSettings' is a new query hook the user intended to add or modify.
// The provided snippet for 'useSettingsv' was incomplete and mixed mutation/query concepts.
// This is a placeholder for a potential useSettings query hook, if that was the intent.
// If 'useSettingsv' was meant to be a mutation, the refetchInterval would be incorrect.
// For now, I'm adding a placeholder for a useSettings query hook with refetchInterval.
// If the user meant to add a mutation, they would need to provide a full mutation definition.
export interface Settings {
  id: string;
  key: string;
  value: string;
  created_at: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*');

      if (error) throw error;
      return data as Settings[];
    },
    refetchInterval: 5000,
  });
}

export function useUpdateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { password: string; videoId: string; title?: string; url?: string }) => {
      const { data, error } = await supabase.rpc('update_video_authenticated', {
        p_password: params.password,
        p_video_id: params.videoId,
        p_title: params.title || null,
        p_url: params.url || null,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { password: string; videoId: string }) => {
      const { data, error } = await supabase.rpc('delete_video_authenticated', {
        p_password: params.password,
        p_video_id: params.videoId,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useReorderVideos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { password: string; videoIds: string[] }) => {
      const { data, error } = await supabase.rpc('reorder_videos_authenticated', {
        p_password: params.password,
        p_video_ids: params.videoIds,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}
