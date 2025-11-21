# Lottery Claim Circuit

This directory contains the zero-knowledge circuit for privacy-preserving lottery prize claims.

## Prerequisites

Install circom and snarkjs:
```bash
npm install -g circom snarkjs
```

## Circuit Compilation

1. **Compile the circuit:**
```bash
circom claim.circom --r1cs --wasm --sym
```

2. **Generate proving and verification keys:**

Start a new powers of tau ceremony:
```bash
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
```

Generate the zkey:
```bash
snarkjs groth16 setup claim.r1cs pot12_final.ptau claim_0000.zkey
snarkjs zkey contribute claim_0000.zkey claim_final.zkey --name="Contribution" -v
```

3. **Export verification key:**
```bash
snarkjs zkey export verificationkey claim_final.zkey verification_key.json
```

4. **Export Solidity verifier (for reference):**
```bash
snarkjs zkey export solidityverifier claim_final.zkey verifier.sol
```

## Circuit Logic

The circuit proves knowledge of `secret` and `nullifier` such that:
- `commitment = secret² + nullifier²`
- `nullifierHash = nullifier²`

**Note:** This uses simplified quadratic constraints for the PoC. For production:
- Replace with Poseidon hash function
- Implement Merkle tree verification for larger anonymity sets
- Add range checks for input values

## Integration with Move Contract

The verification key components need to be extracted and hardcoded into the Move contract's `verify_groth16_proof` function.

## Testing the Circuit

Create a test input file `input.json`:
```json
{
  "secret": "12345",
  "nullifier": "67890",
  "commitment": "4757390025",
  "nullifierHash": "4609610100"
}
```

Generate witness and proof:
```bash
node claim_js/generate_witness.js claim_js/claim.wasm input.json witness.wtns
snarkjs groth16 prove claim_final.zkey witness.wtns proof.json public.json
snarkjs groth16 verify verification_key.json public.json proof.json
```
