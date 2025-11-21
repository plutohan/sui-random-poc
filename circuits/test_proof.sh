#!/bin/bash

# Test Proof Generation Script
# Tests the claim circuit with example inputs

set -e

echo "🧪 Testing ZK Proof Generation..."
echo ""

# Check if circuit is compiled
if [ ! -f "claim_final.zkey" ]; then
    echo "❌ Circuit not set up. Please run ./setup.sh first"
    exit 1
fi

# Create test input
echo "📝 Creating test input..."

# Example: secret = 12345, nullifier = 67890
SECRET=12345
NULLIFIER=67890
COMMITMENT=$((SECRET * SECRET + NULLIFIER * NULLIFIER))
NULLIFIER_HASH=$((NULLIFIER * NULLIFIER))

echo "Test values:"
echo "  secret = $SECRET"
echo "  nullifier = $NULLIFIER"
echo "  commitment = $COMMITMENT (${SECRET}² + ${NULLIFIER}²)"
echo "  nullifier_hash = $NULLIFIER_HASH (${NULLIFIER}²)"
echo ""

cat > input.json <<EOF
{
  "secret": "$SECRET",
  "nullifier": "$NULLIFIER",
  "commitment": "$COMMITMENT",
  "nullifierHash": "$NULLIFIER_HASH"
}
EOF

echo "✅ Test input created: input.json"
echo ""

# Generate witness
echo "🔨 Step 1: Generating witness..."
node claim_js/generate_witness.js claim_js/claim.wasm input.json witness.wtns

if [ $? -eq 0 ]; then
    echo "✅ Witness generated"
else
    echo "❌ Witness generation failed"
    exit 1
fi
echo ""

# Generate proof
echo "🎯 Step 2: Generating proof..."
snarkjs groth16 prove claim_final.zkey witness.wtns proof.json public.json

if [ $? -eq 0 ]; then
    echo "✅ Proof generated"
else
    echo "❌ Proof generation failed"
    exit 1
fi
echo ""

# Display proof
echo "📄 Generated Proof:"
cat proof.json | jq
echo ""

echo "📄 Public Signals:"
cat public.json | jq
echo ""

# Verify proof
echo "✅ Step 3: Verifying proof..."
snarkjs groth16 verify verification_key.json public.json proof.json

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Proof verification successful!"
else
    echo ""
    echo "❌ Proof verification failed"
    exit 1
fi
echo ""

# Convert proof for Move contract
echo "📦 Step 4: Converting proof for Move contract..."

# Extract proof components
PROOF_A=$(cat proof.json | jq -r '.pi_a | @json')
PROOF_B=$(cat proof.json | jq -r '.pi_b | @json')
PROOF_C=$(cat proof.json | jq -r '.pi_c | @json')

echo "Proof components for Move contract:"
echo "  proof_a: $PROOF_A"
echo "  proof_b: $PROOF_B"
echo "  proof_c: $PROOF_C"
echo "  commitment: $COMMITMENT"
echo "  nullifier_hash: $NULLIFIER_HASH"
echo ""

# Create a file with Move-compatible format
cat > proof_move.json <<EOF
{
  "proof_a": $PROOF_A,
  "proof_b": $PROOF_B,
  "proof_c": $PROOF_C,
  "commitment": "$COMMITMENT",
  "nullifier_hash": "$NULLIFIER_HASH"
}
EOF

echo "✅ Move-compatible proof saved to: proof_move.json"
echo ""

echo "🎉 All tests passed!"
echo ""
echo "Files generated:"
echo "  - input.json        (Test input)"
echo "  - witness.wtns      (Witness)"
echo "  - proof.json        (ZK proof)"
echo "  - public.json       (Public signals)"
echo "  - proof_move.json   (Move-compatible format)"
