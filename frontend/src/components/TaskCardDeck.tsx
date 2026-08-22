import { useRef, useState } from "react";
import { PartyPopper, CheckCircle2, SkipForward, Clock3 } from "lucide-react";
import { Member, TaskInstance } from "../types";
import { Avatar } from "./Avatar";

type Action = "done" | "pass" | "defer";

function StackCard({ depth }: { depth: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#FFFFFF",
        borderRadius: 20,
        border: "1px solid #E7E2D2",
        transform: `translateY(${-depth * 10}px) scale(${1 - depth * 0.045})`,
        opacity: 1 - depth * 0.35,
        boxShadow: "0 6px 16px rgba(30,58,50,0.08)",
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
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
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
      <div
        style={{
          height: 300,
          borderRadius: 20,
          background: "#FFFFFF",
          border: "1.5px dashed #D8D2BE",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          textAlign: "center",
          padding: 20,
        }}
      >
        <PartyPopper size={26} color="#D9A441" />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#22281F" }}>
          Baralho de hoje zerado
        </div>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: "#8A8571", maxWidth: 220 }}>
          Volta amanhã com um baralho novo.
        </div>
      </div>
    );
  }

  const dirMap: Record<Action, "right" | "left" | "up"> = { done: "right", pass: "left", defer: "up" };
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ position: "relative", height: 300 }}>
        {queue[2] && <StackCard depth={2} />}
        {queue[1] && <StackCard depth={1} />}

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          style={{
            position: "absolute",
            inset: 0,
            background: "#FFFFFF",
            borderRadius: 20,
            border: "1px solid #E7E2D2",
            boxShadow: "0 14px 30px rgba(30,58,50,0.16)",
            display: "flex",
            flexDirection: "column",
            padding: 20,
            touchAction: "none",
            cursor: dragging ? "grabbing" : "grab",
            transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
            opacity: cardOpacity,
            transition,
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10.5,
                color: "#8A8571",
                background: "#F2EFE3",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              {top.freq === "DAILY" ? "Diária" : top.freq === "WEEKLY" ? "Semanal" : "Mensal"}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#8A8571", alignSelf: "center" }}>
              {"●".repeat(top.weight)}
              {"○".repeat(3 - top.weight)}
            </span>
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 6px" }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, color: "#22281F", lineHeight: 1.2 }}>
              {top.name}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "center" }}>
            <Avatar member={membersById[top.assignee]} size={24} />
            <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: "#6B7268" }}>
              Sugestão: {membersById[top.assignee]?.name ?? top.assignee}
            </span>
          </div>

          <div style={{ position: "absolute", top: 22, right: 18, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 22, color: "#6B8F71", border: "3px solid #6B8F71", borderRadius: 10, padding: "2px 10px", transform: "rotate(12deg)", opacity: rightStamp }}>
            FEITO
          </div>
          <div style={{ position: "absolute", top: 22, left: 18, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 22, color: "#8A8571", border: "3px solid #8A8571", borderRadius: 10, padding: "2px 10px", transform: "rotate(-12deg)", opacity: leftStamp }}>
            PASSA
          </div>
          <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 20, color: "#D9A441", border: "3px solid #D9A441", borderRadius: 10, padding: "2px 10px", opacity: upStamp }}>
            ADIA
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 18 }}>
        <button onClick={() => !exit && triggerExit("pass")} style={{ width: 46, height: 46, borderRadius: "50%", border: "none", background: "#FFFFFF", boxShadow: "0 3px 8px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <SkipForward size={19} color="#8A8571" />
        </button>
        <button onClick={() => !exit && triggerExit("defer")} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "#FFFFFF", boxShadow: "0 3px 8px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", alignSelf: "center" }}>
          <Clock3 size={16} color="#D9A441" />
        </button>
        <button onClick={() => !exit && triggerExit("done")} style={{ width: 46, height: 46, borderRadius: "50%", border: "none", background: "#6B8F71", boxShadow: "0 3px 8px rgba(107,143,113,0.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <CheckCircle2 size={20} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}
