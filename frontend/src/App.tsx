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
  Typography,
} from "@mui/material";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  ListChecks,
  Plus,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api/client";
import { useAuth } from "./auth/AuthContext";
import { Avatar } from "./components/Avatar";
import { EventCard } from "./components/EventCard";
import { LoginScreen } from "./components/LoginScreen";
import { SetPasswordScreen } from "./components/SetPasswordScreen";
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
type SheetType = "task" | "event";

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
  const [loading, setLoading] = useState(true);
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
  const [weekAnchor, setWeekAnchor] = useState(todayISO);
  const weekDates = useMemo(() => weekDatesFor(weekAnchor), [weekAnchor]);
  const [selectedDay, setSelectedDay] = useState(() => {
    const index = weekDates.indexOf(todayISO());
    return index === -1 ? 0 : index;
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType>("task");
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskFreq, setNewTaskFreq] = useState<TaskFrequency>("DAILY");
  const [newTaskWeight, setNewTaskWeight] = useState<1 | 2 | 3>(1);
  const [newTaskDayOfWeek, setNewTaskDayOfWeek] = useState(0);
  const [newTaskDayOfMonth, setNewTaskDayOfMonth] = useState(1);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDay, setNewEventDay] = useState(selectedDay);
  const [newEventMembers, setNewEventMembers] = useState<string[]>([]);

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
      const [membersRes, tasksRes, deckRes, eventsRes, familyRes] = await Promise.all([
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

  useEffect(() => {
    if (status === "authenticated") loadAll();
  }, [status]);

  const handleDeckDecide = async (
    taskId: string,
    action: "done" | "pass" | "defer",
  ) => {
    setActionError(null);
    const decided = deckQueue.find((item) => item.taskId === taskId);
    try {
      await api.decide(taskId, action);
      setDeckQueue((queue) => queue.filter((item) => item.taskId !== taskId));
      if (action === "pass") setTasks((await api.listTasks()).items);
      // guarda a última decisão pra permitir "Desfazer" na hora, sem
      // precisar esperar o baralho de amanhã recriar a tarefa
      setLastDecision(decided ? { taskId, name: decided.name } : null);
    } catch (error) {
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
    try {
      await api.createTask({
        name: newTaskName.trim(),
        freq: newTaskFreq,
        weight: newTaskWeight,
        rotationOrder: members.map((member) => member.id),
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
    }
  };

  const addEvent = async () => {
    if (!newEventTitle.trim() || !newEventTime.trim()) return;
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
    }
  };

  const openSheet = () => {
    setSheetType(tab === "agenda" ? "event" : "task");
    setNewEventDay(selectedDay);
    setSheetOpen(true);
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
    return <LoginScreen />;
  }

  if (status === "newPasswordRequired") {
    return <SetPasswordScreen />;
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 0, sm: 3 },
        bgcolor: { xs: "background.default", sm: "#f2efe3" },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "min(1180px, 100%)",
          height: { xs: "100dvh", sm: "min(900px, calc(100dvh - 48px))" },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: { xs: 0, sm: 7 },
          border: { xs: 0, sm: "1px solid rgba(231, 226, 210, 0.22)" },
          boxShadow: { xs: "none", sm: "0 30px 70px rgba(0, 0, 0, 0.32)" },
          backgroundColor: "background.default",
        }}
      >
        <AppBar
          position="static"
          elevation={0}
          sx={{
            flexShrink: 0,
            overflow: "hidden",
            backgroundColor: "background.main",
            boxShadow: "inset 0 -1px rgba(255,255,255,0.12)",
          }}
        >
          <Box
            sx={{
              position: "relative",
              px: { xs: 2.5, sm: 4 },
              pt: { xs: "calc(16px + env(safe-area-inset-top))", sm: 2.75 },
              pb: { xs: 2.25, sm: 3 },
              "&::after": {
                content: '""',
                position: "absolute",
                width: 260,
                height: 260,
                right: -85,
                top: -190,
                border: "1px solid rgba(242,239,227,0.22)",
                borderRadius: "50%",
                boxShadow:
                  "0 0 0 34px rgba(242,239,227,0.045), 0 0 0 68px rgba(242,239,227,0.035)",
              },
            }}
          >
            <Typography
              variant="overline"
              sx={{
                position: "relative",
                zIndex: 1,
                color: "#B7C4BC",
                opacity: 0.9,
                fontSize: 11,
                letterSpacing: 1,
              }}
            >
              SISTEMA FAMILIAR
            </Typography>
            <Typography
              variant="h5"
              sx={{
                position: "relative",
                zIndex: 1,
                mt: -0.5,
                color: "#F2EFE3",
                fontSize: { xs: 23, sm: 28 },
                letterSpacing: -0.6,
              }}
            >
              {tab === "hoje" && "Hoje em casa"}
              {tab === "tarefas" && "Tarefas"}
              {tab === "agenda" && "Agenda"}
              {tab === "familia" && "Família"}
            </Typography>
          </Box>
        </AppBar>

        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: "min(100%, 920px)",
            alignSelf: "center",
            p: { xs: 2, sm: "24px 28px 28px" },
          }}
        >
          {loading && (
            <Stack
              spacing={1.5}
              sx={{
                flex: 1,
                color: "text.secondary",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={28} color="primary" />
              <Typography variant="body2">Carregando…</Typography>
            </Stack>
          )}
          {!loading && loadError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={loadAll}>
                  Tentar de novo
                </Button>
              }
            >
              {loadError}
            </Alert>
          )}
          {!loading && !loadError && (
            <>
              {actionError && (
                <Alert severity="error" onClose={() => setActionError(null)}>
                  {actionError}
                </Alert>
              )}
              {tab === "hoje" && (
                <>
                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Hoje em casa
                      </Typography>
                      {!!family && family.streak > 0 && (
                        <Chip
                          size="small"
                          icon={<Flame size={14} />}
                          label={`${family.streak} ${family.streak === 1 ? "dia" : "dias"}`}
                          sx={{
                            bgcolor: "secondary.main",
                            color: "secondary.contrastText",
                            fontWeight: 700,
                            "& .MuiChip-icon": { color: "inherit" },
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {deckQueue.length} restantes
                    </Typography>
                  </Stack>
                  <TaskCardDeck
                    queue={deckQueue}
                    membersById={membersById}
                    onDecide={handleDeckDecide}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    align="center"
                    sx={{ px: 1.25 }}
                  >
                    Arraste a carta: direita = feito, esquerda = passa pra
                    outro, cima = adia
                  </Typography>
                </>
              )}

              {tab === "tarefas" && (
                <Stack spacing={2}>
                  {(["DAILY", "WEEKLY", "MONTHLY"] as TaskFrequency[]).map(
                    (frequency) => {
                      const list = tasks.filter(
                        (task) => task.freq === frequency,
                      );
                      if (list.length === 0) return null;
                      return (
                        <Stack key={frequency} spacing={1}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700 }}
                          >
                            {frequency === "DAILY"
                              ? "Diária"
                              : frequency === "WEEKLY"
                                ? "Semanal"
                                : "Mensal"}
                          </Typography>
                          {list.map((task) => (
                            <TaskDefinitionRow
                              key={task.id}
                              task={task}
                              membersById={membersById}
                            />
                          ))}
                        </Stack>
                      );
                    },
                  )}
                  {tasks.length === 0 && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                      sx={{ py: 4 }}
                    >
                      Nenhuma tarefa cadastrada ainda. Toque em “+” para criar a
                      primeira.
                    </Typography>
                  )}
                </Stack>
              )}

              {tab === "agenda" && (
                <Stack spacing={2}>
                  <Paper
                    variant="outlined"
                    sx={{ p: { xs: 1.25, sm: 1.5, borderRadius: 8 } }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mb: 1.5, alignItems: "center" }}
                    >
                      <IconButton
                        aria-label="Semana anterior"
                        onClick={() => changeWeek(-1)}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: "#FDFCF8",
                        }}
                      >
                        <ChevronLeft size={19} strokeWidth={2.3} />
                      </IconButton>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="overline"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            fontSize: 10,
                            lineHeight: 1.1,
                            letterSpacing: 0.7,
                          }}
                        >
                          SELECIONE UMA DATA
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          noWrap
                          sx={{ mt: 0.25 }}
                        >
                          {formatDate(weekDates[0])} —{" "}
                          {formatDate(weekDates[6])}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => selectAgendaDate(todayISO())}
                        sx={{ display: { xs: "none", sm: "inline-flex" } }}
                      >
                        Hoje
                      </Button>
                      <IconButton
                        component="label"
                        aria-label="Escolher outra data"
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: "#FDFCF8",
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
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: "#FDFCF8",
                        }}
                      >
                        <ChevronRight size={19} strokeWidth={2.3} />
                      </IconButton>
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ overflowX: "auto", pb: 0.5 }}
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
                            variant={isSelected ? "contained" : "outlined"}
                            color="primary"
                            onClick={() => setSelectedDay(index)}
                            aria-pressed={isSelected}
                            sx={{
                              flex: "1 0 62px",
                              minWidth: 62,
                              minHeight: 76,
                              p: 1,
                              display: "flex",
                              flexDirection: "column",
                              lineHeight: 1,
                              bgcolor: isSelected ? "primary.main" : "#FDFCF8",
                              borderColor: isSelected
                                ? "primary.main"
                                : "divider",
                              "&:hover": {
                                bgcolor: isSelected
                                  ? "primary.dark"
                                  : "#FDFCF8",
                                borderColor: isSelected
                                  ? "primary.dark"
                                  : "#6B8F71",
                              },
                            }}
                          >
                            <Typography
                              component="span"
                              sx={{
                                fontSize: 10,
                                opacity: 0.72,
                                letterSpacing: 0.4,
                              }}
                            >
                              {day}
                            </Typography>
                            <Typography
                              component="span"
                              sx={{
                                mt: 0.5,
                                fontSize: 20,
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
                                  width: 5,
                                  height: 5,
                                  mt: 0.75,
                                  borderRadius: "50%",
                                  bgcolor: isSelected
                                    ? "secondary.main"
                                    : "error.main",
                                }}
                              />
                            )}
                          </Button>
                        );
                      })}
                    </Stack>
                  </Paper>
                  <Stack spacing={1}>
                    {dayEvents.length === 0 && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                        sx={{ py: 3.75 }}
                      >
                        Nada agendado para este dia.
                        <br />
                        Toque em “+” para adicionar um compromisso.
                      </Typography>
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
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
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
                <Stack spacing={2}>
                  {featuredTask && (
                    <Paper
                      variant="outlined"
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        p: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Wheel task={featuredTask} members={members} />
                    </Paper>
                  )}
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Membros
                    </Typography>
                    {members.map((member) => (
                      <Paper
                        key={member.id}
                        variant="outlined"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          p: "10px 12px",
                          borderRadius: 3,
                        }}
                      >
                        <Avatar member={member} size={34} />
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                          {member.name}
                          {member.id === memberId && (
                            <Typography
                              component="span"
                              sx={{
                                fontWeight: 500,
                                fontSize: 12.5,
                                color: "text.secondary",
                              }}
                            >
                              {" "}
                              (você)
                            </Typography>
                          )}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={logout}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Sair
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Box>

        {!loading && !loadError && (
          <Fab
            color="default"
            aria-label={
              tab === "agenda" ? "Adicionar compromisso" : "Adicionar tarefa"
            }
            onClick={openSheet}
            sx={{
              position: "absolute",
              right: {
                xs: 8,
                sm: "max(28px, calc((100% - 920px) / 2 + 12px))",
              },
              bottom: {
                xs: "calc(72px + env(safe-area-inset-bottom))",
                sm: 9.5,
              },
              boxShadow: "0 6px 16px rgba(217,164,65,0.5)",
              "&:hover": { boxShadow: "0 10px 22px rgba(217,164,65,0.48)" },
            }}
          >
            <Plus size={22} strokeWidth={2.5} className="" />
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
              sm: 70,
            },
            px: { xs: 0.5, sm: 2.75 },
            pb: { xs: "env(safe-area-inset-bottom)", sm: 0 },
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            "& .MuiBottomNavigationAction-root": {
              minWidth: 0,
              py: 1,
              borderRadius: 3,
              mx: { xs: 0, sm: 0.4 },
            },
            "& .Mui-selected": { bgcolor: "rgba(30,58,50,0.1)" },
            "& .MuiBottomNavigationAction-label": {
              fontSize: 10.5,
              fontWeight: 600,
            },
          }}
        >
          {tabItems.map(({ id, label, icon: Icon }) => (
            <BottomNavigationAction
              key={id}
              value={id}
              label={label}
              icon={<Icon size={19} strokeWidth={tab === id ? 2.4 : 2} />}
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
              width: "min(720px, 100%)",
              mx: "auto",
              borderRadius: "22px 22px 0 0",
              p: {
                xs: "20px 20px calc(20px + env(safe-area-inset-bottom))",
                sm: 2.5,
              },
              bgcolor: "background.default",
              boxShadow: "0 -14px 42px rgba(18,33,26,0.2)",
            },
          },
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Typography variant="h6" sx={{ fontSize: 18 }}>
              {sheetType === "task" ? "Nova tarefa" : "Novo compromisso"}
            </Typography>
            <IconButton aria-label="Fechar" onClick={() => setSheetOpen(false)}>
              <X size={20} />
            </IconButton>
          </Stack>
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

          {sheetType === "task" ? (
            <Stack spacing={2}>
              <TextField
                label="Nome da tarefa"
                value={newTaskName}
                onChange={(event) => setNewTaskName(event.target.value)}
                placeholder="Ex.: Passar roupa"
              />
              <Box>
                <FormLabel component="legend">Frequência</FormLabel>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={newTaskFreq}
                  onChange={(_, frequency: TaskFrequency | null) =>
                    frequency && setNewTaskFreq(frequency)
                  }
                  sx={{ mt: 0.75 }}
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
                  <FormLabel component="legend">Dia da semana</FormLabel>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    value={newTaskDayOfWeek}
                    onChange={(_, day: number | null) =>
                      day !== null && setNewTaskDayOfWeek(day)
                    }
                    sx={{ mt: 0.75 }}
                  >
                    {WEEKDAYS.map((day, index) => (
                      <ToggleButton
                        key={day}
                        value={index}
                        sx={{
                          fontSize: 11,
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
                <FormLabel component="legend">Peso / esforço</FormLabel>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={newTaskWeight}
                  onChange={(_, weight: 1 | 2 | 3 | null) =>
                    weight && setNewTaskWeight(weight)
                  }
                  sx={{ mt: 0.75 }}
                >
                  {[1, 2, 3].map((weight) => (
                    <ToggleButton
                      key={weight}
                      value={weight}
                      sx={{
                        "&.Mui-selected": {
                          bgcolor: "rgba(217,164,65,0.18)",
                          borderColor: "secondary.main",
                          "&:hover": { bgcolor: "rgba(217,164,65,0.26)" },
                        },
                      }}
                    >
                      {"●".repeat(weight)}
                      {"○".repeat(3 - weight)}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
              <Button
                variant="contained"
                size="large"
                onClick={addTask}
                disabled={!newTaskName.trim() || members.length === 0}
              >
                Adicionar tarefa
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <TextField
                label="Título"
                value={newEventTitle}
                onChange={(event) => setNewEventTitle(event.target.value)}
                placeholder="Ex.: Consulta médica"
              />
              <Box>
                <FormLabel component="legend">Dia</FormLabel>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={newEventDay}
                  onChange={(_, day: number | null) =>
                    day !== null && setNewEventDay(day)
                  }
                  sx={{ mt: 0.75 }}
                >
                  {WEEKDAYS.map((day, index) => (
                    <ToggleButton
                      key={day}
                      value={index}
                      sx={{
                        fontSize: 11,
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
                <FormLabel component="legend">Quem participa</FormLabel>
                <ToggleButtonGroup
                  value={newEventMembers}
                  onChange={(_, participantIds: string[]) =>
                    setNewEventMembers(participantIds)
                  }
                  sx={{
                    mt: 0.75,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    "& .MuiToggleButtonGroup-grouped": {
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "999px !important",
                      m: "0 !important",
                      px: 1.25,
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
                      <Avatar member={member} size={20} />
                      {member.name}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
              <Button
                variant="contained"
                size="large"
                onClick={addEvent}
                disabled={!newEventTitle.trim() || !newEventTime.trim()}
              >
                Adicionar compromisso
              </Button>
            </Stack>
          )}
        </Stack>
      </Drawer>

      <Snackbar
        open={!!lastDecision}
        onClose={() => setLastDecision(null)}
        autoHideDuration={8000}
        message={
          lastDecision ? `"${lastDecision.name}" saiu do baralho` : ""
        }
        action={
          <Button
            color="inherit"
            size="small"
            disabled={undoing}
            onClick={handleUndo}
          >
            Desfazer
          </Button>
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
