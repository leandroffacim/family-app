import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  FormLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";
import { AVATAR_COLORS, Member } from "../types";
import { Avatar } from "./Avatar";

export function ProfileScreen({
  member,
  onClose,
  onSaved,
  onAccountDeleted,
}: {
  member: Member;
  onClose: () => void;
  onSaved: (member: Member) => void;
  onAccountDeleted: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [color, setColor] = useState(member.color);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await api.updateProfile({ name: name.trim(), color });
      onSaved({
        id: member.id,
        name: result.name ?? name.trim(),
        color: result.color ?? color,
      });
      onClose();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o perfil",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount();
      onAccountDeleted();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a conta",
      );
      setDeleting(false);
    }
  };

  return (
    <Drawer
      anchor="bottom"
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: "min(680px, 100%)",
            mx: "auto",
            borderRadius: "24px 22px 0 0",
            p: {
              xs: "24px 20px calc(24px + env(safe-area-inset-bottom))",
              sm: 3,
            },
            bgcolor: "#FFFFFF",
            boxShadow: "0 -20px 50px rgba(15, 23, 42, 0.15)",
          },
        },
      }}
    >
      <Stack spacing={2.5}>
        <Box
          sx={{
            width: 36,
            height: 4,
            borderRadius: 2,
            bgcolor: "#CBD5E1",
            mx: "auto",
            mt: -1,
            mb: 0.5,
          }}
        />

        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <Typography
            variant="h6"
            sx={{ fontSize: 19, fontWeight: 800, color: "#0F172A" }}
          >
            Meu perfil
          </Typography>
          <IconButton aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </Stack>

        {!confirmingDelete ? (
          <Stack spacing={2}>
            {saveError && (
              <Alert severity="error" onClose={() => setSaveError(null)}>
                {saveError}
              </Alert>
            )}

            <Stack sx={{ alignItems: "center" }}>
              <Avatar member={{ id: member.id, name, color }} size={64} />
            </Stack>

            <TextField
              label="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <Box>
              <FormLabel
                component="legend"
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#475569",
                  mb: 0.75,
                }}
              >
                Cor do avatar
              </FormLabel>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {AVATAR_COLORS.map((swatch) => (
                  <IconButton
                    key={swatch}
                    aria-label={`Cor ${swatch}`}
                    onClick={() => setColor(swatch)}
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: swatch,
                      border:
                        color === swatch
                          ? "3px solid #0F172A"
                          : "2px solid #FFFFFF",
                      boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
                      "&:hover": { bgcolor: swatch },
                    }}
                  />
                ))}
              </Stack>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              startIcon={
                saving ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
              sx={{ py: 1.5, mt: 1 }}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>

            <Button
              variant="text"
              size="small"
              onClick={() => setConfirmingDelete(true)}
              sx={{ color: "#EF4444", fontWeight: 700 }}
            >
              Excluir minha conta
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            {deleteError && (
              <Alert severity="error" onClose={() => setDeleteError(null)}>
                {deleteError}
              </Alert>
            )}
            <Alert severity="warning">
              Essa ação é permanente: sua conta será excluída e você perderá o
              acesso ao app. Não é possível desfazer.
            </Alert>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="error"
                fullWidth
                onClick={handleDelete}
                disabled={deleting}
                startIcon={
                  deleting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : undefined
                }
              >
                {deleting ? "Excluindo..." : "Sim, excluir conta"}
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Drawer>
  );
}
