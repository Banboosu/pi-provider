import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blockWindow, MIN_LIST_ROWS, visibleRows } from "./fit.ts";

describe("visibleRows", () => {
	it("shows a list that fits whole, without a position line", () => {
		assert.equal(visibleRows(10, 10), 10);
	});

	it("gives a scrolling list's position line one of the rows", () => {
		assert.equal(visibleRows(30, 12), 11);
	});

	it("never shows more than the cap", () => {
		assert.equal(visibleRows(30, 40, 20), 20);
	});

	it("keeps a few rows on a terminal too short for the panel", () => {
		assert.equal(visibleRows(30, -4), MIN_LIST_ROWS);
	});
});

describe("blockWindow", () => {
	const ones = (n: number) => Array<number>(n).fill(1);

	it("draws every block when they fit", () => {
		assert.deepEqual(blockWindow(ones(5), 5, 3, 4), { start: 0, end: 5 });
	});

	it("keeps the focus in view and moves as little as possible", () => {
		// Six rows: five blocks and the position line.
		assert.deepEqual(blockWindow(ones(20), 6, 0, 3), { start: 0, end: 5 });
		assert.deepEqual(blockWindow(ones(20), 6, 0, 5), { start: 1, end: 6 });
		assert.deepEqual(blockWindow(ones(20), 6, 4, 2), { start: 2, end: 7 });
	});

	it("does not leave blank rows under the last block", () => {
		assert.deepEqual(blockWindow(ones(20), 6, 18, 18), { start: 15, end: 20 });
	});

	it("counts every line of a block", () => {
		assert.deepEqual(blockWindow([2, 2, 2, 2, 2], 7, 0, 4), { start: 2, end: 5 });
	});

	it("draws a block taller than the room on its own rather than nothing", () => {
		assert.deepEqual(blockWindow([1, 9, 1], 5, 0, 1), { start: 1, end: 2 });
	});
});
