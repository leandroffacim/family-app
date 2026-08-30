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
import { Lock, Mail, UserPlus, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import * as cognito from "../auth/cognito";

interface SignUpScreenProps {
  onSignedUp: (email: string) => void;
  onBackToLogin: () => void;
}

export function SignUpScreen({ onSignedUp, onBackToLogin }: SignUpScreenProps) {
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!familyName.trim() || !email.trim() || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      await cognito.signUp(familyName.trim(), email.trim(), password);
      onSignedUp(email.trim());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível criar a conta",
      );
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
            <UserPlus size={28} />
          </Box>
          <Typography
            variant="h5"
            sx={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}
          >
            Criar conta da família
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748B", fontSize: 14 }}>
            Cadastre a sua família pra começar a usar o app.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label="Nome da família"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <Users
                    size={18}
                    style={{ marginRight: 8, color: "#94A3B8" }}
                  />
                ),
              },
            }}
          />
          <TextField
            label="E-mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            autoComplete="new-password"
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
          disabled={
            submitting || !familyName.trim() || !email.trim() || !password
          }
          startIcon={
            submitting ? (
              <CircularProgress size={18} color="inherit" />
            ) : undefined
          }
          sx={{ py: 1.5, fontSize: 15 }}
        >
          Criar conta
        </Button>

        <Button
          variant="text"
          onClick={onBackToLogin}
          sx={{ color: "#4F46E5", fontWeight: 700 }}
        >
          Já tenho conta — entrar
        </Button>
      </Paper>
    </Box>
  );
}
