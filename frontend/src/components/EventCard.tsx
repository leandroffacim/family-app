import { Clock, MapPin } from "lucide-react";
import { AvatarGroup, Box, Paper, Stack, Typography } from "@mui/material";
import { FamilyEvent, Member } from "../types";
import { Avatar } from "./Avatar";

export function EventCard({ ev, membersById }: { ev: FamilyEvent; membersById: Record<string, Member> }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 2,
        borderRadius: 4,
        bgcolor: "#FFFFFF",
        borderColor: "#E2E8F0",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          borderColor: "#C7D2FE",
          boxShadow: "0 6px 16px -2px rgba(79, 70, 229, 0.08)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack
        sx={{
          minWidth: 64,
          px: 1.25,
          py: 0.75,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 3,
          bgcolor: "#EEF2FF",
          color: "#4F46E5",
        }}
      >
        <Clock size={14} strokeWidth={2.5} />
        <Typography sx={{ mt: 0.5, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
          {ev.time}
        </Typography>
      </Stack>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#0F172A", lineHeight: 1.3 }}>
          {ev.title}
        </Typography>
        {ev.location && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, alignItems: "center", color: "#64748B" }}>
            <MapPin size={12} strokeWidth={2.2} />
            <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 500 }}>
              {ev.location}
            </Typography>
          </Stack>
        )}
      </Box>

      <AvatarGroup
        max={4}
        sx={{
          flexShrink: 0,
          "& .MuiAvatar-root": {
            width: 28,
            height: 28,
            fontSize: 11,
            fontWeight: 700,
            borderColor: "#FFFFFF",
          },
        }}
      >
        {ev.members.map((memberId) => (
          <Avatar key={memberId} member={membersById[memberId]} size={28} showBorder={false} />
        ))}
      </AvatarGroup>
    </Paper>
  );
}
