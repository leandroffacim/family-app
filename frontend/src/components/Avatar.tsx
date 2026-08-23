import MuiAvatar from "@mui/material/Avatar";
import { Member } from "../types";

export function Avatar({ member, size = 32 }: { member?: Member; size?: number }) {
  if (!member) {
    return (
      <MuiAvatar sx={{ width: size, height: size, bgcolor: "#D8D2BE", flexShrink: 0 }} />
    );
  }
  return (
    <MuiAvatar
      sx={{
        width: size,
        height: size,
        bgcolor: member.color,
        color: "#F2EFE3",
        fontWeight: 600,
        fontSize: size * 0.42,
        flexShrink: 0,
        border: "2px solid #F2EFE3",
        boxShadow: "0 0 0 1px rgba(30,58,50,0.15)",
      }}
    >
      {member.name.charAt(0).toUpperCase()}
    </MuiAvatar>
  );
}
