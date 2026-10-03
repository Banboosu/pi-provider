import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initTheme, type Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { HOST_ROWS } from "./fit.ts";
import { type RowMenuChoice, RowMenu, type RowMenuOptions } from "./row-menu.ts";

initTheme();
const stubTheme = { fg: (_c: string, t: string) => t, bold: (t: string) => t } as unknown as Theme;
const stubTui = { requestRender() {}, terminal: { rows: 40, columns: 100 } } as unknown as TUI;
const UP = "\x1b[A";
const DOWN = "\x1b[B";
const ENTER = "\r";
// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escapes
const plain = (menu: RowMenu) => menu.render(100).join("\n").replace(/\x1b\[[0-9;]*m/g, "");

function open(options: Partial<RowMenuOptions>) {
	const chosen: Array<RowMenuChoice | undefined> = [];
	const menu = new RowMenu(
		stubTui,
		stubTheme,
		{
			title: "t",
			entries: [
				{ heading: "Section" },
				{ id: "a", label: "Alpha", value: "1" },
				{ separator: true },
				{ id: "off", label: "Disabled", disabled: true },
				{ id: "b", label: "Beta", value: "2" },
			],
			...options,
		},
		(choice) => chosen.push(choice),
	);
	return { menu, chosen };
}

describe("RowMenu", () => {
	it("shortens the detail before the badge when a row is too wide", () => {
		const row = {
			id: "p",
			label: "claude-relay",
			detail: "claude.example-relay.com · anthropic-messages · 2 models",
			badge: { text: "✓ 2/2 · 1.2s · 5m ago", tone: "success" as const },
		};
		const { menu } = open({ entries: [row] });
		// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escapes
		const line = (width: number) => menu.render(width).map((l) => l.replace(/\x1b\[[0-9;]*m/g, "")).find((l) => l.includes("claude-relay"))!;

		assert.ok(line(120).includes("2 models  ✓ 2/2 · 1.2s · 5m ago"), line(120));
		assert.ok(line(80).endsWith("…  ✓ 2/2 · 1.2s · 5m ago"), line(80));
		assert.ok(line(80).includes("claude.example-relay.com"), line(80));
		// Too narrow for a useful detail: it goes, the badge stays.
		assert.equal(line(45).trim(), "→ claude-relay  ✓ 2/2 · 1.2s · 5m ago");
	});

	it("starts on the first selectable row and skips headings, separators and disabled rows", () => {
		const { menu, chosen } = open({});
		assert.equal(menu.focusedRow?.id, "a");
		menu.handleInput(DOWN);
		assert.equal(menu.focusedRow?.id, "b");
		menu.handleInput(DOWN); // wraps
		assert.equal(menu.focusedRow?.id, "a");
		menu.handleInput(UP);
		menu.handleInput(ENTER);
		assert.deepEqual(chosen, [{ id: "b" }]);
	});

	it("honours initialId", () => {
		const { menu } = open({ initialId: "b" });
		assert.equal(menu.focusedRow?.id, "b");
	});

	it("offers a shortcut only on the rows it applies to", () => {
		const { menu, chosen } = open({ keys: [{ key: "t", label: "test", applies: (row) => row.id === "b" }] });
		assert.ok(!plain(menu).includes("t test"));
		menu.handleInput("t"); // not applicable on "a"
		assert.deepEqual(chosen, []);
		menu.handleInput(DOWN);
		assert.ok(plain(menu).includes("t test"));
		menu.handleInput("t");
		assert.deepEqual(chosen, [{ id: "b", key: "t" }]);
	});

	it("aligns the value column and shows notes", () => {
		const { menu } = open({
			notes: [{ text: "✓ Saved", tone: "success" }],
			entries: [
				{ id: "a", label: "Base URL", value: "https://x" },
				{ id: "b", label: "API key", value: "none" },
			],
		});
		const lines = plain(menu).split("\n");
		const url = lines.find((l) => l.includes("https://x"))!;
		const key = lines.find((l) => l.includes("none"))!;
		assert.equal(url.indexOf("https://x"), key.indexOf("none"));
		assert.ok(plain(menu).includes("✓ Saved"));
	});

	it("Esc resolves undefined", () => {
		const { menu, chosen } = open({});
		menu.handleInput("\x1b");
		assert.deepEqual(chosen, [undefined]);
	});
});

describe("RowMenu on a short terminal", () => {
	it("leaves Pi its rows and keeps the cursor row on screen", () => {
		const entries = Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, label: `model-${i}`, detail: "128k" }));
		for (const rows of [20, 24, 30]) {
			const tui = { requestRender() {}, terminal: { rows, columns: 100 } } as unknown as TUI;
			const menu = new RowMenu(tui, stubTheme, { title: "Models", entries, initialId: "m25" }, () => {});
			const lines = menu.render(100);
			assert.ok(lines.length <= rows - HOST_ROWS, `${lines.length} lines on ${rows} rows`);
			assert.ok(lines.some((line) => line.includes("model-25")));
		}
	});
});
