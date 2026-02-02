import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.bizroom.app',
  appName: 'BizRoom',
  webDir: 'public',
  server: {
    url: 'https://bizroom--bill-7362b.us-east4.hosted.app',
    cleartext: true
  }
};

export default config;
