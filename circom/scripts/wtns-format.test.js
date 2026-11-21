const assert = require("node:assert/strict");
const test = require("node:test");
const { parseWtns } = require("./wtns-format");

function section(id, payload) {
  const header = Buffer.alloc(12);
  header.writeUInt32LE(id, 0);
  header.writeBigUInt64LE(BigInt(payload.length), 4);
  return Buffer.concat([header, payload]);
}

function encodeLittleEndian(value, width) {
  const bytes = Buffer.alloc(width);
  let remaining = BigInt(value);
  for (let index = 0; index < width; index += 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  assert.equal(remaining, 0n, "value must fit in the requested field width");
  return bytes;
}

function createHeader({ fieldBytes = 1, primeField = 17n, witnessCount = 2 } = {}) {
  return Buffer.concat([
    Buffer.from([fieldBytes, 0, 0, 0]),
    encodeLittleEndian(primeField, fieldBytes),
    Buffer.from([
      witnessCount & 0xff,
      (witnessCount >>> 8) & 0xff,
      (witnessCount >>> 16) & 0xff,
      (witnessCount >>> 24) & 0xff,
    ]),
  ]);
}

function createWtns({ version = 2, sectionCount = 2, header, witness, sections } = {}) {
  const headerPayload = header ?? createHeader();
  const witnessPayload = witness ?? Buffer.from([1, 2]);
  const sectionData = sections ?? [section(1, headerPayload), section(2, witnessPayload)];
  const fileHeader = Buffer.alloc(12);
  fileHeader.write("wtns", 0, "ascii");
  fileHeader.writeUInt32LE(version, 4);
  fileHeader.writeUInt32LE(sectionCount, 8);
  return Buffer.concat([fileHeader, ...sectionData]);
}

test("parses a structurally valid WTNS v2 file", () => {
  assert.deepEqual(parseWtns(createWtns()), {
    version: 2,
    fieldBytes: 1,
    witnessCount: 2,
    primeField: "17",
  });
});

test("accepts valid WTNS sections in either order", () => {
  const header = createHeader();
  assert.deepEqual(parseWtns(createWtns({
    sections: [section(2, Buffer.from([1, 2])), section(1, header)],
  })), {
    version: 2,
    fieldBytes: 1,
    witnessCount: 2,
    primeField: "17",
  });
});

test("rejects non-buffer input", () => {
  assert.throws(() => parseWtns("wtns"), /must be a Buffer/);
});

test("rejects a truncated file header", () => {
  assert.throws(() => parseWtns(Buffer.from("wtns")), /truncated before the header/);
});

test("rejects an invalid magic header", () => {
  const data = createWtns();
  data.write("nope", 0, "ascii");
  assert.throws(() => parseWtns(data), /invalid magic header/);
});

test("rejects unsupported WTNS versions", () => {
  assert.throws(() => parseWtns(createWtns({ version: 1 })), /Unsupported WTNS version: 1/);
});

test("rejects an unexpected section count", () => {
  assert.throws(() => parseWtns(createWtns({ sectionCount: 3 })), /Expected 2 WTNS sections/);
});

test("rejects truncated section headers", () => {
  assert.throws(() => parseWtns(createWtns({ sections: [Buffer.from([1])] })), /truncated header/);
});

test("rejects section sizes that extend beyond the file", () => {
  const data = createWtns();
  data.writeBigUInt64LE(1000n, 16);
  assert.throws(() => parseWtns(data), /extends beyond the file/);
});

test("rejects duplicate section identifiers", () => {
  const header = createHeader();
  assert.throws(() => parseWtns(createWtns({
    sections: [section(1, header), section(1, Buffer.from([1]))],
  })), /duplicate section 1/);
});

test("rejects files missing a required section", () => {
  const header = createHeader();
  assert.throws(() => parseWtns(createWtns({
    sections: [section(1, header), section(3, Buffer.from([1, 2]))],
  })), /must contain header and witness sections/);
});

test("rejects malformed field-width metadata", () => {
  assert.throws(() => parseWtns(createWtns({
    header: Buffer.from([0, 0, 0, 0, 17, 2, 0, 0, 0]),
  })), /invalid field width/);
});

test("rejects truncated header-section metadata", () => {
  assert.throws(() => parseWtns(createWtns({ header: Buffer.from([1, 0, 0, 0]) })), /header section is truncated/);
});

test("rejects a zero witness count", () => {
  assert.throws(() => parseWtns(createWtns({
    header: createHeader({ witnessCount: 0 }),
    witness: Buffer.alloc(0),
  })), /declares no witnesses/);
});

test("rejects witness data whose size disagrees with its header", () => {
  assert.throws(() => parseWtns(createWtns({ witness: Buffer.from([1]) })), /length does not match its header/);
});

test("rejects trailing bytes after the declared sections", () => {
  assert.throws(() => parseWtns(Buffer.concat([createWtns(), Buffer.from([0])])), /trailing data/);
});

test("rejects a zero prime field modulus", () => {
  assert.throws(() => parseWtns(createWtns({
    header: createHeader({ primeField: 0n }),
  })), /invalid prime field modulus/);
});

test("rejects a modulus that cannot define a field", () => {
  assert.throws(() => parseWtns(createWtns({
    header: createHeader({ primeField: 1n }),
  })), /invalid prime field modulus/);
});

test("accepts the largest canonical witness value below the modulus", () => {
  assert.doesNotThrow(() => parseWtns(createWtns({ witness: Buffer.from([16, 0]) })));
});

test("rejects a witness equal to the prime field modulus", () => {
  assert.throws(() => parseWtns(createWtns({ witness: Buffer.from([17, 2]) })), /witness 0 is not a canonical field element/);
});

test("rejects a witness greater than the prime field modulus", () => {
  assert.throws(() => parseWtns(createWtns({ witness: Buffer.from([18, 2]) })), /witness 0 is not a canonical field element/);
});

test("reads multi-byte prime fields and witness values as little-endian integers", () => {
  const data = createWtns({
    header: createHeader({ fieldBytes: 2, primeField: 257n }),
    witness: Buffer.concat([encodeLittleEndian(256n, 2), encodeLittleEndian(0n, 2)]),
  });
  assert.equal(parseWtns(data).primeField, "257");
});
