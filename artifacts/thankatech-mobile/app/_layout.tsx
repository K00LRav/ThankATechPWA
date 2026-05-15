import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from "@expo-google-fonts/playfair-display";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/lib/auth";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

SplashScreen.preventAutoHideAsync();

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) {
  setBaseUrl(`https://${domain}`);
}
setAuthTokenGetter(() => SecureStore.getItemAsync("auth_session_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RootLayoutNav() {
  const router = useRouter();

  // Global handler: navigate to retry-tip on notification tap, including cold-start launches.
  useEffect(() => {
    if (Platform.OS === "web") return;

    // Handle notification tap when app is already running.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const thankMessageId = data?.thankMessageId;
      if (typeof thankMessageId === "number") {
        (router.push as (href: string) => void)(`/retry-tip/${thankMessageId}`);
      }
    });

    // Handle notification tap that launched the app from a terminated/background state.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, unknown>;
      const thankMessageId = data?.thankMessageId;
      if (typeof thankMessageId === "number") {
        (router.push as (href: string) => void)(`/retry-tip/${thankMessageId}`);
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="technician" options={{ headerShown: false }} />
      <Stack.Screen
        name="thank"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="job" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboard"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen name="retry-tip" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
