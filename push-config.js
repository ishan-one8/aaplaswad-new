/* ============================================
   SAI PRASAD — Customer notification config
   Fill these in from the Firebase console:
     Project settings → General → Your apps → Web app
     Project settings → Cloud Messaging → Web Push certificates
   Everything stays switched off until they are filled in, so the site
   behaves exactly as before if this is never configured.
   ============================================ */

const SP_FIREBASE = {
    apiKey: '',
    authDomain: '',
    projectId: 'sai-prasad-7f021',
    messagingSenderId: '',
    appId: '',
    // "Web Push certificates" → Key pair (the long public key)
    vapidKey: ''
};

SP_FIREBASE.configured = !!(SP_FIREBASE.apiKey && SP_FIREBASE.messagingSenderId &&
    SP_FIREBASE.appId && SP_FIREBASE.vapidKey);
