import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  TextField,
} from "@mui/material";
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
        err instanceof Error ? err.message : "Não foi possível confirmar o código",
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
        err instanceof Error ? err.message : "Não foi possível reenviar o código",
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
        bgcolor: "primary.main",
      }}
    >
      <Paper
        component="form"
        onSubmit={onSubmit}
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 360,
          borderRadius: 5,
          p: 3.5,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontSize: 22 }}>
            Confirme seu e-mail
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enviamos um código de confirmação pra {email}.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {info && <Alert severity="success">{info}</Alert>}

        <TextField
          label="Código de confirmação"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />

        <Stack spacing={1.5}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !code.trim()}
            startIcon={
              submitting ? <CircularProgress size={16} color="inherit" /> : undefined
            }
          >
            Confirmar
          </Button>

          <Button
            variant="text"
            onClick={onResend}
            disabled={resending}
            startIcon={
              resending ? <CircularProgress size={16} color="inherit" /> : undefined
            }
          >
            Reenviar código
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
