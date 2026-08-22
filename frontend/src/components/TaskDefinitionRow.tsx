import { Member, Task } from "../types";
import { freqLabel } from "../lib/date";
import { Avatar } from "./Avatar";

export function TaskDefinitionRow({ task, membersById }: { task: Task; membersById: Record<string, Member> }) {
  const currentId = task.rotationOrder[task.currentIndex % task.rotationOrder.length];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#FFFFFF", borderRadius: 12, border: "1px solid #E7E2D2" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 14.5, color: "#22281F" }}>
          {task.name}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#8A8571", background: "#F2EFE3", padding: "1px 6px", borderRadius: 999 }}>
            {freqLabel(task.freq)}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#8A8571" }}>
            {"●".repeat(task.weight)}
            {"○".repeat(3 - task.weight)}
          </span>
        </div>
      </div>
      <Avatar member={membersById[currentId]} size={28} />
    </div>
  );
}
