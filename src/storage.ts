const STORAGE_ZONE = "s-skewl-net";
const STORAGE_ENDPOINT = `https://storage.bunnycdn.com/${STORAGE_ZONE}`;

export async function putObject(
  id: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const accessKey = Deno.env.get("STORAGE_ACCESS_KEY");
  if (!accessKey) {
    throw new Error("STORAGE_ACCESS_KEY is not configured");
  }

  const res = await fetch(`${STORAGE_ENDPOINT}/${id}`, {
    method: "PUT",
    headers: {
      AccessKey: accessKey,
      "Content-Type": contentType,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(
      `Storage upload failed: ${res.status} ${await res.text()}`,
    );
  }
}
