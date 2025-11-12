module random_poc::random_poc;

use sui::event;
use sui::random::{Random};
use sui::random::new_generator;

const ENotActiveLottery: u64 = 1;
const EInvalidSlot: u64 = 2;
const SLOT_COUNT: u64 = 9;

public struct Lottery has key {
  id: UID,
  slots: vector<bool>,
  is_active: bool,
  winning_slot: u64,
}

public struct LotteryCreatedEvent has copy, drop, store {
  lottery_id: ID,
  slot_count: u64,
}

public struct PickedEvent has copy, drop, store {
  lottery_id: ID,
  slot_index: u64,
  won: bool,
  random_number: u64,
}

public fun create_lottery(ctx: &mut tx_context::TxContext) {
  let lottery = Lottery {
    id: sui::object::new(ctx),
    slots: make_empty_vec(SLOT_COUNT),
    is_active: true,
    winning_slot: 0
  };

  event::emit(LotteryCreatedEvent {
    lottery_id: object::id(&lottery),
    slot_count: SLOT_COUNT,
  });

  transfer::share_object(lottery);
}

fun fill(v: &mut vector<bool>, n: u64) {
    if (n == 0) return;
    vector::push_back(v, false);
    fill(v, n - 1);
}

fun make_empty_vec(n: u64): vector<bool> {
    let mut v = vector::empty<bool>();
    fill(&mut v, n);
    v
}

fun count_unpicked_slots(slots: &vector<bool>): u64 {
    let mut count = 0;
    let mut i = 0;
    let len = vector::length(slots);
    while (i < len) {
        if (*vector::borrow(slots, i) == false) {
            count = count + 1;
        };
        i = i + 1;
    };
    count
}

entry fun pick_slot(slot_index: u64, lottery:&mut Lottery, r: &Random, ctx: &mut tx_context::TxContext):u64 {
  assert!(lottery.is_active, ENotActiveLottery);
  assert!(lottery.slots[slot_index] == false, EInvalidSlot);

  let slot = vector::borrow_mut(&mut lottery.slots, slot_index);
  * slot = true;

  // Count remaining unpicked slots
  let remaining_slots = count_unpicked_slots(&lottery.slots);

  // Generate random number and determine if won
  let random_number: u64;
  let won: bool;

  // If this is the last slot, winner is guaranteed
  if (remaining_slots == 0) {
    won = true;
    random_number = 0; // No random number needed for guaranteed win
  } else {
    let winning_number = 10000 / lottery.slots.length();
    let mut generator = new_generator(r, ctx);
    random_number = generator.generate_u64_in_range(0,10000);
    won = random_number < winning_number;
  };

  if (won) {
    lottery.is_active = false;
    lottery.winning_slot = slot_index;
  };

  event::emit(PickedEvent {
    lottery_id: object::id(lottery),
    slot_index,
    won,
    random_number,
  });

  random_number
}

// Public accessor functions for testing
public fun is_active(lottery: &Lottery): bool {
  lottery.is_active
}

public fun get_slot(lottery: &Lottery, index: u64): bool {
  lottery.slots[index]
}

public fun get_slots_length(lottery: &Lottery): u64 {
  lottery.slots.length()
}

public fun get_winning_slot(lottery: &Lottery): u64 {
  lottery.winning_slot
}

public fun slot_count(): u64 {
  SLOT_COUNT
}
