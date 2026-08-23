import { Clock, MapPin } from "lucide-react";
import { AvatarGroup, Box, Divider, Paper, Stack, Typography } from "@mui/material";
import { FamilyEvent, Member } from "../types";
import { Avatar } from "./Avatar";

export function EventCard({ ev, membersById }: { ev: FamilyEvent; membersById: Record<string, Member> }) {
  return (
    <Paper variant="outlined" sx={{ display: "flex", gap: 1.5, p: 1.5, borderRadius: 3 }}>
      <Stack sx={{ minWidth: 46, alignItems: "center", justifyContent: "center" }}>
        <Clock size={13} color="#8A8571" />
        <Typography sx={{ mt: 0.25, fontSize: 12.5, fontWeight: 500 }}>
          {ev.time}
        </Typography>
      </Stack>
      <Divider orientation="vertical" flexItem sx={{ borderStyle: "dashed" }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
          {ev.title}
        </Typography>
        {ev.location && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.25, alignItems: "center" }}>
            <MapPin size={11} color="#8A8571" />
            <Typography variant="caption" color="text.secondary">{ev.location}</Typography>
          </Stack>
        )}
        <AvatarGroup max={5} sx={{ justifyContent: "flex-end", mt: 1, "& .MuiAvatar-root": { width: 24, height: 24, fontSize: 10 } }}>
          {ev.members.map((memberId) => <Avatar key={memberId} member={membersById[memberId]} size={24} />)}
        </AvatarGroup>
      </Box>
    </Paper>
  );
}
