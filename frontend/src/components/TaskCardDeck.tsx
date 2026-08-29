import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Check, Clock3, PartyPopper, SkipForward, Zap } from "lucide-react";
import { useRef, useState } from "react";
import { Member, TaskInstance } from "../types";
import { Avatar } from "./Avatar";

type Action = "done" | "pass" | "defer";

function StackCard({ depth }: { depth: number }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        position: "absolute",
        inset: 0,
        borderRadius: 5,
        transform: `translateY(${-depth * 10}px) scale(${1 - depth * 0.045})`,
        opacity: 1 - depth * 0.3,
        bgcolor: "#FFFFFF",
        borderColor: "#E2E8F0",
        boxShadow: `0 ${6 + depth * 4}px ${16 + depth * 6}px rgba(15, 23, 42, 0.04)`,
      }}
    />
  );
}

export function TaskCardDeck({
  queue,
  membersById,
  onDecide,
}: {
  queue: TaskInstance[];
  membersById: Record<string, Member>;
  onDecide: (taskId: string, action: Action) => void;
}) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exit, setExit] = useState<Action | null>(null);
  const startRef = useRef({ x: 0, y: 0 });

  const top = queue[0];

  const onPointerDown = (e: React.PointerEvent) => {
    if (exit || !top) return;
    setDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || exit) return;
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    });
  };

  const endDrag = (e: React.PointerEvent, commit: boolean) => {
    if (!dragging || exit) return;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignora
    }
    setDragging(false);
    const { x, y } = drag;
    if (commit && y < -90 && Math.abs(y) > Math.abs(x)) {
      triggerExit("defer");
    } else if (commit && Math.abs(x) > 100) {
      triggerExit(x > 0 ? "done" : "pass");
    } else {
      setDrag({ x: 0, y: 0 });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => endDrag(e, true);
  const onPointerCancel = (e: React.PointerEvent) => endDrag(e, false);

  const triggerExit = (action: Action) => {
    setExit(action);
    setTimeout(() => {
      onDecide(top.taskId, action);
      setExit(null);
      setDrag({ x: 0, y: 0 });
    }, 240);
  };

  if (!top) {
    return (
      <Paper
        variant="outlined"
        sx={{
          height: 310,
          borderRadius: 5,
          borderStyle: "dashed",
          borderColor: "#CBD5E1",
          bgcolor: "#F8FAFC",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          textAlign: "center",
          p: 3,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: "#FEF3C7",
            color: "#D97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 16px rgba(245, 158, 11, 0.15)",
          }}
        >
          <PartyPopper size={28} />
        </Box>
        <Typography variant="h6" sx={{ fontSize: 18, color: "#0F172A" }}>
          Baralho de hoje zerado! 🎉
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "#64748B", maxWidth: 260, lineHeight: 1.5 }}
        >
          Todas as tarefas de hoje foram concluídas ou organizadas. Volte
          amanhã!
        </Typography>
      </Paper>
    );
  }

  const dirMap: Record<Action, "right" | "left" | "up"> = {
    done: "right",
    pass: "left",
    defer: "up",
  };
  const dir = exit ? dirMap[exit] : null;

  const tx = dir === "right" ? 420 : dir === "left" ? -420 : drag.x;
  const ty = dir === "up" ? -640 : drag.y;
  const rot =
    dir === "right"
      ? 22
      : dir === "left"
        ? -22
        : dir === "up"
          ? 0
          : drag.x / 18;
  const cardOpacity = exit ? 0 : 1;
  const transition = exit
    ? "transform 240ms ease-in, opacity 240ms ease-in"
    : dragging
      ? "none"
      : "transform 320ms cubic-bezier(.2,.9,.3,1)";

  const rightStamp = Math.max(0, Math.min(1, drag.x / 100));
  const leftStamp = Math.max(0, Math.min(1, -drag.x / 100));
  const upStamp = Math.max(0, Math.min(1, -drag.y / 90));

  return (
    <Stack spacing={2.5}>
      <Box sx={{ position: "relative", height: 300 }}>
        {queue[2] && <StackCard depth={2} />}
        {queue[1] && <StackCard depth={1} />}

        <Paper
          component="article"
          variant="outlined"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: 5,
            bgcolor: "#FFFFFF",
            borderColor: "#E2E8F0",
            boxShadow:
              "0 20px 35px -5px rgba(15, 23, 42, 0.08), 0 10px 15px -5px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            p: 3,
            touchAction: "none",
            cursor: dragging ? "grabbing" : "grab",
            transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
            opacity: cardOpacity,
            transition,
            userSelect: "none",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Chip
              label={
                top.freq === "DAILY"
                  ? "Diária"
                  : top.freq === "WEEKLY"
                    ? "Semanal"
                    : "Mensal"
              }
              size="small"
              sx={{
                height: 24,
                fontSize: 11,
                fontWeight: 700,
                bgcolor:
                  top.freq === "DAILY"
                    ? "#EEF2FF"
                    : top.freq === "WEEKLY"
                      ? "#FEF3C7"
                      : "#F1F5F9",
                color:
                  top.freq === "DAILY"
                    ? "#4F46E5"
                    : top.freq === "WEEKLY"
                      ? "#D97706"
                      : "#475569",
              }}
            />
            <Stack
              direction="row"
              spacing={0.25}
              sx={{ alignItems: "center", color: "#F59E0B" }}
            >
              <Zap size={14} fill="#F59E0B" color="#F59E0B" />
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "#64748B", ml: 0.5 }}
              >
                Esforço {top.weight}
              </Typography>
            </Stack>
          </Stack>

          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              px: 1,
            }}
          >
            <Typography
              variant="h4"
              sx={{
                fontSize: 26,
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1.25,
              }}
            >
              {top.name}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignSelf: "center",
              alignItems: "center",
              bgcolor: "#F8FAFC",
              px: 2,
              py: 0.8,
              borderRadius: 99,
              border: "1px solid #F1F5F9",
            }}
          >
            <Avatar member={membersById[top.assignee]} size={24} />
            <Typography
              variant="body2"
              sx={{ fontSize: 13, color: "#475569", fontWeight: 600 }}
            >
              Sugestão:{" "}
              <Box component="span" sx={{ color: "#0F172A", fontWeight: 700 }}>
                {membersById[top.assignee]?.name ?? top.assignee}
              </Box>
            </Typography>
          </Stack>

          <Typography
            sx={{
              position: "absolute",
              top: 16,
              right: 20,
              fontWeight: 900,
              fontSize: 22,
              color: "#10B981",
              border: "3px solid #10B981",
              borderRadius: 3,
              px: 1.5,
              py: 0.3,
              transform: "rotate(12deg)",
              opacity: rightStamp,
              bgcolor: "rgba(236, 253, 245, 0.85)",
            }}
          >
            FEITO
          </Typography>
          <Typography
            sx={{
              position: "absolute",
              top: 16,
              left: 20,
              fontWeight: 900,
              fontSize: 22,
              color: "#64748B",
              border: "3px solid #64748B",
              borderRadius: 3,
              px: 1.5,
              py: 0.3,
              transform: "rotate(-12deg)",
              opacity: leftStamp,
              bgcolor: "rgba(241, 245, 249, 0.85)",
            }}
          >
            PASSA
          </Typography>
          <Typography
            sx={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              fontWeight: 900,
              fontSize: 20,
              color: "#F59E0B",
              border: "3px solid #F59E0B",
              borderRadius: 3,
              px: 1.5,
              py: 0.3,
              opacity: upStamp,
              bgcolor: "rgba(254, 243, 199, 0.85)",
            }}
          >
            ADIA
          </Typography>
        </Paper>
      </Box>

      <Stack
        direction="row"
        spacing={2.5}
        sx={{ justifyContent: "center", alignItems: "center", pt: 0.5 }}
      >
        <Tooltip title="Passar pra outra pessoa (Esquerda)">
          <IconButton
            aria-label="Passar tarefa"
            onClick={() => !exit && triggerExit("pass")}
            sx={{
              width: 52,
              height: 52,
              bgcolor: "#FFFFFF",
              color: "#64748B",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
              "&:hover": {
                bgcolor: "#F1F5F9",
                color: "#334155",
                transform: "translateY(-2px)",
              },
            }}
          >
            <SkipForward size={22} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Adiar tarefa (Cima)">
          <IconButton
            aria-label="Adiar tarefa"
            onClick={() => !exit && triggerExit("defer")}
            sx={{
              width: 44,
              height: 44,
              bgcolor: "#FEF3C7",
              color: "#D97706",
              border: "1px solid #FDE68A",
              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)",
              "&:hover": {
                bgcolor: "#FDE68A",
                transform: "translateY(-2px)",
              },
            }}
          >
            <Clock3 size={20} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Concluir tarefa (Direita)">
          <IconButton
            aria-label="Concluir tarefa"
            onClick={() => !exit && triggerExit("done")}
            sx={{
              width: 52,
              height: 52,
              color: "#FFFFFF",
              bgcolor: "#10B981",
              boxShadow: "0 6px 16px rgba(16, 185, 129, 0.35)",
              "&:hover": {
                bgcolor: "#059669",
                transform: "translateY(-2px)",
              },
            }}
          >
            <Check size={26} strokeWidth={2.8} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
