const { parseCanonicalField, parseMerkleVectorAtDepth } = require("./merkle-vector");
const { stripNoirComments } = require("./noir-merkle-vector");

const SHARED_VECTOR_TEST = "matches_shared_merkle_membership_bn254_depth5_vector";
const EXPECTED_ROOT_EXPRESSION = "hash_2([h3, path_elements[4]])";

function extractDeclaration(body, name) {
  const pattern = new RegExp("\\blet\\s+" + name + "\\s*=\\s*([^;]+);", "g");
  const matches = [...body.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error("Noir depth-5 vector test must declare " + name + " exactly once");
  }
  return matches[0][1].trim();
}

function extractTestBody(source) {
  if (typeof source !== "string" || source.trim().length === 0) {
    throw new TypeError("Noir depth-5 Merkle source must be a non-empty string");
  }
  const uncommented = stripNoirComments(source);
  const pattern = new RegExp(
    "\\bfn\\s+" + SHARED_VECTOR_TEST + "\\s*\\(\\s*\\)\\s*\\{([\\s\\S]*?)^\\}",
    "gm",
  );
  const matches = [...uncommented.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error("Noir source must define the depth-5 shared-vector test exactly once");
  }
  return matches[0][1];
}

function parseDecimalArray(expression, label) {
  const match = expression.match(/^\[\s*(.*?)\s*\]$/s);
  if (!match || match[1].trim().length === 0) {
    throw new Error("Noir depth-5 " + label + " must be a non-empty decimal array");
  }
  return match[1].split(",").map((value, index) =>
    parseCanonicalField(value.trim(), "Noir depth-5 " + label + "[" + index + "]"));
}

function parseBooleanArray(expression, label) {
  const match = expression.match(/^\[\s*(.*?)\s*\]$/s);
  if (!match || match[1].trim().length === 0) {
    throw new Error("Noir depth-5 " + label + " must be a non-empty boolean array");
  }
  return match[1].split(",").map((value, index) => {
    const direction = value.trim();
    if (direction !== "true" && direction !== "false") {
      throw new Error("Noir depth-5 " + label + "[" + index + "] must be true or false");
    }
    return direction === "true" ? 1 : 0;
  });
}

function parseNoirDepth5Vector(source) {
  const body = extractTestBody(source);
  const leaf = parseCanonicalField(extractDeclaration(body, "leaf"), "Noir depth-5 leaf");
  const pathElements = parseDecimalArray(extractDeclaration(body, "path_elements"), "path_elements");
  const pathIndices = parseBooleanArray(extractDeclaration(body, "path_indices"), "path_indices");

  const expectedRoot = extractDeclaration(body, "expected_root");
  if (expectedRoot !== EXPECTED_ROOT_EXPRESSION) {
    throw new Error("Noir depth-5 vector must derive its root from the fifth Poseidon level");
  }

  const expectedHashSteps = [
    "let h0 = hash_2([leaf, path_elements[0]]);",
    "let h1 = hash_2([path_elements[1], h0]);",
    "let h2 = hash_2([h1, path_elements[2]]);",
    "let h3 = hash_2([path_elements[3], h2]);",
  ];
  for (const step of expectedHashSteps) {
    if (!body.includes(step)) {
      throw new Error("Noir depth-5 vector is missing reference hash step: " + step);
    }
  }

  const mainCalls = [...body.matchAll(/\bmain\s*\(/g)];
  const expectedCalls = [...body.matchAll(
    /\bmain\s*\(\s*leaf\s*,\s*path_elements\s*,\s*path_indices\s*,\s*expected_root\s*\)\s*;/g,
  )];
  if (mainCalls.length !== 1 || expectedCalls.length !== 1) {
    throw new Error("Noir depth-5 vector test must pass its declared values to main exactly once");
  }

  return { leaf, pathElements, pathIndices };
}

function assertNoirDepth5Vector(source, vector) {
  const expected = parseMerkleVectorAtDepth(vector, 5, false);
  const actual = parseNoirDepth5Vector(source);
  if (actual.leaf !== expected.leaf) {
    throw new Error("Noir depth-5 Merkle leaf does not match the shared vector");
  }
  if (actual.pathElements.length !== 5 ||
      actual.pathElements.some((value, index) => value !== expected.pathElements[index])) {
    throw new Error("Noir depth-5 Merkle path elements do not match the shared vector");
  }
  if (actual.pathIndices.length !== 5 ||
      actual.pathIndices.some((value, index) => value !== expected.pathIndices[index])) {
    throw new Error("Noir depth-5 Merkle path indices do not match the shared vector");
  }
  return actual;
}

module.exports = { assertNoirDepth5Vector, parseNoirDepth5Vector };
