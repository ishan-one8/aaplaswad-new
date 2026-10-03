/* ============================================
   SAI PRASAD — Customer notification config
   Fill these in from the Firebase console:
     Project settings → General → Your apps → Web app
     Project settings → Cloud Messaging → Web Push certificates
   Everything stays switched off until they are filled in, so the site
   behaves exactly as before if this is never configured.
   ============================================ */

const SP_FIREBASE = {
    apiKey: 'AIzaSyCQP3lrdcxuEn-mmZ3lHPbMqYu2QCfI6cw',
    authDomain: 'sai-prasad-7f021.firebaseapp.com',
    projectId: 'sai-prasad-7f021',
    messagingSenderId: '195330113681',
    appId: '1:195330113681:web:5748af7073ec14bb54ff30',
    // "Web Push certificates" → Key pair (the long public key)
    // Generate it in Firebase Console:
    //   Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
    vapidKey: 'BEYc4zzO-QjPMrsMofNaDeHqNstKsOXEaWzxLvQbG8STmtyKJp06yb65ItDekrZ4JVBy6favcQJaRfAHcmkhI3U'
};

// Native Android push works without vapidKey (uses google-services.json + FCM).
// Web push needs the vapidKey for the browser's Push API.
SP_FIREBASE.configured = !!(SP_FIREBASE.apiKey && SP_FIREBASE.messagingSenderId &&
    SP_FIREBASE.appId);
SP_FIREBASE.webPushReady = !!(SP_FIREBASE.configured && SP_FIREBASE.vapidKey);

