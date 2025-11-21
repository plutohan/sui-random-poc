// Test commitment calculation to debug frontend issues

// User's actual values
const secret = 1329288705n;
const baseNullifier = 47709592n;
const slotIndex = 5n; // Assuming slot 5

console.log('Testing Commitment Calculations');
console.log('='.repeat(60));

// Base commitment (what's stored)
const baseCommitment = secret * secret + baseNullifier * baseNullifier;
console.log('\nBase Commitment:');
console.log(`  Secret: ${secret}`);
console.log(`  Base Nullifier: ${baseNullifier}`);
console.log(`  Secret^2: ${secret * secret}`);
console.log(`  Nullifier^2: ${baseNullifier * baseNullifier}`);
console.log(`  Base Commitment: ${baseCommitment}`);

// Slot-specific commitment (what's used for picking)
const slotNullifier = baseNullifier + slotIndex;
const slotCommitment = secret * secret + slotNullifier * slotNullifier;
console.log('\nSlot-Specific Commitment (Slot 5):');
console.log(`  Slot Nullifier: ${slotNullifier}`);
console.log(`  Slot Nullifier^2: ${slotNullifier * slotNullifier}`);
console.log(`  Slot Commitment: ${slotCommitment}`);

// Check if values fit in u64
const MAX_U64 = (1n << 64n) - 1n;
console.log('\n' + '='.repeat(60));
console.log('Overflow Checks:');
console.log(`  MAX_U64: ${MAX_U64}`);
console.log(`  Secret^2 fits in u64: ${secret * secret <= MAX_U64}`);
console.log(`  Base Nullifier^2 fits in u64: ${baseNullifier * baseNullifier <= MAX_U64}`);
console.log(`  Slot Nullifier^2 fits in u64: ${slotNullifier * slotNullifier <= MAX_U64}`);
console.log(`  Base Commitment fits in u64: ${baseCommitment <= MAX_U64}`);
console.log(`  Slot Commitment fits in u64: ${slotCommitment <= MAX_U64}`);

// Test with test values that work
console.log('\n' + '='.repeat(60));
console.log('Test Values (from passing tests):');
const testSecret = 1000n;
const testNullifier = 2003n; // 2000 + 3
const testCommitment = testSecret * testSecret + testNullifier * testNullifier;
const testNullifierHash = testNullifier * testNullifier;
console.log(`  Test Secret: ${testSecret}`);
console.log(`  Test Nullifier: ${testNullifier}`);
console.log(`  Test Commitment: ${testCommitment}`);
console.log(`  Test Nullifier Hash: ${testNullifierHash}`);

// Test localStorage roundtrip
console.log('\n' + '='.repeat(60));
console.log('Testing toString/parse roundtrip:');
const commitmentStr = baseCommitment.toString();
const parsedCommitment = BigInt(commitmentStr);
console.log(`  Original: ${baseCommitment}`);
console.log(`  String: "${commitmentStr}"`);
console.log(`  Parsed: ${parsedCommitment}`);
console.log(`  Match: ${baseCommitment === parsedCommitment}`);
