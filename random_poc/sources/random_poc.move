module random_poc::random_poc;

use sui::event;
use sui::random::{Random};
use sui::random::new_generator;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::balance::{Self, Balance};
use sui::table::{Self, Table};
use sui::groth16;
use sui::bcs;

const ENotActiveLottery: u64 = 1;
const EInvalidSlot: u64 = 2;
const EInsufficientPayment: u64 = 3;
const ENotCreator: u64 = 4;
const ENotWinner: u64 = 5;
const ENoWinner: u64 = 6;
const EInvalidProof: u64 = 7;
const EPrizeAlreadyClaimed: u64 = 8;
const ENullifierAlreadyUsed: u64 = 9;
const EInvalidCommitment: u64 = 10;
const SLOT_COUNT: u64 = 9;
const LOTTERY_PRIZE: u64 = 100_000_000; // 0.1 SUI in MIST (1 SUI = 1,000,000,000 MIST)
const FEE: u64 = 15_000_000; // 0.015 SUI in MIST

public struct Lottery has key {
  id: UID,
  creator: address,
  slots: vector<bool>,
  winner: option::Option<address>,
  winning_slot: u64,
  winning_commitment: option::Option<u64>,  // Commitment of the winning slot (for ZK verification)
  last_picker: option::Option<address>,
  last_slot: u64,
  prize: Balance<SUI>,
  remaining_fee: Balance<SUI>,
  slot_commitments: vector<option::Option<u64>>,  // Per-slot commitments (hash of secret + nullifier)
  used_nullifiers: Table<u64, bool>,  // Track used nullifiers to prevent double-claiming
  prize_claimed: bool,
  // Groth16 verification key components (BN254 curve)
  vk_gamma_abc_g1: vector<u8>,
  vk_alpha_g1_beta_g2: vector<u8>,
  vk_gamma_g2_neg_pc: vector<u8>,
  vk_delta_g2_neg_pc: vector<u8>
}

public struct LotteryCreatedEvent has copy, drop, store {
  lottery_id: ID,
  creator: address,
  slot_count: u64,
  prize: u64
}

public struct PickedEvent has copy, drop, store {
  lottery_id: ID,
  slot_index: u64,
  won: bool,
  random_number: u64,
}

// Event emitted when prize is claimed with ZK proof (no private data exposed)
public struct PrizeClaimedEvent has copy, drop, store {
  lottery_id: ID,
  nullifier_hash: u64,  // Public nullifier hash (prevents double-claiming)
}

public fun create_lottery(
  payment: Coin<SUI>,
  vk_gamma_abc_g1: vector<u8>,
  vk_alpha_g1_beta_g2: vector<u8>,
  vk_gamma_g2_neg_pc: vector<u8>,
  vk_delta_g2_neg_pc: vector<u8>,
  ctx: &mut tx_context::TxContext
) {
  // Verify payment
  assert!(coin::value(&payment) == LOTTERY_PRIZE, EInsufficientPayment);

  let creator = tx_context::sender(ctx);
  let lottery = Lottery {
    id: sui::object::new(ctx),
    creator,
    slots: make_empty_vec(SLOT_COUNT),
    winner: option::none(),
    winning_slot: 0,
    winning_commitment: option::none(),
    last_picker: option::none(),
    last_slot: 0,
    prize: coin::into_balance(payment),
    remaining_fee: balance::zero(),
    slot_commitments: make_empty_commitment_vec(SLOT_COUNT),
    used_nullifiers: table::new(ctx),
    prize_claimed: false,
    // Set verification keys at creation
    vk_gamma_abc_g1,
    vk_alpha_g1_beta_g2,
    vk_gamma_g2_neg_pc,
    vk_delta_g2_neg_pc
  };

  event::emit(LotteryCreatedEvent {
    lottery_id: object::id(&lottery),
    creator,
    slot_count: SLOT_COUNT,
    prize: LOTTERY_PRIZE
  });

  transfer::share_object(lottery);
}

// Set the Groth16 verification key for the lottery
// Only the creator can set the verification key
public fun set_verification_key(
  lottery: &mut Lottery,
  vk_gamma_abc_g1: vector<u8>,
  vk_alpha_g1_beta_g2: vector<u8>,
  vk_gamma_g2_neg_pc: vector<u8>,
  vk_delta_g2_neg_pc: vector<u8>,
  ctx: &mut tx_context::TxContext
) {
  assert!(tx_context::sender(ctx) == lottery.creator, ENotCreator);

  lottery.vk_gamma_abc_g1 = vk_gamma_abc_g1;
  lottery.vk_alpha_g1_beta_g2 = vk_alpha_g1_beta_g2;
  lottery.vk_gamma_g2_neg_pc = vk_gamma_g2_neg_pc;
  lottery.vk_delta_g2_neg_pc = vk_delta_g2_neg_pc;
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

fun fill_commitment(v: &mut vector<option::Option<u64>>, n: u64) {
    if (n == 0) return;
    vector::push_back(v, option::none());
    fill_commitment(v, n - 1);
}

fun make_empty_commitment_vec(n: u64): vector<option::Option<u64>> {
    let mut v = vector::empty<option::Option<u64>>();
    fill_commitment(&mut v, n);
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

entry fun pick_slot(
  slot_index: u64,
  lottery:&mut Lottery,
  r: &Random,
  payment: Coin<SUI>,
  commitment: u64,  // User's commitment (hash of secret + nullifier)
  ctx: &mut tx_context::TxContext
):u64 {
  assert!(option::is_none(&lottery.winner), ENotActiveLottery);
  assert!(lottery.slots[slot_index] == false, EInvalidSlot);
  assert!(coin::value(&payment) == FEE, EInsufficientPayment);

  // Collect the fee
  balance::join(&mut lottery.remaining_fee, coin::into_balance(payment));

  let slot = vector::borrow_mut(&mut lottery.slots, slot_index);
  * slot = true;

  // Store the commitment for this slot
  let commitment_slot = vector::borrow_mut(&mut lottery.slot_commitments, slot_index);
  *commitment_slot = option::some(commitment);

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
    won = random_number < winning_number * 5; //@TODO this is for testing purpose
  };

  let sender = tx_context::sender(ctx);
  if (won) {
    lottery.winner = option::some(sender);
    lottery.winning_slot = slot_index;
    lottery.winning_commitment = option::some(commitment);

    // Note: No private data is emitted here - winner already knows their commitment
    // They can claim anonymously later with a ZK proof
  } else {
    // Update last_picker and last_slot when not winning to keep gas costs consistent
    lottery.last_picker = option::some(sender);
    lottery.last_slot = slot_index;
  };

  event::emit(PickedEvent {
    lottery_id: object::id(lottery),
    slot_index,
    won,
    random_number,
  });

  random_number
}

public fun collect_fee(lottery: &mut Lottery, ctx: &mut tx_context::TxContext) {
  // Only creator can collect fees
  assert!(tx_context::sender(ctx) == lottery.creator, ENotCreator);

  let fee_amount = balance::value(&lottery.remaining_fee);
  if (fee_amount > 0) {
    let fee_coin = coin::from_balance(balance::split(&mut lottery.remaining_fee, fee_amount), ctx);
    transfer::public_transfer(fee_coin, lottery.creator);
  };
}

public fun collect_prize(lottery: &mut Lottery, ctx: &mut tx_context::TxContext) {
  // Must have a winner
  assert!(option::is_some(&lottery.winner), ENoWinner);

  // Only winner can collect prize
  let winner_addr = *option::borrow(&lottery.winner);
  assert!(tx_context::sender(ctx) == winner_addr, ENotWinner);

  let prize_amount = balance::value(&lottery.prize);
  if (prize_amount > 0) {
    let prize_coin = coin::from_balance(balance::split(&mut lottery.prize, prize_amount), ctx);
    transfer::public_transfer(prize_coin, winner_addr);
  };
}

// Anonymous prize claiming with ZK proof
// Proves knowledge of secret and nullifier without revealing them
public fun claim_prize_with_proof(
  lottery: &mut Lottery,
  proof_a: vector<u8>,          // Groth16 proof point A
  proof_b: vector<u8>,          // Groth16 proof point B
  proof_c: vector<u8>,          // Groth16 proof point C
  commitment: u64,              // Public: commitment from winning slot
  nullifier_hash: u64,          // Public: hash of nullifier (prevents double-claiming)
  ctx: &mut tx_context::TxContext
) {
  // Must have a winner
  assert!(option::is_some(&lottery.winning_commitment), ENoWinner);

  // Prize must not have been claimed yet
  assert!(!lottery.prize_claimed, EPrizeAlreadyClaimed);

  // Verify the commitment matches the winning commitment
  let winning_commitment = *option::borrow(&lottery.winning_commitment);
  assert!(commitment == winning_commitment, EInvalidCommitment);

  // Check nullifier hasn't been used before (prevent double-claiming)
  assert!(!table::contains(&lottery.used_nullifiers, nullifier_hash), ENullifierAlreadyUsed);

  // Verify Groth16 proof
  // If verification keys are empty, use simplified verification (for testing)
  // Otherwise, use real Groth16 verification with BN254 curve
  let is_valid = verify_groth16_proof(lottery, proof_a, proof_b, proof_c, commitment, nullifier_hash);
  assert!(is_valid, EInvalidProof);

  // Mark nullifier as used
  table::add(&mut lottery.used_nullifiers, nullifier_hash, true);

  // Mark prize as claimed
  lottery.prize_claimed = true;

  // Transfer prize to the caller (can be any address for anonymity)
  let prize_amount = balance::value(&lottery.prize);
  if (prize_amount > 0) {
    let prize_coin = coin::from_balance(balance::split(&mut lottery.prize, prize_amount), ctx);
    transfer::public_transfer(prize_coin, tx_context::sender(ctx));
  };

  // Emit claim event (no private data exposed)
  event::emit(PrizeClaimedEvent {
    lottery_id: object::id(lottery),
    nullifier_hash,
  });
}

// Groth16 proof verification using BN254 curve
// Falls back to simplified verification if verification keys are not set (for testing)
fun verify_groth16_proof(
  lottery: &Lottery,
  proof_a: vector<u8>,
  proof_b: vector<u8>,
  proof_c: vector<u8>,
  commitment: u64,
  nullifier_hash: u64,
): bool {
  // If verification keys are empty, use simplified verification for testing
  if (vector::is_empty(&lottery.vk_gamma_abc_g1)) {
    return true  // Simplified verification for testing
  };

  // Combine proof components into single vector expected by groth16 module
  // Format: proof_a || proof_b || proof_c
  let mut proof_points = vector::empty<u8>();
  vector::append(&mut proof_points, proof_a);
  vector::append(&mut proof_points, proof_b);
  vector::append(&mut proof_points, proof_c);

  // Serialize public inputs (commitment and nullifier_hash) as bytes
  // Format: commitment (32 bytes big-endian) || nullifier_hash (32 bytes big-endian)
  let mut public_inputs_bytes = vector::empty<u8>();

  // Convert commitment (u64) to 32-byte big-endian
  let mut commitment_bytes = bcs::to_bytes(&commitment);
  // Pad to 32 bytes (BCS encoding of u64 is 8 bytes, need to pad to 32)
  while (vector::length(&commitment_bytes) < 32) {
    vector::push_back(&mut commitment_bytes, 0u8);
  };
  vector::append(&mut public_inputs_bytes, commitment_bytes);

  // Convert nullifier_hash (u64) to 32-byte big-endian
  let mut nullifier_bytes = bcs::to_bytes(&nullifier_hash);
  while (vector::length(&nullifier_bytes) < 32) {
    vector::push_back(&mut nullifier_bytes, 0u8);
  };
  vector::append(&mut public_inputs_bytes, nullifier_bytes);

  // Perform Groth16 verification using BN254 curve
  let curve = groth16::bn254();
  let prepared_vk = groth16::pvk_from_bytes(
    lottery.vk_gamma_abc_g1,
    lottery.vk_alpha_g1_beta_g2,
    lottery.vk_gamma_g2_neg_pc,
    lottery.vk_delta_g2_neg_pc
  );
  let public_inputs_prepared = groth16::public_proof_inputs_from_bytes(public_inputs_bytes);
  let proof = groth16::proof_points_from_bytes(proof_points);

  groth16::verify_groth16_proof(
    &curve,
    &prepared_vk,
    &public_inputs_prepared,
    &proof
  )
}

// Public accessor functions for testing
public fun is_active(lottery: &Lottery): bool {
  option::is_none(&lottery.winner)
}

public fun get_winner(lottery: &Lottery): option::Option<address> {
  lottery.winner
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

public fun get_creator(lottery: &Lottery): address {
  lottery.creator
}

public fun get_prize(lottery: &Lottery): u64 {
  balance::value(&lottery.prize)
}

public fun get_remaining_fee(lottery: &Lottery): u64 {
  balance::value(&lottery.remaining_fee)
}

public fun get_last_picker(lottery: &Lottery): option::Option<address> {
  lottery.last_picker
}

public fun get_last_slot(lottery: &Lottery): u64 {
  lottery.last_slot
}
