const { parseCanonicalField } = require("./merkle-vector");

function parsePoseidonVector(vector, expectedArity, label = "Poseidon vector") {
  if (vector === null || typeof vector !== "object" || Array.isArray(vector)) {
    throw new TypeError(`${label} must be a JSON object`);
  }
  if (!Number.isInteger(expectedArity) || expectedArity < 1) {
    throw new RangeError("expectedArity must be a positive integer");
  }
  if (!Array.isArray(vector.inputs) || vector.inputs.length !== expectedArity) {
    throw new Error(`${label} inputs must contain exactly ${expectedArity} values`);
  }

  const inputs = vector.inputs.map((value, index) =>
    parseCanonicalField(value, `${label} inputs[${index}]`));
  const output = parseCanonicalField(vector.output, `${label} output`);

  return { inputs, output };
}

module.exports = { parsePoseidonVector };
