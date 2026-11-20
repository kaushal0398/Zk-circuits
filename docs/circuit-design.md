# Circuit design and review checklist

## Specify the statement

- List public inputs, private witness inputs, and outputs.
- Write the exact relation being proven.
- Define intended field and integer ranges.
- Distinguish field elements from bounded integers.

## Constraint review

- Every output must be constrained.
- Every witness value affecting the claim must participate in constraints.
- Boolean values must be constrained, for example with `b * (b - 1) === 0`.
- Integer range assumptions must be explicit; field arithmetic alone does not imply ordinary integer arithmetic.
- Witness-generation code is not a substitute for constraints.

## Test matrix

1. Valid witness.
2. Witness violating the core relation.
3. Minimum and maximum boundary values.
4. Values immediately outside each boundary.
5. Cases that could expose missing boolean or range constraints.

## Security note

Compilation and local tests do not establish soundness. Review compiled constraints, public input ordering, field semantics, trusted setup (where applicable), and verifier integration. Obtain independent review before production use.
