use poseidon::poseidon::bn254::hash_2;

/// Reconstructs a depth-5 binary Merkle root from a leaf and its authentication path.
fn compute_root(
    leaf: Field,
    path_elements: [Field; 5],
    path_indices: [bool; 5],
) -> Field {
    let mut current = leaf;

    for i in 0..5 {
        if !path_indices[i] {
            current = hash_2([current, path_elements[i]]);
        } else {
            current = hash_2([path_elements[i], current]);
        }
    }

    current
}

/// Proves that a private leaf belongs to a public depth-5 Merkle root.
fn main(
    leaf: Field,
    path_elements: [Field; 5],
    path_indices: [bool; 5],
    merkle_root: pub Field,
) {
    assert(compute_root(leaf, path_elements, path_indices) == merkle_root);
}

#[test]
fn matches_shared_merkle_membership_bn254_depth5_vector() {
    let leaf = 11;
    let path_elements = [22, 33, 44, 55, 66];
    let path_indices = [false, true, false, true, false];

    // Independently unroll the five Poseidon levels as a reference for the loop.
    let h0 = hash_2([leaf, path_elements[0]]);
    let h1 = hash_2([path_elements[1], h0]);
    let h2 = hash_2([h1, path_elements[2]]);
    let h3 = hash_2([path_elements[3], h2]);
    let expected_root = hash_2([h3, path_elements[4]]);

    main(leaf, path_elements, path_indices, expected_root);
}

#[test(should_fail)]
fn rejects_wrong_depth5_root() {
    let leaf = 11;
    let path_elements = [22, 33, 44, 55, 66];
    let path_indices = [false, true, false, true, false];

    main(leaf, path_elements, path_indices, 123456);
}
