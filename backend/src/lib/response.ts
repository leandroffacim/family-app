type Json = Record<string, unknown>;

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export const ok = (body: Json, statusCode = 200) => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});

export const err = (statusCode: number, message: string) => ({
  statusCode,
  headers,
  body: JSON.stringify({ error: message }),
});
