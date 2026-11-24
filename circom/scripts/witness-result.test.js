const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { assertWitnessResult } = require("./witness-result");

test("accepts a valid witness that exits successfully", () => {
  assert.doesNotThrow(() => assertWitnessResult("valid", {
    status: 0, signal: null, stdout: "", stderr: "", error: undefined,
  }, true));
});

test("accepts a Circom assertion failure wrapped by the witness calculator", () => {
  assert.doesNotThrow(() => assertWitnessResult("invalid", {
    status: 1, signal: null, stdout: "",
    stderr: "Error: Error: Assert Failed.\nError in template RangeCheck_1 line: 8",
    error: undefined,
  }, false));
});

test("rejects invalid witnesses that exit successfully", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: 0, signal: null, stdout: "", stderr: "", error: undefined,
  }, false), /invalid witness unexpectedly succeeded/);
});

test("rejects constraint assertion output with an unexpected exit code", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: 2, signal: null, stdout: "", stderr: "Error: Assert Failed.", error: undefined,
  }, false), /expected a constraint assertion failure to exit with status 1, received 2/);
});

test("rejects invalid witnesses that fail for an unrelated reason", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: 1, signal: null, stdout: "", stderr: "module not found", error: undefined,
  }, false), /expected a constraint assertion failure/);
});

test("rejects a signal-terminated calculator even if it printed an assertion", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: null, signal: "SIGTERM", stdout: "Assert Failed", stderr: "", error: undefined,
  }, false), /did not exit normally \(signal SIGTERM\)/);
});

test("rejects a calculator with no exit status", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: null, signal: null, stdout: "Assert Failed", stderr: "", error: undefined,
  }, false), /did not exit normally \(no exit status\)/);
});

test("reports process startup errors", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: null, signal: null, stdout: "", stderr: "", error: new Error("spawn failed"),
  }, false), /could not execute witness calculator: spawn failed/);
});

test("rejects a calculator that exceeds its execution timeout", () => {
  const result = spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], {
    encoding: "utf8",
    timeout: 100,
  });
  assert.equal(result.error?.code, "ETIMEDOUT");
  assert.throws(() => assertWitnessResult("timed-out", result, false), /could not execute witness calculator/);
});

test("rejects unrelated errors that merely mention an assertion failure", () => {
  assert.throws(() => assertWitnessResult("invalid", {
    status: 1,
    signal: null,
    stdout: "",
    stderr: "Error: Calculator initialization failed.\nPrevious run note: assert failed in a different process.",
    error: undefined,
  }, false), /expected a constraint assertion failure/);
});
