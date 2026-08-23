import { Member, Task } from "../types";
import { freqLabel } from "../lib/date";
import { Avatar } from "./Avatar";

export function TaskDefinitionRow({ task, membersById }: { task: Task; membersById: Record<string, Member> }) {
  const currentId = task.rotationOrder[task.currentIndex % task.rotationOrder.length];
  return (
    <Paper variant="outlined" sx={{ display: "flex", alignItems: "center", gap: 1.25, p: "10px 12px", borderRadius: 3 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 600, fontSize: 14.5 }}>
          {task.name}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.25, alignItems: "center" }}>
          <Chip label={freqLabel(task.freq)} size="small" sx={{ height: 20, fontSize: 10.5, bgcolor: "#F2EFE3", color: "text.secondary" }} />
          <Typography sx={{  fontSize: 10.5, color: "text.secondary" }}>
            {"●".repeat(task.weight)}
            {"○".repeat(3 - task.weight)}
          </Typography>
        </Stack>
      </Box>
      <Avatar member={membersById[currentId]} size={28} />
    </Paper>
  );
}
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
