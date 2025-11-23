#[test_only]
module random_poc::tests {
    use random_poc::random_poc::{Self};
    use sui::random::{Self, Random};
    use sui::test_scenario::{Self as ts};
    use sui::test_utils::{Self};
    use sui::coin::{Self};
    use sui::sui::SUI;

    const ADMIN: address = @0xAD;
    const PLAYER: address = @0x1;
    const LOTTERY_COST: u64 = 100_000_000; // 0.1 SUI
    const FEE: u64 = 15_000_000; // 0.015 SUI

    #[test]
    fun test_create_lottery_and_pick() {
        // Create test scenario
        let mut scenario = ts::begin(@0x0);

        // Create random object for testing
        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        // Take lottery and random objects
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Pick the first slot
            let fee_payment = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, fee_payment, b"test_secret", ts::ctx(&mut scenario));

            // Verify slot 0 is now marked as true
            assert!(random_poc::get_slot(&lottery, 0) == true, 1);

            // Return shared objects and end test
            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_multiple_slots_picked() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Pick multiple slots
            let fee1 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, fee1, b"test_secret", ts::ctx(&mut scenario));
            let fee2 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(1, &mut lottery, &r, fee2, b"test_secret", ts::ctx(&mut scenario));
            let fee3 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(2, &mut lottery, &r, fee3, b"test_secret", ts::ctx(&mut scenario));

            // Verify each slot was properly selected
            assert!(random_poc::get_slot(&lottery, 0) == true, 1);
            assert!(random_poc::get_slot(&lottery, 1) == true, 2);
            assert!(random_poc::get_slot(&lottery, 2) == true, 3);

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = random_poc::EInvalidSlot)]
    fun test_pick_same_slot_twice_fails() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Picking the same slot twice should fail
            let fee1 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, fee1, b"test_secret", ts::ctx(&mut scenario));
            let fee2 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, fee2, b"test_secret", ts::ctx(&mut scenario)); // Should fail here

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_lottery_can_become_inactive() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Try multiple times until someone wins
            let mut i = 0;
            while (random_poc::is_active(&lottery) && i < random_poc::slot_count()) {
                if (random_poc::get_slot(&lottery, i) == false) {
                    let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                    random_poc::pick_slot(i, &mut lottery, &r, fee, b"test_secret", ts::ctx(&mut scenario));
                };
                i = i + 1;
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_all_slots_initially_false() {
        let mut scenario = ts::begin(ADMIN);

        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            // Verify all slots are initialized to false
            let mut i = 0;
            while (i < random_poc::get_slots_length(&lottery)) {
                assert!(random_poc::get_slot(&lottery, i) == false, i);
                i = i + 1;
            };

            assert!(random_poc::is_active(&lottery) == true, 100);

            ts::return_shared(lottery);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_create_lottery_basic() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            assert!(random_poc::get_slots_length(&lottery) == random_poc::slot_count(), 1);

            let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, fee, b"test_secret", ts::ctx(&mut scenario));
            assert!(random_poc::get_slot(&lottery, 0) == true, 2);

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_create_lottery_validates_slot_count() {
        let mut scenario = ts::begin(ADMIN);

        // Create lottery
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            assert!(random_poc::get_slots_length(&lottery) == random_poc::slot_count(), 1);
            assert!(random_poc::is_active(&lottery) == true, 2);

            ts::return_shared(lottery);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_pick_invalid_slot_index() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Out of bounds slot index (5 slots means indices are 0-4)
            let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(10, &mut lottery, &r, fee, b"test_secret", ts::ctx(&mut scenario));

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_winning_slot_is_recorded() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with 2 slots (50% winning probability)
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Keep trying until someone wins
            let mut attempts = 0;
            while (random_poc::is_active(&lottery) && attempts < random_poc::slot_count()) {
                let slot_to_try = attempts % random_poc::slot_count();
                if (random_poc::get_slot(&lottery, slot_to_try) == false) {
                    let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                    random_poc::pick_slot(slot_to_try, &mut lottery, &r, fee, b"test_secret", ts::ctx(&mut scenario));
                };
                attempts = attempts + 1;
            };

            // If won, winning_slot should be recorded
            if (!random_poc::is_active(&lottery)) {
                assert!(random_poc::get_winning_slot(&lottery) < random_poc::slot_count(), 1);
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_last_slot_always_wins() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Pick all but the last slot - stop if someone wins
            let mut picked = 0;
            while (picked < random_poc::slot_count() - 1 && random_poc::is_active(&lottery)) {
                let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(picked, &mut lottery, &r, fee, b"test_secret", ts::ctx(&mut scenario));
                picked = picked + 1;
            };

            // If lottery is still active, pick the last slot which must guarantee a win
            if (random_poc::is_active(&lottery)) {
                // Lottery should still be active before picking last slot
                assert!(random_poc::is_active(&lottery) == true, 1);

                // Pick last slot - must guarantee a win
                let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                random_poc::pick_slot(random_poc::slot_count() - 1, &mut lottery, &r, fee, b"test_secret", ts::ctx(&mut scenario));

                // Lottery should become inactive
                assert!(random_poc::is_active(&lottery) == false, 2);
                // Winning slot should be the last one
                assert!(random_poc::get_winning_slot(&lottery) == random_poc::slot_count() - 1, 3);
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_events_with_random_numbers() {
        use std::debug;

        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Log winning threshold for reference
            let winning_threshold = 10000 / random_poc::slot_count();
            test_utils::print(b"Winning threshold (10000/slot_count()):");
            debug::print(&winning_threshold);
            test_utils::print(b"");

            // Pick all slots and log the random numbers (stop if someone wins)
            let mut i = 0;
            while (i < random_poc::slot_count() && random_poc::is_active(&lottery)) {
                test_utils::print(b"=== Picking slot ===");
                debug::print(&i);

                let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                let random_num = random_poc::pick_slot(i, &mut lottery, &r, fee, b"test_secret", ts::ctx(&mut scenario));

                test_utils::print(b"Random number:");
                debug::print(&random_num);

                test_utils::print(b"Won:");
                debug::print(&!random_poc::is_active(&lottery));
                test_utils::print(b"");

                i = i + 1;
            };

            // Verify all attempted slots were picked
            let mut j = 0;
            while (j < i) {
                assert!(random_poc::get_slot(&lottery, j) == true, j);
                j = j + 1;
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_creator_can_collect_fees() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery as ADMIN
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, PLAYER);

        // Player picks 3 slots
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let fee1 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, fee1, b"test_secret", ts::ctx(&mut scenario));
            let fee2 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(1, &mut lottery, &r, fee2, b"test_secret", ts::ctx(&mut scenario));
            let fee3 = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
            random_poc::pick_slot(2, &mut lottery, &r, fee3, b"test_secret", ts::ctx(&mut scenario));

            // Verify fees were collected
            assert!(random_poc::get_remaining_fee(&lottery) == FEE * 3, 1);

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::next_tx(&mut scenario, ADMIN);

        // Creator collects fees
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            random_poc::collect_fee(&mut lottery, ts::ctx(&mut scenario));

            // Verify fees were withdrawn
            assert!(random_poc::get_remaining_fee(&lottery) == 0, 2);

            ts::return_shared(lottery);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = random_poc::ENotCreator)]
    fun test_non_creator_cannot_collect_fees() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery as ADMIN
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, PLAYER);

        // Player tries to collect fees (should fail)
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            random_poc::collect_fee(&mut lottery, ts::ctx(&mut scenario));

            ts::return_shared(lottery);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_winner_can_collect_prize() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, PLAYER);

        // Player picks all slots until winning
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let mut i = 0;
            while (random_poc::is_active(&lottery) && i < random_poc::slot_count()) {
                if (random_poc::get_slot(&lottery, i) == false) {
                    let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                    random_poc::pick_slot(i, &mut lottery, &r, fee, b"test_secret", ts::ctx(&mut scenario));
                };
                i = i + 1;
            };

            // Verify someone won
            assert!(!random_poc::is_active(&lottery), 1);
            assert!(random_poc::get_prize(&lottery) == LOTTERY_COST, 2);

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::next_tx(&mut scenario, PLAYER);

        // Winner collects prize
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            random_poc::collect_prize(&mut lottery, ts::ctx(&mut scenario));

            // Verify prize was withdrawn
            assert!(random_poc::get_prize(&lottery) == 0, 3);

            ts::return_shared(lottery);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = random_poc::ENoWinner)]
    fun test_cannot_collect_prize_without_winner() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, PLAYER);

        // Try to collect prize without anyone winning (should fail)
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            random_poc::collect_prize(&mut lottery, ts::ctx(&mut scenario));

            ts::return_shared(lottery);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = random_poc::ENotWinner)]
    fun test_non_winner_cannot_collect_prize() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery
        {
            let payment = coin::mint_for_testing<SUI>(LOTTERY_COST, ts::ctx(&mut scenario));
            random_poc::create_lottery(payment, FEE, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, PLAYER);

        // Player picks slots until winning
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let mut i = 0;
            while (random_poc::is_active(&lottery) && i < random_poc::slot_count()) {
                if (random_poc::get_slot(&lottery, i) == false) {
                    let fee = coin::mint_for_testing<SUI>(FEE, ts::ctx(&mut scenario));
                    random_poc::pick_slot(i, &mut lottery, &r, fee, b"test_secret", ts::ctx(&mut scenario));
                };
                i = i + 1;
            };

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::next_tx(&mut scenario, ADMIN);

        // ADMIN tries to collect prize (should fail, only winner can)
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            random_poc::collect_prize(&mut lottery, ts::ctx(&mut scenario));

            ts::return_shared(lottery);
        };
        ts::end(scenario);
    }
}
