const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");

const repositoryRoot = resolve(__dirname, "../..");
const circomToNoirNames = {
  root: "merkle_root",
};

const circuits = [
  {
    name: "multiplication",
    circom: "circom/multiplier/multiplier.circom",
    noir: "noir/multiplication/src/main.nr",
    expectedPublic: ["product"],
  },
  {
    name: "8-bit range check",
    circom: "circom/range-check/range_check.circom",
    noir: "noir/range-check/src/main.nr",
    expectedPublic: ["value"],
  },
  {
    name: "Poseidon hash preimage",
    circom: "circom/hash-preimage/hash_preimage.circom",
    noir: "noir/hash-preimage/src/main.nr",
    expectedPublic: ["digest"],
  },
  {
    name: "Poseidon Merkle membership",
    circom: "circom/merkle-membership/merkle_membership.circom",
    noir: "noir/merkle-membership/src/main.nr",
    expectedPublic: ["merkle_root"],
  },
];

function parseNoirPublicParameters(source) {
  const signature = source.match(/\bfn\s+main\s*\(([\s\S]*?)\)\s*\{/);
  assert.ok(signature, "Noir main function must exist");

  return signature[1]
    .split(",")
    .map((parameter) => parameter.trim())
    .filter(Boolean)
    .map((parameter) => {
      const match = parameter.match(/^([A-Za-z_]\w*)\s*:\s*(pub\s+)?/);
      assert.ok(match, `Could not parse Noir main parameter: ${parameter}`);
      return match[2] ? match[1] : null;
    })
    .filter(Boolean);
}

function parseCircomPublicValues(source) {
  const main = source.match(/\bcomponent\s+main(?:\s*\{\s*public\s*\[([^\]]*)\]\s*\})?\s*=/);
  assert.ok(main, "Circom main component must exist");

  const publicInputs = (main[1] ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const declaredInputs = [...source.matchAll(/\bsignal\s+input\s+([A-Za-z_]\w*)/g)]
    .map((match) => match[1]);
  const outputs = [...source.matchAll(/\bsignal\s+output\s+([A-Za-z_]\w*)/g)]
    .map((match) => match[1]);

  for (const name of publicInputs) {
    assert.ok(declaredInputs.includes(name), `Circom public input ${name} must be declared`);
  }

  // Circom places main-component outputs before explicitly public inputs in witness order.
  return [...outputs, ...publicInputs]
    .map((name) => circomToNoirNames[name] ?? name);
}

for (const circuit of circuits) {
  test(`${circuit.name} keeps the same public values in Noir and Circom`, () => {
    const noirSource = readFileSync(resolve(repositoryRoot, circuit.noir), "utf8");
    const circomSource = readFileSync(resolve(repositoryRoot, circuit.circom), "utf8");
    const noirPublic = parseNoirPublicParameters(noirSource);
    const circomPublic = parseCircomPublicValues(circomSource);
    const expected = [...circuit.expectedPublic];

    assert.deepEqual(noirPublic, expected, "Noir public parameters must match the circuit contract in declaration order");
    assert.deepEqual(circomPublic, expected, "Circom public values must match the circuit contract in witness order");
    assert.deepEqual(noirPublic, circomPublic, "Noir and Circom public interfaces must agree in order");
  });
}

test("preserves declaration order for multi-value public interfaces", () => {
  const noirPublic = parseNoirPublicParameters(
    "fn main(digest: pub Field, second: pub Field, first: pub Field, witness: Field) {}",
  );
  const circomPublic = parseCircomPublicValues(`
    signal input first;
    signal input second;
    signal input witness;
    signal output digest;
    component main { public [second, first] } = Example();
  `);

  assert.deepEqual(noirPublic, ["digest", "second", "first"]);
  assert.deepEqual(circomPublic, noirPublic);
});
