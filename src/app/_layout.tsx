import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FieldStoreProvider, useField } from "@/lib/store";
import { usePalette } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { ready, session, view } = useField();
  const palette = usePalette();
  const scheme = useColorScheme();
  const signedIn = Boolean(session && view);

  // Hold the splash until the stored session and cached walk are read, so a
  // signed-in inspector never sees the sign-in screen flash.
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: palette.accent, background: palette.bg, card: palette.surface, text: palette.ink, border: palette.line }
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerTintColor: palette.accent, contentStyle: { backgroundColor: palette.bg } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="item/[itemId]" options={{ title: "Punch item", headerBackTitle: "Back" }} />
          <Stack.Screen name="log-item" options={{ presentation: "modal", title: "Log punch item" }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FieldStoreProvider>
          <RootNavigator />
        </FieldStoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
