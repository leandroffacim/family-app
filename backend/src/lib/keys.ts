export const familyPK = (familyId: string) => `FAMILY#${familyId}`;
export const metadataSK = () => "METADATA";
export const memberSK = (memberId: string) => `MEMBER#${memberId}`;
export const taskSK = (taskId: string) => `TASK#${taskId}`;
export const instanceSK = (date: string, taskId: string) => `INSTANCE#${date}#${taskId}`;
export const eventSK = (date: string, eventId: string) => `EVENT#${date}#${eventId}`;

// GSI1: consulta "tarefas de um membro por data" sem scan
export const gsi1pkMember = (familyId: string, memberId: string) =>
  `FAMILY#${familyId}#MEMBER#${memberId}`;

// GSI2: valor de partição fixo, usado só na linha METADATA de cada
// família, pra listar todas as famílias com um Query em vez de Scan
// (ver generateDailyDeck.ts).
export const GSI2PK_FAMILIES = "FAMILIES";
