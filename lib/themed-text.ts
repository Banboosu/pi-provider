import { Text } from "@earendil-works/pi-tui";

/**
 * Text styled at render time.
 *
 * A `new Text(theme.fg(...))` keeps the colours of the theme that was active
 * when it was built, so a theme switch while the dialog is open (the terminal
 * flipping light/dark, or its colours arriving late over SSH) leaves it in the
 * old palette. pi's tui.md asks components not to store themed strings unless
 * invalidate() rebuilds them; this one re-runs `content` on every render.
 */
export class ThemedText extends Text {
	private readonly content: () => string;
	private last = "";

	/** `content` first runs at render, so it may read state set up after construction. */
	constructor(content: () => string, paddingX = 1, paddingY = 0) {
		super("", paddingX, paddingY);
		this.content = content;
	}

	override render(width: number): string[] {
		const text = this.content();
		// setText drops Text's wrap cache, so only call it when the text changed.
		if (text !== this.last) {
			this.last = text;
			this.setText(text);
		}
		return super.render(width);
	}
}
