import MuiAvatar from "@mui/material/Avatar";
import { Member } from "../types";

export function Avatar({
  member,
  size = 32,
  showBorder = true,
}: {
  member?: Member;
  size?: number;
  showBorder?: boolean;
}) {
  if (!member) {
    return (
      <MuiAvatar
        sx={{
          width: size,
          height: size,
          bgcolor: "#CBD5E1",
          color: "#64748B",
          fontSize: size * 0.42,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        ?
      </MuiAvatar>
    );
  }

  return (
    <MuiAvatar
      sx={{
        width: size,
        height: size,
        bgcolor: member.color || "#4F46E5",
        color: "#FFFFFF",
        fontWeight: 700,
        fontSize: size * 0.42,
        flexShrink: 0,
        border: showBorder ? "2px solid #FFFFFF" : "none",
        boxShadow: showBorder ? "0 2px 8px rgba(15, 23, 42, 0.12)" : "none",
        transition: "transform 0.2s ease-in-out",
        "&:hover": {
          transform: "scale(1.06)",
        },
      }}
    >
      {member.name?.charAt(0)?.toUpperCase() ?? "?"}
    </MuiAvatar>
  );
}
