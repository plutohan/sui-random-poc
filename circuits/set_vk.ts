import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import * as fs from 'fs';

const PACKAGE_ID = '0xcd6a27ea0cbb9b409f66b83fa0856f30e91a326e0d885f189ff123da642e4a0b';

async function setVerificationKey(lotteryObjectId: string) {
    // Read the verification key components
    const vkComponents = JSON.parse(fs.readFileSync('vk_components.json', 'utf8'));

    // Convert hex strings to byte arrays
    function hexToBytes(hex: string): number[] {
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        return bytes;
    }

    const vk_gamma_abc_g1 = hexToBytes(vkComponents.vk_gamma_abc_g1);
    const vk_alpha_g1_beta_g2 = hexToBytes(vkComponents.vk_alpha_g1_beta_g2);
    const vk_gamma_g2_neg_pc = hexToBytes(vkComponents.vk_gamma_g2_neg_pc);
    const vk_delta_g2_neg_pc = hexToBytes(vkComponents.vk_delta_g2_neg_pc);

    console.log('Verification Key Components:');
    console.log('vk_gamma_abc_g1:', vk_gamma_abc_g1.length, 'bytes');
    console.log('vk_alpha_g1_beta_g2:', vk_alpha_g1_beta_g2.length, 'bytes');
    console.log('vk_gamma_g2_neg_pc:', vk_gamma_g2_neg_pc.length, 'bytes');
    console.log('vk_delta_g2_neg_pc:', vk_delta_g2_neg_pc.length, 'bytes');
    console.log('');

    // Create transaction
    const tx = new Transaction();

    tx.moveCall({
        target: `${PACKAGE_ID}::random_poc::set_verification_key`,
        arguments: [
            tx.object(lotteryObjectId),
            tx.pure.vector('u8', vk_gamma_abc_g1),
            tx.pure.vector('u8', vk_alpha_g1_beta_g2),
            tx.pure.vector('u8', vk_gamma_g2_neg_pc),
            tx.pure.vector('u8', vk_delta_g2_neg_pc),
        ],
    });

    // Serialize and print the transaction
    const txBytes = await tx.build({ client: new SuiClient({ url: 'https://fullnode.testnet.sui.io' }) });
    console.log('Transaction created successfully!');
    console.log('To execute this transaction:');
    console.log('1. Copy the transaction object above');
    console.log('2. Sign and execute it using your wallet');
    console.log('');
    console.log('Transaction data:', JSON.stringify(tx, null, 2));
}

// Get lottery object ID from command line argument
const lotteryObjectId = process.argv[2];

if (!lotteryObjectId) {
    console.error('Usage: npx ts-node set_vk.ts <LOTTERY_OBJECT_ID>');
    console.error('');
    console.error('Example: npx ts-node set_vk.ts 0x123abc...');
    process.exit(1);
}

setVerificationKey(lotteryObjectId).catch(console.error);
