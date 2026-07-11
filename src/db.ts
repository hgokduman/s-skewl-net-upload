type HranaValue =
  | { type: "null" }
  | { type: "integer"; value: string }
  | { type: "float"; value: number }
  | { type: "text"; value: string }
  | { type: "blob"; base64: string };

function toHranaValue(value: string | number): HranaValue {
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { type: "integer", value: String(value) }
      : { type: "float", value };
  }
  return { type: "text", value };
}

function fromHranaValue(value: HranaValue): string | number | null {
  switch (value.type) {
    case "null":
      return null;
    case "integer":
      return Number(value.value);
    case "float":
      return value.value;
    case "text":
      return value.value;
    case "blob":
      return value.base64;
  }
}

function httpBaseUrl(): string {
  const raw = Deno.env.get("DB_URL");
  if (!raw) throw new Error("DB_URL is not configured");
  return raw.replace(/^libsql:\/\//, "https://").replace(/\/+$/, "");
}

async function execute(
  sql: string,
  args: (string | number)[] = [],
): Promise<Record<string, string | number | null>[]> {
  const token = Deno.env.get("DB_AUTH_TOKEN");
  if (!token) throw new Error("DB_AUTH_TOKEN is not configured");

  const res = await fetch(`${httpBaseUrl()}/v2/pipeline`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map(toHranaValue) } },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`DB request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const result = data.results?.[0];
  if (result?.type === "error") {
    throw new Error(`DB error: ${result.error?.message ?? "unknown"}`);
  }

  const execResult = result.response.result;
  const cols: string[] = execResult.cols.map((c: { name: string }) => c.name);
  const rows: HranaValue[][] = execResult.rows;

  return rows.map((row) => {
    const record: Record<string, string | number | null> = {};
    row.forEach((value, i) => {
      record[cols[i]] = fromHranaValue(value);
    });
    return record;
  });
}

// Matches the legacy "YYYY-MM-DD HH:MM:SS.ffffff" format already used in the `files` table.
function sqliteTimestamp(d: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    ` ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` +
    `.${pad(d.getUTCMilliseconds(), 3)}000`;
}

export interface FileRow {
  id: string;
  filename: string;
  contentType: string;
  filesize: number;
}

export async function idExists(id: string): Promise<boolean> {
  const rows = await execute(
    "SELECT id FROM files WHERE id = ? LIMIT 1",
    [id],
  );
  return rows.length > 0;
}

export async function insertFile(row: FileRow): Promise<void> {
  await execute(
    "INSERT INTO files (id, filename, content_type, filesize, uploaded) VALUES (?, ?, ?, ?, ?)",
    [
      row.id,
      row.filename,
      row.contentType,
      row.filesize,
      sqliteTimestamp(new Date()),
    ],
  );
}
