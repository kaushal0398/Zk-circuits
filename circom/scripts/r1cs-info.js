const ANSI_ESCAPE = /\u001B\[[0-?]*[ -/]*[@-~]/g;
const BN254_SNARKJS_CURVE = "bn-128";

function parseCurve(output) {
  const matchingLines = output.split(/\r?\n/).filter((line) => line.includes("Curve:"));
  if (matchingLines.length !== 1) {
    throw new Error('snarkjs r1cs info must report "Curve:" exactly once');
  }

  const match = matchingLines[0].match(/^\s*(?:\[[A-Z]+\]\s*snarkJS:\s*)?Curve:\s*([a-z0-9-]+)\s*$/i);
  if (!match) {
    throw new Error("snarkjs r1cs info reported an invalid curve");
  }
  return match[1].toLowerCase();
}

function parseCount(output, label) {
  const marker = "# of " + label + ":";
  const matchingLines = output.split(/\r?\n/).filter((line) => line.includes(marker));
  if (matchingLines.length !== 1) {
    throw new Error('snarkjs r1cs info must report "' + marker + '" exactly once');
  }

  const line = matchingLines[0];
  const pattern = new RegExp("^\\s*(?:\\[[A-Z]+\\]\\s*snarkJS:\\s*)?# of " + label + ":\\s*(0|[1-9][0-9]*)\\s*$");
  const match = line.match(pattern);
  if (!match) {
    throw new Error("snarkjs r1cs info reported an invalid count for " + label);
  }

  const count = Number(match[1]);
  if (!Number.isSafeInteger(count)) {
    throw new Error("snarkjs r1cs info count for " + label + " exceeds the safe integer range");
  }
  return count;
}

function parseR1csInfo(output) {
  if (typeof output !== "string" || output.trim().length === 0) {
    throw new TypeError("snarkjs r1cs info output must be a non-empty string");
  }

  const normalized = output.replace(ANSI_ESCAPE, "");
  return {
    curve: parseCurve(normalized),
    publicInputs: parseCount(normalized, "Public Inputs"),
    publicOutputs: parseCount(normalized, "Outputs"),
  };
}

function assertR1csPublicInterface(name, result, expected) {
  if (!result || typeof result !== "object") {
    throw new TypeError(name + ": snarkjs r1cs info result must be an object");
  }
  if (!expected || typeof expected !== "object") {
    throw new TypeError(name + ": expected R1CS public interface must be an object");
  }

  for (const field of ["publicInputs", "publicOutputs"]) {
    if (!Number.isSafeInteger(expected[field]) || expected[field] < 0) {
      throw new TypeError(name + ": expected " + field + " must be a non-negative safe integer");
    }
  }

  const output = [result.stdout, result.stderr]
    .filter((part) => typeof part === "string")
    .join("\n");
  if (result.error) {
    throw new Error(name + ": could not run snarkjs r1cs info: " + result.error.message);
  }
  if (result.signal) {
    throw new Error(name + ": snarkjs r1cs info was terminated by " + result.signal);
  }
  if (result.status !== 0) {
    throw new Error(name + ": snarkjs r1cs info exited with status " + result.status + ": " + output.trim());
  }

  const actual = parseR1csInfo(output);
  if (actual.curve !== BN254_SNARKJS_CURVE) {
    throw new Error(name + ": R1CS curve expected " + BN254_SNARKJS_CURVE + ", received " + actual.curve);
  }
  for (const field of ["publicInputs", "publicOutputs"]) {
    if (actual[field] !== expected[field]) {
      throw new Error(
        name + ": R1CS " + field + " count expected " + expected[field] + ", received " + actual[field],
      );
    }
  }
  return actual;
}

module.exports = { assertR1csPublicInterface, parseR1csInfo };
