const assert = require("node:assert/strict");
const test = require("node:test");
const { assertR1csWitnessResult } = require("./r1cs-witness");

test("accepts a witness confirmed by snarkjs", () => {
  assert.doesNotThrow(() => assertR1csWitnessResult("multiplier", {
    status: 0,
    stdout: "[INFO] snarkJS: WITNESS IS CORRECT",
    stderr: "",
    error: undefined,
  }));
});

test("rejects a witness that fails an R1CS constraint", () => {
  assert.throws(() => assertR1csWitnessResult("multiplier", {
    status: 1,
    stdout: "[ERROR] snarkJS: Constraint doesn't match",
    stderr: "",
    error: undefined,
  }), /snarkjs rejected the generated witness \\(exit 1\\)/);
});

test("rejects a successful process without the explicit witness verdict", () => {
  assert.throws(() => assertR1csWitnessResult("multiplier", {
    status: 0,
    stdout: "completed",
    stderr: "",
    error: undefined,
  }), /did not confirm witness constraint satisfaction/);
});

test("reports snarkjs process startup and timeout errors", () => {
  assert.throws(() => assertR1csWitnessResult("multiplier", {
    status: null,
    stdout: "",
    stderr: "",
    error: Object.assign(new Error("timed out"), { code: "ETIMEDOUT" }),
  }), /could not run snarkjs witness check: timed out/);
});


test("rejects a success phrase embedded in an unrelated message", () => {
  assert.throws(() => assertR1csWitnessResult("multiplier", {
    status: 0,
    stdout: "[INFO] snarkJS: NOT WITNESS IS CORRECT",
    stderr: "",
    error: undefined,
  }), /did not confirm witness constraint satisfaction/);
});

test("rejects a success phrase followed by extra text", () => {
  assert.throws(() => assertR1csWitnessResult("multiplier", {
    status: 0,
    stdout: "[INFO] snarkJS: WITNESS IS CORRECT but verification was skipped",
    stderr: "",
    error: undefined,
  }), /did not confirm witness constraint satisfaction/);
});

test("accepts the exact witness verdict when snarkjs colors its terminal output", () => {
  assert.doesNotThrow(() => assertR1csWitnessResult("multiplier", {
    status: 0,
    stdout: "\u001b[1;32m[INFO] snarkJS: WITNESS IS CORRECT\u001b[0m",
    stderr: "",
    error: undefined,
  }));
});
