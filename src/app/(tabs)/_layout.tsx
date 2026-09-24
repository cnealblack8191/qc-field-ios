import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Icon } from "@/components/icon";
import { useField } from "@/lib/store";
import { usePalette } from "@/lib/theme";

/**
 * Four tabs, in the order an inspector reaches for them: the assigned
 * projects, every punch item still owed attention, what is waiting to sync,
 * and the account. Office functions have no tab because the field app does
 * not offer them.
 */
export default function TabsLayout() {
  const palette = usePalette();
  const { pendingCount, rejectedCount, view } = useField();
  const userId = view?.user.id;
  const openItems = view?.items.filter((item) => item.status === "OPEN" || item.status === "AWAITING_VERIFICATION").length ?? 0;
  const syncBadge = rejectedCount || pendingCount;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        // The browser demo has no home indicator inset, so give labels room there.
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.line, ...(Platform.OS === "web" ? { height: 62, paddingBottom: 6 } : null) },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: "600" }
      }}
    >
      <Tabs.Screen
        name="projects"
        options={{ title: "Projects", tabBarIcon: ({ color }) => <Icon color={color} name="projects" size={24} /> }}
      />
      <Tabs.Screen
        name="punch"
        options={{
          title: "Punch",
          tabBarBadge: openItems && userId ? openItems : undefined,
          tabBarBadgeStyle: { backgroundColor: palette.warning, color: "#fff" },
          tabBarIcon: ({ color }) => <Icon color={color} name="punch" size={24} />
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: "Sync",
          headerShown: true,
          headerTitle: "Sync",
          headerStyle: { backgroundColor: palette.surface },
          headerTintColor: palette.ink,
          tabBarBadge: syncBadge || undefined,
          tabBarBadgeStyle: { backgroundColor: rejectedCount ? palette.danger : palette.warning, color: "#fff" },
          tabBarIcon: ({ color }) => <Icon color={color} name="sync" size={24} />
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          headerShown: true,
          headerStyle: { backgroundColor: palette.surface },
          headerTintColor: palette.ink,
          tabBarIcon: ({ color }) => <Icon color={color} name="account" size={24} />
        }}
      />
    </Tabs>
  );
}
