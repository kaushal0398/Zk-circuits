use poseidon::poseidon::bn254::hash_1;

/// Proves knowledge of a private preimage for a public Poseidon digest.
fn main(preimage: Field, digest: pub Field) {
    assert(hash_1([preimage]) == digest);
}

#[test]
fn accepts_matching_digest() {
    let preimage = 42;
    let digest = hash_1([preimage]);
    main(preimage, digest);
}

#[test(should_fail)]
fn rejects_non_matching_digest() {
    let preimage = 42;
    let wrong_digest = 123456;
    main(preimage, wrong_digest);
}

#[test]
fn matches_shared_poseidon_bn254_hash_1_vector() {
    // Keep this known-answer value aligned with test-vectors/poseidon-hash-1-bn254.json.
    let expected_digest: Field = 18586133768512220936620570745912940619677854269274689475585506675881198879027;
    main(1, expected_digest);
}
