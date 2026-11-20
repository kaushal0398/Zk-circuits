use poseidon::poseidon::bn254::hash_2;

/// Proves that a private leaf belongs to a public depth-4 Merkle root.
/// path_indices[i] is false when the current node is the left child.
fn main(
    leaf: Field,
    path_elements: [Field; 4],
    path_indices: [bool; 4],
    merkle_root: pub Field,
) {
    let mut current = leaf;

    for i in 0..4 {
        if !path_indices[i] {
            current = hash_2([current, path_elements[i]]);
        } else {
            current = hash_2([path_elements[i], current]);
        }
    }

    assert(current == merkle_root);
}

#[test]
fn accepts_leaf_with_correct_path() {
    let leaf = 11;
    let path_elements = [22, 33, 44, 55];
    let path_indices = [false, true, false, true];

    let h0 = hash_2([leaf, path_elements[0]]);
    let h1 = hash_2([path_elements[1], h0]);
    let h2 = hash_2([h1, path_elements[2]]);
    let root = hash_2([path_elements[3], h2]);

    let mut computed = leaf;
    for i in 0..4 {
        if !path_indices[i] {
            computed = hash_2([computed, path_elements[i]]);
        } else {
            computed = hash_2([path_elements[i], computed]);
        }
    }

    assert(computed == root);
}

#[test(should_fail)]
fn rejects_wrong_root() {
    let leaf = 11;
    let path_elements = [22, 33, 44, 55];
    let path_indices = [false, true, false, true];
    let wrong_root = 123456;

    let mut computed = leaf;
    for i in 0..4 {
        if !path_indices[i] {
            computed = hash_2([computed, path_elements[i]]);
        } else {
            computed = hash_2([path_elements[i], computed]);
        }
    }

    assert(computed == wrong_root);
}
