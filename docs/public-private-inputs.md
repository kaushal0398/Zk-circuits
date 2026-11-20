# Public and private inputs

A circuit's public interface is part of its security model.

## Public inputs

Public inputs are visible to the verifier and bind a proof to a statement: for example a commitment, root, digest, amount, or application context.

## Private witnesses

Private witnesses are known to the prover. They must be constrained so a valid proof establishes the intended relation, rather than merely proving that witness-generation code returned a value.

## Review questions

- Is every public input necessary?
- Does each public input bind the proof to the intended application state?
- Can a private witness change without changing the constrained statement?
- Are integer bounds enforced rather than assumed?
- Is public-input ordering documented for verifier integration?

The circuit's public-input declaration determines what is exposed; frontend labels do not.
