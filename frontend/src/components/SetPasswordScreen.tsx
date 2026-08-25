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
            Escolha sua senha
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Primeiro acesso — defina uma senha definitiva pra sua conta.
          </Typography>
        </Box>

        {(localError || error) && (
          <Alert severity="error">{localError ?? error}</Alert>
        )}

        <Stack spacing={1.5}>
          <TextField
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <TextField
            label="Confirme a senha"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Stack>

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting || !password || !confirm}
          startIcon={
            submitting ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          Confirmar
        </Button>
      </Paper>
    </Box>
  );
}
