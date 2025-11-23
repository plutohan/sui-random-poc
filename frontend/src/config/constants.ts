// Contract Configuration
// Update these values after deploying your contract

// Your deployed random_poc package ID
// Find this in your deployment output or Move.toml after publishing
export const PACKAGE_ID =
	"0xd43153ad125aa4944f359b27bb6b51b5b1ba61333a7879e1d6fe16773b211232"

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
