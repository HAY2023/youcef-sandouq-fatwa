import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { SplashScreen } from "@/components/SplashScreen";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import SecurityLogs from "./pages/SecurityLogs";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle document direction based on language
function DirectionHandler({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useRealtimeNotifications();
  return <>{children}</>;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  const { requestPermission } = usePushNotifications();

  useEffect(() => {
    // Check if it's the first visit in this session
    const hasVisited = sessionStorage.getItem('hasVisited');
    if (!hasVisited) {
      setIsFirstVisit(true);
      sessionStorage.setItem('hasVisited', 'true');

      // Attempt to register for push notifications on first visit/startup
      requestPermission().catch(console.error);
    } else {
      setShowSplash(false);
    }
  }, [requestPermission]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <DirectionHandler>
          <TooltipProvider>
            {/* Show splash screen only on first visit */}
            {showSplash && isFirstVisit && (
              <SplashScreen onComplete={handleSplashComplete} duration={1000} />
            )}

            <ConnectionStatus />

            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/security-logs" element={<SecurityLogs />} />
                <Route path="/install" element={<Install />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </DirectionHandler>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
