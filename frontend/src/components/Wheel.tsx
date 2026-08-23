import { Box, Typography } from "@mui/material";
import { Member, Task } from "../types";

// Mostra o rodízio atual de uma tarefa (quem é a vez). Somente
// leitura: o avanço do rodízio só acontece de verdade quando alguém
// desliza "passa" no baralho do dia — aqui é só o retrato do estado.
export function Wheel({ task, members }: { task: Task; members: Member[] }) {
  if (members.length === 0) return null;

  const radius = 72;
  const center = 84;
  const segAngle = 360 / members.length;
  const currentId =
    task.rotationOrder[task.currentIndex % task.rotationOrder.length];
  const current = members.find((m) => m.id === currentId);

  const segments = members.map((m, i) => {
    const startAngle = i * segAngle - 90;
    const endAngle = startAngle + segAngle;
    const toRad = (a: number) => (a * Math.PI) / 180;
    const x1 = center + radius * Math.cos(toRad(startAngle));
    const y1 = center + radius * Math.sin(toRad(startAngle));
    const x2 = center + radius * Math.cos(toRad(endAngle));
    const y2 = center + radius * Math.sin(toRad(endAngle));
    const midAngle = startAngle + segAngle / 2;
    const lx = center + radius * 0.62 * Math.cos(toRad(midAngle));
    const ly = center + radius * 0.62 * Math.sin(toRad(midAngle));
    const isCurrent = m.id === currentId;
    return (
      <g key={m.id}>
        <path
          d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`}
          fill={m.color}
          opacity={isCurrent ? 1 : 0.35}
          stroke="#F2EFE3"
          strokeWidth="2"
        />
        <text
          x={lx}
          y={ly}
          fill="#F2EFE3"
          fontWeight="700"
          fontSize="13"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {m.name.charAt(0).toUpperCase()}
        </text>
      </g>
    );
  });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Box sx={{ position: "relative", width: center * 2, height: center * 2 }}>
        <svg width={center * 2} height={center * 2}>
          {segments}
          <circle
            cx={center}
            cy={center}
            r="20"
            fill="#F2EFE3"
            stroke="#1E3A32"
            strokeWidth="2"
          />
        </svg>
        <Box
          sx={{
            position: "absolute",
            top: -0.75,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: "12px solid #22281F",
          }}
        />
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography sx={{ fontSize: 11, color: "#6B7268", letterSpacing: 1 }}>
          RODÍZIO · {task.name.toUpperCase()}
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#22281F" }}>
          Vez de {current?.name ?? "?"}
        </Typography>
      </Box>
    </Box>
  );
}
