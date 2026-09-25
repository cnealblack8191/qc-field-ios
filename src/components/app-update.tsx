import * as Updates from "expo-updates";
import { Text } from "react-native";
import { useField } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";
import { Button, Card, Meta } from "./ui";

/**
 * Over-the-air updates (EAS Update). A new version downloads in the
 * background when the app opens and is used from the next launch, so a walk
 * is never interrupted and no signal never delays opening the app.
 *
 * When one is waiting, the inspector can restart into it — but not while
 * changes are still sending, so nothing is cut off mid-upload. The queue
 * itself survives a restart either way; this only avoids a retry.
 */
export function AppUpdate() {
  const palette = usePalette();
  const { pendingCount, syncState } = useField();
  const { currentlyRunning, isUpdatePending } = Updates.useUpdates();
  const busy = pendingCount > 0 || syncState === "syncing";

  return (
    <>
      {isUpdatePending ? (
        <Card>
          <Text style={[type.headline, { color: palette.ink }]}>An app update is ready</Text>
          <Meta>
            {busy
              ? "It installs the next time the app opens. Restarting is available once your changes have sent."
              : "It installs the next time the app opens, or restart now."}
          </Meta>
          <Button disabled={busy} label="Restart to update" onPress={() => void Updates.reloadAsync()} variant="secondary" />
        </Card>
      ) : null}
      <Meta>
        {currentlyRunning.isEmbeddedLaunch
          ? "Running the version installed from the App Store."
          : `Update ${currentlyRunning.updateId?.slice(0, 8) ?? ""}${currentlyRunning.channel ? ` · ${currentlyRunning.channel}` : ""}`}
      </Meta>
    </>
  );
}
