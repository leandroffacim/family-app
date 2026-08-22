export const familyPK = (familyId: string) => `FAMILY#${familyId}`;
export const metadataSK = () => "METADATA";
export const memberSK = (memberId: string) => `MEMBER#${memberId}`;
export const taskSK = (taskId: string) => `TASK#${taskId}`;
export const instanceSK = (date: string, taskId: string) => `INSTANCE#${date}#${taskId}`;
export const eventSK = (date: string, eventId: string) => `EVENT#${date}#${eventId}`;

// GSI1: consulta "tarefas de um membro por data" sem scan
export const gsi1pkMember = (familyId: string, memberId: string) =>
  `FAMILY#${familyId}#MEMBER#${memberId}`;
