const assert = require("node:assert/strict");
const test = require("node:test");
const { assertWitnessResult } = require("./witness-result");

test("accepts a valid witness that exits successfully", () => {
  assert.doesNotThrow(() => assertWitnessResult("valid", {
    status: 0, signal: null, stdout: "", stderr: "", error: undefined,
  }, true));
});

test("accepts an invalid witness rejected by a constraint assertion", () => {
  assert.doesNotThrow(() => assertWitnessResult("invalid", {
    status: 1, signal: null, stdout: "", stderr: "Error: Assert Failed.", error: undefined,
  }, false));
});

test("rejects invalid witnesses that exit successfully", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: 0, signal: null, stdout: "", stderr: "", error: undefined,
  }, false), /invalid witness unexpectedly succeeded/);
});

test("rejects invalid witnesses that fail for an unrelated reason", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: 1, signal: null, stdout: "", stderr: "module not found", error: undefined,
  }, false), /expected a constraint assertion failure/);
});

test("rejects a signal-terminated calculator even if it printed an assertion", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: null, signal: "SIGTERM", stdout: "Assert Failed", stderr: "", error: undefined,
  }, false), /did not exit normally \\(signal SIGTERM\\)/);
});

test("rejects a calculator with no exit status", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: null, signal: null, stdout: "Assert Failed", stderr: "", error: undefined,
  }, false), /did not exit normally \\(no exit status\\)/);
});

test("reports process startup errors", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: null, signal: null, stdout: "", stderr: "", error: new Error("spawn failed"),
  }, false), /could not execute witness calculator: spawn failed/);
});
