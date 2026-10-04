import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LockScreen } from "@/components/lock-screen";
import { LockProvider } from "@/lib/lock";
import { FieldStoreProvider, useField } from "@/lib/store";
import { usePalette } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * What shows if a screen throws, instead of a blank app. Work saved on the
 * phone is untouched: the outbox lives in storage, not in the screen.
 * Rendered outside the app's providers, so it uses plain colours.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const dark = useColorScheme() === "dark";
  const ink = dark ? "#f5f6f8" : "#15191d";
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24, backgroundColor: dark ? "#15191d" : "#f5f6f8" }}>
      <Text accessibilityRole="header" style={{ color: ink, fontSize: 22, fontWeight: "700", textAlign: "center" }}>
        Something went wrong on this screen
      </Text>
      <Text style={{ color: ink, fontSize: 17, textAlign: "center", opacity: 0.75 }}>
        Your saved work is still on this phone and will sync as usual.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={{ minHeight: 52, minWidth: 180, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#c2261c" }}
      >
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>Try again</Text>
      </Pressable>
    </View>
  );
}

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
      <Stack screenOptions={{ headerTintColor: palette.accent, headerTitleStyle: { color: palette.ink }, contentStyle: { backgroundColor: palette.bg } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="item/[itemId]" options={{ title: "Punch item", headerBackTitle: "Back" }} />
          {/* Above the tabs, so a sheet gets the whole screen. */}
          <Stack.Screen name="sheet/[sheetId]" options={{ title: "", headerBackTitle: "Back" }} />
          <Stack.Screen name="log-item" options={{ presentation: "modal", title: "Log punch item" }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <LockScreen />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FieldStoreProvider>
          <LockProvider>
            <RootNavigator />
          </LockProvider>
        </FieldStoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
