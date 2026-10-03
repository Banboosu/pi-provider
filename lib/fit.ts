/**
 * Fitting a panel into the rows Pi leaves it.
 *
 * Every panel here takes the editor's slot. In fullscreen mode, Pi's default
 * since 1.0, that slot sits in a fixed dock under the transcript, and a panel
 * taller than the dock is cut from the bottom: the key hints go first, and in
 * the test panel the verdict with them. So each panel measures its other lines
 * and gives its list only the rows that are left.
 */

import type { Component } from "@earendil-works/pi-tui";

/**
 * Rows Pi keeps for itself while a panel is up: the one transcript row
 * fullscreen never gives away, the widget spacer, the two-line footer, and one
 * for an extension status line.
 */
export const HOST_ROWS = 5;

/** A list keeps this many rows even on a terminal too short to fit the panel. */
export const MIN_LIST_ROWS = 3;

/** Rows left for a panel's list once Pi and the panel's other lines are placed. */
export function spareRows(terminalRows: number, otherRows: number): number {
	return terminalRows - HOST_ROWS - otherRows;
}

/** Lines a panel draws outside `list`, at this width. */
export function otherRows(children: readonly Component[], width: number, list: Component): number {
	let rows = 0;
	for (const child of children) if (child !== list) rows += child.render(width).length;
	return rows;
}

/**
 * How many rows of a one-line-per-row list to show. A list that has to scroll
 * gives one row to its position line, so it shows one row fewer than `room`.
 */
export function visibleRows(count: number, room: number, cap = Number.POSITIVE_INFINITY): number {
	if (count <= Math.min(cap, room)) return count;
	return Math.max(MIN_LIST_ROWS, Math.min(cap, room - 1));
}

/**
 * The run of blocks to draw in `room` rows. A block is one list row and the
 * lines under it. The run keeps block `focus` in view and moves as little as
 * possible from `start`, the first block drawn last time, so stepping through
 * the list does not make it jump. A list that has to scroll gives one row to
 * its position line. Returns the first block drawn and the one past the last.
 */
export function blockWindow(
	heights: readonly number[],
	room: number,
	start: number,
	focus: number,
): { start: number; end: number } {
	const count = heights.length;
	if (count === 0 || heights.reduce((sum, h) => sum + h, 0) <= room) return { start: 0, end: count };
	const avail = Math.max(MIN_LIST_ROWS, room - 1);
	const target = Math.min(Math.max(focus, 0), count - 1);

	let first = Math.min(Math.max(start, 0), count - 1);
	if (target < first) first = target;
	// Past the bottom of the run: pull the run down until it ends on the focus.
	let used = 0;
	let end = first;
	while (end < count && (end === first || used + heights[end]! <= avail)) used += heights[end++]!;
	if (target >= end) {
		first = target;
		used = heights[target]!;
		while (first > 0 && used + heights[first - 1]! <= avail) used += heights[--first]!;
		end = target + 1;
	}
	// Fill any room left under the last block from above, so a run that reaches
	// the end of the list does not leave blank rows.
	while (end < count && used + heights[end]! <= avail) used += heights[end++]!;
	while (end === count && first > 0 && used + heights[first - 1]! <= avail) used += heights[--first]!;
	return { start: first, end };
}
