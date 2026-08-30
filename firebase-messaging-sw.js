/* Service worker for customer offer notifications.
   Runs in the background, so a deal can reach someone who does not have the
   site open. Must live at the site root to control the whole origin. */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
importScripts('push-config.js');

if (SP_FIREBASE.configured) {
    firebase.initializeApp({
        apiKey: SP_FIREBASE.apiKey,
        authDomain: SP_FIREBASE.authDomain,
        projectId: SP_FIREBASE.projectId,
        messagingSenderId: SP_FIREBASE.messagingSenderId,
        appId: SP_FIREBASE.appId
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        const notification = payload.notification || {};
        self.registration.showNotification(notification.title || 'Aapla Swad', {
            body: notification.body || '',
            icon: 'logo.png',
            badge: 'logo.png',
            data: payload.data || {},
            tag: 'sai-prasad-offer'
        });
    });
}

// Tapping an offer should open the ordering page, reusing an open tab if there
// already is one rather than piling up duplicates.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || 'order.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
            for (const tab of tabs) {
                if (tab.url.includes(target) && 'focus' in tab) return tab.focus();
            }
            return clients.openWindow(target);
        })
    );
});
