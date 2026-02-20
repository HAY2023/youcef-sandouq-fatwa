import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { CountdownTimer } from '@/components/CountdownTimer';
import { VideoList } from '@/components/VideoList';
import { QuestionForm } from '@/components/QuestionForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { FlashMessageBanner } from '@/components/FlashMessageBanner';
import { QuestionCounter } from '@/components/QuestionCounter';
import { Button } from '@/components/ui/button';
import { BookOpen, Menu, X, Download, MessageSquare } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import mosqueImage from '@/assets/mosque-exterior.jpg';
import ShareButton from '@/components/ShareButton';
import ReadingMode from '@/components/ReadingMode';
import ReportProblem from '@/components/ReportProblem';

const Index = () => {
  const { t, i18n } = useTranslation();
  const [logoTaps, setLogoTaps] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: settings, isLoading } = useSettings();
  const formSectionRef = useRef<HTMLDivElement>(null);

  // تفعيل إشعارات المتصفح
  useBrowserNotifications();

  const isRTL = i18n.language === 'ar';

  // Handle scroll for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Desktop shortcut: Ctrl+Shift+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        window.location.href = '/admin';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mobile: 5 taps on logo
  const handleLogoTap = useCallback(() => {
    setLogoTaps((prev) => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        window.location.href = '/admin';
        return 0;
      }
      setTimeout(() => setLogoTaps(0), 2000);
      return newCount;
    });
  }, []);

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sticky Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-background/95 backdrop-blur-md shadow-lg border-b border-border'
        : 'bg-transparent'
        }`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-default select-none"
              onClick={handleLogoTap}
            >
              <BookOpen className={`w-7 h-7 ${isScrolled ? 'text-primary' : 'text-primary-foreground'}`} />
              <div className={isScrolled ? 'text-foreground' : 'text-primary-foreground'}>
                <h1 className="text-base font-bold leading-tight">{t('nav.title')}</h1>
                <p className="text-xs opacity-80">{t('nav.subtitle')}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <ReadingMode />
              <LanguageSwitcher variant={isScrolled ? 'default' : 'hero'} />
              <ThemeToggle />
              <Button
                onClick={scrollToForm}
                variant="secondary"
                size="sm"
                className={isScrolled
                  ? ''
                  : 'bg-primary-foreground/90 text-foreground hover:bg-primary-foreground'
                }
              >
                {t('nav.askQuestion')}
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className={`w-6 h-6 ${isScrolled ? 'text-foreground' : 'text-primary-foreground'}`} />
              ) : (
                <Menu className={`w-6 h-6 ${isScrolled ? 'text-foreground' : 'text-primary-foreground'}`} />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-border/50 pt-4 animate-in slide-in-from-top-2">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <ReadingMode />
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
                <Button onClick={scrollToForm} className="w-full">
                  {t('nav.askQuestion')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${mosqueImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/50 to-foreground/70" />

        <div className="relative z-10 text-center px-4 pt-16">
          <div className="w-16 h-1 bg-primary mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-primary-foreground/80 max-w-xl mx-auto text-sm md:text-base">
            {t('hero.description')}
          </p>
          <div className="w-12 h-1 bg-primary mx-auto mt-6" />
        </div>
      </section>

      {/* Flash Messages - Right below hero */}
      <section className="bg-background py-4">
        <div className="container mx-auto max-w-3xl px-4">
          <FlashMessageBanner />
        </div>
      </section>

      {/* Video Section */}
      <section className="py-12 px-4 bg-card">
        <div className="container mx-auto max-w-3xl">
          <VideoList />
        </div>
      </section>


      {/* Countdown Timer */}
      {settings?.show_countdown && settings?.next_session_date && (
        <section className="py-8 px-4 bg-secondary/30">
          <div className="container mx-auto max-w-xl">
            <CountdownTimer
              targetDate={settings.next_session_date}
              style={settings.countdown_style ?? 1}
              bgColor={settings.countdown_bg_color ?? undefined}
              textColor={settings.countdown_text_color ?? undefined}
              borderColor={settings.countdown_border_color ?? undefined}
            />
          </div>
        </section>
      )}

      {/* Question Form Section */}
      <section ref={formSectionRef} className="py-16 px-4 islamic-pattern">
        <div className="container mx-auto max-w-xl">
          {/* Announcements - Above question form */}
          <div className="mb-8">
            <AnnouncementBanner />
          </div>

          {settings?.is_box_open !== false ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                  {t('form.title')}
                </h2>
                <p className="text-muted-foreground">
                  {t('form.description')}
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg">
                <QuestionForm />
              </div>
              {/* Question Counter */}
              {settings?.show_question_count && <QuestionCounter />}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  {t('form.boxClosed', 'صندوق الأسئلة مغلق حالياً')}
                </h2>
                <p className="text-muted-foreground">
                  {t('form.boxClosedDescription', 'سيتم فتح الصندوق قريباً إن شاء الله')}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-card border-t border-border">
        <div className="container mx-auto text-center space-y-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {settings?.show_install_page && (
              <Link to="/install">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  {t('footer.installApp', 'تثبيت التطبيق')}
                </Button>
              </Link>
            )}
            <ShareButton />
          </div>

          {/* Report Problem */}
          <div className="pt-2">
            <ReportProblem />
          </div>

          <p className="text-sm text-muted-foreground">{t('footer.mosqueName')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
