import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { Zap } from "lucide-react";
import { freqLabel } from "../lib/date";
import { Member, Task } from "../types";
import { Avatar } from "./Avatar";

export function TaskDefinitionRow({
  task,
  membersById,
}: {
  task: Task;
  membersById: Record<string, Member>;
}) {
  const currentId =
    task.rotationOrder[task.currentIndex % task.rotationOrder.length];
  const assignedMember = membersById[currentId];

  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        p: "14px 16px",
        borderRadius: 1,
        bgcolor: "#FFFFFF",
        borderColor: "#E2E8F0",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          borderColor: "#C7D2FE",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          noWrap
          sx={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}
        >
          {task.name}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 0.75, alignItems: "center" }}
        >
          <Chip
            label={freqLabel(task.freq)}
            size="small"
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 700,
              bgcolor:
                task.freq === "DAILY"
                  ? "#EEF2FF"
                  : task.freq === "WEEKLY"
                    ? "#FEF3C7"
                    : "#F1F5F9",
              color:
                task.freq === "DAILY"
                  ? "#4F46E5"
                  : task.freq === "WEEKLY"
                    ? "#D97706"
                    : "#475569",
            }}
          />
          <Stack
            direction="row"
            spacing={0.25}
            sx={{ alignItems: "center", color: "#F59E0B" }}
          >
            <Zap size={13} fill="#F59E0B" color="#F59E0B" />
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: "#64748B" }}
            >
              {task.weight}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          bgcolor: "#F8FAFC",
          px: 1.25,
          py: 0.5,
          borderRadius: 99,
          border: "1px solid #F1F5F9",
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}
        >
          Vez de:
        </Typography>
        <Avatar member={assignedMember} size={24} showBorder={false} />
        <Typography
          variant="body2"
          sx={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}
        >
          {assignedMember?.name ?? "Ninguém"}
        </Typography>
      </Stack>
    </Paper>
  );
}
