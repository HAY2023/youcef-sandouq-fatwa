import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings, useVerifyAdminPassword, useUpdateSettingsAuthenticated, useDeleteAllQuestionsAuthenticated, useDeleteSelectedQuestionsAuthenticated } from '@/hooks/useSettings';
import { useGetQuestionsAuthenticated, useGetAccessLogsAuthenticated, Question, AccessLog } from '@/hooks/useQuestionsList';
import { useVideos, useAddVideo, useDeleteVideo, useReorderVideos, useUpdateVideo, Video as VideoType } from '@/hooks/useVideos';
import { useAnnouncements, useAddAnnouncement, useDeleteAnnouncement } from '@/hooks/useAnnouncements';
import { useAllFlashMessages, useAddFlashMessage, useDeleteFlashMessage } from '@/hooks/useFlashMessages';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAccess } from '@/hooks/useAdminAccessLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { getCategoryLabel } from '@/lib/categories';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CountdownTimerPreview } from '@/components/CountdownTimer';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableVideoItem } from '@/components/SortableVideoItem';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Lock, MessageSquare, Calendar, Video,
  FileSpreadsheet, FileText, Bell, BellOff, Trash2, Settings, List, Home, AlertTriangle, CheckSquare, Plus, Megaphone, Zap, Hash,
  Shield, MapPin, Monitor, Globe, CheckCircle, XCircle, Clock, Wifi, Smartphone, Fingerprint, ChevronDown, ChevronUp, Search, Filter, BarChart3, BellRing, Send, Bug, AlertCircle, RefreshCw, Timer, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Helper functions for video URL parsing
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getGoogleDriveFileId(url: string): string | null {
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/\n?#]+)/,
    /drive\.google\.com\/open\?id=([^&\n?#]+)/,
    /drive\.google\.com\/uc\?.*id=([^&\n?#]+)/,
    /docs\.google\.com\/file\/d\/([^/\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questionsCount, setQuestionsCount] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // فلاتر السجل
  const [logSearchIP, setLogSearchIP] = useState('');
  const [logFilterStatus, setLogFilterStatus] = useState<'all' | 'authorized' | 'failed'>('all');
  const [logFilterDate, setLogFilterDate] = useState('');

  // فلتر الأسئلة
  const [questionFilter, setQuestionFilter] = useState<'all' | 'new' | 'old'>('all');
  const [questionCategoryFilter, setQuestionCategoryFilter] = useState<string>('all');

  const { toast } = useToast();

  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: videos, isLoading: videosLoading } = useVideos();
  const { data: announcements } = useAnnouncements();
  const { data: flashMessages } = useAllFlashMessages();
  const verifyPassword = useVerifyAdminPassword();
  const updateSettings = useUpdateSettingsAuthenticated();
  const getQuestions = useGetQuestionsAuthenticated();
  const getAccessLogs = useGetAccessLogsAuthenticated();
  const deleteAllQuestions = useDeleteAllQuestionsAuthenticated();
  const deleteSelectedQuestions = useDeleteSelectedQuestionsAuthenticated();
  const addVideo = useAddVideo();
  const deleteVideo = useDeleteVideo();
  const reorderVideos = useReorderVideos();
  const updateVideo = useUpdateVideo();
  const addAnnouncement = useAddAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const addFlashMessage = useAddFlashMessage();
  const deleteFlashMessage = useDeleteFlashMessage();

  const [isBoxOpen, setIsBoxOpen] = useState(false);
  const [nextSessionDate, setNextSessionDate] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showCountdown, setShowCountdown] = useState(true);
  const [countdownStyle, setCountdownStyle] = useState(1);
  const [showQuestionCount, setShowQuestionCount] = useState(false);
  const [showInstallPage, setShowInstallPage] = useState(true);
  const [savingVideo, setSavingVideo] = useState(false);
  const [savingCountdownStyle, setSavingCountdownStyle] = useState(false);

  // Countdown color customization
  const [countdownBgColor, setCountdownBgColor] = useState('#000000');
  const [countdownTextColor, setCountdownTextColor] = useState('#22c55e');
  const [countdownBorderColor, setCountdownBorderColor] = useState('#166534');
  const [savingCountdownColors, setSavingCountdownColors] = useState(false);
  const [localVideos, setLocalVideos] = useState<VideoType[]>([]);

  // Announcement states
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementType, setAnnouncementType] = useState('info');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  // Flash message states
  const [flashMessage, setFlashMessage] = useState('');
  const [flashDirection, setFlashDirection] = useState('rtl');
  const [flashColor, setFlashColor] = useState('#3b82f6');
  const [flashStartDate, setFlashStartDate] = useState('');
  const [flashEndDate, setFlashEndDate] = useState('');
  const [flashFontSize, setFlashFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [savingFlash, setSavingFlash] = useState(false);

  // Notification settings states
  const [notifyOnQuestion, setNotifyOnQuestion] = useState(true);
  const [notifyEveryN, setNotifyEveryN] = useState(10);
  const [savingNotification, setSavingNotification] = useState(false);

  // Push notification states
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<Array<{
    id: string;
    title: string;
    body: string;
    sent_at: string;
    recipients_count: number;
  }>>([]);

  // Admin device management states
  const [adminDeviceToken, setAdminDeviceToken] = useState('');
  const [settingAdminDevice, setSettingAdminDevice] = useState(false);
  const [pushTokensList, setPushTokensList] = useState<Array<{
    id: string;
    token: string;
    device_type: string | null;
    is_admin: boolean | null;
    created_at: string | null;
  }>>([]);

  // Content filter state
  const [contentFilterEnabled, setContentFilterEnabled] = useState(true);

  // User reports state
  const [userReports, setUserReports] = useState<Array<{
    id: string;
    report_type: string;
    message: string;
    email: string | null;
    device_info: any;
    created_at: string;
    status: string;
  }>>([]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // إحصائيات الأسئلة
  const questionStats = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    questions.forEach(q => {
      const cat = getCategoryLabel(q.category);
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const categoryData = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));

    // إحصائيات حسب التاريخ (آخر 7 أيام)
    const last7Days: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
      last7Days[dateStr] = 0;
    }

    questions.forEach(q => {
      const qDate = new Date(q.created_at);
      const daysDiff = Math.floor((today.getTime() - qDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < 7) {
        const dateStr = qDate.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
        if (last7Days[dateStr] !== undefined) {
          last7Days[dateStr]++;
        }
      }
    });

    const dailyData = Object.entries(last7Days).map(([name, count]) => ({ name, count }));

    return { categoryData, dailyData };
  }, [questions]);

  // إحصائيات الزوار حسب اليوم
  const visitorStats = useMemo(() => {
    const last7Days: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
      last7Days[dateStr] = 0;
    }

    accessLogs.forEach(log => {
      const logDate = new Date(log.accessed_at);
      const daysDiff = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < 7) {
        const dateStr = logDate.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
        if (last7Days[dateStr] !== undefined) {
          last7Days[dateStr]++;
        }
      }
    });

    return Object.entries(last7Days).map(([name, count]) => ({ name, count }));
  }, [accessLogs]);

  // فلترة الأسئلة حسب التصنيف والتاريخ (قديم أولاً ثم جديد)
  const filteredQuestions = useMemo(() => {
    let filtered = [...questions];

    // فلتر حسب الوقت (قديم/جديد)
    if (questionFilter === 'new') {
      // الأسئلة في آخر 24 ساعة
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter(q => new Date(q.created_at) > oneDayAgo);
    } else if (questionFilter === 'old') {
      // الأسئلة أقدم من 24 ساعة
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter(q => new Date(q.created_at) <= oneDayAgo);
    }

    // فلتر حسب نوع الفتوى
    if (questionCategoryFilter !== 'all') {
      filtered = filtered.filter(q => q.category === questionCategoryFilter);
    }

    // ترتيب قديم أولاً ثم جديد
    filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return filtered;
  }, [questions, questionFilter, questionCategoryFilter]);

  // فلترة السجلات
  const filteredLogs = useMemo(() => {
    return accessLogs.filter(log => {
      // فلتر البحث بـ IP
      if (logSearchIP && !log.ip_address?.toLowerCase().includes(logSearchIP.toLowerCase())) {
        return false;
      }

      // فلتر الحالة
      if (logFilterStatus === 'authorized' && !log.is_authorized) return false;
      if (logFilterStatus === 'failed' && log.is_authorized) return false;

      // فلتر التاريخ
      if (logFilterDate) {
        const logDate = new Date(log.accessed_at).toISOString().split('T')[0];
        if (logDate !== logFilterDate) return false;
      }

      return true;
    });
  }, [accessLogs, logSearchIP, logFilterStatus, logFilterDate]);

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch {
      // Sound not supported
    }
  };

  const formatDateForInput = (isoDate: string | null): string => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (settings) {
      setIsBoxOpen(settings.is_box_open);
      setNextSessionDate(formatDateForInput(settings.next_session_date));
      setVideoTitle(settings.video_title || '');
      setVideoUrl(settings.video_url || '');
      setShowCountdown(settings.show_countdown);
      setCountdownStyle(settings.countdown_style ?? 1);
      setShowQuestionCount(settings.show_question_count ?? false);
      setShowInstallPage(settings.show_install_page ?? true);
      setContentFilterEnabled((settings as any).content_filter_enabled ?? true);
      setCountdownBgColor(settings.countdown_bg_color ?? '#000000');
      setCountdownTextColor(settings.countdown_text_color ?? '#22c55e');
      setCountdownBorderColor(settings.countdown_border_color ?? '#166534');
    }
  }, [settings]);

  useEffect(() => {
    if (videos) {
      setLocalVideos(videos);
    }
  }, [videos]);

  useEffect(() => {
    if (isAuthenticated && storedPassword) {
      loadQuestions();
      loadAccessLogs();
      loadNotificationHistory();
      loadUserReports();
      loadPushTokens();
    }
  }, [isAuthenticated, storedPassword]);

  const loadNotificationHistory = async () => {
    if (!storedPassword) return;
    try {
      const { data, error } = await supabase.rpc('get_notification_history_authenticated', {
        p_password: storedPassword
      });
      if (!error && data) {
        setNotificationHistory(data as any[]);
      }
    } catch (error) {
      console.error('Failed to load notification history:', error);
    }
  };

  const loadUserReports = async () => {
    if (!storedPassword) return;
    try {
      const { data, error } = await supabase.rpc('get_user_reports_authenticated', {
        p_password: storedPassword
      });
      if (!error && data) {
        setUserReports(data as any[]);
      }
    } catch (error) {
      console.error('Failed to load user reports:', error);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    if (!storedPassword) return;
    try {
      const { data, error } = await supabase.rpc('update_report_status_authenticated', {
        p_password: storedPassword,
        p_report_id: reportId,
        p_status: newStatus
      });
      if (!error && data) {
        setUserReports(prev => prev.map(r =>
          r.id === reportId ? { ...r, status: newStatus } : r
        ));
        toast({ title: 'تم التحديث', description: `تم تحديث حالة البلاغ إلى "${newStatus === 'reviewed' ? 'تمت المراجعة' : newStatus === 'resolved' ? 'تم الحل' : 'معلق'}"` });
      }
    } catch (error) {
      console.error('Failed to update report status:', error);
      toast({ title: 'خطأ', description: 'فشل تحديث حالة البلاغ', variant: 'destructive' });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!storedPassword) return;
    try {
      const { data, error } = await supabase.rpc('delete_user_report_authenticated', {
        p_password: storedPassword,
        p_report_id: reportId
      });
      if (!error && data) {
        setUserReports(prev => prev.filter(r => r.id !== reportId));
        toast({ title: 'تم الحذف', description: 'تم حذف البلاغ بنجاح' });
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast({ title: 'خطأ', description: 'فشل حذف البلاغ', variant: 'destructive' });
    }
  };

  const loadAccessLogs = async () => {
    if (!storedPassword) return;
    try {
      const data = await getAccessLogs.mutateAsync(storedPassword);
      setAccessLogs(data || []);
    } catch (error) {
      console.error('Failed to load access logs:', error);
    }
  };

  // طلب إذن الإشعارات عند تسجيل الدخول
  useEffect(() => {
    if (isAuthenticated && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('questions-realtime-admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions' },
        async (payload) => {
          if (soundEnabled) {
            playNotificationSound();
          }
          loadQuestions();

          const question = payload.new as { category?: string; question_text?: string };
          const title = '📩 سؤال جديد!';
          const body = `فئة: ${getCategoryLabel(question.category || 'other')}\n${question.question_text?.slice(0, 50) || ''}...`;

          // Try native notification first (Tauri)
          try {
            const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
            let permission = await isPermissionGranted();
            if (!permission) {
              const permissionRes = await requestPermission();
              permission = permissionRes === 'granted';
            }

            if (permission) {
              sendNotification({
                title,
                body,
                icon: 'icon-mosque',
              });
            } else {
              // Fallback to browser if native permission denied
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body, icon: '/icon-mosque.png', tag: 'new-question' });
              }
            }
          } catch (e) {
            console.warn('Native notification failed in realtime listener:', e);
            // Fallback to Browser Notification API
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(title, { body, icon: '/icon-mosque.png', tag: 'new-question' });
            }
          }

          toast({ title: '📩 سؤال جديد', description: 'تم استلام سؤال جديد' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, soundEnabled]);

  const handleTestNotification = async () => {
    try {
      // Import Tauri notification plugin dynamically
      const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');

      let permission = await isPermissionGranted();
      if (!permission) {
        const permissionRes = await requestPermission();
        permission = permissionRes === 'granted';
      }

      if (permission) {
        sendNotification({
          title: '🔔 إشعار تجريبي',
          body: 'هذا إشعار تجريبي من نظام صندوق فتوى للتأكد من وصول التنبيهات الأصلية.',
          icon: 'icon-mosque',
        });
        toast({ title: '✓ تم الإرسال', description: 'تم إرسال إشعار تجريبي أصلي للنظام' });
      } else {
        // Fallback to browser notification if native fails or denied
        if ('Notification' in window) {
          const browserPerm = await Notification.requestPermission();
          if (browserPerm === 'granted') {
            new Notification('🔔 إشعار تجريبي', {
              body: 'إشعار تجريبي عبر المتصفح (الصلاحية الأصلية مرفوضة)',
              icon: '/icon-mosque.png'
            });
            toast({ title: '✓ تم الإرسال', description: 'تم الإرسال عبر المتصفح' });
          } else {
            toast({ title: '⚠️ تنبيه', description: 'يرجى تفعيل الإشعارات في النظام أولاً', variant: 'destructive' });
          }
        }
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      // Final fallback
      toast({ title: '❌ خطأ', description: 'فشل إرسال الإشعار، تأكد من تحديث البرنامج', variant: 'destructive' });
    }
  };

  const loadQuestions = async () => {
    if (!storedPassword) return;
    try {
      const data = await getQuestions.mutateAsync(storedPassword);
      setQuestions(data || []);
      setQuestionsCount(data?.length || 0);
    } catch {
      // Failed to load questions
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const isValid = await verifyPassword.mutateAsync(password);
      logAdminAccess(isValid, true);

      if (isValid) {
        setIsAuthenticated(true);
        setStoredPassword(password);
      } else {
        toast({ title: 'خطأ', description: 'كلمة المرور غير صحيحة', variant: 'destructive' });
      }
    } catch {
      logAdminAccess(false, true);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء التحقق', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleToggleBox = async () => {
    if (!settings || !storedPassword) return;
    setIsLoading(true);
    try {
      const success = await updateSettings.mutateAsync({
        password: storedPassword,
        is_box_open: !isBoxOpen,
      });
      if (success) {
        setIsBoxOpen(!isBoxOpen);
        toast({ title: 'تم التحديث', description: `الصندوق ${!isBoxOpen ? 'مفتوح' : 'مغلق'} الآن` });
      } else {
        toast({ title: 'خطأ', description: 'فشل التحديث - تحقق من كلمة المرور', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleUpdateSession = async () => {
    if (!settings || !nextSessionDate || !storedPassword) return;
    setIsLoading(true);
    try {
      const isoDate = new Date(nextSessionDate).toISOString();
      const success = await updateSettings.mutateAsync({
        password: storedPassword,
        next_session_date: isoDate,
      });
      if (success) {
        toast({ title: 'تم التحديث', description: 'تم تحديث موعد الحلقة' });
      } else {
        toast({ title: 'خطأ', description: 'فشل التحديث - تحقق من كلمة المرور', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleSaveVideo = async () => {
    if (!storedPassword || !videoUrl || !videoTitle) return;
    setSavingVideo(true);
    try {
      const result = await addVideo.mutateAsync({
        password: storedPassword,
        title: videoTitle,
        url: videoUrl,
      });
      if (result) {
        setVideoTitle('');
        setVideoUrl('');
        toast({ title: 'تم الحفظ', description: 'تم إضافة الفيديو بنجاح' });
      } else {
        toast({ title: 'خطأ', description: 'فشل إضافة الفيديو', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل حفظ الفيديو', variant: 'destructive' });
    }
    setSavingVideo(false);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!storedPassword) return;
    try {
      const success = await deleteVideo.mutateAsync({
        password: storedPassword,
        videoId,
      });
      if (success) {
        toast({ title: 'تم الحذف', description: 'تم حذف الفيديو' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' });
    }
  };

  const handleEditVideo = async (videoId: string, title: string, url: string) => {
    if (!storedPassword) return;
    try {
      const success = await updateVideo.mutateAsync({
        password: storedPassword,
        videoId,
        title,
        url,
      });
      if (success) {
        toast({ title: 'تم التحديث', description: 'تم تعديل الفيديو بنجاح' });
      } else {
        toast({ title: 'خطأ', description: 'فشل التعديل', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل تعديل الفيديو', variant: 'destructive' });
    }
  };

  const handleSaveCountdownColors = async () => {
    if (!storedPassword) return;
    setSavingCountdownColors(true);
    try {
      const success = await updateSettings.mutateAsync({
        password: storedPassword,
        countdown_bg_color: countdownBgColor,
        countdown_text_color: countdownTextColor,
        countdown_border_color: countdownBorderColor,
      });
      if (success) {
        toast({ title: 'تم الحفظ', description: 'تم حفظ ألوان العداد بنجاح' });
      } else {
        toast({ title: 'خطأ', description: 'فشل حفظ الألوان', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل حفظ الألوان', variant: 'destructive' });
    }
    setSavingCountdownColors(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localVideos.findIndex(v => v.id === active.id);
      const newIndex = localVideos.findIndex(v => v.id === over.id);

      const newVideos = arrayMove(localVideos, oldIndex, newIndex);
      setLocalVideos(newVideos);

      try {
        await reorderVideos.mutateAsync({
          password: storedPassword,
          videoIds: newVideos.map(v => v.id),
        });
        toast({ title: 'تم الحفظ', description: 'تم تحديث ترتيب الفيديوهات' });
      } catch {
        toast({ title: 'خطأ', description: 'فشل حفظ الترتيب', variant: 'destructive' });
        if (videos) setLocalVideos(videos);
      }
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!storedPassword || !announcementMessage) return;
    setSavingAnnouncement(true);
    try {
      const result = await addAnnouncement.mutateAsync({
        password: storedPassword,
        message: announcementMessage,
        type: announcementType,
      });
      if (result) {
        setAnnouncementMessage('');
        toast({ title: 'تم الحفظ', description: 'تم إضافة الإعلان بنجاح' });
      } else {
        toast({ title: 'خطأ', description: 'فشل إضافة الإعلان', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل حفظ الإعلان', variant: 'destructive' });
    }
    setSavingAnnouncement(false);
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!storedPassword) return;
    try {
      const success = await deleteAnnouncement.mutateAsync({
        password: storedPassword,
        announcementId,
      });
      if (success) {
        toast({ title: 'تم الحذف', description: 'تم حذف الإعلان' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' });
    }
  };

  const handleSaveFlashMessage = async () => {
    if (!storedPassword || !flashMessage) return;
    setSavingFlash(true);
    try {
      const result = await addFlashMessage.mutateAsync({
        password: storedPassword,
        message: flashMessage,
        text_direction: flashDirection,
        color: flashColor,
        start_date: flashStartDate ? new Date(flashStartDate).toISOString() : null,
        end_date: flashEndDate ? new Date(flashEndDate).toISOString() : null,
        font_size: flashFontSize,
      });
      if (result) {
        setFlashMessage('');
        setFlashStartDate('');
        setFlashEndDate('');
        toast({ title: 'تم الحفظ', description: 'تم إضافة رسالة الفلاش بنجاح' });
      } else {
        toast({ title: 'خطأ', description: 'فشل إضافة رسالة الفلاش', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل حفظ رسالة الفلاش', variant: 'destructive' });
    }
    setSavingFlash(false);
  };

  const handleDeleteFlashMessage = async (flashMessageId: string) => {
    if (!storedPassword) return;
    try {
      const success = await deleteFlashMessage.mutateAsync({
        password: storedPassword,
        flashMessageId,
      });
      if (success) {
        toast({ title: 'تم الحذف', description: 'تم حذف رسالة الفلاش' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' });
    }
  };

  const handleToggleCountdown = async () => {
    if (!storedPassword) return;
    setIsLoading(true);
    try {
      const success = await updateSettings.mutateAsync({
        password: storedPassword,
        show_countdown: !showCountdown,
      });
      if (success) {
        setShowCountdown(!showCountdown);
        toast({ title: 'تم التحديث', description: `العداد التنازلي ${!showCountdown ? 'مفعّل' : 'معطّل'} الآن` });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleSaveCountdownStyle = async (newStyle: number) => {
    if (!storedPassword) return;
    setSavingCountdownStyle(true);
    try {
      const success = await updateSettings.mutateAsync({
        password: storedPassword,
        countdown_style: newStyle,
      });
      if (success) {
        setCountdownStyle(newStyle);
        toast({ title: 'تم التحديث', description: 'تم حفظ نمط العداد التنازلي' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' });
    }
    setSavingCountdownStyle(false);
  };

  const handleToggleQuestionCount = async () => {
    if (!storedPassword) return;
    setIsLoading(true);
    try {
      const success = await updateSettings.mutateAsync({
        password: storedPassword,
        show_question_count: !showQuestionCount,
      });
      if (success) {
        setShowQuestionCount(!showQuestionCount);
        toast({ title: 'تم التحديث', description: `عداد الأسئلة ${!showQuestionCount ? 'مفعّل' : 'معطّل'} الآن` });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleToggleInstallPage = async () => {
    if (!storedPassword) return;
    setIsLoading(true);
    try {
      const success = await updateSettings.mutateAsync({
        password: storedPassword,
        show_install_page: !showInstallPage,
      });
      if (success) {
        setShowInstallPage(!showInstallPage);
        toast({ title: 'تم التحديث', description: `صفحة التثبيت ${!showInstallPage ? 'مفعّلة' : 'معطّلة'} الآن` });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleToggleContentFilter = async () => {
    if (!storedPassword) return;
    setIsLoading(true);
    try {
      const success = await updateSettings.mutateAsync({
        password: storedPassword,
        content_filter_enabled: !contentFilterEnabled,
      } as any);
      if (success) {
        setContentFilterEnabled(!contentFilterEnabled);
        toast({ title: 'تم التحديث', description: `فلتر المحتوى ${!contentFilterEnabled ? 'مفعّل' : 'معطّل'} الآن` });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleSendPushNotification = async () => {
    if (!storedPassword || !notifTitle.trim() || !notifBody.trim()) return;
    setSendingNotification(true);
    try {
      // إرسال الإشعار عبر Edge Function
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          action: 'send',
          notification: {
            title: notifTitle.trim(),
            body: notifBody.trim(),
          },
          admin_password: storedPassword
        }
      });

      if (error) throw error;

      // حفظ في سجل الإشعارات
      await supabase.rpc('add_notification_authenticated', {
        p_password: storedPassword,
        p_title: notifTitle.trim(),
        p_body: notifBody.trim(),
        p_recipients_count: data?.tokens_count || 0
      });

      setNotifTitle('');
      setNotifBody('');
      await loadNotificationHistory();

      toast({
        title: '✓ تم الإرسال',
        description: `تم إرسال الإشعار إلى ${data?.tokens_count || 0} جهاز`
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({ title: 'خطأ', description: 'فشل إرسال الإشعار', variant: 'destructive' });
    }
    setSendingNotification(false);
  };

  // Load push tokens list
  const loadPushTokens = async () => {
    if (!storedPassword) return;
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPushTokensList(data || []);
    } catch (error) {
      console.error('Error loading push tokens:', error);
    }
  };

  // Set device as admin
  const handleSetAdminDevice = async () => {
    if (!storedPassword || !adminDeviceToken.trim()) return;
    setSettingAdminDevice(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          action: 'set-admin',
          token: adminDeviceToken.trim(),
          admin_password: storedPassword
        }
      });

      if (error) throw error;

      setAdminDeviceToken('');
      await loadPushTokens();
      toast({
        title: '✓ تم التعيين',
        description: 'تم تعيين الجهاز كمسؤول بنجاح'
      });
    } catch (error) {
      console.error('Error setting admin device:', error);
      toast({ title: 'خطأ', description: 'فشل تعيين الجهاز كمسؤول', variant: 'destructive' });
    }
    setSettingAdminDevice(false);
  };

  // Delete notification from history
  const handleDeleteNotification = async (notificationId: string) => {
    if (!storedPassword) return;
    try {
      const { error } = await supabase.rpc('delete_notification_authenticated', {
        p_password: storedPassword,
        p_notification_id: notificationId
      });

      if (error) throw error;

      setNotificationHistory(prev => prev.filter(n => n.id !== notificationId));
      toast({ title: '✓ تم الحذف', description: 'تم حذف الإشعار بنجاح' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({ title: 'خطأ', description: 'فشل حذف الإشعار', variant: 'destructive' });
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (!storedPassword) return;
    setIsLoading(true);
    try {
      const success = await deleteAllQuestions.mutateAsync(storedPassword);
      if (success) {
        setQuestions([]);
        setQuestionsCount(0);
        setSelectedQuestions([]);
        toast({ title: 'تم الحذف', description: 'تم حذف جميع الأسئلة بنجاح' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل حذف الأسئلة', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleDeleteSelectedQuestions = async () => {
    if (!storedPassword || selectedQuestions.length === 0) return;
    setIsLoading(true);
    try {
      const success = await deleteSelectedQuestions.mutateAsync({
        password: storedPassword,
        questionIds: selectedQuestions,
      });
      if (success) {
        setQuestions(prev => prev.filter(q => !selectedQuestions.includes(q.id)));
        setQuestionsCount(prev => (prev ?? 0) - selectedQuestions.length);
        toast({ title: 'تم الحذف', description: `تم حذف ${selectedQuestions.length} سؤال` });
        setSelectedQuestions([]);
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل حذف الأسئلة المحددة', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.length === questions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(questions.map(q => q.id));
    }
  };

  const toggleLogExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl p-10 w-full max-w-md shadow-2xl shadow-primary/10">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">لوحة التحكم</h2>
            <p className="text-sm text-muted-foreground">أدخل كلمة المرور للوصول إلى لوحة الإدارة</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-11 text-center h-12 text-lg rounded-xl bg-muted/50 border-muted-foreground/20 focus:border-primary transition-colors"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg font-medium rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 ml-2 animate-spin" />
                  جارٍ التحقق...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 ml-2" />
                  دخول
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/50 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="w-4 h-4 ml-2" />
              العودة للرئيسية
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">لوحة التحكم</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'إيقاف الصوت' : 'تشغيل الصوت'}
            >
              {soundEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Home className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 max-w-5xl">
        {/* Questions Count Summary */}
        <div className="bg-primary/10 rounded-xl p-4 mb-6 text-center">
          <div className="text-3xl font-bold text-primary">{questionsCount ?? 0}</div>
          <div className="text-sm text-muted-foreground">سؤال مستلم</div>
        </div>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-9 mb-6">
            <TabsTrigger value="stats" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">إحصائيات</span>
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-1">
              <List className="w-4 h-4" />
              <span className="hidden md:inline">الأسئلة</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              <span className="hidden md:inline">الفيديو</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-1">
              <Megaphone className="w-4 h-4" />
              <span className="hidden md:inline">الإعلانات</span>
            </TabsTrigger>
            <TabsTrigger value="flash" className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span className="hidden md:inline">فلاش</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1">
              <Bell className="w-4 h-4" />
              <span className="hidden md:inline">إشعارات</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1 relative">
              <Bug className="w-4 h-4" />
              <span className="hidden md:inline">البلاغات</span>
              {userReports.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {userReports.filter(r => r.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span className="hidden md:inline">السجل</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">الإعدادات</span>
            </TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              إحصائيات الأسئلة
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* الأسئلة حسب الفئة */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-medium mb-4 text-center">الأسئلة حسب الفئة</h4>
                {questionStats.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={questionStats.categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {questionStats.categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    لا توجد بيانات
                  </div>
                )}
              </div>

              {/* الأسئلة حسب اليوم */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-medium mb-4 text-center">الأسئلة في آخر 7 أيام</h4>
                {questions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={questionStats.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="عدد الأسئلة" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    لا توجد بيانات
                  </div>
                )}
              </div>

              {/* الزوار حسب اليوم */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-medium mb-4 text-center">الزوار في آخر 7 أيام</h4>
                {accessLogs.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={visitorStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" name="عدد الزوار" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    لا توجد بيانات
                  </div>
                )}
              </div>
            </div>

            {/* ملخص الإحصائيات */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">{questions.length}</div>
                <div className="text-sm text-muted-foreground">إجمالي الأسئلة</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{questionStats.categoryData.length}</div>
                <div className="text-sm text-muted-foreground">فئات مختلفة</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {accessLogs.length}
                </div>
                <div className="text-sm text-muted-foreground">إجمالي الزوار</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-500">
                  {accessLogs.filter(l => l.is_authorized).length}
                </div>
                <div className="text-sm text-muted-foreground">دخول ناجح</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-destructive">
                  {accessLogs.filter(l => !l.is_authorized).length}
                </div>
                <div className="text-sm text-muted-foreground">محاولات فاشلة</div>
              </div>
            </div>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToExcel(questions)}
                  disabled={questions.length === 0}
                >
                  <FileSpreadsheet className="w-4 h-4 ml-2" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToPDF(questions)}
                  disabled={questions.length === 0}
                >
                  <FileText className="w-4 h-4 ml-2" />
                  PDF
                </Button>
                {questions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                  >
                    <CheckSquare className="w-4 h-4 ml-2" />
                    {selectedQuestions.length === questions.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {selectedQuestions.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف المحدد ({selectedQuestions.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          تأكيد الحذف
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف {selectedQuestions.length} سؤال؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row-reverse gap-2">
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelectedQuestions} className="bg-destructive hover:bg-destructive/90">
                          حذف المحدد
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={questions.length === 0}
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      حذف الكل
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        تأكيد الحذف
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد من حذف جميع الأسئلة؟ لا يمكن التراجع عن هذا الإجراء.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row-reverse gap-2">
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAllQuestions} className="bg-destructive hover:bg-destructive/90">
                        حذف الكل
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* فلاتر الأسئلة */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="w-4 h-4" />
                تصفية الأسئلة
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">حسب الوقت</label>
                  <Select value={questionFilter} onValueChange={(v) => setQuestionFilter(v as typeof questionFilter)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأسئلة</SelectItem>
                      <SelectItem value="old">أسئلة قديمة</SelectItem>
                      <SelectItem value="new">أسئلة جديدة (آخر 24 ساعة)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm mb-1">حسب نوع الفتوى</label>
                  <Select value={questionCategoryFilter} onValueChange={setQuestionCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      {Array.from(new Set(questions.map(q => q.category))).map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {getCategoryLabel(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(questionFilter !== 'all' || questionCategoryFilter !== 'all') && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    عرض {filteredQuestions.length} من {questions.length} سؤال
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuestionFilter('all');
                      setQuestionCategoryFilter('all');
                    }}
                  >
                    مسح الفلاتر
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">لا توجد أسئلة حتى الآن</p>
                </div>
              ) : (
                filteredQuestions.map((q, index) => (
                  <div
                    key={q.id}
                    className={`bg-card border rounded-lg p-4 cursor-pointer transition-colors ${selectedQuestions.includes(q.id) ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    onClick={() => toggleQuestionSelection(q.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedQuestions.includes(q.id)}
                        onCheckedChange={() => toggleQuestionSelection(q.id)}
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                            {getCategoryLabel(q.category)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            #{index + 1} - {new Date(q.created_at).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        <p className="text-sm">{q.question_text}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* User Reports Tab - بلاغات المستخدمين */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium flex items-center gap-2">
                <Bug className="w-5 h-5 text-primary" />
                بلاغات المستخدمين ({userReports.length})
              </h3>
              <Button variant="outline" size="sm" onClick={loadUserReports}>
                تحديث
              </Button>
            </div>

            {userReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد بلاغات حالياً</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userReports.map((report) => (
                  <div key={report.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${report.report_type === 'bug' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            report.report_type === 'suggestion' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                            {report.report_type === 'bug' ? 'مشكلة تقنية' : report.report_type === 'suggestion' ? 'اقتراح' : 'أخرى'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${report.status === 'pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            report.status === 'reviewed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                            {report.status === 'pending' ? 'معلق' : report.status === 'reviewed' ? 'تمت المراجعة' : 'تم الحل'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{report.message}</p>
                        {report.email && (
                          <p className="text-xs text-muted-foreground">📧 {report.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={report.status}
                          onValueChange={(value) => handleUpdateReportStatus(report.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">معلق</SelectItem>
                            <SelectItem value="reviewed">تمت المراجعة</SelectItem>
                            <SelectItem value="resolved">تم الحل</SelectItem>
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف البلاغ</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف هذا البلاغ؟ لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteReport(report.id)}>
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Logs Tab - سجل الدخول */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="font-medium flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                سجل محاولات الدخول ({filteredLogs.length})
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/security-logs')}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Lock className="w-4 h-4 ml-2" />
                  سجلات الأمان المتقدمة
                </Button>
                <Button variant="outline" size="sm" onClick={loadAccessLogs}>
                  <RefreshCw className="w-4 h-4 ml-2" />
                  تحديث
                </Button>
              </div>
            </div>

            {/* فلاتر البحث */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="w-4 h-4" />
                البحث والفلترة
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">البحث بـ IP</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={logSearchIP}
                      onChange={(e) => setLogSearchIP(e.target.value)}
                      placeholder="ابحث بعنوان IP..."
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">الحالة</label>
                  <Select value={logFilterStatus} onValueChange={(v) => setLogFilterStatus(v as typeof logFilterStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="authorized">دخول ناجح</SelectItem>
                      <SelectItem value="failed">محاولات فاشلة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm mb-1">التاريخ</label>
                  <Input
                    type="date"
                    value={logFilterDate}
                    onChange={(e) => setLogFilterDate(e.target.value)}
                  />
                </div>
              </div>
              {(logSearchIP || logFilterStatus !== 'all' || logFilterDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLogSearchIP('');
                    setLogFilterStatus('all');
                    setLogFilterDate('');
                  }}
                >
                  مسح الفلاتر
                </Button>
              )}
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">لا توجد سجلات</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`bg-card border rounded-lg overflow-hidden ${log.is_authorized ? 'border-green-500/30' : 'border-destructive/30'
                      }`}
                  >
                    {/* Header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleLogExpand(log.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {log.is_authorized ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                          <span className={log.is_authorized ? 'text-green-500 font-medium' : 'text-destructive font-medium'}>
                            {log.is_authorized ? 'دخول مصرح' : 'محاولة فاشلة'}
                          </span>
                          {log.fingerprint_id && (
                            <span className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                              <Fingerprint className="w-3 h-3" />
                              {log.fingerprint_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.accessed_at).toLocaleString('ar-SA')}
                          </span>
                          {expandedLogId === log.id ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Globe className="w-4 h-4" />
                          <span>{log.ip_address || 'غير معروف'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{log.country && log.city ? `${log.city}, ${log.country}` : 'غير معروف'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Smartphone className="w-4 h-4" />
                          <span>{log.device_type || 'غير معروف'}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {log.browser} / {log.os}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedLogId === log.id && (
                      <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* معلومات الموقع */}
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2 text-primary">
                              <MapPin className="w-4 h-4" />
                              معلومات الموقع
                            </h4>
                            <div className="bg-card rounded-lg p-3 space-y-1">
                              <p><span className="text-muted-foreground">الدولة:</span> {log.country || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">المدينة:</span> {log.city || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">المنطقة:</span> {log.region || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">الرمز البريدي:</span> {log.postal || 'غير معروف'}</p>
                              {log.latitude && log.longitude && (
                                <p><span className="text-muted-foreground">الإحداثيات:</span> {log.latitude}, {log.longitude}</p>
                              )}
                            </div>
                          </div>

                          {/* معلومات الشبكة */}
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2 text-primary">
                              <Wifi className="w-4 h-4" />
                              معلومات الشبكة
                            </h4>
                            <div className="bg-card rounded-lg p-3 space-y-1">
                              <p><span className="text-muted-foreground">IP:</span> {log.ip_address || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">مزود الخدمة:</span> {log.isp || log.org || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">ASN:</span> {log.asn || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">نوع الاتصال:</span> {log.network_type || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">نوع الشبكة:</span> {log.connection_type || 'غير معروف'}</p>
                            </div>
                          </div>

                          {/* معلومات الجهاز */}
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2 text-primary">
                              <Monitor className="w-4 h-4" />
                              معلومات الجهاز
                            </h4>
                            <div className="bg-card rounded-lg p-3 space-y-1">
                              <p><span className="text-muted-foreground">النوع:</span> {log.device_type || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">المتصفح:</span> {log.browser || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">النظام:</span> {log.os || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">حجم الشاشة:</span> {log.screen_size || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">عمق الألوان:</span> {log.color_depth || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">كثافة البكسل:</span> {log.pixel_ratio || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">دعم اللمس:</span> {log.touch_support ? 'نعم' : 'لا'}</p>
                            </div>
                          </div>

                          {/* معلومات المتصفح */}
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2 text-primary">
                              <Globe className="w-4 h-4" />
                              معلومات المتصفح
                            </h4>
                            <div className="bg-card rounded-lg p-3 space-y-1">
                              <p><span className="text-muted-foreground">اللغة:</span> {log.language || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">المنطقة الزمنية:</span> {log.timezone || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">عدد الأنوية:</span> {log.hardware_concurrency || 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">الذاكرة:</span> {log.device_memory ? `${log.device_memory} GB` : 'غير معروف'}</p>
                              <p><span className="text-muted-foreground">المصدر:</span> {log.referrer || 'مباشر'}</p>
                            </div>
                          </div>
                        </div>

                        {/* User Agent */}
                        {log.user_agent && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-primary">User Agent</h4>
                            <div className="bg-card rounded-lg p-3">
                              <p className="text-xs text-muted-foreground break-all font-mono" dir="ltr">
                                {log.user_agent}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Fingerprint */}
                        {log.fingerprint_id && (
                          <div className="flex items-center gap-2 text-sm">
                            <Fingerprint className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">بصمة المتصفح:</span>
                            <code className="bg-muted px-2 py-1 rounded text-xs">{log.fingerprint_id}</code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-4">
            {videosLoading ? (
              <div className="text-center py-4 text-muted-foreground">جارٍ تحميل الفيديوهات...</div>
            ) : localVideos && localVideos.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">الفيديوهات الحالية ({localVideos.length}) - اسحب لإعادة الترتيب</h4>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localVideos.map(v => v.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localVideos.map((video) => (
                      <SortableVideoItem
                        key={video.id}
                        video={video}
                        onDelete={handleDeleteVideo}
                        onEdit={handleEditVideo}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد فيديوهات</p>
              </div>
            )}

            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                إضافة فيديو جديد
              </h4>
              <Input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="عنوان الفيديو"
              />
              <Input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="رابط YouTube أو Google Drive (مثال: https://www.youtube.com/watch?v=... أو https://drive.google.com/file/d/...)"
                dir="ltr"
              />

              {/* معاينة الفيديو */}
              {videoUrl && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-sm font-medium flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    معاينة الفيديو
                  </div>
                  <div className="aspect-video">
                    {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeVideoId(videoUrl)}`}
                        title="معاينة"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : videoUrl.includes('drive.google.com') || videoUrl.includes('docs.google.com/file') ? (
                      <iframe
                        src={`https://drive.google.com/file/d/${getGoogleDriveFileId(videoUrl)}/preview`}
                        title="معاينة"
                        className="w-full h-full"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={videoUrl}
                        controls
                        className="w-full h-full"
                        preload="metadata"
                      >
                        متصفحك لا يدعم تشغيل الفيديو
                      </video>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleSaveVideo}
                disabled={savingVideo || !videoUrl || !videoTitle}
                className="w-full"
              >
                <Plus className="w-4 h-4 ml-2" />
                {savingVideo ? 'جارٍ الإضافة...' : 'إضافة الفيديو'}
              </Button>
            </div>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            {announcements && announcements.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">الإعلانات الحالية ({announcements.length})</h4>
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <span className={`text-xs px-2 py-1 rounded ${ann.type === 'success' ? 'bg-green-500/20 text-green-600' :
                          ann.type === 'warning' ? 'bg-amber-500/20 text-amber-600' :
                            ann.type === 'error' ? 'bg-destructive/20 text-destructive' :
                              'bg-primary/20 text-primary'
                          }`}>
                          {ann.type === 'success' ? 'نجاح' : ann.type === 'warning' ? 'تنبيه' : ann.type === 'error' ? 'خطأ' : 'إعلان'}
                        </span>
                        <p className="mt-2 text-sm">{ann.message}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد إعلانات</p>
              </div>
            )}

            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                إضافة إعلان جديد
              </h4>
              <Input
                type="text"
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                placeholder="نص الإعلان"
              />
              <Select value={announcementType} onValueChange={setAnnouncementType}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع الإعلان" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">إعلان</SelectItem>
                  <SelectItem value="success">نجاح</SelectItem>
                  <SelectItem value="warning">تنبيه</SelectItem>
                  <SelectItem value="error">تحذير</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleSaveAnnouncement}
                disabled={savingAnnouncement || !announcementMessage}
                className="w-full"
              >
                <Plus className="w-4 h-4 ml-2" />
                {savingAnnouncement ? 'جارٍ الإضافة...' : 'إضافة الإعلان'}
              </Button>
            </div>
          </TabsContent>

          {/* Flash Messages Tab */}
          <TabsContent value="flash" className="space-y-4">
            {flashMessages && flashMessages.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">رسائل الفلاش الحالية ({flashMessages.length})</h4>
                {flashMessages.map((msg) => (
                  <div key={msg.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: msg.color }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {msg.text_direction === 'rtl' ? 'من اليمين لليسار' : 'من اليسار لليمين'}
                          </span>
                          {msg.start_date && (
                            <span className="text-xs text-muted-foreground">
                              من: {new Date(msg.start_date).toLocaleDateString('ar-SA')}
                            </span>
                          )}
                          {msg.end_date && (
                            <span className="text-xs text-muted-foreground">
                              إلى: {new Date(msg.end_date).toLocaleDateString('ar-SA')}
                            </span>
                          )}
                        </div>
                        <p
                          className="text-sm p-2 rounded"
                          style={{ backgroundColor: msg.color, color: getContrastColor(msg.color) }}
                          dir={msg.text_direction}
                        >
                          {msg.message}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteFlashMessage(msg.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد رسائل فلاش</p>
              </div>
            )}

            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                إضافة رسالة فلاش جديدة
              </h4>

              <Input
                type="text"
                value={flashMessage}
                onChange={(e) => setFlashMessage(e.target.value)}
                placeholder="نص الرسالة"
              />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2">اتجاه النص</label>
                  <Select value={flashDirection} onValueChange={setFlashDirection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rtl">من اليمين لليسار</SelectItem>
                      <SelectItem value="ltr">من اليسار لليمين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm mb-2">حجم الخط</label>
                  <Select value={flashFontSize} onValueChange={(v) => setFlashFontSize(v as 'sm' | 'md' | 'lg' | 'xl')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">صغير</SelectItem>
                      <SelectItem value="md">متوسط</SelectItem>
                      <SelectItem value="lg">كبير</SelectItem>
                      <SelectItem value="xl">كبير جداً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm mb-2">اللون</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={flashColor}
                      onChange={(e) => setFlashColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={flashColor}
                      onChange={(e) => setFlashColor(e.target.value)}
                      className="flex-1"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">تاريخ البداية (اختياري)</label>
                  <Input
                    type="datetime-local"
                    value={flashStartDate}
                    onChange={(e) => setFlashStartDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">اتركه فارغاً للظهور فوراً</p>
                </div>

                <div>
                  <label className="block text-sm mb-2">تاريخ النهاية (اختياري)</label>
                  <Input
                    type="datetime-local"
                    value={flashEndDate}
                    onChange={(e) => setFlashEndDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">اتركه فارغاً لعدم الانتهاء</p>
                </div>
              </div>

              {flashMessage && (
                <div>
                  <label className="block text-sm mb-2">معاينة:</label>
                  <div
                    className="p-3 rounded-lg flex items-center gap-2 overflow-hidden"
                    style={{ backgroundColor: flashColor, color: getContrastColor(flashColor) }}
                    dir={flashDirection}
                  >
                    <Zap className="w-5 h-5 flex-shrink-0" />
                    <div className="animate-marquee whitespace-nowrap">
                      <p className={`inline-block font-medium ${flashFontSize === 'sm' ? 'text-sm' :
                        flashFontSize === 'lg' ? 'text-lg' :
                          flashFontSize === 'xl' ? 'text-xl' : 'text-base'
                        }`}>{flashMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSaveFlashMessage}
                disabled={savingFlash || !flashMessage}
                className="w-full"
              >
                <Plus className="w-4 h-4 ml-2" />
                {savingFlash ? 'جارٍ الإضافة...' : 'إضافة رسالة الفلاش'}
              </Button>
            </div>
          </TabsContent>

          {/* Notifications Tab - إرسال إشعارات */}
          <TabsContent value="notifications" className="space-y-4">
            {/* تعيين هذا الجهاز كمسؤول */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                تعيين جهاز كمسؤول
              </h4>
              <p className="text-sm text-muted-foreground">
                أدخل رمز الجهاز (Push Token) لتعيينه كجهاز مسؤول لاستقبال الإشعارات
              </p>
              <div className="flex gap-2">
                <Input
                  value={adminDeviceToken}
                  onChange={(e) => setAdminDeviceToken(e.target.value)}
                  placeholder="رمز الجهاز (Push Token)"
                  className="flex-1"
                  dir="ltr"
                />
                <Button
                  onClick={handleSetAdminDevice}
                  disabled={settingAdminDevice || !adminDeviceToken.trim()}
                  variant="outline"
                >
                  <Shield className="w-4 h-4 ml-2" />
                  {settingAdminDevice ? 'جارٍ التعيين...' : 'تعيين كمسؤول'}
                </Button>
              </div>
            </div>

            {/* قائمة الأجهزة المسجلة */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  الأجهزة المسجلة للإشعارات
                </h4>
                <Button variant="ghost" size="sm" onClick={loadPushTokens}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              {pushTokensList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد أجهزة مسجلة</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {pushTokensList.map((device) => (
                    <div key={device.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-mono truncate max-w-[200px]" dir="ltr">
                          {device.token.slice(0, 20)}...
                        </span>
                        <span className="text-xs text-muted-foreground">({device.device_type})</span>
                      </div>
                      {device.is_admin && (
                        <Badge variant="default" className="text-xs">
                          <Shield className="w-3 h-3 ml-1" />
                          مسؤول
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* زر اختبار الإشعارات */}
            <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-primary" />
                  اختبار استلام الإشعارات
                </h4>
                <p className="text-sm text-muted-foreground">
                  اختبر وصول التنبيهات على هذا الجهاز حالاً
                </p>
              </div>
              <Button onClick={handleTestNotification} variant="outline" className="gap-2">
                <Sparkles className="w-4 h-4" />
                إرسال تنبيه تجريبي
              </Button>
            </div>

            {/* إرسال إشعار */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                إرسال إشعار للمستخدمين
              </h4>
              <Input
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="عنوان الإشعار"
              />
              <Textarea
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder="نص الإشعار..."
                className="min-h-[100px]"
              />
              <Button
                onClick={handleSendPushNotification}
                disabled={sendingNotification || !notifTitle.trim() || !notifBody.trim()}
                className="w-full"
              >
                <Send className="w-4 h-4 ml-2" />
                {sendingNotification ? 'جارٍ الإرسال...' : 'إرسال للجميع'}
              </Button>
            </div>

            {/* سجل الإشعارات */}
            {notificationHistory.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">الإشعارات السابقة ({notificationHistory.length})</h4>
                {notificationHistory.map((notif) => (
                  <div key={notif.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium">{notif.title}</h5>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(notif.sent_at).toLocaleString('ar-SA')}
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                تأكيد الحذف
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف هذا الإشعار من السجل؟
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse gap-2">
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteNotification(notif.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{notif.body}</p>
                    <div className="mt-2 text-xs text-primary">
                      أُرسل إلى {notif.recipients_count} جهاز
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">

            {/* فتح/إغلاق الصندوق */}
            <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  صندوق الأسئلة
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isBoxOpen ? 'الصندوق مفتوح - يمكن للزوار إرسال الأسئلة' : 'الصندوق مغلق - لا يمكن إرسال الأسئلة'}
                </p>
              </div>
              <Switch
                checked={isBoxOpen}
                onCheckedChange={handleToggleBox}
                disabled={isLoading}
              />
            </div>

            <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  العداد التنازلي
                </h3>
                <p className="text-sm text-muted-foreground">
                  {showCountdown ? 'يظهر العداد التنازلي للحلقة القادمة' : 'العداد التنازلي مخفي'}
                </p>
              </div>
              <Switch
                checked={showCountdown}
                onCheckedChange={handleToggleCountdown}
                disabled={isLoading}
              />
            </div>

            {/* اختيار نمط العداد التنازلي */}
            {showCountdown && (
              <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="font-medium flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" />
                    نمط العداد التنازلي
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    اختر النمط المناسب وشاهد المعاينة قبل الحفظ
                  </p>
                </div>

                <RadioGroup
                  value={String(countdownStyle)}
                  onValueChange={(val) => setCountdownStyle(Number(val))}
                  className="grid grid-cols-2 md:grid-cols-5 gap-3"
                >
                  <div>
                    <RadioGroupItem value="1" id="style-1" className="peer sr-only" />
                    <Label
                      htmlFor="style-1"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <Monitor className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">LED رقمي</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="2" id="style-2" className="peer sr-only" />
                    <Label
                      htmlFor="style-2"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <Clock className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">كلاسيكي</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="3" id="style-3" className="peer sr-only" />
                    <Label
                      htmlFor="style-3"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <Timer className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">بسيط</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="4" id="style-4" className="peer sr-only" />
                    <Label
                      htmlFor="style-4"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <RefreshCw className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">دائري</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="5" id="style-5" className="peer sr-only" />
                    <Label
                      htmlFor="style-5"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <Sparkles className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">زجاجي 3D</span>
                    </Label>
                  </div>
                </RadioGroup>

                {/* تخصيص الألوان */}
                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    🎨 تخصيص الألوان
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm mb-2">لون الخلفية</label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={countdownBgColor}
                          onChange={(e) => setCountdownBgColor(e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={countdownBgColor}
                          onChange={(e) => setCountdownBgColor(e.target.value)}
                          className="flex-1"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">لون النص</label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={countdownTextColor}
                          onChange={(e) => setCountdownTextColor(e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={countdownTextColor}
                          onChange={(e) => setCountdownTextColor(e.target.value)}
                          className="flex-1"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">لون الإطار</label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={countdownBorderColor}
                          onChange={(e) => setCountdownBorderColor(e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={countdownBorderColor}
                          onChange={(e) => setCountdownBorderColor(e.target.value)}
                          className="flex-1"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveCountdownColors}
                    disabled={savingCountdownColors}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    {savingCountdownColors ? 'جارٍ الحفظ...' : 'حفظ الألوان'}
                  </Button>
                </div>

                {/* معاينة النمط */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">معاينة:</h4>
                  <div className="max-w-xl mx-auto">
                    <CountdownTimerPreview
                      style={countdownStyle}
                      bgColor={countdownBgColor}
                      textColor={countdownTextColor}
                      borderColor={countdownBorderColor}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleSaveCountdownStyle(countdownStyle)}
                  disabled={savingCountdownStyle || countdownStyle === (settings?.countdown_style ?? 1)}
                  className="w-full"
                >
                  {savingCountdownStyle ? 'جارٍ الحفظ...' : 'حفظ نمط العداد'}
                </Button>
              </div>
            )}

            <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  عداد الأسئلة
                </h3>
                <p className="text-sm text-muted-foreground">
                  {showQuestionCount ? 'يظهر عدد الأسئلة المستلمة للزوار' : 'عداد الأسئلة مخفي عن الزوار'}
                </p>
              </div>
              <Switch
                checked={showQuestionCount}
                onCheckedChange={handleToggleQuestionCount}
                disabled={isLoading}
              />
            </div>

            <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  صفحة التثبيت
                </h3>
                <p className="text-sm text-muted-foreground">
                  {showInstallPage ? 'صفحة التثبيت متاحة للزوار (/install)' : 'صفحة التثبيت معطّلة'}
                </p>
              </div>
              <Switch
                checked={showInstallPage}
                onCheckedChange={handleToggleInstallPage}
                disabled={isLoading}
              />
            </div>

            <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  فلتر المحتوى
                </h3>
                <p className="text-sm text-muted-foreground">
                  {contentFilterEnabled ? 'يمنع الأسئلة غير اللائقة' : 'فلتر المحتوى معطّل'}
                </p>
              </div>
              <Switch
                checked={contentFilterEnabled}
                onCheckedChange={handleToggleContentFilter}
                disabled={isLoading}
              />
            </div>

            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-medium">موعد الحلقة القادمة</h3>
              </div>
              <Input
                type="datetime-local"
                value={nextSessionDate}
                onChange={(e) => setNextSessionDate(e.target.value)}
              />
              <Button onClick={handleUpdateSession} disabled={isLoading || !nextSessionDate}>
                {isLoading ? 'جارٍ الحفظ...' : 'حفظ الموعد'}
              </Button>
            </div>

            {/* قسم الإشعارات */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-primary" />
                <h3 className="font-medium">إشعارات الأسئلة الجديدة</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                تلقي إشعارات في المتصفح عند وصول أسئلة جديدة أثناء تواجدك في لوحة التحكم
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">إشعارات الصوت</p>
                    <p className="text-xs text-muted-foreground">تشغيل صوت عند وصول سؤال جديد</p>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">اختبار الإشعارات</p>
                    <p className="text-xs text-muted-foreground">تأكد من عمل الأيقونة والتنبيه</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestNotification}
                  >
                    <Send className="w-4 h-4 ml-2" />
                    اختبار
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">إشعارات المتصفح</p>
                  <p className="text-xs text-muted-foreground">طلب إذن المتصفح وإرسال تنبيه تفعيل</p>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    if ('Notification' in window) {
                      Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                          new Notification('تم تفعيل الإشعارات!', {
                            body: 'ستصلك إشعارات عند وصول أسئلة جديدة',
                            icon: '/icon-mosque.png'
                          });
                          toast({ title: '✓ تم التفعيل', description: 'تم تفعيل إشعارات المتصفح بنجاح' });
                        }
                      });
                    }
                  }}
                >
                  <Bell className="w-4 h-4 ml-2" />
                  تفعيل الآن
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Helper function to get contrast color
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export default AdminPage;
