#!/bin/bash

# Circuit Setup Script
# This script compiles the claim circuit and generates proving/verification keys

set -e

echo "🔧 Setting up ZK Lottery Claim Circuit..."
echo ""

# Check if circom and snarkjs are installed
if ! command -v circom &> /dev/null; then
    echo "❌ circom not found. Please install it:"
    echo "   npm install -g circom"
    exit 1
fi

if ! command -v snarkjs &> /dev/null; then
    echo "❌ snarkjs not found. Please install it:"
    echo "   npm install -g snarkjs"
    exit 1
fi

echo "✅ Dependencies found"
echo ""

# Step 1: Compile the circuit
echo "📝 Step 1: Compiling circuit..."
circom claim.circom --r1cs --wasm --sym --c

if [ $? -eq 0 ]; then
    echo "✅ Circuit compiled successfully"
else
    echo "❌ Circuit compilation failed"
    exit 1
fi
echo ""

# Step 2: View circuit info
echo "📊 Circuit Info:"
snarkjs r1cs info claim.r1cs
echo ""

# Step 3: Start Powers of Tau ceremony
echo "🎲 Step 2: Starting Powers of Tau ceremony..."
if [ ! -f "pot12_final.ptau" ]; then
    echo "   Creating new ceremony..."
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="random entropy"
    snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
    echo "✅ Powers of Tau ceremony completed"
else
    echo "✅ Using existing pot12_final.ptau"
fi
echo ""

# Step 4: Generate zkey
echo "🔑 Step 3: Generating proving key..."
if [ ! -f "claim_final.zkey" ]; then
    snarkjs groth16 setup claim.r1cs pot12_final.ptau claim_0000.zkey
    snarkjs zkey contribute claim_0000.zkey claim_final.zkey --name="Contribution" -v -e="random entropy"
    echo "✅ Proving key generated"
else
    echo "✅ Using existing claim_final.zkey"
fi
echo ""

# Step 5: Export verification key
echo "🔐 Step 4: Exporting verification key..."
snarkjs zkey export verificationkey claim_final.zkey verification_key.json
echo "✅ Verification key exported"
echo ""

# Step 6: Generate Solidity verifier for reference
echo "📄 Step 5: Generating Solidity verifier (reference)..."
snarkjs zkey export solidityverifier claim_final.zkey verifier.sol
echo "✅ Solidity verifier generated"
echo ""

# Cleanup intermediate files
echo "🧹 Cleaning up intermediate files..."
rm -f pot12_0000.ptau pot12_0001.ptau claim_0000.zkey
echo "✅ Cleanup complete"
echo ""

echo "🎉 Setup Complete!"
echo ""
echo "Generated files:"
echo "  - claim.r1cs          (R1CS constraint system)"
echo "  - claim.sym           (Symbol table)"
echo "  - claim_js/           (WASM witness generator)"
echo "  - claim_cpp/          (C++ witness generator)"
echo "  - claim_final.zkey    (Proving key)"
echo "  - verification_key.json (Verification key)"
echo "  - verifier.sol        (Solidity verifier - reference)"
echo ""
echo "Next steps:"
echo "  1. Run ./test_proof.sh to test proof generation"
echo "  2. Integrate verification key into Move contract"
