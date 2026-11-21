function assertWitnessResult(name, result, shouldPass) {
  if (result.error) {
    throw new Error(`${name}: could not execute witness calculator: ${result.error.message}`);
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  if (shouldPass && result.status !== 0) {
    throw new Error(`${name}: expected valid witness\n${output}`);
  }

  if (!shouldPass && (result.status === null || result.signal != null)) {
    const termination = result.signal ? `signal ${result.signal}` : "no exit status";
    throw new Error(`${name}: witness calculator did not exit normally (${termination})\n${output}`);
  }

  if (!shouldPass && result.status === 0) {
    throw new Error(`${name}: invalid witness unexpectedly succeeded`);
  }

  if (!shouldPass && !/assert failed/i.test(output)) {
    throw new Error(`${name}: expected a constraint assertion failure, received:\n${output}`);
  }
}

module.exports = { assertWitnessResult };
