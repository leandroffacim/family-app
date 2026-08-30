import {
  Alert,
  AppBar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  Fab,
  FormLabel,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  HeartHandshake,
  ListChecks,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api/client";
import { useAuth } from "./auth/AuthContext";
import { Avatar } from "./components/Avatar";
import { ConfirmSignUpScreen } from "./components/ConfirmSignUpScreen";
import { EventCard } from "./components/EventCard";
import { LoginScreen } from "./components/LoginScreen";
import { SetPasswordScreen } from "./components/SetPasswordScreen";
import { SignUpScreen } from "./components/SignUpScreen";
import { TaskCardDeck } from "./components/TaskCardDeck";
import { TaskDefinitionRow } from "./components/TaskDefinitionRow";
import { Wheel } from "./components/Wheel";
import {
  WEEKDAYS,
  displayIndexToApiWeekday,
  shiftISO,
  todayISO,
  weekDatesFor,
} from "./lib/date";
import {
  Family,
  FamilyEvent,
  Member,
  Task,
  TaskFrequency,
  TaskInstance,
} from "./types";

type Tab = "hoje" | "tarefas" | "agenda" | "familia";
type SheetType = "task" | "event" | "invite";

const tabItems = [
  { id: "hoje" as const, label: "Hoje", icon: Sun },
  { id: "tarefas" as const, label: "Tarefas", icon: ListChecks },
  { id: "agenda" as const, label: "Agenda", icon: CalendarDays },
  { id: "familia" as const, label: "Família", icon: Users },
];

const frequencyOptions: { id: TaskFrequency; label: string }[] = [
  { id: "DAILY", label: "Diária" },
  { id: "WEEKLY", label: "Semanal" },
  { id: "MONTHLY", label: "Mensal" },
];

export default function App() {
  const { status, memberId, logout } = useAuth();
  const [authView, setAuthView] = useState<"login" | "signup" | "confirm">(
    "login",
  );
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState("");
  const [prefillEmail, setPrefillEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deckQueue, setDeckQueue] = useState<TaskInstance[]>([]);
  const [family, setFamily] = useState<Family | null>(null);
  const [lastDecision, setLastDecision] = useState<{
    taskId: string;
    name: string;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [tab, setTab] = useState<Tab>("hoje");
  const [taskFilter, setTaskFilter] = useState<"ALL" | TaskFrequency>("ALL");
  const [weekAnchor, setWeekAnchor] = useState(todayISO);
  const weekDates = useMemo(() => weekDatesFor(weekAnchor), [weekAnchor]);
  const [selectedDay, setSelectedDay] = useState(() => {
    const index = weekDates.indexOf(todayISO());
    return index === -1 ? 0 : index;
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType>("task");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMemberId, setInviteMemberId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskFreq, setNewTaskFreq] = useState<TaskFrequency>("DAILY");
  const [newTaskWeight, setNewTaskWeight] = useState<1 | 2 | 3>(1);
  const [newTaskDayOfWeek, setNewTaskDayOfWeek] = useState(0);
  const [newTaskDayOfMonth, setNewTaskDayOfMonth] = useState(1);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDay, setNewEventDay] = useState(selectedDay);
  const [newEventMembers, setNewEventMembers] = useState<string[]>([]);
  const [creatingEvent, setCreatingEvent] = useState(false);

  const membersById = useMemo(
    () => Object.fromEntries(members.map((member) => [member.id, member])),
    [members],
  );

  const selectAgendaDate = (date: string) => {
    const nextWeek = weekDatesFor(date);
    setWeekAnchor(date);
    setSelectedDay(nextWeek.indexOf(date));
  };

  const changeWeek = (direction: -1 | 1) => {
    setWeekAnchor((current) => shiftISO(current, direction * 7));
  };

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [membersRes, tasksRes, deckRes, eventsRes, familyRes] =
        await Promise.all([
          api.listMembers(),
          api.listTasks(),
          api.getDeck(),
          api.listEvents(),
          api.getFamily(),
        ]);
      setMembers(membersRes.items);
      setTasks(tasksRes.items);
      setDeckQueue(deckRes.items);
      setEvents(eventsRes.items);
      setFamily(familyRes);
      setNewEventMembers(membersRes.items.map((member) => member.id));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Erro ao carregar dados",
      );
    } finally {
      setLoading(false);
    }
  }

  const refreshDeck = async () => {
    setRefreshing(true);
    setActionError(null);
    try {
      const deckRes = await api.getDeck();
      setDeckQueue(deckRes.items);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o baralho",
      );
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") loadAll();
  }, [status]);

  const handleDeckDecide = async (
    taskId: string,
    action: "done" | "pass" | "defer",
  ) => {
    setActionError(null);
    const decided = deckQueue.find((item) => item.taskId === taskId);
    // Otimista: tira a carta da fila já — não espera a viagem de rede
    // pra próxima carta virar interativa. Se a API falhar, volta pro
    // topo no catch (ver TaskCardDeck.tsx, que anima em cima de um
    // snapshot local, então não depende de quando a fila muda aqui).
    setDeckQueue((queue) => queue.filter((item) => item.taskId !== taskId));
    try {
      await api.decide(taskId, action);
      if (action === "pass") setTasks((await api.listTasks()).items);
      // guarda a última decisão pra permitir "Desfazer" na hora, sem
      // precisar esperar o baralho de amanhã recriar a tarefa
      setLastDecision(decided ? { taskId, name: decided.name } : null);
    } catch (error) {
      if (decided) setDeckQueue((queue) => [decided, ...queue]);
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a decisão",
      );
    }
  };

  const handleUndo = async () => {
    if (!lastDecision) return;
    setUndoing(true);
    setActionError(null);
    try {
      await api.undo(lastDecision.taskId);
      const [deckRes, tasksRes] = await Promise.all([
        api.getDeck(),
        api.listTasks(),
      ]);
      setDeckQueue(deckRes.items);
      setTasks(tasksRes.items);
      setLastDecision(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível desfazer a decisão",
      );
    } finally {
      setUndoing(false);
    }
  };

  const addTask = async () => {
    if (!newTaskName.trim() || members.length === 0) return;
    setCreatingTask(true);
    setActionError(null);
    try {
      await api.createTask({
        name: newTaskName.trim(),
        freq: newTaskFreq,
        weight: newTaskWeight,
        rotationOrder: members.map((member) => member.id).filter(Boolean),
        dayOfWeek:
          newTaskFreq === "WEEKLY"
            ? displayIndexToApiWeekday(newTaskDayOfWeek)
            : undefined,
        dayOfMonth: newTaskFreq === "MONTHLY" ? newTaskDayOfMonth : undefined,
      });
      setTasks((await api.listTasks()).items);
      setNewTaskName("");
      setNewTaskFreq("DAILY");
      setNewTaskWeight(1);
      setSheetOpen(false);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a tarefa",
      );
    } finally {
      setCreatingTask(false);
    }
  };

  const addEvent = async () => {
    if (!newEventTitle.trim() || !newEventTime.trim()) return;
    setCreatingEvent(true);
    setActionError(null);
    try {
      await api.createEvent({
        date: weekDates[newEventDay],
        time: newEventTime.trim(),
        title: newEventTitle.trim(),
        members: newEventMembers.length
          ? newEventMembers
          : ([members[0]?.id].filter(Boolean) as string[]),
      });
      setEvents((await api.listEvents()).items);
      setNewEventTitle("");
      setNewEventTime("");
      setSheetOpen(false);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o compromisso",
      );
    } finally {
      setCreatingEvent(false);
    }
  };

  const openSheet = () => {
    setSheetType(
      tab === "agenda" ? "event" : tab === "familia" ? "invite" : "task",
    );
    setNewEventDay(selectedDay);
    setInviteEmail("");
    setInviteMemberId(
      tab === "familia" ? (members[0]?.id ?? "") : inviteMemberId,
    );
    setActionError(null);
    setSheetOpen(true);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteMemberId) return;
    setInviting(true);
    setActionError(null);
    try {
      await api.inviteMember({
        email: inviteEmail.trim(),
        memberId: inviteMemberId,
      });
      const invitedName =
        members.find((member) => member.id === inviteMemberId)?.name ??
        "Membro";
      setInviteSuccess(`Convite enviado pra ${invitedName}`);
      setInviteEmail("");
      setSheetOpen(false);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o convite",
      );
    } finally {
      setInviting(false);
    }
  };

  const dayEvents = events
    .filter((event) => event.date === weekDates[selectedDay])
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcomingEvents = events
    .filter((event) => event.date !== weekDates[selectedDay])
    .sort((a, b) => a.date.localeCompare(b.date));
  const featuredTask =
    tasks.find((task) => task.rotationOrder.length > 1) ?? tasks[0];
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(
      new Date(`${date}T12:00:00`),
    );

  if (status === "loading") {
    return (
      <Box
        sx={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "primary.main",
        }}
      >
        <CircularProgress sx={{ color: "#F2EFE3" }} />
      </Box>
    );
  }

  if (status === "unauthenticated") {
    if (authView === "signup") {
      return (
        <SignUpScreen
          onSignedUp={(signedUpEmail) => {
            setPendingConfirmEmail(signedUpEmail);
            setAuthView("confirm");
          }}
          onBackToLogin={() => setAuthView("login")}
        />
      );
    }
    if (authView === "confirm") {
      return (
        <ConfirmSignUpScreen
          email={pendingConfirmEmail}
          onConfirmed={(confirmedEmail) => {
            setPrefillEmail(confirmedEmail);
            setAuthView("login");
          }}
        />
      );
    }
    return (
      <LoginScreen
        onNavigateToSignUp={() => setAuthView("signup")}
        prefillEmail={prefillEmail}
      />
    );
  }

  if (status === "newPasswordRequired") {
    return <SetPasswordScreen />;
  }

  const filteredTasks = tasks.filter((task) =>
    taskFilter === "ALL" ? true : task.freq === taskFilter,
  );

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 0, sm: 2.5 },
        bgcolor: { xs: "#F8FAFC", sm: "#CBD5E1" },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "min(1080px, 100%)",
          height: { xs: "100dvh", sm: "min(880px, calc(100dvh - 40px))" },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: { xs: 0, sm: 6 },
          border: { xs: 0, sm: "1px solid #E2E8F0" },
          boxShadow: {
            xs: "none",
            sm: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          },
          backgroundColor: "#F8FAFC",
          position: "relative",
        }}
      >
        <AppBar
          position="static"
          elevation={0}
          sx={{
            flexShrink: 0,
            background:
              "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)",
            color: "#FFFFFF",
            px: { xs: 2.5, sm: 3.5 },
            pt: { xs: "calc(16px + env(safe-area-inset-top))", sm: 2.5 },
            pb: { xs: 2, sm: 2.5 },
          }}
        >
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Box>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", mb: 0.25 }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: 1.5,
                    bgcolor: "rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <HeartHandshake size={13} color="#A5B4FC" />
                </Box>
                <Typography
                  variant="overline"
                  sx={{
                    color: "#A5B4FC",
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    lineHeight: 1,
                  }}
                >
                  SISTEMA FAMILIAR
                </Typography>
              </Stack>
              <Typography
                variant="h5"
                sx={{
                  color: "#FFFFFF",
                  fontSize: { xs: 20, sm: 25 },
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {tab === "hoje" && "Hoje em casa"}
                {tab === "tarefas" && "Tarefas da Família"}
                {tab === "agenda" && "Agenda Familiar"}
                {tab === "familia" && "Nossa Família"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              {!!family && family.streak > 0 && (
                <Chip
                  size="small"
                  icon={<Flame size={14} color="#F59E0B" />}
                  label={`${family.streak} ${family.streak === 1 ? "dia" : "dias"}`}
                  sx={{
                    bgcolor: "rgba(245, 158, 11, 0.2)",
                    color: "#FCD34D",
                    fontWeight: 800,
                    fontSize: 12,
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    "& .MuiChip-icon": { color: "#F59E0B" },
                  }}
                />
              )}
              {memberId && membersById[memberId] && (
                <Avatar member={membersById[memberId]} size={36} showBorder />
              )}
              <IconButton
                onClick={logout}
                aria-label="Sair"
                sx={{
                  color: "#CBD5E1",
                  bgcolor: "rgba(255,255,255,0.1)",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "#FFFFFF",
                  },
                }}
              >
                <LogOut size={18} />
              </IconButton>
            </Stack>
          </Stack>
        </AppBar>

        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            width: "min(100%, 860px)",
            alignSelf: "center",
            p: { xs: 2, sm: "24px 28px 32px" },
          }}
        >
          {loading && (
            <Stack
              spacing={2}
              sx={{
                flex: 1,
                color: "#64748B",
                alignItems: "center",
                justifyContent: "center",
                py: 8,
              }}
            >
              <CircularProgress size={32} sx={{ color: "#4F46E5" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Carregando dados da família...
              </Typography>
            </Stack>
          )}
          {!loading && loadError && (
            <Alert
              severity="error"
              sx={{ borderRadius: 3 }}
              action={
                <Button color="inherit" size="small" onClick={loadAll}>
                  Tentar novamente
                </Button>
              }
            >
              {loadError}
            </Alert>
          )}
          {!loading && !loadError && (
            <>
              {actionError && (
                <Alert
                  severity="error"
                  sx={{ borderRadius: 3 }}
                  onClose={() => setActionError(null)}
                >
                  {actionError}
                </Alert>
              )}

              {tab === "hoje" && (
                <Stack spacing={2.5}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 4,
                      bgcolor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", mb: 0.5 }}
                      >
                        <Sparkles size={16} color="#4F46E5" />
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 800, color: "#0F172A" }}
                        >
                          Sua rotina do dia
                        </Typography>
                      </Stack>
                      <Typography
                        variant="caption"
                        sx={{ color: "#64748B", fontWeight: 500 }}
                      >
                        {deckQueue.length === 0
                          ? "Tudo pronto! Nenhuma tarefa pendente no baralho."
                          : `${deckQueue.length} ${deckQueue.length === 1 ? "tarefa pendente" : "tarefas pendentes"} no baralho.`}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Chip
                        label={`${deckQueue.length} restantes`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor:
                            deckQueue.length === 0 ? "#DCFCE7" : "#EEF2FF",
                          color: deckQueue.length === 0 ? "#15803D" : "#4F46E5",
                          px: 0.5,
                        }}
                      />
                      <Tooltip title="Atualizar baralho">
                        <IconButton
                          size="small"
                          onClick={refreshDeck}
                          disabled={refreshing}
                          aria-label="Atualizar baralho"
                          sx={{
                            color: "#64748B",
                            bgcolor: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            "&:hover": { bgcolor: "#F1F5F9" },
                          }}
                        >
                          {refreshing ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <RefreshCw size={16} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Paper>

                  <TaskCardDeck
                    queue={deckQueue}
                    membersById={membersById}
                    onDecide={handleDeckDecide}
                  />

                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      justifyContent: "center",
                      alignItems: "center",
                      flexWrap: "wrap",
                      pt: 0.5,
                    }}
                  >
                    <Chip
                      label="👈 Esquerda: Passar"
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: "#CBD5E1",
                        color: "#64748B",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <Chip
                      label="👆 Cima: Adiar"
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: "#FDE68A",
                        color: "#D97706",
                        bgcolor: "#FEF3C7",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <Chip
                      label="👉 Direita: Concluir"
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: "#A7F3D0",
                        color: "#059669",
                        bgcolor: "#ECFDF5",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  </Stack>
                </Stack>
              )}

              {tab === "tarefas" && (
                <Stack spacing={2.5}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 4,
                      bgcolor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      value={taskFilter}
                      onChange={(_, nextFilter: "ALL" | TaskFrequency | null) =>
                        nextFilter && setTaskFilter(nextFilter)
                      }
                      sx={{ gap: 1 }}
                    >
                      <ToggleButton
                        value="ALL"
                        sx={{
                          py: 1,
                          borderRadius: "10px !important",
                          border: "1px solid #E2E8F0 !important",
                        }}
                      >
                        Todas ({tasks.length})
                      </ToggleButton>
                      <ToggleButton
                        value="DAILY"
                        sx={{
                          py: 1,
                          borderRadius: "10px !important",
                          border: "1px solid #E2E8F0 !important",
                        }}
                      >
                        Diárias (
                        {tasks.filter((t) => t.freq === "DAILY").length})
                      </ToggleButton>
                      <ToggleButton
                        value="WEEKLY"
                        sx={{
                          py: 1,
                          borderRadius: "10px !important",
                          border: "1px solid #E2E8F0 !important",
                        }}
                      >
                        Semanais (
                        {tasks.filter((t) => t.freq === "WEEKLY").length})
                      </ToggleButton>
                      <ToggleButton
                        value="MONTHLY"
                        sx={{
                          py: 1,
                          borderRadius: "10px !important",
                          border: "1px solid #E2E8F0 !important",
                        }}
                      >
                        Mensais (
                        {tasks.filter((t) => t.freq === "MONTHLY").length})
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Paper>

                  <Stack spacing={1.5}>
                    {filteredTasks.map((task) => (
                      <TaskDefinitionRow
                        key={task.id}
                        task={task}
                        membersById={membersById}
                      />
                    ))}
                    {filteredTasks.length === 0 && (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 4,
                          borderRadius: 4,
                          textAlign: "center",
                          bgcolor: "#FFFFFF",
                          borderColor: "#E2E8F0",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: "#64748B", fontWeight: 600 }}
                        >
                          Nenhuma tarefa encontrada neste filtro.
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Plus size={16} />}
                          onClick={openSheet}
                          sx={{ mt: 2 }}
                        >
                          Adicionar tarefa
                        </Button>
                      </Paper>
                    )}
                  </Stack>
                </Stack>
              )}

              {tab === "agenda" && (
                <Stack spacing={2.5}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      borderRadius: { xs: 1, sm: 1.25 },
                      bgcolor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mb: 2, alignItems: "center" }}
                    >
                      <IconButton
                        aria-label="Semana anterior"
                        onClick={() => changeWeek(-1)}
                        sx={{
                          border: "1px solid #E2E8F0",
                          bgcolor: "#F8FAFC",
                          "&:hover": { bgcolor: "#EEF2FF", color: "#4F46E5" },
                        }}
                      >
                        <ChevronLeft size={18} strokeWidth={2.5} />
                      </IconButton>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="overline"
                          sx={{
                            display: "block",
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: 0.8,
                            color: "#64748B",
                            lineHeight: 1,
                          }}
                        >
                          SEMANA ATUAL
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          noWrap
                          sx={{ fontWeight: 800, color: "#0F172A", mt: 0.25 }}
                        >
                          {formatDate(weekDates[0])} —{" "}
                          {formatDate(weekDates[6])}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => selectAgendaDate(todayISO())}
                        sx={{
                          display: { xs: "none", sm: "inline-flex" },
                          borderColor: "#E2E8F0",
                        }}
                      >
                        Hoje
                      </Button>
                      <IconButton
                        component="label"
                        aria-label="Escolher outra data"
                        sx={{
                          border: "1px solid #E2E8F0",
                          bgcolor: "#F8FAFC",
                          "&:hover": { bgcolor: "#EEF2FF", color: "#4F46E5" },
                        }}
                      >
                        <CalendarDays size={18} strokeWidth={2.2} />
                        <input
                          hidden
                          type="date"
                          value={weekDates[selectedDay]}
                          onChange={(event) =>
                            event.target.value &&
                            selectAgendaDate(event.target.value)
                          }
                        />
                      </IconButton>
                      <IconButton
                        aria-label="Próxima semana"
                        onClick={() => changeWeek(1)}
                        sx={{
                          border: "1px solid #E2E8F0",
                          bgcolor: "#F8FAFC",
                          "&:hover": { bgcolor: "#EEF2FF", color: "#4F46E5" },
                        }}
                      >
                        <ChevronRight size={18} strokeWidth={2.5} />
                      </IconButton>
                    </Stack>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                        gap: { xs: 0.5, sm: 1 },
                      }}
                      aria-label="Dias da semana"
                    >
                      {WEEKDAYS.map((day, index) => {
                        const hasEvent = events.some(
                          (event) => event.date === weekDates[index],
                        );
                        const isSelected = selectedDay === index;
                        return (
                          <Button
                            key={weekDates[index]}
                            onClick={() => setSelectedDay(index)}
                            aria-pressed={isSelected}
                            sx={{
                              minWidth: 0,
                              width: "100%",
                              minHeight: { xs: 60, sm: 76 },
                              p: { xs: 0.5, sm: 1 },
                              display: "flex",
                              flexDirection: "column",
                              lineHeight: 1,
                              borderRadius: 3.5,
                              bgcolor: isSelected ? "#4F46E5" : "#F8FAFC",
                              color: isSelected ? "#FFFFFF" : "#0F172A",
                              border: "1px solid",
                              borderColor: isSelected ? "#4F46E5" : "#E2E8F0",
                              boxShadow: isSelected
                                ? "0 4px 12px rgba(79, 70, 229, 0.3)"
                                : "none",
                              "&:hover": {
                                bgcolor: isSelected ? "#4338CA" : "#EEF2FF",
                              },
                            }}
                          >
                            <Typography
                              component="span"
                              sx={{
                                fontSize: { xs: 9.5, sm: 11 },
                                fontWeight: 700,
                                opacity: isSelected ? 0.9 : 0.6,
                                letterSpacing: 0.3,
                              }}
                            >
                              {day}
                            </Typography>
                            <Typography
                              component="span"
                              sx={{
                                mt: 0.5,
                                fontSize: { xs: 16, sm: 20 },
                                fontWeight: 800,
                                lineHeight: 1,
                              }}
                            >
                              {Number(weekDates[index].slice(8, 10))}
                            </Typography>
                            {hasEvent && (
                              <Box
                                component="span"
                                aria-label="Tem compromisso"
                                sx={{
                                  width: 6,
                                  height: 6,
                                  mt: 0.75,
                                  borderRadius: "50%",
                                  bgcolor: isSelected ? "#FCD34D" : "#EF4444",
                                }}
                              />
                            )}
                          </Button>
                        );
                      })}
                    </Box>
                  </Paper>

                  <Stack spacing={1.5}>
                    {dayEvents.length === 0 && (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 4,
                          borderRadius: 4,
                          textAlign: "center",
                          bgcolor: "#FFFFFF",
                          borderColor: "#E2E8F0",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: "#64748B", fontWeight: 600 }}
                        >
                          Nada agendado para este dia.
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Plus size={16} />}
                          onClick={openSheet}
                          sx={{ mt: 2 }}
                        >
                          Adicionar compromisso
                        </Button>
                      </Paper>
                    )}
                    {dayEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        ev={event}
                        membersById={membersById}
                      />
                    ))}
                  </Stack>

                  {upcomingEvents.length > 0 && (
                    <Stack spacing={1.5} sx={{ pt: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 800, color: "#0F172A", px: 0.5 }}
                      >
                        Próximos compromissos
                      </Typography>
                      {upcomingEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          ev={event}
                          membersById={membersById}
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              )}

              {tab === "familia" && (
                <Stack spacing={2.5}>
                  {featuredTask && (
                    <Paper
                      variant="outlined"
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        p: 3,
                        borderRadius: 5,
                        bgcolor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                      }}
                    >
                      <Wheel task={featuredTask} members={members} />
                    </Paper>
                  )}

                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "center",
                        px: 0.5,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 800, color: "#0F172A" }}
                      >
                        Membros da Família ({members.length})
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<UserPlus size={16} />}
                        onClick={openSheet}
                        sx={{ color: "#4F46E5", fontWeight: 700 }}
                      >
                        Convidar
                      </Button>
                    </Stack>

                    {members.map((member) => (
                      <Paper
                        key={member.id}
                        variant="outlined"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: "12px 16px",
                          borderRadius: 4,
                          bgcolor: "#FFFFFF",
                          borderColor: "#E2E8F0",
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          sx={{ alignItems: "center" }}
                        >
                          <Avatar member={member} size={38} />
                          <Box>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: 15,
                                color: "#0F172A",
                              }}
                            >
                              {member.name}
                              {member.id === memberId && (
                                <Box
                                  component="span"
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: 13,
                                    color: "#4F46E5",
                                    ml: 0.75,
                                  }}
                                >
                                  (Você)
                                </Box>
                              )}
                            </Typography>
                          </Box>
                        </Stack>
                        <Chip
                          label="Membro"
                          size="small"
                          sx={{
                            bgcolor: "#F1F5F9",
                            color: "#475569",
                            fontWeight: 600,
                          }}
                        />
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              )}
            </>
          )}
        </Box>

        {!loading && !loadError && (
          <Fab
            color="primary"
            aria-label={
              tab === "agenda"
                ? "Adicionar compromisso"
                : tab === "familia"
                  ? "Convidar membro"
                  : "Adicionar tarefa"
            }
            onClick={openSheet}
            sx={{
              position: "absolute",
              right: {
                xs: 20,
                sm: "max(32px, calc((100% - 860px) / 2 + 16px))",
              },
              bottom: {
                xs: "calc(76px + env(safe-area-inset-bottom))",
                sm: 24,
              },
              zIndex: 10,
              bgcolor: "#4F46E5",
              color: "#FFFFFF",
              width: 56,
              height: 56,
              boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.5)",
              "&:hover": { bgcolor: "#4338CA", transform: "scale(1.05)" },
              transition: "all 0.2s ease-in-out",
            }}
          >
            <Plus size={26} strokeWidth={2.5} />
          </Fab>
        )}

        <BottomNavigation
          showLabels
          value={tab}
          onChange={(_, nextTab: Tab) => setTab(nextTab)}
          sx={{
            flexShrink: 0,
            minHeight: {
              xs: "calc(64px + env(safe-area-inset-bottom))",
              sm: 68,
            },
            px: { xs: 1, sm: 3 },
            pb: { xs: "env(safe-area-inset-bottom)", sm: 0 },
            borderTop: "1px solid #E2E8F0",
            bgcolor: "#FFFFFF",
            "& .MuiBottomNavigationAction-root": {
              minWidth: 0,
              py: 1,
              borderRadius: 3,
              mx: { xs: 0, sm: 0.5 },
              color: "#64748B",
              transition: "all 0.2s ease-in-out",
            },
            "& .Mui-selected": {
              color: "#4F46E5",
              bgcolor: "#EEF2FF",
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: 11,
              fontWeight: 700,
            },
          }}
        >
          {tabItems.map(({ id, label, icon: Icon }) => (
            <BottomNavigationAction
              key={id}
              value={id}
              label={label}
              icon={<Icon size={20} strokeWidth={tab === id ? 2.5 : 2} />}
            />
          ))}
        </BottomNavigation>
      </Paper>

      <Drawer
        anchor="bottom"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
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
              {sheetType === "task"
                ? "Nova tarefa"
                : sheetType === "event"
                  ? "Novo compromisso"
                  : "Convidar membro"}
            </Typography>
            <IconButton aria-label="Fechar" onClick={() => setSheetOpen(false)}>
              <X size={20} />
            </IconButton>
          </Stack>

          {sheetType !== "invite" && (
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={sheetType}
              onChange={(_, nextType: SheetType | null) =>
                nextType && setSheetType(nextType)
              }
            >
              <ToggleButton value="task">Tarefa</ToggleButton>
              <ToggleButton value="event">Compromisso</ToggleButton>
            </ToggleButtonGroup>
          )}

          {sheetType === "task" ? (
            <Stack spacing={2}>
              {actionError && (
                <Alert
                  severity="error"
                  sx={{ borderRadius: 3 }}
                  onClose={() => setActionError(null)}
                >
                  {actionError}
                </Alert>
              )}
              <TextField
                label="Nome da tarefa"
                value={newTaskName}
                onChange={(event) => setNewTaskName(event.target.value)}
                placeholder="Ex.: Passar roupa"
              />
              <Box>
                <FormLabel
                  component="legend"
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#475569",
                    mb: 0.5,
                  }}
                >
                  Frequência
                </FormLabel>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={newTaskFreq}
                  onChange={(_, frequency: TaskFrequency | null) =>
                    frequency && setNewTaskFreq(frequency)
                  }
                >
                  {frequencyOptions.map((frequency) => (
                    <ToggleButton key={frequency.id} value={frequency.id}>
                      {frequency.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
              {newTaskFreq === "WEEKLY" && (
                <Box>
                  <FormLabel
                    component="legend"
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#475569",
                      mb: 0.5,
                    }}
                  >
                    Dia da semana
                  </FormLabel>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    value={newTaskDayOfWeek}
                    onChange={(_, day: number | null) =>
                      day !== null && setNewTaskDayOfWeek(day)
                    }
                  >
                    {WEEKDAYS.map((day, index) => (
                      <ToggleButton
                        key={day}
                        value={index}
                        sx={{
                          fontSize: 12,
                        }}
                      >
                        {day[0]}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              )}
              {newTaskFreq === "MONTHLY" && (
                <TextField
                  label="Dia do mês"
                  type="number"
                  value={newTaskDayOfMonth}
                  onChange={(event) =>
                    setNewTaskDayOfMonth(Number(event.target.value))
                  }
                  slotProps={{ htmlInput: { min: 1, max: 31 } }}
                />
              )}
              <Box>
                <FormLabel
                  component="legend"
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#475569",
                    mb: 0.5,
                  }}
                >
                  Nível de Esforço
                </FormLabel>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={newTaskWeight}
                  onChange={(_, weight: 1 | 2 | 3 | null) =>
                    weight && setNewTaskWeight(weight)
                  }
                >
                  {[1, 2, 3].map((weight) => (
                    <ToggleButton key={weight} value={weight} sx={{ gap: 0.5 }}>
                      <Zap
                        size={14}
                        fill={newTaskWeight === weight ? "#4F46E5" : "none"}
                      />
                      Esforço {weight}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
              <Button
                variant="contained"
                size="large"
                onClick={addTask}
                disabled={
                  creatingTask || !newTaskName.trim() || members.length === 0
                }
                startIcon={
                  creatingTask ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : undefined
                }
                sx={{ py: 1.5, mt: 1 }}
              >
                {creatingTask ? "Adicionando..." : "Adicionar tarefa"}
              </Button>
            </Stack>
          ) : sheetType === "event" ? (
            <Stack spacing={2}>
              {actionError && (
                <Alert
                  severity="error"
                  sx={{ borderRadius: 3 }}
                  onClose={() => setActionError(null)}
                >
                  {actionError}
                </Alert>
              )}
              <TextField
                label="Título"
                value={newEventTitle}
                onChange={(event) => setNewEventTitle(event.target.value)}
                placeholder="Ex.: Consulta médica"
              />
              <Box>
                <FormLabel
                  component="legend"
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#475569",
                    mb: 0.5,
                  }}
                >
                  Dia
                </FormLabel>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={newEventDay}
                  onChange={(_, day: number | null) =>
                    day !== null && setNewEventDay(day)
                  }
                >
                  {WEEKDAYS.map((day, index) => (
                    <ToggleButton
                      key={day}
                      value={index}
                      sx={{
                        fontSize: 12,
                      }}
                    >
                      {day[0]}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
              <TextField
                label="Horário"
                type="time"
                value={newEventTime}
                onChange={(event) => setNewEventTime(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Box>
                <FormLabel
                  component="legend"
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#475569",
                    mb: 0.5,
                  }}
                >
                  Quem participa
                </FormLabel>
                <ToggleButtonGroup
                  value={newEventMembers}
                  onChange={(_, participantIds: string[]) =>
                    setNewEventMembers(participantIds)
                  }
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    "& .MuiToggleButtonGroup-grouped": {
                      border: "1px solid #E2E8F0",
                      borderRadius: "99px !important",
                      m: "0 !important",
                      px: 1.5,
                      py: 0.75,
                    },
                  }}
                >
                  {members.map((member) => (
                    <ToggleButton
                      key={member.id}
                      value={member.id}
                      sx={{ gap: 0.75 }}
                    >
                      <Avatar member={member} size={20} showBorder={false} />
                      {member.name}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
              <Button
                variant="contained"
                size="large"
                onClick={addEvent}
                disabled={
                  creatingEvent ||
                  !newEventTitle.trim() ||
                  !newEventTime.trim()
                }
                startIcon={
                  creatingEvent ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : undefined
                }
                sx={{ py: 1.5, mt: 1 }}
              >
                {creatingEvent ? "Adicionando..." : "Adicionar compromisso"}
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2}>
              {actionError && (
                <Alert
                  severity="error"
                  sx={{ borderRadius: 3 }}
                  onClose={() => setActionError(null)}
                >
                  {actionError}
                </Alert>
              )}
              <Box>
                <FormLabel
                  component="legend"
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#475569",
                    mb: 0.5,
                  }}
                >
                  Quem é a pessoa?
                </FormLabel>
                <ToggleButtonGroup
                  exclusive
                  value={inviteMemberId}
                  onChange={(_, id: string | null) =>
                    id && setInviteMemberId(id)
                  }
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    "& .MuiToggleButtonGroup-grouped": {
                      border: "1px solid #E2E8F0",
                      borderRadius: "99px !important",
                      m: "0 !important",
                      px: 1.5,
                      py: 0.75,
                    },
                  }}
                >
                  {members.map((member) => (
                    <ToggleButton
                      key={member.id}
                      value={member.id}
                      sx={{ gap: 0.75 }}
                    >
                      <Avatar member={member} size={20} showBorder={false} />
                      {member.name}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
              <TextField
                label="E-mail"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="nome@exemplo.com"
              />
              <Typography variant="caption" sx={{ color: "#64748B" }}>
                A pessoa receberá um e-mail com senha temporária para acesso.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim() || !inviteMemberId}
                startIcon={
                  inviting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : undefined
                }
                sx={{ py: 1.5, mt: 1 }}
              >
                {inviting ? "Enviando..." : "Enviar convite"}
              </Button>
            </Stack>
          )}
        </Stack>
      </Drawer>

      <Snackbar
        open={!!lastDecision}
        onClose={() => setLastDecision(null)}
        autoHideDuration={8000}
        message={lastDecision ? `"${lastDecision.name}" saiu do baralho` : ""}
        action={
          <Button
            color="secondary"
            size="small"
            disabled={undoing}
            onClick={handleUndo}
            sx={{ fontWeight: 800 }}
          >
            Desfazer
          </Button>
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      <Snackbar
        open={!!inviteSuccess}
        onClose={() => setInviteSuccess(null)}
        autoHideDuration={5000}
        message={inviteSuccess ?? ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
