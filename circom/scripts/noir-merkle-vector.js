function stripNoirComments(source) {
  let output = "";
  let state = "code";
  let blockDepth = 0;
  let quote = null;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      if (current === "\n" || current === "\r") {
        output += current;
        state = "code";
      } else {
        output += " ";
      }
      continue;
    }

    if (state === "block-comment") {
      if (current === "/" && next === "*") {
        output += "  ";
        blockDepth += 1;
        index += 1;
      } else if (current === "*" && next === "/") {
        output += "  ";
        blockDepth -= 1;
        index += 1;
        if (blockDepth === 0) state = "code";
      } else {
        output += current === "\n" || current === "\r" ? current : " ";
      }
      continue;
    }

    if (state === "string") {
      output += current;
      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === quote) {
        quote = null;
        state = "code";
      }
      continue;
    }

    if (current === "/" && next === "/") {
      output += "  ";
      state = "line-comment";
      index += 1;
    } else if (current === "/" && next === "*") {
      output += "  ";
      state = "block-comment";
      blockDepth = 1;
      index += 1;
    } else {
      if (current === "\"" || current === "'") {
        quote = current;
        state = "string";
      }
      output += current;
    }
  }

  return output;
}

const { parseCanonicalField, parseMerkleVector } = require("./merkle-vector");

const SHARED_VECTOR_TEST = "matches_shared_merkle_membership_bn254_vector";

function extractSharedVectorBody(source) {
  if (typeof source !== "string" || source.trim().length === 0) {
    throw new TypeError("Noir Merkle source must be a non-empty string");
  }

  const uncommentedSource = stripNoirComments(source);
  const pattern = new RegExp(
    "\\bfn\\s+" + SHARED_VECTOR_TEST + "\\s*\\(\\s*\\)\\s*\\{([\\s\\S]*?)^\\}",
    "gm",
  );
  const matches = [...uncommentedSource.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error("Noir Merkle source must define the shared-vector test exactly once");
  }
  return matches[0][1];
}

function extractDeclaration(body, name) {
  const pattern = new RegExp("\\blet\\s+" + name + "\\s*=\\s*([^;]+);", "g");
  const matches = [...body.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error("Noir shared-vector test must declare " + name + " exactly once");
  }
  return matches[0][1].trim();
}

function parseDecimalArray(expression, label) {
  const match = expression.match(/^\[\s*(.*?)\s*\]$/s);
  if (!match || match[1].trim().length === 0) {
    throw new Error("Noir shared-vector " + label + " must be a non-empty decimal array");
  }
  return match[1].split(",").map((value, index) =>
    parseCanonicalField(value.trim(), "Noir shared-vector " + label + "[" + index + "]"));
}

function parseBooleanArray(expression, label) {
  const match = expression.match(/^\[\s*(.*?)\s*\]$/s);
  if (!match || match[1].trim().length === 0) {
    throw new Error("Noir shared-vector " + label + " must be a non-empty boolean array");
  }
  return match[1].split(",").map((value, index) => {
    const direction = value.trim();
    if (direction !== "true" && direction !== "false") {
      throw new Error("Noir shared-vector " + label + "[" + index + "] must be true or false");
    }
    return direction === "true" ? 1 : 0;
  });
}

function parseNoirMerkleVector(source) {
  const body = extractSharedVectorBody(source);
  const leaf = parseCanonicalField(extractDeclaration(body, "leaf"), "Noir shared-vector leaf");
  const pathElements = parseDecimalArray(extractDeclaration(body, "path_elements"), "path_elements");
  const pathIndices = parseBooleanArray(extractDeclaration(body, "path_indices"), "path_indices");
  const root = parseCanonicalField(extractDeclaration(body, "expected_root"), "Noir shared-vector expected_root");

  const mainCalls = [...body.matchAll(/\bmain\s*\(/g)];
  const expectedCalls = [...body.matchAll(
    /\bmain\s*\(\s*leaf\s*,\s*path_elements\s*,\s*path_indices\s*,\s*expected_root\s*\)\s*;/g,
  )];
  if (mainCalls.length !== 1 || expectedCalls.length !== 1) {
    throw new Error("Noir shared-vector test must pass its declared values to main exactly once");
  }

  return { leaf, pathElements, pathIndices, root: root.toString() };
}

function assertNoirMerkleVector(source, vector) {
  const expected = parseMerkleVector(vector);
  const actual = parseNoirMerkleVector(source);

  if (actual.leaf !== expected.leaf) {
    throw new Error("Noir Merkle leaf does not match the checked-in BN254 vector");
  }
  if (actual.pathElements.length !== expected.pathElements.length ||
      actual.pathElements.some((value, index) => value !== expected.pathElements[index])) {
    throw new Error("Noir Merkle path elements do not match the checked-in BN254 vector");
  }
  if (actual.pathIndices.length !== expected.pathIndices.length ||
      actual.pathIndices.some((value, index) => value !== expected.pathIndices[index])) {
    throw new Error("Noir Merkle path indices do not match the checked-in BN254 vector");
  }
  if (actual.root !== expected.root) {
    throw new Error("Noir Merkle root does not match the checked-in BN254 vector");
  }
  return actual;
}

module.exports = { assertNoirMerkleVector, parseNoirMerkleVector, stripNoirComments };
