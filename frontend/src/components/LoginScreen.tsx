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

export function LoginScreen() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState("");
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
            Sistema Familiar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Entre com a conta que foi criada pra você.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack spacing={1.5}>
          <TextField
            label="E-mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Stack>

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting || !email.trim() || !password}
          startIcon={
            submitting ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          Entrar
        </Button>
      </Paper>
    </Box>
  );
}
