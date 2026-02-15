import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OfflineQuestion {
  id: string;
  category: string;
  question_text: string;
  timestamp: number;
}

const DB_NAME = 'fatwa-offline-db';
const STORE_NAME = 'pending-questions';
const DB_VERSION = 1;

// فتح قاعدة البيانات
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// حفظ سؤال
const saveQuestionToDB = async (question: OfflineQuestion): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(question);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// جلب جميع الأسئلة المحفوظة
const getAllQuestions = async (): Promise<OfflineQuestion[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

// تحديث سؤال
const updateQuestionInDB = async (id: string, data: Partial<OfflineQuestion>): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (existing) {
        const updated = { ...existing, ...data };
        const putRequest = store.put(updated);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        reject(new Error('Question not found'));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// حذف سؤال
const deleteQuestionFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// حذف جميع الأسئلة
const deleteAllQuestionsFromDB = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export function useOfflineQuestions() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineQuestions, setOfflineQuestions] = useState<OfflineQuestion[]>([]);
  const { toast } = useToast();

  // تحديث عدد الأسئلة المعلقة وقائمتها
  const updatePendingCount = useCallback(async () => {
    try {
      const questions = await getAllQuestions();
      setPendingCount(questions.length);
      setOfflineQuestions(questions);
    } catch (error) {
      console.error('Error getting pending questions:', error);
    }
  }, []);

  // جلب الأسئلة المحفوظة
  const getOfflineQuestions = useCallback(async (): Promise<OfflineQuestion[]> => {
    try {
      const questions = await getAllQuestions();
      setOfflineQuestions(questions);
      return questions;
    } catch (error) {
      console.error('Error getting offline questions:', error);
      return [];
    }
  }, []);

  // تحديث سؤال محفوظ
  const updateQuestion = useCallback(async (id: string, data: Partial<OfflineQuestion>) => {
    try {
      await updateQuestionInDB(id, data);
      await updatePendingCount();
      toast({
        title: '✓',
        description: 'تم تحديث السؤال',
      });
    } catch (error) {
      console.error('Error updating question:', error);
    }
  }, [toast, updatePendingCount]);

  // حذف سؤال محفوظ
  const deleteQuestion = useCallback(async (id: string) => {
    try {
      await deleteQuestionFromDB(id);
      await updatePendingCount();
      toast({
        title: '🗑️',
        description: 'تم حذف السؤال',
      });
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  }, [toast, updatePendingCount]);

  // مزامنة الأسئلة المعلقة
  const syncPendingQuestions = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const questions = await getAllQuestions();

      if (questions.length === 0) {
        setIsSyncing(false);
        return;
      }

      let successCount = 0;

      for (const q of questions) {
        try {
          const { error } = await supabase
            .from('questions')
            .insert({
              category: q.category,
              question_text: q.question_text,
            });

          if (!error) {
            await deleteQuestionFromDB(q.id);
            successCount++;
          }
        } catch (err) {
          console.error('Error syncing question:', err);
        }
      }

      if (successCount > 0) {
        toast({
          title: '✅ تمت المزامنة',
          description: `تم إرسال ${successCount} سؤال محفوظ`,
        });
      }

      await updatePendingCount();
    } catch (error) {
      console.error('Error syncing questions:', error);
    }
    setIsSyncing(false);
  }, [isSyncing, toast, updatePendingCount]);

  // حفظ سؤال للإرسال لاحقاً
  const saveForLater = useCallback(async (category: string, question_text: string) => {
    const question: OfflineQuestion = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      question_text,
      timestamp: Date.now(),
    };

    await saveQuestionToDB(question);
    await updatePendingCount();

    toast({
      title: '💾 تم الحفظ',
      description: 'سيُرسل السؤال تلقائياً عند الاتصال بالإنترنت',
    });
  }, [toast, updatePendingCount]);

  // حذف جميع الأسئلة المحفوظة
  const clearAllQuestions = useCallback(async () => {
    try {
      await deleteAllQuestionsFromDB();
      await updatePendingCount();
      toast({
        title: '🗑️ تم المسح',
        description: 'تم حذف جميع الأسئلة المحفوظة محلياً',
      });
    } catch (error) {
      console.error('Error clearing all questions:', error);
    }
  }, [toast, updatePendingCount]);

  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: '🌐 متصل بالإنترنت',
        description: 'جارٍ مزامنة الأسئلة المحفوظة...',
      });
      syncPendingQuestions();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: '📴 غير متصل',
        description: 'سيتم حفظ أسئلتك وإرسالها عند الاتصال',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // تحديث العدد عند التحميل
    updatePendingCount();

    // محاولة المزامنة عند التحميل
    if (navigator.onLine) {
      syncPendingQuestions();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingQuestions, toast, updatePendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    offlineQuestions,
    saveForLater,
    syncPendingQuestions,
    getOfflineQuestions,
    updateQuestion,
    deleteQuestion,
    clearAllQuestions,
  };
}
