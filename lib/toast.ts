import { Alert } from 'react-native';

// Cross-platform action feedback.
//
// This is the NATIVE (iOS/Android) implementation — it delegates to the OS Alert,
// which is reliable and renders above modals. The web build lives in `toast.web.ts`
// and shows an in-page toast instead, because React Native's `Alert` is a no-op on
// react-native-web — which is why action results (e.g. "account already exists")
// never appeared when running the app in the browser.
//
// Metro picks `toast.web.ts` for the web bundle and this file everywhere else.

export type ToastType = 'error' | 'success' | 'info';

type NotifyFn = {
  (title: string, message?: string, type?: ToastType): void;
  error: (title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

export const notify: NotifyFn = Object.assign(
  (title: string, message?: string, _type?: ToastType): void => {
    Alert.alert(title, message);
  },
  {
    error: (title: string, message?: string) => Alert.alert(title, message),
    success: (title: string, message?: string) => Alert.alert(title, message),
    info: (title: string, message?: string) => Alert.alert(title, message),
  }
);
