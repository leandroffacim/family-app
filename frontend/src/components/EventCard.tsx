import { Clock, MapPin } from "lucide-react";
import { FamilyEvent, Member } from "../types";
import { Avatar } from "./Avatar";

export function EventCard({ ev, membersById }: { ev: FamilyEvent; membersById: Record<string, Member> }) {
  return (
    <div style={{ display: "flex", gap: 12, background: "#FFFFFF", border: "1px solid #E7E2D2", borderRadius: 12, padding: "12px 12px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 46, borderRight: "1px dashed #D8D2BE", paddingRight: 10 }}>
        <Clock size={13} color="#8A8571" />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: "#22281F", fontWeight: 500, marginTop: 2 }}>
          {ev.time}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "#22281F" }}>
          {ev.title}
        </div>
        {ev.location && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <MapPin size={11} color="#8A8571" />
            <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11.5, color: "#8A8571" }}>{ev.location}</span>
          </div>
        )}
        <div style={{ display: "flex", marginTop: 8 }}>
          {ev.members.map((mid, i) => (
            <div key={mid} style={{ marginLeft: i === 0 ? 0 : -8 }}>
              <Avatar member={membersById[mid]} size={22} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
