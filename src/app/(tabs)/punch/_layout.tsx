import { Stack } from "expo-router";
import { SyncButton } from "@/components/sync-status";
import { usePalette } from "@/lib/theme";

export default function PunchStack() {
  const palette = usePalette();
  return (
    <Stack
      screenOptions={{
        headerTintColor: palette.accent,
        headerTitleStyle: { color: palette.ink },
        headerLargeTitleStyle: { color: palette.ink },
        headerStyle: { backgroundColor: palette.bg },
        headerShadowVisible: false,
        headerRight: () => <SyncButton />,
        contentStyle: { backgroundColor: palette.bg }
      }}
    >
      <Stack.Screen name="index" options={{ title: "Punch items", headerLargeTitleEnabled: true }} />
    </Stack>
  );
}
