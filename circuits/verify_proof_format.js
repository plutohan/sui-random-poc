const snarkjs = require('../frontend/node_modules/snarkjs');
const fs = require('fs');

// Test with user's actual values
const TEST_SECRET = 1329288705n;
const TEST_BASE_NULLIFIER = 47709592n;
const TEST_SLOT_INDEX = 5n;

const slotNullifier = TEST_BASE_NULLIFIER + TEST_SLOT_INDEX;
const secretSquared = TEST_SECRET * TEST_SECRET;
const nullifierSquared = slotNullifier * slotNullifier;
const commitment = secretSquared + nullifierSquared;
const nullifierHash = nullifierSquared;

console.log('Testing Proof Generation with User Values');
console.log('='.repeat(60));
console.log('Inputs:');
console.log(`  Secret: ${TEST_SECRET}`);
console.log(`  Slot Nullifier: ${slotNullifier}`);
console.log(`  Commitment: ${commitment}`);
console.log(`  Nullifier Hash: ${nullifierHash}`);
console.log('='.repeat(60));

async function testProofGeneration() {
    try {
        const input = {
            secret: TEST_SECRET.toString(),
            nullifier: slotNullifier.toString(),
            commitment: commitment.toString(),
            nullifierHash: nullifierHash.toString(),
        };

        console.log('\nCircuit inputs:');
        console.log(JSON.stringify(input, null, 2));

        console.log('\nGenerating proof...');
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            './claim_js/claim.wasm',
            './claim_final.zkey'
        );

        console.log('\n✓ Proof generated successfully!');
        console.log('\nPublic Signals from proof:');
        console.log(`  [0] ${publicSignals[0]}`);
        console.log(`  [1] ${publicSignals[1]}`);

        console.log('\nExpected Public Signals:');
        console.log(`  [0] ${commitment.toString()}`);
        console.log(`  [1] ${nullifierHash.toString()}`);

        console.log('\nPublic Signals Match:');
        console.log(`  Commitment: ${publicSignals[0] === commitment.toString()}`);
        console.log(`  Nullifier Hash: ${publicSignals[1] === nullifierHash.toString()}`);

        // Check proof components sizes
        console.log('\nProof Components:');
        console.log(`  pi_a: ${proof.pi_a.length} elements`);
        console.log(`  pi_b: ${proof.pi_b.length} elements`);
        console.log(`  pi_c: ${proof.pi_c.length} elements`);

        // Verify the proof locally
        const vKey = JSON.parse(fs.readFileSync('./vk_components.json', 'utf8'));

        console.log('\nVerifying proof locally...');
        const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        console.log(`  Local verification: ${verified ? '✓ PASS' : '✗ FAIL'}`);

        if (!verified) {
            console.error('\n✗ ERROR: Proof verification failed locally!');
            console.error('  This means the proof is invalid even before sending to chain.');
        }

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        if (error.message.includes('Assert Failed')) {
            console.error('\nThis is a circuit constraint failure!');
            console.error('The inputs do not satisfy the circuit constraints.');
            console.error('This usually means the commitment calculation is wrong.');
        }
    }
}

testProofGeneration();
