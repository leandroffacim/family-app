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
import { HeartHandshake, Lock, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthContext";

interface LoginScreenProps {
  onNavigateToSignUp: () => void;
  prefillEmail?: string;
}

export function LoginScreen({
  onNavigateToSignUp,
  prefillEmail,
}: LoginScreenProps) {
  const { login, error } = useAuth();
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
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
          borderRadius: 1.5,
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
            <HeartHandshake size={28} />
          </Box>
          <Typography
            variant="h5"
            sx={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}
          >
            Sistema Familiar
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748B", fontSize: 14 }}>
            Entre na sua conta para organizar sua rotina.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label="E-mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <Mail
                    size={18}
                    style={{ marginRight: 8, color: "#94A3B8" }}
                  />
                ),
              },
            }}
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          disabled={submitting || !email.trim() || !password}
          startIcon={
            submitting ? (
              <CircularProgress size={18} color="inherit" />
            ) : undefined
          }
          sx={{ py: 1.5, fontSize: 15 }}
        >
          Entrar
        </Button>

        <Button
          variant="text"
          onClick={onNavigateToSignUp}
          sx={{ color: "#4F46E5", fontWeight: 700 }}
        >
          Criar nova conta de família
        </Button>
      </Paper>
    </Box>
  );
}
