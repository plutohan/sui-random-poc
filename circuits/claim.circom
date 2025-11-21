pragma circom 2.0.0;

/*
 * Lottery Claim Circuit
 *
 * This circuit proves that the claimer knows the secret and nullifier
 * corresponding to the winning commitment without revealing them.
 *
 * Private Inputs:
 *   - secret: Random value chosen during slot pick
 *   - nullifier: Random value to prevent double-claiming
 *
 * Public Inputs:
 *   - commitment: Hash of secret and nullifier (stored on-chain when picking slot)
 *   - nullifierHash: Hash of nullifier (to prevent double-claiming)
 *
 * Constraints:
 *   1. commitment = secret^2 + nullifier^2
 *   2. nullifierHash = nullifier^2
 *
 * Note: For production, replace with Poseidon hash or similar cryptographic hash
 */

template LotteryClaim() {
    // Private inputs
    signal input secret;
    signal input nullifier;

    // Public inputs
    signal input commitment;
    signal input nullifierHash;

    // Intermediate signals
    signal secretSquared;
    signal nullifierSquared;

    // Compute secret^2
    secretSquared <== secret * secret;

    // Compute nullifier^2
    nullifierSquared <== nullifier * nullifier;

    // Verify commitment = secret^2 + nullifier^2
    commitment === secretSquared + nullifierSquared;

    // Verify nullifierHash = nullifier^2
    nullifierHash === nullifierSquared;
}

component main {public [commitment, nullifierHash]} = LotteryClaim();
