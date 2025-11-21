#[test_only]
module random_poc::zk_lottery_tests {
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

    // Helper functions for commitment generation
    fun commitment(secret: u64, nullifier: u64): u64 {
        secret * secret + nullifier * nullifier
    }

    fun nullifier_hash(nullifier: u64): u64 {
        nullifier * nullifier
    }

    #[test]
    fun test_create_lottery_with_commitments() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with empty verification keys (test mode)
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                vector::empty(),  // vk_gamma_abc_g1
                vector::empty(),  // vk_alpha_g1_beta_g2
                vector::empty(),  // vk_gamma_g2_neg_pc
                vector::empty(),  // vk_delta_g2_neg_pc
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, ADMIN);

        // Pick slot with commitment
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let comm = commitment(12345, 67890);
            let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, fee, comm, ts::ctx(&mut scenario));

            assert!(random_poc::get_slot(&lottery, 0) == true, 1);

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_multiple_players_pick_slots() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with empty verification keys (test mode)
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                vector::empty(),  // vk_gamma_abc_g1
                vector::empty(),  // vk_alpha_g1_beta_g2
                vector::empty(),  // vk_gamma_g2_neg_pc
                vector::empty(),  // vk_delta_g2_neg_pc
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, PLAYER1);

        // Player 1 picks slots with their commitments
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let comm1 = commitment(11111, 22222);
            let fee1 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, fee1, comm1, ts::ctx(&mut scenario));

            // Check if still active before picking more slots
            if (random_poc::is_active(&lottery)) {
                let comm2 = commitment(33333, 44444);
                let fee2 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(1, &mut lottery, &r, fee2, comm2, ts::ctx(&mut scenario));
            };

            // Verify first slot is always picked
            assert!(random_poc::get_slot(&lottery, 0) == true, 1);

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::next_tx(&mut scenario, PLAYER2);

        // Player 2 picks a slot with their commitment (if lottery still active)
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            if (random_poc::is_active(&lottery)) {
                let comm3 = commitment(55555, 66666);
                let fee3 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(2, &mut lottery, &r, fee3, comm3, ts::ctx(&mut scenario));
            };

            // Test passes if slots were picked (lottery may have ended early due to winning)
            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_zk_claim_with_proof() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with empty verification keys (test mode)
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                vector::empty(),  // vk_gamma_abc_g1
                vector::empty(),  // vk_alpha_g1_beta_g2
                vector::empty(),  // vk_gamma_g2_neg_pc
                vector::empty(),  // vk_delta_g2_neg_pc
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, PLAYER1);

        // Pick all slots until someone wins
        let winning_commitment: u64;
        let winning_nullifier: u64 = 12345;
        let winning_secret: u64 = 67890;
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let mut i = 0;
            while (random_poc::is_active(&lottery) && i < random_poc::slot_count()) {
                let comm = commitment(winning_secret, winning_nullifier + i);
                let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(i, &mut lottery, &r, fee, comm, ts::ctx(&mut scenario));
                i = i + 1;
            };

            // Store the winning commitment for later claim
            if (!random_poc::is_active(&lottery)) {
                let winning_slot = random_poc::get_winning_slot(&lottery);
                winning_commitment = commitment(winning_secret, winning_nullifier + winning_slot);
            } else {
                winning_commitment = 0;
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };

        // If there's a winner, test anonymous claiming with ZK proof
        if (winning_commitment != 0) {
            ts::next_tx(&mut scenario, PLAYER2); // Different address for anonymity!

            {
                let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

                // Generate dummy proof (in production, this would be a real Groth16 proof)
                let mut proof_a = vector::empty<u8>();
                vector::push_back(&mut proof_a, 1);
                let mut proof_b = vector::empty<u8>();
                vector::push_back(&mut proof_b, 2);
                let mut proof_c = vector::empty<u8>();
                vector::push_back(&mut proof_c, 3);

                let n_hash = nullifier_hash(winning_nullifier + random_poc::get_winning_slot(&lottery));

                // Claim anonymously from different address
                random_poc::claim_prize_with_proof(
                    &mut lottery,
                    proof_a,
                    proof_b,
                    proof_c,
                    winning_commitment,
                    n_hash,
                    ts::ctx(&mut scenario)
                );

                // Verify prize was claimed
                assert!(random_poc::get_prize(&lottery) == 0, 1);

                ts::return_shared(lottery);
            };
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = random_poc::EPrizeAlreadyClaimed)]
    fun test_cannot_claim_twice_with_same_nullifier() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with empty verification keys (test mode)
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                vector::empty(),  // vk_gamma_abc_g1
                vector::empty(),  // vk_alpha_g1_beta_g2
                vector::empty(),  // vk_gamma_g2_neg_pc
                vector::empty(),  // vk_delta_g2_neg_pc
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, PLAYER1);

        // Pick slots until winning - this tests that prize cannot be claimed twice
        let base_secret = 12345;
        let base_nullifier = 67890;
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Pick all slots with predictable nullifiers
            let mut i = 0;
            while (random_poc::is_active(&lottery) && i < random_poc::slot_count()) {
                let comm = commitment(base_secret, base_nullifier + i);
                let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(i, &mut lottery, &r, fee, comm, ts::ctx(&mut scenario));
                i = i + 1;
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };

        // If won, try to claim twice with same nullifier
        ts::next_tx(&mut scenario, PLAYER1);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            if (!random_poc::is_active(&lottery)) {
                let winning_slot = random_poc::get_winning_slot(&lottery);
                let winning_comm = commitment(base_secret, base_nullifier + winning_slot);
                let n_hash = nullifier_hash(base_nullifier + winning_slot);

                let mut proof_a = vector::empty<u8>();
                vector::push_back(&mut proof_a, 1);
                let proof_b = vector::empty<u8>();
                let proof_c = vector::empty<u8>();

                // First claim
                random_poc::claim_prize_with_proof(
                    &mut lottery,
                    proof_a,
                    proof_b,
                    proof_c,
                    winning_comm,
                    n_hash,
                    ts::ctx(&mut scenario)
                );

                // Second claim with same nullifier (should fail)
                let mut proof_a2 = vector::empty<u8>();
                vector::push_back(&mut proof_a2, 1);
                let proof_b2 = vector::empty<u8>();
                let proof_c2 = vector::empty<u8>();

                random_poc::claim_prize_with_proof(
                    &mut lottery,
                    proof_a2,
                    proof_b2,
                    proof_c2,
                    winning_comm,
                    n_hash, // Same nullifier!
                    ts::ctx(&mut scenario)
                );
            };

            ts::return_shared(lottery);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_last_slot_guarantees_win_with_commitment() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                vector::empty(),
                vector::empty(),
                vector::empty(),
                vector::empty(),
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, PLAYER1);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Pick all but last slot
            let mut picked = 0;
            while (picked < random_poc::slot_count() - 1 && random_poc::is_active(&lottery)) {
                let comm = commitment(picked * 100, picked * 200);
                let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(picked, &mut lottery, &r, fee, comm, ts::ctx(&mut scenario));
                picked = picked + 1;
            };

            // Pick last slot (should guarantee win)
            if (random_poc::is_active(&lottery)) {
                let last_comm = commitment(99999, 88888);
                let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(
                    random_poc::slot_count() - 1,
                    &mut lottery,
                    &r,
                    fee,
                    last_comm,
                    ts::ctx(&mut scenario)
                );

                assert!(!random_poc::is_active(&lottery), 1);
                assert!(random_poc::get_winning_slot(&lottery) == random_poc::slot_count() - 1, 2);
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_commitment_uniqueness_per_player() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(
                payment,
                vector::empty(),
                vector::empty(),
                vector::empty(),
                vector::empty(),
                ts::ctx(&mut scenario)
            );
        };
        ts::next_tx(&mut scenario, PLAYER1);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Each player uses unique secret/nullifier pairs
            let comm1 = commitment(1111, 2222); // Player 1
            let comm2 = commitment(3333, 4444); // Different commitment
            let comm3 = commitment(5555, 6666); // Another different commitment

            // All commitments should be different
            assert!(comm1 != comm2, 1);
            assert!(comm2 != comm3, 2);
            assert!(comm1 != comm3, 3);

            // Pick slots with different commitments
            let fee1 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, fee1, comm1, ts::ctx(&mut scenario));

            if (random_poc::is_active(&lottery)) {
                let fee2 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(1, &mut lottery, &r, fee2, comm2, ts::ctx(&mut scenario));
            };

            if (random_poc::is_active(&lottery)) {
                let fee3 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(2, &mut lottery, &r, fee3, comm3, ts::ctx(&mut scenario));
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }
}
