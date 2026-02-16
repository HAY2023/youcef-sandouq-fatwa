import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubmitQuestion } from '@/hooks/useQuestions';
import { useOfflineQuestions, OfflineQuestion } from '@/hooks/useOfflineQuestions';
import { QUESTION_CATEGORIES } from '@/lib/categories';
import { validateWithToast, questionSchema } from '@/lib/validations';
import { checkQuestionContent, getContentFilterMessage } from '@/lib/contentFilter';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Send, Tag, MessageSquare, Sparkles, Loader2, WifiOff, CloudUpload, Eye, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { VoiceInput } from '@/components/VoiceInput';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from '@/hooks/useSettings';

export function QuestionForm() {
  const { t, i18n } = useTranslation();
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [showOfflineQuestions, setShowOfflineQuestions] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<OfflineQuestion | null>(null);
  const [editText, setEditText] = useState('');
  const [contentWarning, setContentWarning] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const submitQuestion = useSubmitQuestion();
  const {
    isOnline,
    pendingCount,
    saveForLater,
    isSyncing,
    offlineQuestions,
    updateQuestion,
    deleteQuestion,
    getOfflineQuestions,
    clearAllQuestions
  } = useOfflineQuestions();

  const isRTL = i18n.language === 'ar';
  // استخدام any للوصول للخاصية الجديدة حتى يتم تحديث الأنواع
  const isContentFilterEnabled = (settings as any)?.content_filter_enabled !== false;

  const correctionMessages = {
    ar: {
      short: 'يرجى كتابة سؤال أطول للتصحيح',
      corrected: 'تم تصحيح السؤال تلقائياً',
      correct: 'سؤالك مكتوب بشكل صحيح',
      error: 'فشل التصحيح، حاول مرة أخرى',
    },
    fr: {
      short: 'Veuillez écrire une question plus longue',
      corrected: 'Question corrigée automatiquement',
      correct: 'Votre question est correcte',
      error: 'Échec de la correction, réessayez',
    },
    en: {
      short: 'Please write a longer question',
      corrected: 'Question automatically corrected',
      correct: 'Your question is correct',
      error: 'Correction failed, try again',
    },
  };

  const msgs = correctionMessages[i18n.language as keyof typeof correctionMessages] || correctionMessages.ar;

  const handleCorrectQuestion = async () => {
    if (!questionText.trim() || questionText.trim().length < 10) {
      toast({
        title: t('common.alert'),
        description: msgs.short,
        variant: 'destructive',
      });
      return;
    }

    setIsCorrecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('correct-question', {
        body: { question: questionText.trim() }
      });

      if (error) throw error;

      if (data.hasCorrections && data.corrected) {
        setQuestionText(data.corrected);
        toast({
          title: '✨',
          description: msgs.corrected,
        });
      } else {
        toast({
          title: '✓',
          description: msgs.correct,
        });
      }
    } catch (error) {
      console.error('Error correcting question:', error);
      toast({
        title: t('common.error'),
        description: msgs.error,
        variant: 'destructive',
      });
    }
    setIsCorrecting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // فحص المحتوى إذا كان الفلتر مفعّل
    if (isContentFilterEnabled) {
      const contentCheck = checkQuestionContent(questionText);
      if (!contentCheck.isClean && !contentCheck.isWarning) {
        const message = getContentFilterMessage(contentCheck, i18n.language);
        toast({
          title: i18n.language === 'ar' ? '⚠️ تنبيه' : '⚠️ Warning',
          description: message,
          variant: 'destructive',
        });
        setContentWarning(message);
        return;
      }

      if (contentCheck.isWarning) {
        const message = getContentFilterMessage(contentCheck, i18n.language);
        setContentWarning(message);
        // نسمح بالإرسال مع تحذير
      }
    }

    const validation = validateWithToast(
      questionSchema,
      {
        category,
        question_text: questionText.trim(),
        customCategory: category === 'other' ? customCategory.trim() : undefined,
      },
      (msg) => toast({ title: t('common.alert'), description: msg, variant: 'destructive' })
    );

    if (!validation) return;

    if (category === 'other' && !customCategory.trim()) {
      toast({
        title: t('common.alert'),
        description: i18n.language === 'ar' ? 'يرجى كتابة نوع الفتوى' : 'Please specify the category',
        variant: 'destructive',
      });
      return;
    }

    const finalCategory = category === 'other' ? customCategory.trim() : category;
    setContentWarning(null);

    // إذا كان غير متصل، احفظ للإرسال لاحقاً
    if (!isOnline) {
      await saveForLater(finalCategory, questionText.trim());
      setIsSubmitted(true);
      return;
    }

    try {
      await submitQuestion.mutateAsync({
        category: finalCategory,
        question_text: questionText.trim(),
      });
      setIsSubmitted(true);
    } catch {
      // إذا فشل الإرسال، احفظ للإرسال لاحقاً
      await saveForLater(finalCategory, questionText.trim());
      setIsSubmitted(true);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setCategory('');
    setCustomCategory('');
    setQuestionText('');
  };

  const handleVoiceTranscript = (transcript: string) => {
    setQuestionText((prev) => prev ? `${prev} ${transcript}` : transcript);
  };

  const handleViewOfflineQuestions = async () => {
    await getOfflineQuestions();
    setShowOfflineQuestions(true);
  };

  const handleEditQuestion = (q: OfflineQuestion) => {
    setEditingQuestion(q);
    setEditText(q.question_text);
  };

  const handleSaveEdit = async () => {
    if (editingQuestion && editText.trim()) {
      await updateQuestion(editingQuestion.id, { question_text: editText.trim() });
      setEditingQuestion(null);
      setEditText('');
      await getOfflineQuestions();
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    await deleteQuestion(id);
    await getOfflineQuestions();
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-8 animate-in fade-in duration-500">
        <CheckCircle className="w-16 h-16 text-primary mx-auto mb-6" />
        <h3 className="text-2xl font-bold mb-4">{t('form.successTitle')}</h3>
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          {!isOnline
            ? (i18n.language === 'ar' ? 'تم حفظ سؤالك وسيُرسل عند الاتصال بالإنترنت' : 'Your question was saved and will be sent when online')
            : t('form.successMessage')
          }
        </p>
        <Button onClick={handleReset} variant="outline" size="lg">
          {t('form.submitAnother')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* حالة الاتصال وعرض الأسئلة المحفوظة */}
        {(!isOnline || pendingCount > 0) && (
          <div className={`flex items-center justify-between gap-2 p-3 rounded-lg text-sm ${isOnline ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-destructive/10 text-destructive'
            }`}>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <CloudUpload className="w-4 h-4 animate-pulse" />
                  <span>
                    {i18n.language === 'ar'
                      ? `جارٍ إرسال ${pendingCount} سؤال محفوظ...`
                      : `Syncing ${pendingCount} saved questions...`
                    }
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span>
                    {i18n.language === 'ar'
                      ? `غير متصل - ${pendingCount > 0 ? `${pendingCount} سؤال محفوظ` : 'سيُحفظ سؤالك'}`
                      : `Offline - ${pendingCount > 0 ? `${pendingCount} saved` : 'Your question will be saved'}`
                    }
                  </span>
                </>
              )}
            </div>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleViewOfflineQuestions}
                className="flex items-center gap-1 hover:underline font-medium"
              >
                <Eye className="w-4 h-4" />
                {i18n.language === 'ar' ? 'عرض' : 'View'}
              </button>
            )}
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Tag className="w-4 h-4 text-accent" />
            <span>{t('form.categoryLabel')}</span>
            <span className="text-destructive">{t('form.required')}</span>
          </label>
          <Select value={category} onValueChange={(val) => {
            setCategory(val);
            if (val !== 'other') setCustomCategory('');
          }}>
            <SelectTrigger className={`w-full bg-background ${isRTL ? 'text-right' : 'text-left'}`}>
              <SelectValue placeholder={t('form.categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {category === 'other' && (
            <Input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder={i18n.language === 'ar' ? "اكتب نوع الفتوى (مثال: الحج، الزكاة...)" : "Specify category..."}
              className="mt-3 bg-background"
              dir={isRTL ? 'rtl' : 'ltr'}
              required
            />
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            <span>{t('form.questionLabel')}</span>
            <span className="text-destructive">{t('form.required')}</span>
          </label>
          <div className="flex gap-2">
            <Textarea
              value={questionText}
              onChange={(e) => {
                setQuestionText(e.target.value);
                setContentWarning(null);
              }}
              placeholder={t('form.questionPlaceholder')}
              className="min-h-[120px] resize-none bg-background flex-1"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <div className="flex flex-col gap-2 justify-end">
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                disabled={submitQuestion.isPending || isCorrecting}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCorrectQuestion}
                disabled={isCorrecting || !questionText.trim() || questionText.trim().length < 10}
                title={i18n.language === 'ar' ? "تصحيح السؤال تلقائياً" : "Auto-correct question"}
                className="h-10 w-10"
              >
                {isCorrecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* تحذير المحتوى */}
          {contentWarning && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm mt-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{contentWarning}</span>
            </div>
          )}

          {/* عداد الأحرف */}
          <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
            <span>{questionText.length} / 2000</span>
            {questionText.length >= 1800 && (
              <span className="text-amber-500">
                {i18n.language === 'ar' ? 'اقتربت من الحد الأقصى' : 'Approaching limit'}
              </span>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          size="lg"
          disabled={submitQuestion.isPending || isCorrecting || !category || !questionText.trim()}
        >
          {submitQuestion.isPending ? (
            <>
              <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('form.submitting')}
            </>
          ) : !isOnline ? (
            <>
              <CloudUpload className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {i18n.language === 'ar' ? 'حفظ السؤال' : 'Save Question'}
            </>
          ) : (
            <>
              <Send className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('form.submit')}
            </>
          )}
        </Button>
      </form>

      {/* نافذة عرض الأسئلة المحفوظة */}
      <Dialog open={showOfflineQuestions} onOpenChange={setShowOfflineQuestions}>
        <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>
              {i18n.language === 'ar' ? 'الأسئلة المحفوظة' : 'Saved Questions'}
            </DialogTitle>
            {offlineQuestions.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (confirm(i18n.language === 'ar' ? 'هل أنت متأكد من حذف جميع الأسئلة؟' : 'Are you sure you want to clear all questions?')) {
                    await clearAllQuestions();
                  }
                }}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {i18n.language === 'ar' ? 'مسح الكل' : 'Clear All'}
              </Button>
            )}
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {offlineQuestions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {i18n.language === 'ar' ? 'لا توجد أسئلة محفوظة' : 'No saved questions'}
              </p>
            ) : (
              offlineQuestions.map((q) => (
                <div key={q.id} className="p-4 bg-muted rounded-lg space-y-2">
                  {editingQuestion?.id === q.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[80px] bg-background"
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          {i18n.language === 'ar' ? 'حفظ' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-muted-foreground mb-1">{q.category}</div>
                      <p className="text-sm">{q.question_text}</p>
                      <div className="flex gap-2 justify-end pt-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEditQuestion(q)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
