import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type ExtensionCommandContext, initTheme, type Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { ChecksPanel } from "./checks-panel.ts";
import { loopInput, loopSelect } from "./loop-ui.ts";
import { RowMenu } from "./row-menu.ts";
import { ThemedText } from "./themed-text.ts";

// DynamicBorder and keyHint() read pi's global theme; the components' own
// colouring goes through the injected theme below.
initTheme("dark");

const stubTui = { requestRender() {}, terminal: { rows: 40, columns: 100 } } as unknown as TUI;
const flush = () => new Promise((resolve) => setImmediate(resolve));

/** Tags every coloured span with the active palette, so a stale colour shows up as `<old:…>`. */
function switchableTheme() {
	let palette = "old";
	const theme = {
		fg: (color: string, text: string) => `<${palette}:${color}>${text}`,
		bold: (text: string) => text,
	} as unknown as Theme;
	return { theme, switchTo: (next: string) => (palette = next) };
}

/** Run a ui.custom factory synchronously and hand back the component it built. */
function mount<C>(open: (ctx: ExtensionCommandContext) => Promise<unknown>, theme: Theme): C {
	let component: C | undefined;
	const ctx = {
		mode: "tui",
		ui: {
			custom: (factory: (...args: unknown[]) => C) =>
				new Promise(() => {
					component = factory(stubTui, theme, undefined, () => {});
				}),
		},
	} as unknown as ExtensionCommandContext;
	void open(ctx);
	return component!;
}

describe("ThemedText", () => {
	it("styles its text at render time", () => {
		let label = "a";
		const text = new ThemedText(() => `[${label}]`);
		assert.equal(text.render(20).join("").trim(), "[a]");
		label = "b";
		assert.equal(text.render(20).join("").trim(), "[b]");
	});
});

describe("theme switch while a dialog is open", () => {
	it("RowMenu restyles its title, notes, rows and badges", () => {
		const { theme, switchTo } = switchableTheme();
		const menu = new RowMenu(
			stubTui,
			theme,
			{
				title: "Providers",
				subtitle: "sub",
				notes: [{ text: "✓ saved", tone: "success" }],
				entries: [
					{ heading: "Custom" },
					{ id: "a", label: "alpha", detail: "relay", badge: { text: "✓", tone: "success" } },
					{ id: "b", label: "beta", value: "1" },
				],
			},
			() => {},
		);
		assert.ok(menu.render(100).join("\n").includes("<old:accent>Providers"));

		switchTo("new");
		menu.invalidate();
		const out = menu.render(100).join("\n");
		assert.ok(!out.includes("<old:"), out);
		assert.ok(out.includes("<new:accent>Providers"), out);
		assert.ok(out.includes("<new:success>✓ saved"), out);
	});

	it("ChecksPanel restyles finished rows and the verdict", async () => {
		const { theme, switchTo } = switchableTheme();
		const panel = new ChecksPanel(
			stubTui,
			theme,
			{
				title: "Test",
				notes: ["slow relay"],
				checks: [{ label: "chat", run: async () => ({ ok: false, detail: "401", hint: "check the key" }) }],
			},
			() => {},
		);
		await flush();
		assert.ok(panel.render(100).join("\n").includes("<old:error>✗"));

		switchTo("new");
		panel.invalidate();
		const out = panel.render(100).join("\n");
		assert.ok(!out.includes("<old:"), out);
		assert.ok(out.includes("<new:error>✗ 1 of 1 check(s) failed"), out);
		assert.ok(out.includes("<new:warning>⚠ slow relay"), out);
		panel.dispose();
	});

	it("loopSelect restyles its options", () => {
		const { theme, switchTo } = switchableTheme();
		const select = mount<{ render(width: number): string[]; invalidate(): void }>(
			(ctx) => loopSelect(ctx, "Pick", ["one", "two"]),
			theme,
		);
		assert.ok(select.render(100).join("\n").includes("<old:accent>one"));

		switchTo("new");
		select.invalidate();
		const out = select.render(100).join("\n");
		assert.ok(!out.includes("<old:"), out);
		assert.ok(out.includes("<new:accent>one"), out);
	});

	it("loopInput restyles its title and inline error", () => {
		const { theme, switchTo } = switchableTheme();
		const input = mount<{ render(width: number): string[]; invalidate(): void; handleInput(data: string): void }>(
			(ctx) => loopInput(ctx, "Base URL", { hint: ["ends in /v1"], validate: () => "required" }),
			theme,
		);
		input.handleInput("\r");
		assert.ok(input.render(100).join("\n").includes("<old:error>✗ required"));

		switchTo("new");
		input.invalidate();
		const out = input.render(100).join("\n");
		assert.ok(!out.includes("<old:"), out);
		assert.ok(out.includes("<new:error>✗ required"), out);
		assert.ok(out.includes("<new:muted>ends in /v1"), out);
	});
});
