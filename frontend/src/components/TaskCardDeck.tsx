import { Box, Chip, IconButton, Paper, Stack, Typography } from "@mui/material";
import { CheckCircle2, Clock3, PartyPopper, SkipForward } from "lucide-react";
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
        opacity: 1 - depth * 0.35,
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
  const finishDrag = () => {
    if (!dragging || exit) return;
    setDragging(false);
    const { x, y } = drag;
    if (y < -90 && Math.abs(y) > Math.abs(x)) {
      triggerExit("defer");
    } else if (Math.abs(x) > 100) {
      triggerExit(x > 0 ? "done" : "pass");
    } else {
      setDrag({ x: 0, y: 0 });
    }
  };

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
          height: 300,
          borderRadius: 5,
          borderStyle: "dashed",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          textAlign: "center",
          p: 2.5,
        }}
      >
        <PartyPopper size={26} color="#D9A441" />
        <Typography variant="h1" sx={{ fontSize: 16 }}>
          Baralho de hoje zerado
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 220 }}
        >
          Volta amanhã com um baralho novo.
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
  const rot = dir === "right" ? 22 : dir === "left" ? -22 : drag.x / 18;
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
    <Stack spacing={1.5}>
      <Box sx={{ position: "relative", height: 300 }}>
        {queue[2] && <StackCard depth={2} />}
        {queue[1] && <StackCard depth={1} />}

        <Paper
          component="article"
          variant="outlined"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: 5,
            boxShadow: "0 14px 30px rgba(30,58,50,0.16)",
            display: "flex",
            flexDirection: "column",
            p: 2.5,
            touchAction: "none",
            cursor: dragging ? "grabbing" : "grab",
            transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
            opacity: cardOpacity,
            transition,
            userSelect: "none",
          }}
        >
          <Stack direction="row" spacing={1}>
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
                height: 22,
                fontSize: 10.5,
                bgcolor: "#F2EFE3",
                color: "text.secondary",
              }}
            />
            <Typography
              sx={{
                fontSize: 10.5,
                color: "text.secondary",
                alignSelf: "center",
              }}
            >
              {"●".repeat(top.weight)}
              {"○".repeat(3 - top.weight)}
            </Typography>
          </Stack>

          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              px: 0.75,
            }}
          >
            <Typography variant="h4" sx={{ fontSize: 26, lineHeight: 1.2 }}>
              {top.name}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignSelf: "center", alignItems: "center" }}
          >
            <Avatar member={membersById[top.assignee]} size={24} />
            <Typography variant="body2" color="text.secondary">
              Sugestão: {membersById[top.assignee]?.name ?? top.assignee}
            </Typography>
          </Stack>

          <Typography
            sx={{
              position: "absolute",
              top: 2.75,
              right: 2.25,
              fontWeight: 800,
              fontSize: 22,
              color: "#6B8F71",
              border: "3px solid #6B8F71",
              borderRadius: 2.5,
              px: 1.25,
              py: 0.25,
              transform: "rotate(12deg)",
              opacity: rightStamp,
            }}
          >
            FEITO
          </Typography>
          <Typography
            sx={{
              position: "absolute",
              top: 2.75,
              left: 2.25,
              fontWeight: 800,
              fontSize: 22,
              color: "#8A8571",
              border: "3px solid #8A8571",
              borderRadius: 2.5,
              px: 1.25,
              py: 0.25,
              transform: "rotate(-12deg)",
              opacity: leftStamp,
            }}
          >
            PASSA
          </Typography>
          <Typography
            sx={{
              position: "absolute",
              bottom: 2.75,
              left: "50%",
              transform: "translateX(-50%)",
              fontWeight: 800,
              fontSize: 20,
              color: "#D9A441",
              border: "3px solid #D9A441",
              borderRadius: 2.5,
              px: 1.25,
              py: 0.25,
              opacity: upStamp,
            }}
          >
            ADIA
          </Typography>
        </Paper>
      </Box>

      <Stack
        direction="row"
        spacing={2.25}
        sx={{ justifyContent: "center", alignItems: "center" }}
      >
        <IconButton
          aria-label="Passar tarefa"
          onClick={() => !exit && triggerExit("pass")}
          sx={{
            width: 46,
            height: 46,
            bgcolor: "background.paper",
            boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <SkipForward size={19} color="#8A8571" />
        </IconButton>
        <IconButton
          aria-label="Adiar tarefa"
          onClick={() => !exit && triggerExit("defer")}
          sx={{
            width: 40,
            height: 40,
            bgcolor: "background.paper",
            boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <Clock3 size={16} color="#D9A441" />
        </IconButton>
        <IconButton
          aria-label="Concluir tarefa"
          onClick={() => !exit && triggerExit("done")}
          sx={{
            width: 46,
            height: 46,
            color: "common.white",
            bgcolor: "#6B8F71",
            boxShadow: "0 3px 8px rgba(107,143,113,0.4)",
            "&:hover": { bgcolor: "#5D8063" },
          }}
        >
          <CheckCircle2 size={20} color="#FFFFFF" />
        </IconButton>
      </Stack>
    </Stack>
  );
}
