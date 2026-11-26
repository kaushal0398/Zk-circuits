const { parseCanonicalField, parseMerkleVectorAtDepth } = require("./merkle-vector");
const { stripNoirComments } = require("./noir-merkle-vector");

const SHARED_VECTOR_TEST = "matches_shared_merkle_membership_bn254_depth5_vector";
const ORIGINAL_ROOT_HELPER = "assert_original_depth5_root";

function extractDeclaration(body, name) {
  const pattern = new RegExp("\\blet\\s+" + name + "\\s*=\\s*([^;]+);", "g");
  const matches = [...body.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error("Noir depth-5 vector test must declare " + name + " exactly once");
  }
  return matches[0][1].trim();
}

function extractFunctionBody(source, name) {
  if (typeof source !== "string" || source.trim().length === 0) {
    throw new TypeError("Noir depth-5 Merkle source must be a non-empty string");
  }
  const uncommented = stripNoirComments(source);
  const pattern = new RegExp(
    "\\bfn\\s+" + name + "\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)^\\}",
    "gm",
  );
  const matches = [...uncommented.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error("Noir source must define " + name + " exactly once");
  }
  return matches[0][1];
}

function extractTestBody(source) {
  return extractFunctionBody(source, SHARED_VECTOR_TEST);
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

  const root = parseCanonicalField(
    extractDeclaration(body, "expected_root"),
    "Noir depth-5 expected root",
  );

  const helperBody = extractFunctionBody(source, ORIGINAL_ROOT_HELPER);
  const helperRoot = parseCanonicalField(
    extractDeclaration(helperBody, "expected_root"),
    "Noir depth-5 adversarial expected root",
  );
  const helperCalls = [...helperBody.matchAll(/\bmain\s*\(/g)];
  const expectedHelperCalls = [...helperBody.matchAll(
    /\bmain\s*\(\s*leaf\s*,\s*path_elements\s*,\s*path_indices\s*,\s*expected_root\s*\)\s*;/g,
  )];
  if (helperCalls.length !== 1 || expectedHelperCalls.length !== 1) {
    throw new Error("Noir depth-5 adversarial tests must pass the original path and root to main exactly once");
  }
  if (helperRoot !== root) {
    throw new Error("Noir depth-5 adversarial root does not match the shared vector");
  }

  const mainCalls = [...body.matchAll(/\bmain\s*\(/g)];
  const expectedCalls = [...body.matchAll(
    /\bmain\s*\(\s*leaf\s*,\s*path_elements\s*,\s*path_indices\s*,\s*expected_root\s*\)\s*;/g,
  )];
  if (mainCalls.length !== 1 || expectedCalls.length !== 1) {
    throw new Error("Noir depth-5 vector test must pass its declared values to main exactly once");
  }

  return { leaf, pathElements, pathIndices, root: root.toString() };
}

function assertNoirDepth5Vector(source, vector) {
  const expected = parseMerkleVectorAtDepth(vector, 5);
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
  if (actual.root !== expected.root) {
    throw new Error("Noir depth-5 Merkle root does not match the shared vector");
  }
  return actual;
}

module.exports = { assertNoirDepth5Vector, parseNoirDepth5Vector };
