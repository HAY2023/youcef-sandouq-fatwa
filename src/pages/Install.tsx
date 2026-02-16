import { useTranslation } from 'react-i18next';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, Check, Smartphone, Share, Plus, ExternalLink, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';

// استيراد صور دليل التثبيت
import step1Main from '@/assets/install-guide/step1-main.png';
import step2Menu from '@/assets/install-guide/step2-menu.png';
import step3Install from '@/assets/install-guide/step3-install.png';
import step4App from '@/assets/install-guide/step4-app.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: settings, isLoading } = useSettings();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(0);

  const isRTL = i18n.language === 'ar';

  // اكتشاف iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // صور دليل التثبيت للحاسوب
  const desktopGuideSteps = [
    { image: step1Main, title: isRTL ? 'افتح الموقع في المتصفح' : 'Open the website' },
    { image: step2Menu, title: isRTL ? 'اضغط على قائمة المتصفح' : 'Click browser menu' },
    { image: step3Install, title: isRTL ? 'اختر "تثبيت التطبيق"' : 'Choose "Install app"' },
    { image: step4App, title: isRTL ? 'التطبيق جاهز للاستخدام!' : 'App is ready!' },
  ];

  useEffect(() => {
    // فحص إذا كان التطبيق مثبت
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // فحص التثبيت الناجح
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    // إذا كان iOS، أظهر التعليمات
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }

    // إذا كان لدينا prompt، استخدمه
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Installation failed:', error);
      }
      setIsInstalling(false);
      return;
    }

    // إذا لم يتوفر prompt، أظهر تعليمات عامة
    setShowIOSHelp(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (settings && !settings.show_install_page) {
    return <Navigate to="/" replace />;
  }

  const content = {
    ar: {
      title: 'تثبيت التطبيق',
      appName: 'صندوق فتوى',
      subtitle: 'مسجد الإيمان – 150 مسكن',
      downloadBtn: 'تثبيت',
      downloading: 'جارٍ التثبيت...',
      installed: 'تم التثبيت ✓',
      goHome: 'فتح التطبيق',
      showMobileGuide: 'عرض دليل التثبيت للهاتف',
    },
    fr: {
      title: "Installer l'app",
      appName: 'Boîte à Fatwas',
      subtitle: 'Mosquée Al-Iman – 150 Logements',
      downloadBtn: "Installer",
      downloading: 'Installation...',
      installed: 'Installée ✓',
      goHome: "Ouvrir l'app",
      showMobileGuide: 'Guide d\'installation mobile',
    },
    en: {
      title: 'Install App',
      appName: 'Fatwa Box',
      subtitle: 'Al-Iman Mosque – 150 Housing',
      downloadBtn: 'Install',
      downloading: 'Installing...',
      installed: 'Installed ✓',
      goHome: 'Open App',
      showMobileGuide: 'Show Mobile Install Guide',
    },
  };

  const c = content[i18n.language as keyof typeof content] || content.ar;

  const iosInstructions = {
    ar: {
      title: 'تثبيت على iOS',
      step1: 'اضغط على زر المشاركة',
      step2: 'اختر "إضافة إلى الشاشة الرئيسية"',
      step3: 'اضغط "إضافة"',
    },
    fr: {
      title: 'Installer sur iOS',
      step1: 'Appuyez sur le bouton Partager',
      step2: 'Choisissez "Ajouter à l\'écran d\'accueil"',
      step3: 'Appuyez sur "Ajouter"',
    },
    en: {
      title: 'Install on iOS',
      step1: 'Tap the Share button',
      step2: 'Choose "Add to Home Screen"',
      step3: 'Tap "Add"',
    },
  };

  const iosC = iosInstructions[i18n.language as keyof typeof iosInstructions] || iosInstructions.ar;

  const nextStep = () => {
    if (currentGuideStep < desktopGuideSteps.length - 1) {
      setCurrentGuideStep(currentGuideStep + 1);
    }
  };

  const prevStep = () => {
    if (currentGuideStep > 0) {
      setCurrentGuideStep(currentGuideStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border py-4 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <h1 className="text-xl font-bold">{c.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-sm mx-auto"
        >
          {/* App Icon */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-36 h-36 mx-auto mb-8 rounded-3xl overflow-hidden shadow-2xl border-4 border-primary/20 relative"
          >
            <img
              src="/favicon.jpg"
              alt={c.appName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
          </motion.div>

          {/* App Name */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold font-serif mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          >
            {c.appName}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-10"
          >
            {c.subtitle}
          </motion.p>

          {/* Install Button */}
          {isInstalled ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-lg border-2 border-green-500/20">
                <Check className="w-6 h-6" />
                {c.installed}
              </div>
              <div>
                <Button onClick={() => navigate('/')} size="lg" className="w-full text-lg h-14 rounded-xl">
                  {c.goHome}
                </Button>
              </div>
            </motion.div>
          ) : showDesktopGuide ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 w-full max-w-2xl"
            >
              <div className="bg-card border-2 border-border rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2 justify-center">
                  <Monitor className="w-5 h-5 text-primary" />
                  {isRTL ? 'تثبيت على الحاسوب' : 'Install on Desktop'}
                </h3>

                {/* صورة الخطوة الحالية */}
                <div className="relative overflow-hidden rounded-xl border border-border">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentGuideStep}
                      src={desktopGuideSteps[currentGuideStep].image}
                      alt={desktopGuideSteps[currentGuideStep].title}
                      className="w-full h-auto"
                      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                      transition={{ duration: 0.3 }}
                    />
                  </AnimatePresence>
                </div>

                {/* عنوان الخطوة */}
                <div className="text-center">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                      {currentGuideStep + 1}
                    </span>
                    {desktopGuideSteps[currentGuideStep].title}
                  </span>
                </div>

                {/* أزرار التنقل */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevStep}
                    disabled={currentGuideStep === 0}
                    className="gap-1"
                  >
                    {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {isRTL ? 'السابق' : 'Previous'}
                  </Button>

                  <div className="flex gap-1">
                    {desktopGuideSteps.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentGuideStep(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentGuideStep ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                          }`}
                      />
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextStep}
                    disabled={currentGuideStep === desktopGuideSteps.length - 1}
                    className="gap-1"
                  >
                    {isRTL ? 'التالي' : 'Next'}
                    {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => {
                  setShowDesktopGuide(false);
                  setCurrentGuideStep(0);
                }}
                variant="outline"
                size="lg"
                className="w-full h-14 rounded-xl"
              >
                {i18n.language === 'ar' ? 'رجوع' : 'Back'}
              </Button>
            </motion.div>
          ) : showIOSHelp ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-card border-2 border-border rounded-2xl p-6 text-right space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2 justify-center">
                  <Smartphone className="w-5 h-5 text-primary" />
                  {iosC.title}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                    <div className="flex items-center gap-2 flex-1">
                      <Share className="w-5 h-5 text-primary" />
                      <span>{iosC.step1}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                    <div className="flex items-center gap-2 flex-1">
                      <Plus className="w-5 h-5 text-primary" />
                      <span>{iosC.step2}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                    <div className="flex items-center gap-2 flex-1">
                      <ExternalLink className="w-5 h-5 text-primary" />
                      <span>{iosC.step3}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowIOSHelp(false)}
                variant="outline"
                size="lg"
                className="w-full h-14 rounded-xl"
              >
                {i18n.language === 'ar' ? 'رجوع' : 'Back'}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              <div className="mb-4 p-3 bg-primary/10 rounded-xl border border-primary/20">
                <p className="text-primary font-bold flex items-center justify-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  {isRTL ? '📱 نسخة الهاتف (أندرويد وآيفون)' : '📱 Phone Version (Android & iOS)'}
                </p>
              </div>
              <Button
                onClick={handleInstall}
                size="lg"
                className="w-full gap-3 text-xl h-20 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                disabled={isInstalling}
              >
                <Download className="w-8 h-8" />
                {isInstalling ? c.downloading : c.downloadBtn}
              </Button>

              {/* زر عرض دليل التثبيت للهاتف */}
              {isMobile && (
                <Button
                  variant="outline"
                  onClick={() => setShowIOSHelp(true)}
                  className="w-full gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  {c.showMobileGuide}
                </Button>
              )}

              {/* زر عرض دليل التثبيت للحاسوب */}
              {!isMobile && (
                <Button
                  variant="outline"
                  onClick={() => setShowDesktopGuide(true)}
                  className="w-full gap-2"
                >
                  <Monitor className="w-4 h-4" />
                  {isRTL ? 'عرض دليل التثبيت للحاسوب' : 'View Desktop Install Guide'}
                </Button>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}