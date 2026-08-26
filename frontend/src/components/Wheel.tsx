import { Box, Typography } from "@mui/material";
import { RefreshCw } from "lucide-react";
import { Member, Task } from "../types";

export function Wheel({ task, members }: { task: Task; members: Member[] }) {
  if (members.length === 0) return null;

  const radius = 76;
  const center = 90;
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
          fill={m.color || "#4F46E5"}
          opacity={isCurrent ? 1 : 0.4}
          stroke="#FFFFFF"
          strokeWidth="3"
        />
        <text
          x={lx}
          y={ly}
          fill="#FFFFFF"
          fontWeight="800"
          fontSize="14"
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
        gap: 2,
        width: "100%",
        py: 1,
      }}
    >
      <Box sx={{ position: "relative", width: center * 2, height: center * 2 }}>
        <svg width={center * 2} height={center * 2}>
          {segments}
          <circle
            cx={center}
            cy={center}
            r="22"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="3"
          />
        </svg>
        <Box
          sx={{
            position: "absolute",
            top: -2,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "14px solid #4F46E5",
            filter: "drop-shadow(0 2px 4px rgba(79, 70, 229, 0.3))",
          }}
        />
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          variant="caption"
          sx={{
            fontSize: 11,
            fontWeight: 800,
            color: "#4F46E5",
            letterSpacing: 1.2,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <RefreshCw size={12} /> RODÍZIO ATUAL · {task.name.toUpperCase()}
        </Typography>
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, fontSize: 18, color: "#0F172A", mt: 0.25 }}
        >
          Vez de{" "}
          <Box component="span" sx={{ color: "#4F46E5" }}>
            {current?.name ?? "?"}
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
