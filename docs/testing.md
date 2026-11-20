# Testing and local checks

## Noir

Install Nargo using the official Noir installation instructions, then run:

```bash
cd noir/multiplication
nargo check
nargo test
```

The test suite includes a valid multiplication witness and a deliberately invalid public product.

## Circom

Install Circom 2.1.6 or a compatible 2.x release. Compile the examples:

```bash
mkdir -p /tmp/multiplier /tmp/range-check
circom circom/multiplier/multiplier.circom --r1cs --wasm --sym -o /tmp/multiplier
circom circom/range-check/range_check.circom --r1cs --wasm --sym -o /tmp/range-check
```

Example witness inputs are provided beside each circuit. The range-check example represents 173 as an 8-bit little-endian decomposition.

## Continuous integration

The GitHub Actions workflow compiles both Circom examples and runs the Noir package tests on pushes and pull requests targeting `main`.

A successful compile is not a security review. Before relying on a circuit, add adversarial witness tests and inspect the generated constraints and verifier integration.
