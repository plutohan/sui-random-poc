// Contract Configuration
// Update these values after deploying your contract

// Your deployed random_poc package ID
// Find this in your deployment output or Move.toml after publishing
export const PACKAGE_ID =
	"0x9b80581d314984f2fb2624839d50e5ec62079431f797138a4bb4af5e8c8301ab"

// Sui Random object ID (standard on all networks)
export const RANDOM_OBJECT_ID = "0x8"

// Contract constants
export const SLOT_COUNT = 9
export const LOTTERY_PRIZE = 100_000_000 // 0.1 SUI in MIST
export const FEE = 15_000_000 // 0.015 SUI in MIST

// Helper function to convert MIST to SUI
export const mistToSui = (mist: number): string => {
	return parseFloat((mist / 1_000_000_000).toFixed(9)).toString()
}
