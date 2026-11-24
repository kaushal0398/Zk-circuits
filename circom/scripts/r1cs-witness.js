function assertR1csWitnessResult(name, result) {
  if (result.error) {
    throw new Error(name + ": could not run snarkjs witness check: " + result.error.message);
  }

  const output = (result.stdout ?? "") + "\n" + (result.stderr ?? "");
  if (result.status !== 0) {
    throw new Error(name + ": snarkjs rejected the generated witness (exit " + result.status + ")\n" + output);
  }
  if (!/^\\s*(?:\\[INFO\\]\\s*)?snarkJS:\\s*WITNESS IS CORRECT\\s*$/im.test(output)) {
    throw new Error(name + ": snarkjs did not confirm witness constraint satisfaction\n" + output);
  }
}

module.exports = { assertR1csWitnessResult };
