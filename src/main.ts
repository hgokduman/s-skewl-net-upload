import * as BunnySDK from "https://esm.sh/@bunny.net/edgescript-sdk@0.12.0";
import { PAGE_HTML } from "./page.ts";
import { generateId } from "./id.ts";
import { putObject } from "./storage.ts";
import { idExists, insertFile } from "./db.ts";

const PUBLIC_BASE = "https://s.skewl.net";
const MAX_SIZE = 100 * 1024 * 1024;
const MAX_ID_ATTEMPTS = 5;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function hasValidToken(url: URL): boolean {
  const token = Deno.env.get("UPLOAD_TOKEN");
  return !!token && url.searchParams.get("token") === token;
}

async function handleUpload(req: Request): Promise<Response> {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (!contentLength || contentLength > MAX_SIZE) {
    return json({ error: "File missing or exceeds the 100MB limit" }, 413);
  }

  const filename = decodeURIComponent(
    req.headers.get("x-filename") ?? "upload.bin",
  );
  const contentType = req.headers.get("content-type") ||
    "application/octet-stream";
  const body = await req.arrayBuffer();

  let id = "";
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
    const candidate = generateId();
    if (!(await idExists(candidate))) {
      id = candidate;
      break;
    }
  }
  if (!id) {
    return json({ error: "Could not allocate a unique id, try again" }, 500);
  }

  await putObject(id, body, contentType);
  await insertFile({
    id,
    filename,
    contentType,
    filesize: body.byteLength,
  });

  return json({ id, url: `${PUBLIC_BASE}/${id}` });
}

BunnySDK.net.http.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (!hasValidToken(url)) {
    return new Response("Not found", { status: 404 });
  }

  if (req.method === "GET") {
    return new Response(PAGE_HTML, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (req.method === "POST") {
    try {
      return await handleUpload(req);
    } catch (err) {
      console.error(err);
      return json({
        error: err instanceof Error ? err.message : String(err),
      }, 500);
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
