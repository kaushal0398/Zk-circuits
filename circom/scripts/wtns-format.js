const { checkPrimeSync } = require("node:crypto");

function readBigIntLE(buffer) {
  let value = 0n;
  for (let index = buffer.length - 1; index >= 0; index -= 1) {
    value = (value << 8n) | BigInt(buffer[index]);
  }
  return value;
}

function toBigEndianBuffer(value) {
  const hex = value.toString(16);
  return Buffer.from(hex.length % 2 === 0 ? hex : "0" + hex, "hex");
}

function parseWtns(buffer, { expectedPrimeField } = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError("WTNS input must be a Buffer");
  }
  if (expectedPrimeField !== undefined && (typeof expectedPrimeField !== "bigint" || expectedPrimeField <= 1n)) {
    throw new TypeError("expectedPrimeField must be a BigInt greater than 1");
  }
  if (buffer.length < 12) {
    throw new Error("WTNS file is truncated before the header");
  }
  if (buffer.toString("ascii", 0, 4) !== "wtns") {
    throw new Error("WTNS file has an invalid magic header");
  }

  const version = buffer.readUInt32LE(4);
  if (version !== 2) {
    throw new Error("Unsupported WTNS version: " + version);
  }

  const sectionCount = buffer.readUInt32LE(8);
  if (sectionCount !== 2) {
    throw new Error("Expected 2 WTNS sections, found " + sectionCount);
  }

  const sections = new Map();
  let offset = 12;

  for (let index = 0; index < sectionCount; index += 1) {
    if (buffer.length - offset < 12) {
      throw new Error("WTNS section " + (index + 1) + " has a truncated header");
    }

    const sectionId = buffer.readUInt32LE(offset);
    const sectionSize = buffer.readBigUInt64LE(offset + 4);
    offset += 12;

    if (sections.has(sectionId)) {
      throw new Error("WTNS contains duplicate section " + sectionId);
    }
    if (sectionSize > BigInt(buffer.length - offset)) {
      throw new Error("WTNS section " + sectionId + " extends beyond the file");
    }

    const size = Number(sectionSize);
    sections.set(sectionId, buffer.subarray(offset, offset + size));
    offset += size;
  }

  if (offset !== buffer.length) {
    throw new Error("WTNS file contains trailing data");
  }
  if (!sections.has(1) || !sections.has(2)) {
    throw new Error("WTNS file must contain header and witness sections");
  }

  const header = sections.get(1);
  if (header.length < 8) {
    throw new Error("WTNS header section is truncated");
  }

  const fieldBytes = header.readUInt32LE(0);
  if (fieldBytes === 0 || header.length !== 4 + fieldBytes + 4) {
    throw new Error("WTNS header section has an invalid field width");
  }

  const primeField = readBigIntLE(header.subarray(4, 4 + fieldBytes));
  if (primeField <= 1n) {
    throw new Error("WTNS header contains an invalid prime field modulus");
  }
  if (expectedPrimeField !== undefined && primeField !== expectedPrimeField) {
    throw new Error(`WTNS prime field modulus ${primeField} does not match expected circuit modulus ${expectedPrimeField}`);
  }
  if (!checkPrimeSync(toBigEndianBuffer(primeField))) {
    throw new Error("WTNS header contains a modulus that is not prime");
  }

  // snarkjs stores field elements in 64-bit words, rounding the modulus width up.
  const expectedFieldBytes = Math.ceil(primeField.toString(2).length / 64) * 8;
  if (fieldBytes !== expectedFieldBytes) {
    throw new Error("WTNS field width must be " + expectedFieldBytes + " bytes for its modulus");
  }

  const witnessCount = header.readUInt32LE(4 + fieldBytes);
  if (witnessCount === 0) {
    throw new Error("WTNS header declares no witnesses");
  }

  const witnessSection = sections.get(2);
  const expectedWitnessBytes = BigInt(fieldBytes) * BigInt(witnessCount);
  if (BigInt(witnessSection.length) !== expectedWitnessBytes) {
    throw new Error("WTNS witness section length does not match its header");
  }

  for (let index = 0; index < witnessCount; index += 1) {
    const start = index * fieldBytes;
    const value = readBigIntLE(witnessSection.subarray(start, start + fieldBytes));
    if (value >= primeField) {
      throw new Error(`WTNS witness ${index} is not a canonical field element`);
    }
  }

  return { version, fieldBytes, witnessCount, primeField: primeField.toString() };
}

module.exports = { parseWtns };
