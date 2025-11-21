const snarkjs = require('../frontend/node_modules/snarkjs');
const fs = require('fs');

// Test inputs for proof generation
const TEST_SECRET = 1000n;
const TEST_BASE_NULLIFIER = 2000n;
const TEST_SLOT_INDEX = 3n;

// Calculate commitment and nullifier hash
const slotNullifier = TEST_BASE_NULLIFIER + TEST_SLOT_INDEX;
const secretSquared = TEST_SECRET * TEST_SECRET;
const nullifierSquared = slotNullifier * slotNullifier;
const commitment = secretSquared + nullifierSquared;
const nullifierHash = nullifierSquared;

console.log('Test Proof Generation');
console.log('='.repeat(50));
console.log('Inputs:');
console.log(`  Secret: ${TEST_SECRET}`);
console.log(`  Base Nullifier: ${TEST_BASE_NULLIFIER}`);
console.log(`  Slot Index: ${TEST_SLOT_INDEX}`);
console.log(`  Slot Nullifier: ${slotNullifier}`);
console.log(`  Commitment: ${commitment}`);
console.log(`  Nullifier Hash: ${nullifierHash}`);
console.log('='.repeat(50));

async function generateTestProof() {
    try {
        const input = {
            secret: TEST_SECRET.toString(),
            nullifier: slotNullifier.toString(),
            commitment: commitment.toString(),
            nullifierHash: nullifierHash.toString(),
        };

        console.log('\nGenerating proof...');
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            './claim_js/claim.wasm',
            './claim_final.zkey'
        );

        console.log('\n✓ Proof generated successfully!');
        console.log('\nPublic Signals:');
        console.log(`  [0] Commitment: ${publicSignals[0]}`);
        console.log(`  [1] Nullifier Hash: ${publicSignals[1]}`);

        // Convert proof to little-endian byte arrays for Sui
        function bigIntToBytes32LE(value) {
            const bytes = [];
            let v = BigInt(value);
            for (let i = 0; i < 32; i++) {
                bytes.push(Number(v & 0xFFn));
                v = v >> 8n;
            }
            return bytes;
        }

        function encodeG1Point(point) {
            const xBytes = bigIntToBytes32LE(point[0]);
            const yBytes = bigIntToBytes32LE(point[1]);
            return [...xBytes, ...yBytes];
        }

        function encodeG2Point(point) {
            const x_c0_bytes = bigIntToBytes32LE(point[0][0]);
            const x_c1_bytes = bigIntToBytes32LE(point[0][1]);
            const y_c0_bytes = bigIntToBytes32LE(point[1][0]);
            const y_c1_bytes = bigIntToBytes32LE(point[1][1]);
            return [...x_c0_bytes, ...x_c1_bytes, ...y_c0_bytes, ...y_c1_bytes];
        }

        const proof_a = encodeG1Point(proof.pi_a);
        const proof_b = encodeG2Point(proof.pi_b);
        const proof_c = encodeG1Point(proof.pi_c);

        console.log('\nProof Sizes:');
        console.log(`  proof_a: ${proof_a.length} bytes`);
        console.log(`  proof_b: ${proof_b.length} bytes`);
        console.log(`  proof_c: ${proof_c.length} bytes`);

        // Generate Move test code
        const moveCode = `
// Test proof data generated for:
//   Secret: ${TEST_SECRET}
//   Base Nullifier: ${TEST_BASE_NULLIFIER}
//   Slot Index: ${TEST_SLOT_INDEX}
//   Commitment: ${commitment}
//   Nullifier Hash: ${nullifierHash}

const TEST_SECRET: u64 = ${TEST_SECRET};
const TEST_BASE_NULLIFIER: u64 = ${TEST_BASE_NULLIFIER};
const TEST_SLOT_INDEX: u64 = ${TEST_SLOT_INDEX};
const TEST_COMMITMENT: u64 = ${commitment};
const TEST_NULLIFIER_HASH: u64 = ${nullifierHash};

fun get_test_proof_a(): vector<u8> {
    vector[${proof_a.join(', ')}]
}

fun get_test_proof_b(): vector<u8> {
    vector[${proof_b.join(', ')}]
}

fun get_test_proof_c(): vector<u8> {
    vector[${proof_c.join(', ')}]
}
`;

        fs.writeFileSync('./test_proof_data.move', moveCode);
        console.log('\n✓ Move test code written to test_proof_data.move');

        // Also save as JSON for reference
        const jsonData = {
            inputs: {
                secret: TEST_SECRET.toString(),
                baseNullifier: TEST_BASE_NULLIFIER.toString(),
                slotIndex: TEST_SLOT_INDEX.toString(),
                slotNullifier: slotNullifier.toString(),
                commitment: commitment.toString(),
                nullifierHash: nullifierHash.toString(),
            },
            proof: {
                proof_a,
                proof_b,
                proof_c,
            },
            publicSignals,
        };

        fs.writeFileSync('./test_proof_data.json', JSON.stringify(jsonData, null, 2));
        console.log('✓ JSON data written to test_proof_data.json');

    } catch (error) {
        console.error('\n✗ Error generating proof:', error);
        process.exit(1);
    }
}

generateTestProof();
