import { useState, useEffect } from 'react';

const VAPID_PUBLIC_KEY_URL = '/api/push/vapidPublicKey';
const SUBSCRIBE_URL = '/api/push/subscribe';
const UNSUBSCRIBE_URL = '/api/push/unsubscribe';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Register service worker if not already
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        return registration.pushManager.getSubscription();
      }).then((sub) => {
        setSubscription(sub);
      }).catch(err => {
        console.error('Service Worker registration failed:', err);
      }).finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const subscribe = async (userId?: string, ticketId?: string) => {
    if (!isSupported) throw new Error('Notificaciones push no soportadas en este navegador.');
    
    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') {
        throw new Error('Permiso denegado.');
      }

      const vapidRes = await fetch(VAPID_PUBLIC_KEY_URL);
      const vapidData = await vapidRes.json();
      const convertedVapidKey = urlBase64ToUint8Array(vapidData.publicKey);

      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      setSubscription(pushSubscription);

      // Save to backend
      await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: pushSubscription,
          userId,
          ticketId,
        }),
      });

      return true;
    } catch (e) {
      console.error('Error al suscribirse:', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    setIsLoading(true);
    try {
      await fetch(UNSUBSCRIBE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      await subscription.unsubscribe();
      setSubscription(null);
    } catch (e) {
      console.error('Error al desuscribirse:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
