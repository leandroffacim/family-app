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
import { KeyRound, Lock } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthContext";

export function SetPasswordScreen() {
  const { completeNewPassword, error } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setLocalError("As senhas não são iguais.");
      return;
    }
    setSubmitting(true);
    try {
      await completeNewPassword(password);
    } catch {
      // erro já fica disponível via useAuth().error
    } finally {
      setSubmitting(false);
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
        background:
          "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)",
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
            <KeyRound size={28} />
          </Box>
          <Typography
            variant="h5"
            sx={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}
          >
            Escolha sua senha
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748B", fontSize: 14 }}>
            Primeiro acesso — defina uma senha definitiva para sua conta.
          </Typography>
        </Stack>

        {(localError || error) && (
          <Alert severity="error" sx={{ borderRadius: 3 }}>
            {localError ?? error}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <Lock
                    size={18}
                    style={{ marginRight: 8, color: "#94A3B8" }}
                  />
                ),
              },
            }}
          />
          <TextField
            label="Confirme a senha"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <Lock
                    size={18}
                    style={{ marginRight: 8, color: "#94A3B8" }}
                  />
                ),
              },
            }}
          />
        </Stack>

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting || !password || !confirm}
          startIcon={
            submitting ? (
              <CircularProgress size={18} color="inherit" />
            ) : undefined
          }
          sx={{ py: 1.5, fontSize: 15 }}
        >
          Confirmar
        </Button>
      </Paper>
    </Box>
  );
}
