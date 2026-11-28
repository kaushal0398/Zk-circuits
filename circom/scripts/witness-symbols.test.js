const assert = require("node:assert/strict");
const test = require("node:test");
const { assertPublicWitnessOrder, assertWitnessSignals, parseWitnessSymbols } = require("./witness-symbols");

const symbols = "1,1,0,main.product\n2,2,0,main.a\n3,3,0,main.b\n";

test("maps named signals to their compiled witness positions", () => {
  assert.deepEqual([...parseWitnessSymbols(symbols, 4)], [
    ["main.product", 1],
    ["main.a", 2],
    ["main.b", 3],
  ]);
});

test("checks expected public values at symbol-mapped witness positions", () => {
  assert.doesNotThrow(() => assertWitnessSignals("multiplier", ["1", "63", "7", "9"], symbols, {
    "main.product": "63",
  }));
});

test("rejects a public value that differs from its expected value", () => {
  assert.throws(() => assertWitnessSignals("multiplier", ["1", "64", "7", "9"], symbols, {
    "main.product": "63",
  }), /main[.]product expected 63 at witness index 1, received 64/);
});

test("rejects a requested signal missing from the symbol file", () => {
  assert.throws(() => assertWitnessSignals("multiplier", ["1", "63", "7", "9"], symbols, {
    "main.output": "63",
  }), /public signal main[.]output is missing/);
});

test("ignores simplified-away signals but requires every witness slot to be mapped", () => {
  const content = "1,1,0,main.product\n2,-1,0,main.removed\n3,2,0,main.a\n";
  assert.deepEqual([...parseWitnessSymbols(content, 3)], [["main.product", 1], ["main.a", 2]]);
  assert.throws(() => parseWitnessSymbols("1,1,0,main.product\n", 3), /missing witness index 2/);
});

test("rejects duplicate witness positions", () => {
  assert.throws(() => parseWitnessSymbols(
    "1,1,0,main.product\n2,1,0,main.other\n",
    2,
  ), /duplicate witness index 1/);
});

test("rejects malformed symbol rows", () => {
  assert.throws(() => parseWitnessSymbols("1,1,main.product", 2), /must contain four comma-separated fields/);
});

test("rejects component identifiers outside the safe integer range", () => {
  assert.throws(
    () => parseWitnessSymbols("1,1,9007199254740992,main.product\n", 2),
    /out-of-range index/,
  );
});

test("accepts public outputs followed by public inputs in Circom witness order", () => {
  assert.doesNotThrow(() => assertPublicWitnessOrder(
    "multiplier",
    4,
    symbols,
    ["main.product", "main.a", "main.b"],
  ));
});

test("rejects a public signal moved from its expected witness position", () => {
  const reordered = "1,1,0,main.a\n2,2,0,main.product\n3,3,0,main.b\n";
  assert.throws(() => assertPublicWitnessOrder(
    "multiplier",
    4,
    reordered,
    ["main.product", "main.a", "main.b"],
  ), /public signal main[.]product expected at witness index 1, received 2/);
});

test("rejects an expected public signal missing from the compiled symbol map", () => {
  assert.throws(() => assertPublicWitnessOrder(
    "multiplier",
    4,
    symbols,
    ["main.product", "main.a", "main.output"],
  ), /public signal main[.]output is missing/);
});

test("rejects duplicate names in the expected public interface", () => {
  assert.throws(() => assertPublicWitnessOrder(
    "multiplier",
    4,
    symbols,
    ["main.product", "main.product"],
  ), /duplicate expected public signal main[.]product/);
});
