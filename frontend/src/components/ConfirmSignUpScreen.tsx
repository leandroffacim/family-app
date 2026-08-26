import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { KeyRound, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import * as cognito from "../auth/cognito";

interface ConfirmSignUpScreenProps {
  email: string;
  onConfirmed: (email: string) => void;
}

export function ConfirmSignUpScreen({
  email,
  onConfirmed,
}: ConfirmSignUpScreenProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await cognito.confirmSignUp(email, code.trim());
      onConfirmed(email);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível confirmar o código",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await cognito.resendConfirmationCode(email);
      setInfo("Novo código enviado pro seu e-mail.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível reenviar o código",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2.5,
        background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)",
      }}
    >
      <Paper
        component="form"
        onSubmit={onSubmit}
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 400,
          borderRadius: 6,
          p: { xs: 3, sm: 4 },
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          bgcolor: "#FFFFFF",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          borderColor: "#E2E8F0",
        }}
      >
        <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center" }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 4,
              bgcolor: "#EEF2FF",
              color: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 16px rgba(79, 70, 229, 0.15)",
              mb: 0.5,
            }}
          >
            <ShieldCheck size={28} />
          </Box>
          <Typography variant="h5" sx={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>
            Confirme seu e-mail
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748B", fontSize: 14 }}>
            Enviamos um código de confirmação para{" "}
            <Box component="span" sx={{ fontWeight: 700, color: "#0F172A" }}>
              {email}
            </Box>.
          </Typography>
        </Stack>

        {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}
        {info && <Alert severity="success" sx={{ borderRadius: 3 }}>{info}</Alert>}

        <TextField
          label="Código de confirmação"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          slotProps={{
            input: {
              startAdornment: <KeyRound size={18} style={{ marginRight: 8, color: "#94A3B8" }} />,
            },
          }}
        />

        <Stack spacing={1.5}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !code.trim()}
            startIcon={
              submitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : undefined
            }
            sx={{ py: 1.5, fontSize: 15 }}
          >
            Confirmar
          </Button>

          <Button
            variant="text"
            onClick={onResend}
            disabled={resending}
            startIcon={
              resending ? (
                <CircularProgress size={18} color="inherit" />
              ) : undefined
            }
            sx={{ color: "#4F46E5", fontWeight: 700 }}
          >
            Reenviar código
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
