const fs = require('fs');

async function extractVerificationKey() {
    // Read the verification key
    const vk = JSON.parse(fs.readFileSync('verification_key.json', 'utf8'));

    console.log('Extracting verification key components for Sui...\n');

    // Helper function to convert field element to 32-byte hex
    function fieldToHex(field) {
        const bn = BigInt(field);
        const hex = bn.toString(16).padStart(64, '0');
        return hex;
    }

    // Helper function to convert G1 point to bytes (64 bytes: 32 for x, 32 for y)
    function g1ToBytes(point) {
        const x = fieldToHex(point[0]);
        const y = fieldToHex(point[1]);
        return x + y;
    }

    // Helper function to convert G2 point to bytes (128 bytes: 64 for x, 64 for y)
    function g2ToBytes(point) {
        // G2 point has two coordinates, each is two field elements
        const x_c0 = fieldToHex(point[0][0]);
        const x_c1 = fieldToHex(point[0][1]);
        const y_c0 = fieldToHex(point[1][0]);
        const y_c1 = fieldToHex(point[1][1]);
        return x_c0 + x_c1 + y_c0 + y_c1;
    }

    // 1. vk_gamma_abc_g1 - IC array (public inputs)
    console.log('1. vk_gamma_abc_g1 (IC array):');
    let vk_gamma_abc_g1 = '';
    for (let i = 0; i < vk.IC.length; i++) {
        vk_gamma_abc_g1 += g1ToBytes(vk.IC[i]);
    }
    console.log('Length:', vk_gamma_abc_g1.length / 2, 'bytes');
    console.log('Hex:', vk_gamma_abc_g1);
    console.log('');

    // 2. vk_alpha_g1_beta_g2 - Pairing result (vk_alphabeta_12)
    console.log('2. vk_alpha_g1_beta_g2 (alphabeta pairing):');
    // This is a GT element (Fq12), which is 12 field elements of 32 bytes each = 384 bytes
    let vk_alpha_g1_beta_g2 = '';
    for (let i = 0; i < vk.vk_alphabeta_12.length; i++) {
        for (let j = 0; j < vk.vk_alphabeta_12[i].length; j++) {
            vk_alpha_g1_beta_g2 += fieldToHex(vk.vk_alphabeta_12[i][j][0]);
            vk_alpha_g1_beta_g2 += fieldToHex(vk.vk_alphabeta_12[i][j][1]);
        }
    }
    console.log('Length:', vk_alpha_g1_beta_g2.length / 2, 'bytes');
    console.log('Hex:', vk_alpha_g1_beta_g2);
    console.log('');

    // 3. vk_gamma_g2_neg_pc - Negative of vk_gamma_2
    console.log('3. vk_gamma_g2_neg_pc (gamma_g2):');
    const vk_gamma_g2_neg_pc = g2ToBytes(vk.vk_gamma_2);
    console.log('Length:', vk_gamma_g2_neg_pc.length / 2, 'bytes');
    console.log('Hex:', vk_gamma_g2_neg_pc);
    console.log('');

    // 4. vk_delta_g2_neg_pc - Negative of vk_delta_2
    console.log('4. vk_delta_g2_neg_pc (delta_g2):');
    const vk_delta_g2_neg_pc = g2ToBytes(vk.vk_delta_2);
    console.log('Length:', vk_delta_g2_neg_pc.length / 2, 'bytes');
    console.log('Hex:', vk_delta_g2_neg_pc);
    console.log('');

    // Save to file for easier use
    const output = {
        vk_gamma_abc_g1: vk_gamma_abc_g1,
        vk_alpha_g1_beta_g2: vk_alpha_g1_beta_g2,
        vk_gamma_g2_neg_pc: vk_gamma_g2_neg_pc,
        vk_delta_g2_neg_pc: vk_delta_g2_neg_pc
    };

    fs.writeFileSync('vk_components.json', JSON.stringify(output, null, 2));
    console.log('Saved to vk_components.json');
}

extractVerificationKey().catch(console.error);
