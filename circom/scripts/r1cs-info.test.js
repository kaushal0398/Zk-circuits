const assert = require("node:assert/strict");
const test = require("node:test");
const { assertR1csPublicInterface, parseR1csInfo } = require("./r1cs-info");

const info = [
  "[INFO]  snarkJS: Curve: bn-128",
  "[INFO]  snarkJS: # of Private Inputs: 2",
  "[INFO]  snarkJS: # of Public Inputs: 1",
  "[INFO]  snarkJS: # of Outputs: 0",
].join("\n");

test("parses the BN254 curve and public interface counts from snarkjs r1cs info", () => {
  assert.deepEqual(parseR1csInfo(info), { curve: "bn-128", publicInputs: 1, publicOutputs: 0 });
});

test("parses counts when snarkjs writes them across stdout and stderr", () => {
  const result = {
    status: 0,
    stdout: "[INFO]  snarkJS: Curve: bn-128\n[INFO]  snarkJS: # of Public Inputs: 1",
    stderr: "[INFO]  snarkJS: # of Outputs: 0",
  };
  assert.deepEqual(assertR1csPublicInterface("range-check", result, {
    publicInputs: 1,
    publicOutputs: 0,
  }), { curve: "bn-128", publicInputs: 1, publicOutputs: 0 });
});

test("normalizes ANSI-colored snarkjs output", () => {
  const colored = info.replace("[INFO]", "\u001b[32m[INFO]\u001b[0m");
  assert.deepEqual(parseR1csInfo(colored), { curve: "bn-128", publicInputs: 1, publicOutputs: 0 });
});

test("rejects missing R1CS curve metadata", () => {
  assert.throws(() => parseR1csInfo(info.replace("[INFO]  snarkJS: Curve: bn-128\n", "")), /must report "Curve:" exactly once/);
});

test("rejects duplicate R1CS curve metadata", () => {
  assert.throws(() => parseR1csInfo(info + "\n[INFO]  snarkJS: Curve: bn-128"), /must report "Curve:" exactly once/);
});

test("rejects a malformed curve identifier", () => {
  assert.throws(() => parseR1csInfo(info.replace("Curve: bn-128", "Curve: bn-128 extra")), /invalid curve/);
});

test("rejects an R1CS curve that does not match BN254", () => {
  assert.throws(() => assertR1csPublicInterface("range-check", {
    status: 0,
    stdout: info.replace("bn-128", "bls12-381"),
    stderr: "",
  }, {
    publicInputs: 1,
    publicOutputs: 0,
  }), /R1CS curve expected bn-128, received bls12-381/);
});

test("rejects missing R1CS count fields", () => {
  assert.throws(
    () => parseR1csInfo("[INFO]  snarkJS: Curve: bn-128\n[INFO]  snarkJS: # of Outputs: 1"),
    /must report "# of Public Inputs:" exactly once/,
  );
});

test("rejects duplicate R1CS count fields", () => {
  assert.throws(
    () => parseR1csInfo(info + "\n[INFO]  snarkJS: # of Outputs: 1"),
    /must report "# of Outputs:" exactly once/,
  );
});

test("rejects malformed or unsafe count values", () => {
  assert.throws(
    () => parseR1csInfo(info.replace("# of Outputs: 0", "# of Outputs: 1.5")),
    /invalid count for Outputs/,
  );
  assert.throws(
    () => parseR1csInfo(info.replace("# of Outputs: 0", "# of Outputs: 9007199254740992")),
    /safe integer range/,
  );
});

test("checks the compiled R1CS public interface counts", () => {
  const result = { status: 0, signal: null, stdout: info, stderr: "" };
  assert.deepEqual(assertR1csPublicInterface("range-check", result, {
    publicInputs: 1,
    publicOutputs: 0,
  }), { curve: "bn-128", publicInputs: 1, publicOutputs: 0 });
});

test("rejects a mismatch between R1CS metadata and the expected interface", () => {
  assert.throws(() => assertR1csPublicInterface("multiplier", {
    status: 0,
    stdout: info,
    stderr: "",
  }, {
    publicInputs: 0,
    publicOutputs: 1,
  }), /R1CS publicInputs count expected 0, received 1/);
});

test("rejects failed snarkjs commands", () => {
  assert.throws(() => assertR1csPublicInterface("multiplier", {
    status: 1,
    stdout: "",
    stderr: "unable to read file",
  }, {
    publicInputs: 0,
    publicOutputs: 1,
  }), /exited with status 1/);
});

test("rejects invalid expected interface counts", () => {
  assert.throws(() => assertR1csPublicInterface("multiplier", {
    status: 0,
    stdout: info,
    stderr: "",
  }, {
    publicInputs: -1,
    publicOutputs: 1,
  }), /publicInputs must be a non-negative safe integer/);
});
