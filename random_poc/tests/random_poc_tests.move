#[test_only]
module random_poc::tests {
    use random_poc::random_poc::{Self};
    use sui::random::{Self, Random};
    use sui::test_scenario::{Self as ts};
    use sui::test_utils::{Self};

    const ADMIN: address = @0xAD;

    #[test]
    fun test_create_lottery_and_pick() {
        // Create test scenario
        let mut scenario = ts::begin(@0x0);

        // Create random object for testing
        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery
        {
            random_poc::create_lottery(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        // Take lottery and random objects
        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Pick the first slot
            random_poc::pick_slot(0, &mut lottery, &r, ts::ctx(&mut scenario));

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
            random_poc::create_lottery(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Pick multiple slots
            random_poc::pick_slot(0, &mut lottery, &r, ts::ctx(&mut scenario));
            random_poc::pick_slot(1, &mut lottery, &r, ts::ctx(&mut scenario));
            random_poc::pick_slot(2, &mut lottery, &r, ts::ctx(&mut scenario));

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
            random_poc::create_lottery(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Picking the same slot twice should fail
            random_poc::pick_slot(0, &mut lottery, &r, ts::ctx(&mut scenario));
            random_poc::pick_slot(0, &mut lottery, &r, ts::ctx(&mut scenario)); // Should fail here

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
            random_poc::create_lottery(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Try multiple times until someone wins
            let mut i = 0;
            while (random_poc::is_active(&lottery) && i < random_poc::slot_count()) {
                if (random_poc::get_slot(&lottery, i) == false) {
                    random_poc::pick_slot(i, &mut lottery, &r, ts::ctx(&mut scenario));
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
            random_poc::create_lottery(ts::ctx(&mut scenario));
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
            random_poc::create_lottery(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            assert!(random_poc::get_slots_length(&lottery) == random_poc::slot_count(), 1);

            random_poc::pick_slot(0, &mut lottery, &r, ts::ctx(&mut scenario));
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
            random_poc::create_lottery(ts::ctx(&mut scenario));
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
            random_poc::create_lottery(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Out of bounds slot index (5 slots means indices are 0-4)
            random_poc::pick_slot(10, &mut lottery, &r, ts::ctx(&mut scenario));

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
            random_poc::create_lottery(ts::ctx(&mut scenario));
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
                    random_poc::pick_slot(slot_to_try, &mut lottery, &r, ts::ctx(&mut scenario));
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
            random_poc::create_lottery(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Pick all but the last slot - stop if someone wins
            let mut picked = 0;
            while (picked < random_poc::slot_count() - 1 && random_poc::is_active(&lottery)) {
                random_poc::pick_slot(picked, &mut lottery, &r, ts::ctx(&mut scenario));
                picked = picked + 1;
            };

            // If lottery is still active, pick the last slot which must guarantee a win
            if (random_poc::is_active(&lottery)) {
                // Lottery should still be active before picking last slot
                assert!(random_poc::is_active(&lottery) == true, 1);

                // Pick last slot - must guarantee a win
                random_poc::pick_slot(random_poc::slot_count() - 1, &mut lottery, &r, ts::ctx(&mut scenario));

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
            random_poc::create_lottery(ts::ctx(&mut scenario));
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

                let random_num = random_poc::pick_slot(i, &mut lottery, &r, ts::ctx(&mut scenario));

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
}
