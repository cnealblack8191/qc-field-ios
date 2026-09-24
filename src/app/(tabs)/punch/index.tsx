import { useState } from "react";
import { PunchItemCard } from "@/components/punch-item-card";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { EmptyState, Meta } from "@/components/ui";
import { useView } from "@/lib/store";

type Filter = "open" | "reinspect" | "mine";

/**
 * Every punch item across the inspector's projects that still needs someone.
 * Reinspection is walked from here rather than from a project, because an
 * inspector coming back to a job is chasing outstanding items across it.
 */
export default function PunchItemsScreen() {
  const view = useView();
  const [filter, setFilter] = useState<Filter>("open");

  const live = view.items.filter((item) => item.status !== "VOID" && item.status !== "VERIFIED");
  const counts = {
    open: live.filter((item) => item.status === "OPEN" || item.status === "SENT").length,
    reinspect: live.filter((item) => item.status === "AWAITING_VERIFICATION").length,
    mine: live.filter((item) => item.createdById === view.user.id).length
  };
  const items = live
    .filter((item) =>
      filter === "open"
        ? item.status === "OPEN" || item.status === "SENT"
        : filter === "reinspect"
          ? item.status === "AWAITING_VERIFICATION"
          : item.createdById === view.user.id
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Screen>
      <Segmented
        onChange={setFilter}
        options={[
          { value: "open", label: `Open ${counts.open}` },
          { value: "reinspect", label: `Reinspect ${counts.reinspect}` },
          { value: "mine", label: `Mine ${counts.mine}` }
        ]}
        value={filter}
      />
      <Meta>
        {filter === "reinspect"
          ? "The contractor says these are done. Check each one and verify it."
          : filter === "open"
            ? "Logged and not yet corrected."
            : "Items you logged that are still open."}
      </Meta>
      {items.length ? (
        items.map((item) => <PunchItemCard item={item} key={item.id} showPhase />)
      ) : (
        <EmptyState icon="checkCircle" message="Nothing here needs you right now." title="All clear" />
      )}
    </Screen>
  );
}
