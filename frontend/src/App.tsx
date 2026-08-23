import { useEffect, useMemo, useState } from "react";
import { Sun, ListChecks, Users, Plus, X, CalendarDays } from "lucide-react";
import { api } from "./api/client";
import { Member, Task, TaskInstance, FamilyEvent, TaskFrequency } from "./types";
import { currentWeekDates, WEEKDAYS, todayISO, displayIndexToApiWeekday } from "./lib/date";
import { Avatar } from "./components/Avatar";
import { Wheel } from "./components/Wheel";
import { TaskCardDeck } from "./components/TaskCardDeck";
import { EventCard } from "./components/EventCard";
import { TaskDefinitionRow } from "./components/TaskDefinitionRow";

type Tab = "hoje" | "tarefas" | "agenda" | "familia";
type SheetType = "task" | "event";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deckQueue, setDeckQueue] = useState<TaskInstance[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);

  const [tab, setTab] = useState<Tab>("hoje");
  const weekDates = useMemo(() => currentWeekDates(), []);
  const [selectedDay, setSelectedDay] = useState(() => {
    const idx = weekDates.indexOf(todayISO());
    return idx === -1 ? 0 : idx;
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
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members]
  );

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [membersRes, tasksRes, deckRes, eventsRes] = await Promise.all([
        api.listMembers(),
        api.listTasks(),
        api.getDeck(),
        api.listEvents(),
      ]);
      setMembers(membersRes.items);
      setTasks(tasksRes.items);
      setDeckQueue(deckRes.items);
      setEvents(eventsRes.items);
      setNewEventMembers(membersRes.items.map((m) => m.id));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeckDecide = async (taskId: string, action: "done" | "pass" | "defer") => {
    setActionError(null);
    try {
      await api.decide(taskId, action);
      setDeckQueue((q) => q.filter((i) => i.taskId !== taskId));
      if (action === "pass") {
        const { items } = await api.listTasks();
        setTasks(items);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Não foi possível registrar a decisão");
    }
  };

  const addTask = async () => {
    if (!newTaskName.trim() || members.length === 0) return;
    try {
      await api.createTask({
        name: newTaskName.trim(),
        freq: newTaskFreq,
        weight: newTaskWeight,
        rotationOrder: members.map((m) => m.id),
        dayOfWeek: newTaskFreq === "WEEKLY" ? displayIndexToApiWeekday(newTaskDayOfWeek) : undefined,
        dayOfMonth: newTaskFreq === "MONTHLY" ? newTaskDayOfMonth : undefined,
      });
      const { items } = await api.listTasks();
      setTasks(items);
      setNewTaskName("");
      setNewTaskFreq("DAILY");
      setNewTaskWeight(1);
      setSheetOpen(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Não foi possível criar a tarefa");
    }
  };

  const toggleEventMember = (id: string) =>
    setNewEventMembers((ms) => (ms.includes(id) ? ms.filter((x) => x !== id) : [...ms, id]));

  const addEvent = async () => {
    if (!newEventTitle.trim() || !newEventTime.trim()) return;
    try {
      await api.createEvent({
        date: weekDates[newEventDay],
        time: newEventTime.trim(),
        title: newEventTitle.trim(),
        members: newEventMembers.length ? newEventMembers : [members[0]?.id].filter(Boolean) as string[],
      });
      const { items } = await api.listEvents();
      setEvents(items);
      setNewEventTitle("");
      setNewEventTime("");
      setSheetOpen(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Não foi possível criar o compromisso");
    }
  };

  const openSheet = () => {
    setSheetType(tab === "agenda" ? "event" : "task");
    setNewEventDay(selectedDay);
    setSheetOpen(true);
  };

  const dayEvents = events
    .filter((e) => e.date === weekDates[selectedDay])
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcomingEvents = events
    .filter((e) => e.date !== weekDates[selectedDay])
    .sort((a, b) => a.date.localeCompare(b.date));

  const featuredTask = tasks.find((t) => t.rotationOrder.length > 1) ?? tasks[0];

  return (
    <div className="family-page" style={{ minHeight: "100dvh", background: "#12211A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        :root { color: #22281F; background: #12211A; font-synthesis: none; }
        html, body, #root { width: 100%; min-width: 0; min-height: 100%; margin: 0; }
        body { min-height: 100dvh; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        button, input { -webkit-tap-highlight-color: transparent; }
        button { touch-action: manipulation; }

        .family-app {
          width: min(1180px, 100%);
          height: min(900px, calc(100dvh - 48px));
          background: #F2EFE3;
          border-radius: 28px;
          border: 1px solid rgba(231, 226, 210, 0.22);
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.32);
        }
        .family-header {
          position: relative;
          overflow: hidden;
          padding: 22px 32px 24px !important;
          background: linear-gradient(118deg, #183229 0%, #1E3A32 56%, #285143 100%) !important;
          box-shadow: inset 0 -1px rgba(255,255,255,0.12);
        }
        .family-header::after {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          right: -85px;
          top: -190px;
          border: 1px solid rgba(242,239,227,0.22);
          border-radius: 50%;
          box-shadow: 0 0 0 34px rgba(242,239,227,0.045), 0 0 0 68px rgba(242,239,227,0.035);
        }
        .family-header > * { position: relative; z-index: 1; }
        .family-eyebrow { opacity: 0.86; }
        .family-title { font-size: 28px !important; letter-spacing: -0.6px; }
        .family-content {
          width: min(100%, 920px);
          align-self: center;
          padding: 24px 28px 28px !important;
          scroll-behavior: smooth;
        }
        .family-nav { padding: 0 22px; }
        .family-nav button {
          flex-direction: row !important;
          justify-content: center;
          gap: 7px !important;
          padding: 14px 10px !important;
          margin: 7px 3px;
          border-radius: 12px !important;
          transition: background 160ms ease, color 160ms ease, transform 160ms ease;
        }
        .family-nav button:hover { background: rgba(30,58,50,0.06) !important; }
        .family-nav button:active { transform: scale(0.96); }
        .family-nav-item.is-active {
          background: rgba(30,58,50,0.1) !important;
          box-shadow: inset 0 -2px #1E3A32;
        }
        .family-fab {
          right: max(28px, calc((100% - 920px) / 2 + 12px)) !important;
          bottom: 76px !important;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }
        .family-fab:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(217,164,65,0.48) !important; }
        .family-sheet {
          max-width: 720px;
          margin: 0 auto;
          border-radius: 22px 22px 0 0 !important;
          box-shadow: 0 -14px 42px rgba(18,33,26,0.2);
        }
        button:focus-visible, input:focus-visible {
          outline: 3px solid rgba(217,164,65,0.55);
          outline-offset: 2px;
        }

        @media (max-width: 640px) {
          .family-page {
            padding: 0 !important;
            align-items: stretch !important;
            background: #F2EFE3 !important;
          }
          .family-app {
            width: 100% !important;
            height: 100dvh !important;
            min-height: 100dvh !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .family-header {
            padding: calc(16px + env(safe-area-inset-top)) 20px 18px !important;
          }
          .family-header::after { right: -134px; top: -204px; }
          .family-title { font-size: 23px !important; }
          .family-content {
            width: 100%;
            padding: 16px 16px 20px !important;
          }
          .family-nav { padding: 0 4px env(safe-area-inset-bottom) !important; }
          .family-nav button {
            flex-direction: column !important;
            gap: 3px !important;
            padding: 10px 0 11px !important;
            margin: 3px 0;
            border-radius: 10px !important;
          }
          .family-fab {
            right: 18px !important;
            bottom: calc(72px + env(safe-area-inset-bottom)) !important;
          }
          .family-sheet { max-height: min(88dvh, 760px) !important; padding: 20px 20px calc(20px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>

      <div className="family-app" style={{ width: "min(1180px, 100%)", height: "min(900px, calc(100dvh - 48px))", background: "#F2EFE3", borderRadius: 28, border: "1px solid rgba(231, 226, 210, 0.22)", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative", boxShadow: "0 30px 70px rgba(0,0,0,0.32)" }}>
        <div className="family-header" style={{ background: "#1E3A32", padding: "22px 32px 24px", flexShrink: 0 }}>
          <div className="family-eyebrow" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#B7C4BC", letterSpacing: 1 }}>
            SISTEMA FAMILIAR
          </div>
          <div className="family-title" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: "#F2EFE3", marginTop: 2 }}>
            {tab === "hoje" && "Baralho de hoje"}
            {tab === "tarefas" && "Tarefas"}
            {tab === "agenda" && "Agenda"}
            {tab === "familia" && "Família"}
          </div>
        </div>

        <div className="family-content" style={{ flex: 1, overflowY: "auto", padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 40, fontFamily: "'IBM Plex Sans', sans-serif", color: "#8A8571", fontSize: 13 }}>
              Carregando…
            </div>
          )}

          {!loading && loadError && (
            <div style={{ textAlign: "center", padding: 24, background: "#FFFFFF", border: "1px solid #E7E2D2", borderRadius: 12 }}>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#A83E3E", marginBottom: 10 }}>
                {loadError}
              </div>
              <button onClick={loadAll} style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, fontWeight: 600, color: "#1E3A32", background: "none", border: "1.5px solid #1E3A32", borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}>
                Tentar de novo
              </button>
            </div>
          )}

          {!loading && !loadError && (
            <>
              {actionError && (
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11.5, color: "#A83E3E", background: "rgba(168,62,62,0.08)", borderRadius: 8, padding: "6px 10px" }}>
                  {actionError}
                </div>
              )}

              {tab === "hoje" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#22281F" }}>
                      Baralho de hoje
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#8A8571" }}>
                      {deckQueue.length} restantes
                    </span>
                  </div>
                  <TaskCardDeck queue={deckQueue} membersById={membersById} onDecide={handleDeckDecide} />
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11.5, color: "#8A8571", textAlign: "center", padding: "0 10px" }}>
                    Arraste a carta: direita = feito, esquerda = passa pra outro, cima = adia
                  </div>
                </>
              )}

              {tab === "tarefas" && (
                <>
                  {(["DAILY", "WEEKLY", "MONTHLY"] as TaskFrequency[]).map((freq) => {
                    const list = tasks.filter((t) => t.freq === freq);
                    if (list.length === 0) return null;
                    return (
                      <div key={freq}>
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13.5, color: "#22281F", marginBottom: 8 }}>
                          {freq === "DAILY" ? "Diária" : freq === "WEEKLY" ? "Semanal" : "Mensal"}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {list.map((t) => (
                            <TaskDefinitionRow key={t.id} task={t} membersById={membersById} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {tasks.length === 0 && (
                    <div style={{ textAlign: "center", padding: 30, color: "#8A8571", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}>
                      Nenhuma tarefa cadastrada ainda. Toque em "+" pra criar a primeira.
                    </div>
                  )}
                </>
              )}

              {tab === "agenda" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
                    {WEEKDAYS.map((d, i) => (
                      <button key={d} onClick={() => setSelectedDay(i)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0", borderRadius: 10, border: "none", background: selectedDay === i ? "#1E3A32" : "#FFFFFF", cursor: "pointer" }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: selectedDay === i ? "#B7C4BC" : "#8A8571" }}>{d}</span>
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: selectedDay === i ? "#F2EFE3" : "#22281F" }}>
                          {Number(weekDates[i].slice(8, 10))}
                        </span>
                        {events.some((e) => e.date === weekDates[i]) && (
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: selectedDay === i ? "#D9A441" : "#A83E3E" }} />
                        )}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dayEvents.length === 0 && (
                      <div style={{ textAlign: "center", padding: "30px 10px", color: "#8A8571", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}>
                        Nada agendado para este dia.
                        <br />
                        Toque em "+" pra adicionar um compromisso.
                      </div>
                    )}
                    {dayEvents.map((ev) => (
                      <EventCard key={ev.id} ev={ev} membersById={membersById} />
                    ))}
                  </div>

                  {upcomingEvents.length > 0 && (
                    <div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13.5, color: "#22281F", marginBottom: 8 }}>
                        Próximos compromissos
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {upcomingEvents.map((ev) => (
                          <EventCard key={ev.id} ev={ev} membersById={membersById} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === "familia" && (
                <>
                  {featuredTask && (
                    <div style={{ background: "#FFFFFF", border: "1px solid #E7E2D2", borderRadius: 16, padding: "16px 12px", display: "flex", justifyContent: "center" }}>
                      <Wheel task={featuredTask} members={members} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13.5, color: "#22281F", marginBottom: 8 }}>
                      Membros
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {members.map((m) => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", border: "1px solid #E7E2D2", borderRadius: 12, padding: "10px 12px" }}>
                          <Avatar member={m} size={34} />
                          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "#22281F" }}>
                            {m.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {!loading && !loadError && (
          <button className="family-fab" onClick={openSheet} style={{ position: "absolute", right: 28, bottom: 76, width: 48, height: 48, borderRadius: "50%", background: "#D9A441", border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(217,164,65,0.5)", cursor: "pointer" }}>
            <Plus size={22} color="#1E3A32" strokeWidth={2.5} />
          </button>
        )}

        <div className="family-nav" style={{ display: "flex", borderTop: "1px solid #E7E2D2", background: "#FFFFFF", flexShrink: 0, padding: "0 22px" }}>
          {[
            { id: "hoje" as const, label: "Hoje", icon: Sun },
            { id: "tarefas" as const, label: "Tarefas", icon: ListChecks },
            { id: "agenda" as const, label: "Agenda", icon: CalendarDays },
            { id: "familia" as const, label: "Família", icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} className={`family-nav-item${tab === id ? " is-active" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 0 14px", background: "transparent", border: "none", cursor: "pointer", color: tab === id ? "#1E3A32" : "#A6A08D" }}>
              <Icon size={19} strokeWidth={tab === id ? 2.4 : 2} />
              <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10.5, fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>

        {sheetOpen && (
          <div className="family-sheet-overlay" style={{ position: "absolute", inset: 0, background: "rgba(18,33,26,0.55)", display: "flex", alignItems: "flex-end" }}>
            <div className="family-sheet" style={{ background: "#F2EFE3", width: "100%", borderRadius: "22px 22px 0 0", padding: 20, maxHeight: "90%", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#22281F" }}>
                  {sheetType === "task" ? "Nova tarefa" : "Novo compromisso"}
                </span>
                <button onClick={() => setSheetOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X size={20} color="#22281F" />
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[{ id: "task" as const, label: "Tarefa" }, { id: "event" as const, label: "Compromisso" }].map((s) => (
                  <button key={s.id} onClick={() => setSheetType(s.id)} style={{ flex: 1, padding: "7px 0", borderRadius: 999, border: `1.5px solid ${sheetType === s.id ? "#1E3A32" : "#D8D2BE"}`, background: sheetType === s.id ? "#1E3A32" : "transparent", color: sheetType === s.id ? "#F2EFE3" : "#6B7268", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {sheetType === "task" ? (
                <>
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7268", marginBottom: 6 }}>Nome da tarefa</div>
                  <input value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="Ex: Passar roupa" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #D8D2BE", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, marginBottom: 14, background: "#FFFFFF" }} />

                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7268", marginBottom: 6 }}>Frequência</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    {([{ id: "DAILY", label: "Diária" }, { id: "WEEKLY", label: "Semanal" }, { id: "MONTHLY", label: "Mensal" }] as { id: TaskFrequency; label: string }[]).map((f) => (
                      <button key={f.id} onClick={() => setNewTaskFreq(f.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 999, border: `1.5px solid ${newTaskFreq === f.id ? "#1E3A32" : "#D8D2BE"}`, background: newTaskFreq === f.id ? "#1E3A32" : "transparent", color: newTaskFreq === f.id ? "#F2EFE3" : "#6B7268", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {newTaskFreq === "WEEKLY" && (
                    <>
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7268", marginBottom: 6 }}>Dia da semana</div>
                      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                        {WEEKDAYS.map((d, i) => (
                          <button key={d} onClick={() => setNewTaskDayOfWeek(i)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1.5px solid ${newTaskDayOfWeek === i ? "#1E3A32" : "#D8D2BE"}`, background: newTaskDayOfWeek === i ? "#1E3A32" : "transparent", color: newTaskDayOfWeek === i ? "#F2EFE3" : "#6B7268", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, cursor: "pointer" }}>
                            {d[0]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {newTaskFreq === "MONTHLY" && (
                    <>
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7268", marginBottom: 6 }}>Dia do mês</div>
                      <input type="number" min={1} max={31} value={newTaskDayOfMonth} onChange={(e) => setNewTaskDayOfMonth(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #D8D2BE", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, marginBottom: 14, background: "#FFFFFF" }} />
                    </>
                  )}

                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7268", marginBottom: 6 }}>Peso / esforço</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {[1, 2, 3].map((w) => (
                      <button key={w} onClick={() => setNewTaskWeight(w as 1 | 2 | 3)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${newTaskWeight === w ? "#D9A441" : "#D8D2BE"}`, background: newTaskWeight === w ? "rgba(217,164,65,0.18)" : "transparent", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#22281F", cursor: "pointer" }}>
                        {"●".repeat(w)}
                        {"○".repeat(3 - w)}
                      </button>
                    ))}
                  </div>

                  <button onClick={addTask} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: "#1E3A32", color: "#F2EFE3", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    Adicionar tarefa
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7268", marginBottom: 6 }}>Título</div>
                  <input value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="Ex: Consulta médica" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #D8D2BE", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, marginBottom: 14, background: "#FFFFFF" }} />

                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7268", marginBottom: 6 }}>Dia</div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                    {WEEKDAYS.map((d, i) => (
                      <button key={d} onClick={() => setNewEventDay(i)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1.5px solid ${newEventDay === i ? "#1E3A32" : "#D8D2BE"}`, background: newEventDay === i ? "#1E3A32" : "transparent", color: newEventDay === i ? "#F2EFE3" : "#6B7268", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, cursor: "pointer" }}>
                        {d[0]}
                      </button>
                    ))}
                  </div>

                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7268", marginBottom: 6 }}>Horário (HH:mm)</div>
                  <input value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} placeholder="Ex: 19:00" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #D8D2BE", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, marginBottom: 14, background: "#FFFFFF" }} />

                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7268", marginBottom: 6 }}>Quem participa</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                    {members.map((m) => (
                      <button key={m.id} onClick={() => toggleEventMember(m.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, border: `1.5px solid ${newEventMembers.includes(m.id) ? "#D9A441" : "#D8D2BE"}`, background: newEventMembers.includes(m.id) ? "rgba(217,164,65,0.18)" : "transparent", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#22281F", cursor: "pointer" }}>
                        <Avatar member={m} size={18} />
                        {m.name}
                      </button>
                    ))}
                  </div>

                  <button onClick={addEvent} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: "#1E3A32", color: "#F2EFE3", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    Adicionar compromisso
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
