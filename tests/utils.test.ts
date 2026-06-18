import { expect, test } from "vite-plus/test";
import { errorMessage, escapeHtml, formatMs } from "../src/utils.ts";

test("formats shared utility output", () => {
  expect(formatMs(1.234)).toBe("1.23ms");
  expect(escapeHtml(`<a href="x">A&B</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;A&amp;B&lt;/a&gt;");
  expect(errorMessage(new Error("boom"))).toBe("boom");
  expect(errorMessage("plain")).toBe("plain");
});
