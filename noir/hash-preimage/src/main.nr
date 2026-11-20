use poseidon::poseidon::bn254::hash_1;

/// Proves knowledge of a private preimage for a public Poseidon digest.
fn main(preimage: Field, digest: pub Field) {
    assert(hash_1([preimage]) == digest);
}

#[test]
fn accepts_matching_digest() {
    let preimage = 42;
    let digest = hash_1([preimage]);
    assert(hash_1([preimage]) == digest);
}

#[test(should_fail)]
fn rejects_non_matching_digest() {
    let preimage = 42;
    let wrong_digest = 123456;
    assert(hash_1([preimage]) == wrong_digest);
}
