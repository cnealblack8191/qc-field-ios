import { Stack } from "expo-router";
import { SyncButton } from "@/components/sync-status";
import { usePalette } from "@/lib/theme";

export default function ProjectsStack() {
  const palette = usePalette();
  return (
    <Stack
      screenOptions={{
        headerTintColor: palette.accent,
        headerTitleStyle: { color: palette.ink },
        headerLargeTitleStyle: { color: palette.ink },
        headerStyle: { backgroundColor: palette.bg },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerRight: () => <SyncButton />,
        contentStyle: { backgroundColor: palette.bg }
      }}
    >
      <Stack.Screen name="index" options={{ title: "Projects", headerLargeTitleEnabled: true }} />
      <Stack.Screen name="[projectId]" options={{ title: "", headerLargeTitleEnabled: true }} />
      <Stack.Screen name="walk/[phaseId]/index" options={{ title: "", headerLargeTitleEnabled: true }} />
      <Stack.Screen name="walk/[phaseId]/drawings" options={{ title: "Drawings" }} />
      <Stack.Screen name="report/[reportId]" options={{ title: "" }} />
    </Stack>
  );
}
