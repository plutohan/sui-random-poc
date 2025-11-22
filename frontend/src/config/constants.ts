// Contract Configuration
// Update these values after deploying your contract

// Your deployed random_poc package ID
// Find this in your deployment output or Move.toml after publishing
export const PACKAGE_ID =
	"0x43ff6c05ef8b2e4bc89b6f9cfd6a88d97dfc180cd25cc3253bfdf2a6ee406573"

// Sui Random object ID (standard on all networks)
export const RANDOM_OBJECT_ID = "0x8"

// Contract constants
export const SLOT_COUNT = 9

// Default values for prize and fee (now configurable per lottery)
export const DEFAULT_LOTTERY_PRIZE = 100_000_000 // 0.1 SUI in MIST
export const DEFAULT_FEE = 15_000_000 // 0.015 SUI in MIST

// Helper function to convert MIST to SUI
export const mistToSui = (mist: number): string => {
	return parseFloat((mist / 1_000_000_000).toFixed(9)).toString()
}

// Helper function to convert SUI to MIST
export const suiToMist = (sui: number): number => {
	return Math.floor(sui * 1_000_000_000)
}
