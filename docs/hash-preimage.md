# Poseidon hash preimage

The Circom circuit proves knowledge of a private field element `preimage` whose one-input circomlib Poseidon hash equals the public `digest`.

The digest is public; the preimage is private. This circuit is intentionally minimal and does not add application-level domain separation. Production protocols should define a domain-separation convention and use the exact same Poseidon parameters in the tree builder and verifier.
