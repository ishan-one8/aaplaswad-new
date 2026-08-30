import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saiprasad.dalbati',
  appName: 'Aapla Swad',
  webDir: 'www',
  server: {
    url: 'https://aaplaswad.store',
    androidScheme: 'https',
    cleartext: false
  },
  android: {
    allowMixedContent: true,
    buildOptions: {
      signingType: 'apksigner'
    }
  }
};

export default config;
