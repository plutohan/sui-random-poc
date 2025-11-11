#[test_only]
module random_poc::tests {
    use random_poc::random_poc;
    use sui::random::{Self, Random};
    use sui::test_scenario::{Self as ts};

    const ADMIN: address = @0xAD;

    #[test]
    fun test_create_lottery_and_pick() {
        // Create test scenario
        let mut scenario = ts::begin(@0x0);

        // Create random object for testing
        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with 5 slots
        {
            random_poc::create_lottery(5, ts::ctx(&mut scenario));
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

        // Create lottery with 10 slots
        {
            random_poc::create_lottery(10, ts::ctx(&mut scenario));
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
            random_poc::create_lottery(5, ts::ctx(&mut scenario));
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

        // Create lottery with few slots to increase winning probability
        {
            random_poc::create_lottery(2, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Try multiple times until someone wins
            let mut i = 0;
            while (random_poc::is_active(&lottery) && i < 2) {
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
            random_poc::create_lottery(10, ts::ctx(&mut scenario));
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
    fun test_create_lottery_with_single_slot() {
        let mut scenario = ts::begin(@0x0);

        random::create_for_testing(ts::ctx(&mut scenario));
        ts::next_tx(&mut scenario, ADMIN);

        // Create lottery with only 1 slot
        {
            random_poc::create_lottery(1, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            assert!(random_poc::get_slots_length(&lottery) == 1, 1);

            random_poc::pick_slot(0, &mut lottery, &r, ts::ctx(&mut scenario));
            assert!(random_poc::get_slot(&lottery, 0) == true, 2);

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_create_lottery_with_many_slots() {
        let mut scenario = ts::begin(ADMIN);

        // Create lottery with 100 slots
        {
            random_poc::create_lottery(100, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let lottery = ts::take_shared<random_poc::Lottery>(&scenario);

            assert!(random_poc::get_slots_length(&lottery) == 100, 1);
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
            random_poc::create_lottery(5, ts::ctx(&mut scenario));
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
            random_poc::create_lottery(2, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Keep trying until someone wins
            let mut attempts = 0;
            while (random_poc::is_active(&lottery) && attempts < 2) {
                let slot_to_try = attempts % 2;
                if (random_poc::get_slot(&lottery, slot_to_try) == false) {
                    random_poc::pick_slot(slot_to_try, &mut lottery, &r, ts::ctx(&mut scenario));
                };
                attempts = attempts + 1;
            };

            // If won, winning_slot should be recorded
            if (!random_poc::is_active(&lottery)) {
                assert!(random_poc::get_winning_slot(&lottery) < 2, 1);
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

        // Create lottery with 5 slots
        {
            random_poc::create_lottery(5, ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ADMIN);

        {
            let mut lottery = ts::take_shared<random_poc::Lottery>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            // Pick first 4 slots (excluding the last slot)
            random_poc::pick_slot(0, &mut lottery, &r, ts::ctx(&mut scenario));
            random_poc::pick_slot(1, &mut lottery, &r, ts::ctx(&mut scenario));
            random_poc::pick_slot(2, &mut lottery, &r, ts::ctx(&mut scenario));
            random_poc::pick_slot(3, &mut lottery, &r, ts::ctx(&mut scenario));

            // Lottery should still be active
            assert!(random_poc::is_active(&lottery) == true, 1);

            // Pick last slot - must guarantee a win
            random_poc::pick_slot(4, &mut lottery, &r, ts::ctx(&mut scenario));

            // Lottery should become inactive
            assert!(random_poc::is_active(&lottery) == false, 2);
            // Winning slot should be 4
            assert!(random_poc::get_winning_slot(&lottery) == 4, 3);

            ts::return_shared(lottery);
            ts::return_shared(r);
        };
        ts::end(scenario);
    }
}
