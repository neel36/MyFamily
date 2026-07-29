import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myfamily.app',
  appName: 'My Family',
  webDir: 'out',
  server: {
    url: 'https://my-family-pearl.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#0f5238',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f5238',
      overlaysWebView: false
    }
  }
};

export default config;
