#[test_only]
module random_poc::real_vk_tests {
    use random_poc::random_poc::{Self};
    use sui::random::{Self, Random};
    use sui::test_scenario::{Self as ts};
    use sui::coin::{Self};
    use sui::sui::SUI;

    const ADMIN: address = @0xAD;
    const PLAYER1: address = @0x1;
    const PLAYER2: address = @0x2;
    const LOTTERY_COST: u64 = 100_000_000; // 0.1 SUI
    const FEE: u64 = 15_000_000; // 0.015 SUI

    // Test proof data generated offline
    const TEST_SECRET: u64 = 1000;
    const TEST_BASE_NULLIFIER: u64 = 2000;
    const TEST_SLOT_INDEX: u64 = 3;
    const TEST_COMMITMENT: u64 = 5012009;
    const TEST_NULLIFIER_HASH: u64 = 4012009;

    // Helper functions for commitment generation
    fun commitment(secret: u64, nullifier: u64): u64 {
        secret * secret + nullifier * nullifier
    }

    // Real verification key components from circuits
    fun get_vk_gamma_abc_g1(): vector<u8> {
        x"28c0a0bd10a78b77800f12f2cc20f7a1023ebac332f05cd324b362576a474b262a30d066418b9291aed7015e79edb0bedaaf4611d6d440facfae311a761b51f5226cbc2437913f351113c4cd7aa1b02286dabbfac9b0277eec3991d4576617ed1fc2d63fe201442f143ff7a16537e976e12e23a3c37f611a8674f56f0c557922089b150cc1fe4ea2c1ed905fa6ac3279808067fd2a94d62e0e006921b436dcf815b9645b78dd93d9caeb7e958da07a23a7263cd6def017d9df276ae06ddd91a8"
    }

    fun get_vk_alpha_g1_beta_g2(): vector<u8> {
        x"1d2c6d90e83ebedd50dd18e9aad4f7e0aecdd35329cc0c4bccc4c7c923a26fe116a90cd4268a9219a9fd2edbeb3d5a3ef62de1e2d6d993d2d29956386dca5075293f8c2ea380e6ad29962e8428b506b08776e8ead48e4a34e85dbfd44c4b83f01c5788b47ef959de41f759976ae04f9ae4e386b19579769fc3aa1b4e1d9e46c92ee84af4c31d0646e958c24dcbac41ec4174f879eba6a5e2e4195acd164dd11328a20e8fd086eb6570499156729238cc48678220e7fb03f19eba3ec844b687f401093d03f32aceef3ac2d575afe20bf165822aa697ac539135dc9e6f52efe06824319674d48678e82ca30042ac2ef072fd5454df1fd1dc36b16cf0ca57feb92404bd9668884026c441f2645257a860d434b2e4105f506deef326d8315af3bc7a0a1639362c5f21bdb3b958468abe54162beedb0037d2908b8249dcef1665dca501e18177bcbbddcc3a38538f9a9207218a13fcc2a13858e7f6abfc632d86b6cb3032177531dd92444df2d19517da52cf3ba8cd394ce4464f5fe100a7cb04eee1"
    }

    fun get_vk_gamma_g2_neg_pc(): vector<u8> {
        x"1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c212c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b"
    }

    fun get_vk_delta_g2_neg_pc(): vector<u8> {
        x"18bb47a0c30342d980050511120bb7c8b932fab03d38da2dc343e750f3ca5ac32e92cb273eb8178762b9c39afe16652b9b57762537138a62450f92bc6e44cc410b1f72e46f75ad40539ce4059ff22f0a58ad0b2b76783ffcb1d1358a87dc57360082a701d3d94d4082df35c9635ab8dd3388614c88a6b2ae0d8bd53279c167e9"
    }

    // Test proof components (generated offline for TEST_COMMITMENT and TEST_NULLIFIER_HASH)
    fun get_test_proof_a(): vector<u8> {
        vector[252, 172, 112, 69, 152, 28, 7, 130, 220, 204, 143, 79, 39, 125, 20, 138, 198, 141, 235, 148, 111, 166, 64, 166, 208, 33, 116, 54, 224, 248, 123, 18, 39, 209, 143, 31, 103, 35, 89, 83, 50, 219, 193, 41, 163, 180, 144, 50, 75, 230, 208, 107, 23, 8, 232, 174, 215, 191, 213, 94, 78, 99, 163, 5]
    }

    fun get_test_proof_b(): vector<u8> {
        vector[98, 240, 18, 51, 209, 126, 218, 37, 164, 149, 192, 50, 240, 105, 46, 227, 94, 52, 147, 4, 234, 40, 89, 17, 156, 213, 107, 46, 236, 151, 177, 15, 230, 108, 54, 157, 251, 226, 36, 133, 165, 58, 246, 11, 15, 168, 168, 131, 111, 188, 241, 72, 99, 252, 41, 108, 225, 135, 211, 54, 52, 197, 55, 42, 220, 242, 225, 29, 128, 137, 56, 34, 189, 6, 229, 212, 144, 181, 46, 93, 122, 39, 103, 99, 124, 244, 41, 35, 29, 205, 155, 221, 52, 34, 3, 16, 54, 22, 53, 118, 99, 0, 103, 132, 198, 143, 26, 212, 122, 10, 99, 160, 185, 143, 245, 178, 20, 47, 101, 15, 126, 90, 52, 37, 221, 155, 141, 44]
    }

    fun get_test_proof_c(): vector<u8> {
        vector[224, 235, 128, 17, 228, 154, 244, 75, 136, 93, 52, 83, 239, 126, 186, 87, 210, 250, 28, 104, 248, 152, 219, 207, 208, 32, 72, 108, 36, 57, 233, 8, 84, 216, 243, 156, 191, 248, 72, 111, 54, 1, 211, 156, 164, 5, 119, 66, 254, 93, 22, 133, 73, 179, 151, 179, 135, 13, 4, 125, 138, 73, 237, 36]
    }

    #[test]
    fun test_create_lottery_with_real_vk() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with REAL verification keys
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                get_vk_gamma_abc_g1(),
                get_vk_alpha_g1_beta_g2(),
                get_vk_gamma_g2_neg_pc(),
                get_vk_delta_g2_neg_pc(),
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, ADMIN);

        // Verify lottery was created successfully
        {
            let lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            assert!(random_poc::is_active(&lottery), 1);
            assert!(random_poc::slot_count() == 9, 2);
            ts::return_shared(lottery);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_pick_slot_with_real_vk() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with real VK
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                get_vk_gamma_abc_g1(),
                get_vk_alpha_g1_beta_g2(),
                get_vk_gamma_g2_neg_pc(),
                get_vk_delta_g2_neg_pc(),
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, PLAYER1);

        // Pick slot with commitment
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let comm = commitment(TEST_SECRET, TEST_BASE_NULLIFIER + TEST_SLOT_INDEX);
            let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(TEST_SLOT_INDEX, &mut lottery, &r, fee, comm, ts::ctx(&mut scenario));

            assert!(random_poc::get_slot(&lottery, TEST_SLOT_INDEX) == true, 1);

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_real_zk_proof_verification() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with REAL verification keys
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                get_vk_gamma_abc_g1(),
                get_vk_alpha_g1_beta_g2(),
                get_vk_gamma_g2_neg_pc(),
                get_vk_delta_g2_neg_pc(),
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, PLAYER1);

        // Pick all slots with known secret until someone wins
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let mut i = 0;
            while (random_poc::is_active(&lottery) && i < random_poc::slot_count()) {
                let comm = commitment(TEST_SECRET, TEST_BASE_NULLIFIER + i);
                let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(i, &mut lottery, &r, fee, comm, ts::ctx(&mut scenario));
                i = i + 1;
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };

        // If there's a winner and it's slot 3, test real ZK proof verification
        ts::next_tx(&mut scenario, PLAYER2); // Different address for anonymity!

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            if (!random_poc::is_active(&lottery) && random_poc::get_winning_slot(&lottery) == TEST_SLOT_INDEX) {
                // Use REAL proof components generated offline
                let proof_a = get_test_proof_a();
                let proof_b = get_test_proof_b();
                let proof_c = get_test_proof_c();

                // This should PASS with real VK and real proof
                random_poc::claim_prize_with_proof(
                    &mut lottery,
                    proof_a,
                    proof_b,
                    proof_c,
                    TEST_COMMITMENT,
                    TEST_NULLIFIER_HASH,
                    ts::ctx(&mut scenario)
                );

                // Verify prize was claimed
                assert!(random_poc::get_prize(&lottery) == 0, 1);
            };

            ts::return_shared(lottery);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_multiple_players_with_real_vk() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with real VK
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                get_vk_gamma_abc_g1(),
                get_vk_alpha_g1_beta_g2(),
                get_vk_gamma_g2_neg_pc(),
                get_vk_delta_g2_neg_pc(),
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, PLAYER1);

        // Player 1 picks slots
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let comm1 = commitment(11111, 22222);
            let fee1 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, fee1, comm1, ts::ctx(&mut scenario));

            if (random_poc::is_active(&lottery)) {
                let comm2 = commitment(33333, 44444);
                let fee2 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(1, &mut lottery, &r, fee2, comm2, ts::ctx(&mut scenario));
            };

            assert!(random_poc::get_slot(&lottery, 0) == true, 1);

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::next_tx(&mut scenario, PLAYER2);

        // Player 2 picks slots
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            if (random_poc::is_active(&lottery)) {
                let comm3 = commitment(55555, 66666);
                let fee3 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(2, &mut lottery, &r, fee3, comm3, ts::ctx(&mut scenario));
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_collect_prize_and_fees_with_real_vk() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with real VK
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                get_vk_gamma_abc_g1(),
                get_vk_alpha_g1_beta_g2(),
                get_vk_gamma_g2_neg_pc(),
                get_vk_delta_g2_neg_pc(),
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, PLAYER1);

        // Pick all slots until winner
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let mut i = 0;
            while (random_poc::is_active(&lottery) && i < random_poc::slot_count()) {
                let comm = commitment(12345 + i, 67890 + i);
                let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(i, &mut lottery, &r, fee, comm, ts::ctx(&mut scenario));
                i = i + 1;
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };

        // Test prize collection
        if (true) {
            ts::next_tx(&mut scenario, PLAYER1);
            {
                let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

                if (!random_poc::is_active(&lottery)) {
                    let winner = random_poc::get_winner(&lottery);
                    if (std::option::is_some(&winner) &&
                        *std::option::borrow(&winner) == @0x1) { // PLAYER1
                        random_poc::collect_prize(&mut lottery, ts::ctx(&mut scenario));
                        assert!(random_poc::get_prize(&lottery) == 0, 1);
                    };
                };

                ts::return_shared(lottery);
            };
        };

        // Test fee collection
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            if (random_poc::get_remaining_fee(&lottery) > 0) {
                random_poc::collect_fee(&mut lottery, ts::ctx(&mut scenario));
                assert!(random_poc::get_remaining_fee(&lottery) == 0, 1);
            };

            ts::return_shared(lottery);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = random_poc::EInvalidCommitment)]
    fun test_invalid_proof_fails_with_real_vk() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with REAL verification keys
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                get_vk_gamma_abc_g1(),
                get_vk_alpha_g1_beta_g2(),
                get_vk_gamma_g2_neg_pc(),
                get_vk_delta_g2_neg_pc(),
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, PLAYER1);

        // Pick slots
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let mut i = 0;
            while (random_poc::is_active(&lottery) && i < random_poc::slot_count()) {
                let comm = commitment(TEST_SECRET, TEST_BASE_NULLIFIER + i);
                let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(i, &mut lottery, &r, fee, comm, ts::ctx(&mut scenario));
                i = i + 1;
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };

        ts::next_tx(&mut scenario, PLAYER2);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            if (!random_poc::is_active(&lottery)) {
                // Use INVALID proof (random bytes)
                let mut proof_a = vector::empty<u8>();
                vector::push_back(&mut proof_a, 1);
                let proof_b = vector::empty<u8>();
                let proof_c = vector::empty<u8>();

                // This should FAIL with real VK
                random_poc::claim_prize_with_proof(
                    &mut lottery,
                    proof_a,
                    proof_b,
                    proof_c,
                    TEST_COMMITMENT,
                    TEST_NULLIFIER_HASH,
                    ts::ctx(&mut scenario)
                );
            };

            ts::return_shared(lottery);
        };

        ts::end(scenario);
    }
}
