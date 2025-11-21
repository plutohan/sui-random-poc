# ZK-Enhanced Lottery Architecture

## Overview

This lottery system implements maximum privacy using Zero-Knowledge Proofs, inspired by the sui-mixer-poc. Users can pick slots and claim prizes anonymously without revealing their identity on-chain.

## Key Privacy Features

1. ✅ **Commitments Only On-Chain** - Only cryptographic commitments (hashes) are stored, not secrets
2. ✅ **Blob IDs Never On-Chain** - Walrus storage references kept completely private
3. ✅ **ZK Proofs for Claims** - Prove knowledge without revelation
4. ✅ **Nullifiers Prevent Double-Claiming** - Each prize can only be claimed once
5. ✅ **Complete Unlinkability** - No on-chain link between picks and claims

## Architecture

### Pick Slot Flow

```
1. User generates random values:
   - secret (random number)
   - nullifier (random number)

2. Compute commitment:
   commitment = secret² + nullifier²

3. Create encrypted note:
   note = {secret, nullifier, slotIndex, lotteryId}
   encrypted_note = encrypt(note)

4. Upload to Walrus:
   blob_id = walrus.upload(encrypted_note)
   Store blob_id locally (NEVER on-chain)

5. Submit on-chain:
   pick_slot(slot_index, commitment)
   Only commitment is stored on-chain
```

### Win & Claim Flow

```
1. Winner determination (on-chain):
   - Random selection occurs
   - winning_commitment is set
   - NO private data emitted

2. Claim preparation (off-chain):
   - Retrieve blob_id from localStorage
   - Fetch note from Walrus: walrus.get(blob_id)
   - Decrypt note to get secret & nullifier

3. Generate ZK proof:
   - Prove: commitment = secret² + nullifier²
   - Prove: nullifier_hash = nullifier²
   - Using Groth16 ZK-SNARK

4. Submit claim (on-chain):
   claim_prize_with_proof(proof, commitment, nullifier_hash)
   - Verifies proof cryptographically
   - Checks nullifier not already used
   - Transfers prize to ANY address (anonymity)
```

## Smart Contract Changes

### Lottery Struct

**Before (Secret Hash Based):**
```move
slot_secret_hashes: vector<option::Option<vector<u8>>>
```

**After (Commitment Based):**
```move
slot_commitments: vector<option::Option<u64>>  // Commitments only
used_nullifiers: Table<u64, bool>              // Prevent double-claiming
winning_commitment: option::Option<u64>        // For verification
```

### Key Functions

#### `pick_slot()`
- Accepts `commitment` instead of `claim_secret_hash`
- Stores only the commitment on-chain
- Sets `winning_commitment` when user wins
- NO events emitting private data

#### `claim_prize_with_proof()`
- Replaces `claim_prize_with_secret()`
- Accepts Groth16 proof components
- Verifies ZK proof
- Checks nullifier uniqueness
- Allows claiming from ANY wallet address

### Events

**Removed:** `WinnerClaimInfoEvent` (privacy leak)

**Added:** `PrizeClaimedEvent`
```move
public struct PrizeClaimedEvent {
  lottery_id: ID,
  nullifier_hash: u64,  // Public, prevents double-claiming
}
```

## ZK Circuit

Location: `circuits/claim.circom`

```circom
// Private inputs (never revealed)
signal input secret;
signal input nullifier;

// Public inputs (verified on-chain)
signal input commitment;
signal input nullifierHash;

// Constraints
commitment === secret * secret + nullifier * nullifier;
nullifierHash === nullifier * nullifier;
```

## Privacy Analysis

### On-Chain Data (Publicly Visible)

✅ **Safe:**
- Commitments (cryptographic hashes)
- Nullifier hashes (prevent double-claims)
- Slot states (picked/unpicked)
- Winner existence (yes/no)

### Off-Chain Data (Private)

🔒 **Never On-Chain:**
- Walrus blob_id (stored in localStorage)
- Secret values
- Nullifier values
- Encrypted notes

### Unlinkability

**Without ZK Proofs:**
- `pick_slot(slot_5)` → secret_hash_A on-chain
- `claim_prize(secret_A)` → Links to slot_5 ❌

**With ZK Proofs:**
- `pick_slot(slot_5)` → commitment_X on-chain
- `claim_prize(proof)` → Only proves knowledge of commitment_X ✅
- No way to link claim to picker's address

## Security Considerations

### Current Implementation (PoC)

⚠️ **Simplified for demonstration:**
- Using quadratic constraints (secret² + nullifier²)
- Placeholder proof verification
- Small anonymity set (9 slots)

### Production Requirements

🔒 **Must implement:**
1. **Cryptographic Hash Functions:**
   - Replace quadratic with Poseidon hash
   - Use proper domain separation

2. **Real Groth16 Verification:**
   - Implement BLS12-381 pairing checks
   - Add verification key to contract
   - Proper proof deserialization

3. **Larger Anonymity Sets:**
   - Implement Merkle trees
   - Allow hundreds/thousands of participants
   - Batch multiple lotteries

4. **Encryption:**
   - ECIES for encrypted notes
   - Key derivation for Walrus storage

5. **Additional Security:**
   - Range checks on inputs
   - Front-running protection
   - Relayer network for gas-less claims

## Comparison to Mixer

| Feature | Mixer | ZK Lottery |
|---------|-------|------------|
| Purpose | Privacy transfers | Random lottery |
| Commitment Storage | Yes | Yes |
| Nullifiers | Yes | Yes |
| ZK Proofs | Groth16 | Groth16 (simplified) |
| Blob ID on-chain | ❌ Never | ❌ Never |
| Anonymity Set | Pool-based | Slot-based |
| Double-spend Prevention | Nullifiers | Nullifiers |

## Frontend Integration

### Key Changes

1. **Secret Generation:**
   ```typescript
   const secret = randomInt(1_000_000)
   const nullifier = randomInt(1_000_000)
   const commitment = secret * secret + nullifier * nullifier
   ```

2. **Walrus Upload:**
   ```typescript
   const note = { secret, nullifier, slotIndex, lotteryId }
   const blob_id = await walrus.upload(encrypt(note))
   localStorage.setItem(`lottery_${lotteryId}`, blob_id)
   ```

3. **ZK Proof Generation:**
   ```typescript
   const { proof, publicSignals } = await snarkjs.groth16.fullProve(
     { secret, nullifier, commitment, nullifierHash },
     wasmFile,
     zkeyFile
   )
   ```

4. **Anonymous Claiming:**
   ```typescript
   claim_prize_with_proof(
     proof.a, proof.b, proof.c,
     commitment,
     nullifierHash
   )
   ```

## Testing

### Circuit Testing
```bash
cd circuits
circom claim.circom --r1cs --wasm
# Generate and test proof locally
```

### Contract Testing
```bash
cd random_poc
sui move build
sui move test
```

### Integration Testing
- Test commitment generation
- Verify proof generation
- Test nullifier uniqueness
- Verify anonymity guarantees

## Future Enhancements

1. **Production ZK System:**
   - Implement full Groth16 verification
   - Use Poseidon hash function
   - Add Merkle tree for large anonymity sets

2. **Enhanced Privacy:**
   - Relayer network for meta-transactions
   - Ring signatures for additional anonymity
   - Stealth addresses

3. **Scalability:**
   - Batch proof verification
   - Optimistic rollups
   - Layer 2 solutions

## References

- [sui-mixer-poc](https://github.com/wsong0101/sui-mixer-poc) - Inspiration for this design
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf) - ZK-SNARK construction
- [Tornado Cash](https://tornado.cash) - Privacy mixer reference
- [Sui Cryptography](https://docs.sui.io/guides/developer/cryptography) - BLS12-381 support
