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
            Criar conta da família
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cadastre a sua família pra começar a usar o app.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack spacing={1.5}>
          <TextField
            label="Nome da família"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            autoFocus
          />
          <TextField
            label="E-mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Stack>

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting || !familyName.trim() || !email.trim() || !password}
          startIcon={
            submitting ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          Criar conta
        </Button>

        <Button variant="text" onClick={onBackToLogin}>
          Já tenho conta — entrar
        </Button>
      </Paper>
    </Box>
  );
}
