import { router } from "expo-router";
import { Text } from "react-native";
import { punchStatus } from "@/lib/labels";
import { useView } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";
import type { PunchItem } from "@/lib/types";
import { Icon } from "./icon";
import { Card, Meta, PhotoStrip, Pill, Row } from "./ui";

export function PunchItemCard({ item, showPhase }: { item: PunchItem; showPhase?: boolean }) {
  const palette = usePalette();
  const view = useView();
  const status = punchStatus[item.status];
  const equipment = item.equipmentId ? view.equipment.find((candidate) => candidate.id === item.equipmentId) : null;
  const phase = showPhase ? view.phases.find((candidate) => candidate.id === item.phaseId) : null;
  const project = phase ? view.projects.find((candidate) => candidate.id === phase.projectId) : null;

  return (
    <Card
      accessibilityHint="Opens the item"
      accessibilityLabel={`Item ${item.number || "new"}, ${status.label}, ${item.location}. ${item.description}${item.isLocal ? ". Not yet synced" : ""}`}
      onPress={() => router.push({ pathname: "/item/[itemId]", params: { itemId: item.id } })}
    >
      <Row style={{ justifyContent: "space-between" }}>
        <Row>
          <Text style={[type.caption, { color: palette.muted }]}>ITEM {item.number || "NEW"}</Text>
          {item.annotationId ? <Icon color={palette.muted} name="location" size={14} /> : null}
        </Row>
        <Row>
          {item.isLocal ? <Pill label="Not yet synced" tone="open" /> : null}
          <Pill label={status.label} tone={status.tone} />
        </Row>
      </Row>
      {phase ? <Meta>{project?.name} · {phase.name}</Meta> : null}
      <Text style={[type.headline, { color: palette.ink }]}>{item.location}</Text>
      <Text numberOfLines={3} style={[type.body, { color: palette.inkSoft }]}>{item.description}</Text>
      {equipment ? <Meta>{equipment.tag} · {equipment.location}</Meta> : null}
      <PhotoStrip photos={item.photos.slice(0, 4)} />
    </Card>
  );
}
