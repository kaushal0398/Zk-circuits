const assert = require("node:assert/strict");
const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { dirname, relative, resolve, sep } = require("node:path");
const test = require("node:test");

const repositoryRoot = resolve(__dirname, "../..");
const ignoredDirectories = new Set([".git", "build", "dist", "node_modules", "target"]);
const circomToNoirNames = {
  root: "merkle_root",
};

const circuits = [
  {
    name: "multiplication",
    catalogueTopic: "Multiplication relation",
    circom: "circom/multiplier/multiplier.circom",
    catalogueCircom: "circom/multiplier",
    noir: "noir/multiplication/src/main.nr",
    expectedPublic: ["product"],
  },
  {
    name: "8-bit range check",
    catalogueTopic: "8-bit range check",
    circom: "circom/range-check/range_check.circom",
    catalogueCircom: "circom/range-check",
    noir: "noir/range-check/src/main.nr",
    expectedPublic: ["value"],
  },
  {
    name: "Poseidon hash preimage",
    catalogueTopic: "Poseidon hash preimage",
    circom: "circom/hash-preimage/hash_preimage.circom",
    catalogueCircom: "circom/hash-preimage",
    noir: "noir/hash-preimage/src/main.nr",
    expectedPublic: ["digest"],
  },
  {
    name: "Poseidon Merkle membership",
    catalogueTopic: "Poseidon Merkle membership (depth 4)",
    circom: "circom/merkle-membership/merkle_membership.circom",
    catalogueCircom: "circom/merkle-membership",
    noir: "noir/merkle-membership/src/main.nr",
    expectedPublic: ["merkle_root"],
  },
  {
    name: "depth-5 Poseidon Merkle membership",
    catalogueTopic: "Poseidon Merkle membership (depth 5)",
    circom: "circom/merkle-membership/merkle_membership_depth5.circom",
    catalogueCircom: "circom/merkle-membership/merkle_membership_depth5.circom",
    noir: "noir/merkle-membership-depth5/src/main.nr",
    expectedPublic: ["merkle_root"],
  },
];

function discoverFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : discoverFiles(path);
    }
    return entry.isFile() ? [path] : [];
  });
}

function repositoryPath(path) {
  return relative(repositoryRoot, path).split(sep).join("/");
}

function discoverCircomEntrypoints() {
  return discoverFiles(resolve(repositoryRoot, "circom"))
    .filter((path) => path.endsWith(".circom"))
    .map(repositoryPath)
    .sort();
}

function discoverNoirEntrypoints() {
  return discoverFiles(resolve(repositoryRoot, "noir"))
    .filter((path) => path.endsWith("Nargo.toml"))
    .map((manifest) => resolve(dirname(manifest), "src/main.nr"))
    .filter(existsSync)
    .map(repositoryPath)
    .sort();
}

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

test("registers every Circom and Noir circuit entrypoint in the interface contract", () => {
  const registeredCircom = circuits.map((circuit) => circuit.circom).sort();
  const registeredNoir = circuits.map((circuit) => circuit.noir).sort();

  assert.deepEqual(
    registeredCircom,
    discoverCircomEntrypoints(),
    "Every Circom source file must be represented in the public-interface contract",
  );
  assert.deepEqual(
    registeredNoir,
    discoverNoirEntrypoints(),
    "Every Noir package with src/main.nr must be represented in the public-interface contract",
  );
});

test("keeps README circuit catalogue topics and paths in sync with the interface contract", () => {
  const readme = readFileSync(resolve(repositoryRoot, "README.md"), "utf8");
  const heading = /^## Circuit catalogue\s*$/m.exec(readme);
  assert.ok(heading, "README must contain a Circuit catalogue section");
  const afterHeading = readme.slice(heading.index + heading[0].length);
  const nextHeading = /^##\s/m.exec(afterHeading);
  const section = nextHeading ? afterHeading.slice(0, nextHeading.index) : afterHeading;
  const rows = section.split(/\r?\n/).filter((line) => /^\s*\|/.test(line));
  assert.ok(rows.length >= 2, "Circuit catalogue must contain a Markdown table");
  const entries = rows.slice(2).map((row) => {
    const cells = row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    assert.equal(cells.length, 3, `Unexpected circuit catalogue row: ${row}`);
    assert.ok(cells[0], "Circuit catalogue entries must have a topic");
    const paths = cells.slice(1).map((cell) => {
      assert.ok(cell.startsWith("`") && cell.endsWith("`"), `Circuit paths must be formatted as inline code: ${cell}`);
      return cell.slice(1, -1);
    });
    return [cells[0], ...paths];
  });
  const expected = circuits.map(({ catalogueTopic, noir, catalogueCircom }) => [
    catalogueTopic,
    noir.slice(0, noir.lastIndexOf("/src/main.nr")),
    catalogueCircom,
  ]);
  const sortEntries = (items) => items.map((item) => item.join("\0")).sort();
  assert.deepEqual(
    sortEntries(entries),
    sortEntries(expected),
    "README circuit catalogue topics and paths must match the interface registry exactly",
  );
});

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
