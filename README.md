# zk-circuits

A learning-oriented collection of zero-knowledge circuits implemented in **Noir** and **Circom**.

## Circuit catalogue

| Topic | Noir | Circom |
|---|---|---|
| Multiplication relation | `noir/multiplication` | `circom/multiplier` |
| 8-bit range check | planned | `circom/range-check` |
| Poseidon Merkle membership | `noir/merkle-membership` | `circom/merkle-membership` |
| Poseidon hash preimage | next | next |

## Toolchains

- Noir / Nargo
- Circom 2
- circomlib for Circom Poseidon components

## Local checks

See [docs/testing.md](docs/testing.md). CI compiles the Circom examples and runs Noir package checks on pushes and pull requests.

## Design principles

- State public inputs and private witness inputs explicitly.
- Constrain every value that affects the statement.
- Treat field elements and bounded integers as different concepts.
- Test valid, invalid, and boundary witnesses.
- Keep hash parameters and input ordering consistent across implementations.

## Security

These examples are educational and are not audited. Compilation and passing tests do not prove circuit soundness. Review constraints, field semantics, trusted setup, and verifier integration before production use.
