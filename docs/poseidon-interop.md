# Poseidon interoperability checklist

Matching hash names do not guarantee matching outputs across Noir and Circom.

Before sharing roots or digests between implementations, verify:

1. The same finite field and modulus.
2. The same Poseidon parameter set and width.
3. The same number and order of input elements.
4. The same byte-to-field encoding convention.
5. The same domain-separation rules.
6. At least one shared test vector computed independently by both implementations.

Do not claim cross-language compatibility until the shared vectors match. The current Merkle JSON example is illustrative, not a validated shared vector.
