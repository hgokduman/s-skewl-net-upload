import { assert, assertEquals } from "jsr:@std/assert";
import { generateId } from "./id.ts";

Deno.test("generateId returns 8 alphanumeric characters by default", () => {
  const id = generateId();
  assertEquals(id.length, 8);
  assert(/^[0-9A-Za-z]+$/.test(id));
});

Deno.test("generateId respects a custom length", () => {
  assertEquals(generateId(5).length, 5);
});
