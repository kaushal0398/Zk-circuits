function parseWitnessSymbols(content, witnessCount) {
  if (typeof content !== "string") {
    throw new TypeError("Circom symbol data must be a string");
  }
  if (!Number.isSafeInteger(witnessCount) || witnessCount < 1) {
    throw new RangeError("witnessCount must be a positive safe integer");
  }

  const signalIds = new Set();
  const signalNames = new Set();
  const witnessIndices = new Map();

  for (const [lineIndex, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line) continue;

    const fields = line.split(",");
    if (fields.length !== 4) {
      throw new Error(`Circom symbol line ${lineIndex + 1} must contain four comma-separated fields`);
    }

    const [signalIdText, witnessIndexText, componentIdText, signalName] = fields;
    if (!/^[1-9][0-9]*$/.test(signalIdText)
      || !/^-?(0|[1-9][0-9]*)$/.test(witnessIndexText)
      || !/^(0|[1-9][0-9]*)$/.test(componentIdText)
      || !signalName) {
      throw new Error(`Circom symbol line ${lineIndex + 1} contains invalid metadata`);
    }

    const signalId = Number(signalIdText);
    const witnessIndex = Number(witnessIndexText);
    const componentId = Number(componentIdText);
    if (!Number.isSafeInteger(signalId)
      || !Number.isSafeInteger(witnessIndex)
      || !Number.isSafeInteger(componentId)
      || witnessIndex < -1) {
      throw new Error(`Circom symbol line ${lineIndex + 1} contains an out-of-range index`);
    }
    if (signalIds.has(signalId)) {
      throw new Error(`Circom symbol file contains duplicate signal id ${signalId}`);
    }
    if (signalNames.has(signalName)) {
      throw new Error(`Circom symbol file contains duplicate signal name ${signalName}`);
    }
    signalIds.add(signalId);
    signalNames.add(signalName);

    if (witnessIndex >= 0) {
      if (witnessIndex >= witnessCount) {
        throw new Error(`Circom symbol ${signalName} references witness index ${witnessIndex} outside the witness`);
      }
      if (witnessIndices.has(witnessIndex)) {
        throw new Error(`Circom symbol file contains duplicate witness index ${witnessIndex}`);
      }
      witnessIndices.set(witnessIndex, signalName);
    }
  }

  // Witness slot zero is the constant one; every other slot must map to one symbol.
  for (let index = 1; index < witnessCount; index += 1) {
    if (!witnessIndices.has(index)) {
      throw new Error(`Circom symbol file is missing witness index ${index}`);
    }
  }

  return new Map([...witnessIndices].map(([index, name]) => [name, index]));
}

function assertPublicWitnessOrder(name, witnessCount, symbolContent, expectedPublicSignals) {
  if (!Array.isArray(expectedPublicSignals)) {
    throw new TypeError(`${name}: expected public signals must be an array`);
  }

  const signalIndices = parseWitnessSymbols(symbolContent, witnessCount);
  const seen = new Set();
  for (const [index, signalName] of expectedPublicSignals.entries()) {
    if (typeof signalName !== "string" || signalName.length === 0) {
      throw new TypeError(`${name}: expected public signal names must be non-empty strings`);
    }
    if (seen.has(signalName)) {
      throw new Error(`${name}: duplicate expected public signal ${signalName}`);
    }
    seen.add(signalName);

    if (!signalIndices.has(signalName)) {
      throw new Error(`${name}: public signal ${signalName} is missing from the Circom symbol file`);
    }

    const expectedIndex = index + 1;
    const actualIndex = signalIndices.get(signalName);
    if (actualIndex !== expectedIndex) {
      throw new Error(
        `${name}: public signal ${signalName} expected at witness index ${expectedIndex}, received ${actualIndex}`,
      );
    }
  }
}

function assertWitnessSignals(name, witnessValues, symbolContent, expectedSignals) {
  if (!Array.isArray(witnessValues) || witnessValues.some((value) => typeof value !== "string")) {
    throw new TypeError(`${name}: witness values must be an array of decimal strings`);
  }
  if (expectedSignals === null || typeof expectedSignals !== "object" || Array.isArray(expectedSignals)) {
    throw new TypeError(`${name}: expected signals must be an object`);
  }

  const signalIndices = parseWitnessSymbols(symbolContent, witnessValues.length);
  for (const [signalName, expectedValue] of Object.entries(expectedSignals)) {
    if (typeof expectedValue !== "string" || !/^(0|[1-9][0-9]*)$/.test(expectedValue)) {
      throw new TypeError(`${name}: expected value for ${signalName} must be a canonical decimal string`);
    }
    if (!signalIndices.has(signalName)) {
      throw new Error(`${name}: public signal ${signalName} is missing from the Circom symbol file`);
    }

    const witnessIndex = signalIndices.get(signalName);
    const actualValue = witnessValues[witnessIndex];
    if (actualValue !== expectedValue) {
      throw new Error(`${name}: ${signalName} expected ${expectedValue} at witness index ${witnessIndex}, received ${actualValue}`);
    }
  }
}

module.exports = { assertPublicWitnessOrder, assertWitnessSignals, parseWitnessSymbols };
