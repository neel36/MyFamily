import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myfamily.app',
  appName: 'My Family',
  webDir: 'out',
  server: {
    url: 'https://my-family-pearl.vercel.app',
    cleartext: true
  }
};

export default config;
