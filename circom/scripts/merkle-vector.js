const BN254_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const MERKLE_DEPTH = 4;

function parseCanonicalField(value, label) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${label} must be a canonical unsigned decimal string`);
  }

  const parsed = BigInt(value);
  if (parsed >= BN254_SCALAR_FIELD) {
    throw new Error(`${label} must be smaller than the BN254 scalar modulus`);
  }

  return parsed;
}

function parseMerkleVectorAtDepth(vector, depth, requireRoot = true) {
  if (vector === null || typeof vector !== "object" || Array.isArray(vector)) {
    throw new TypeError("Merkle vector must be a JSON object");
  }
  if (!Number.isSafeInteger(depth) || depth < 1) {
    throw new TypeError("Merkle vector depth must be a positive safe integer");
  }
  if (typeof requireRoot !== "boolean") {
    throw new TypeError("requireRoot must be a boolean");
  }
  if (!Array.isArray(vector.pathElements) || vector.pathElements.length !== depth) {
    throw new Error(`Merkle vector pathElements must contain exactly ${depth} values`);
  }
  if (!Array.isArray(vector.pathIndices) || vector.pathIndices.length !== depth) {
    throw new Error(`Merkle vector pathIndices must contain exactly ${depth} values`);
  }

  const leaf = parseCanonicalField(vector.leaf, "Merkle vector leaf");
  const pathElements = Array.from(vector.pathElements, (value, index) =>
    parseCanonicalField(value, `Merkle vector pathElements[${index}]`));

  const pathIndices = Array.from(vector.pathIndices, (value, index) => {
    if (value !== 0 && value !== 1) {
      throw new Error(`Merkle vector pathIndices[${index}] must be 0 or 1`);
    }
    return value;
  });

  if (requireRoot || vector.root !== undefined) {
    const root = parseCanonicalField(vector.root, "Merkle vector root");
    return { leaf, pathElements, pathIndices, root: root.toString() };
  }

  return { leaf, pathElements, pathIndices };
}

function parseMerkleVector(vector) {
  return parseMerkleVectorAtDepth(vector, MERKLE_DEPTH, true);
}

module.exports = {
  BN254_SCALAR_FIELD,
  parseCanonicalField,
  parseMerkleVector,
  parseMerkleVectorAtDepth,
};
