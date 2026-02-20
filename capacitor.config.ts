import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.sandouq_fatwa',
  appName: 'صندوق الفتوى',
  webDir: 'dist',
  server: {
    url: 'https://fe194506-7cd9-4de8-aafe-e158e44b1ea7.lovableproject.com',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#1a1a2e',
      sound: 'notification.wav'
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#f5f0e8',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerStyle: 'large',
      spinnerColor: '#2d6a4f'
    }
  },
  android: {
    buildOptions: {
      keystorePath: null,
      keystorePassword: null,
      keystoreAlias: null,
      keystoreAliasPassword: null,
      releaseType: 'APK'
    },
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true
  }
};

export default config;
