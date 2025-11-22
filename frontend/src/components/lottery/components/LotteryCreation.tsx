import { FC, useState } from "react"
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import {
	PACKAGE_ID,
	DEFAULT_LOTTERY_PRIZE,
	DEFAULT_FEE,
	mistToSui,
	suiToMist,
} from "../../../config/constants"

interface LotteryCreationProps {
	isLoading: boolean
	onLoadingChange: (loading: boolean) => void
	onStatusChange: (status: string) => void
	onLotteryCreated: () => void
}

export const LotteryCreation: FC<LotteryCreationProps> = ({
	isLoading,
	onLoadingChange,
	onStatusChange,
	onLotteryCreated,
}) => {
	const { mutate: signAndExecute } = useSignAndExecuteTransaction()

	// State for prize and fee inputs (in SUI, not MIST)
	const [prizeInSui, setPrizeInSui] = useState<string>(
		mistToSui(DEFAULT_LOTTERY_PRIZE)
	)
	const [feeInSui, setFeeInSui] = useState<string>(mistToSui(DEFAULT_FEE))
	const [localStatus, setLocalStatus] = useState<string>("")

	const handleCreateLottery = async () => {
		if (isLoading) return

		// Convert SUI to MIST
		const prizeInMist = suiToMist(parseFloat(prizeInSui) || 0)
		const feeInMist = suiToMist(parseFloat(feeInSui) || 0)

		// Validate inputs
		if (prizeInMist <= 0) {
			onStatusChange("Prize amount must be greater than 0")
			return
		}
		if (feeInMist <= 0) {
			onStatusChange("Fee must be greater than 0")
			return
		}

		onLoadingChange(true)
		onStatusChange("Creating lottery...")
		setLocalStatus("Creating lottery...")

		try {
			const tx = new Transaction()

			const [coin] = tx.splitCoins(tx.gas, [prizeInMist])

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::create_lottery`,
				arguments: [coin, tx.pure.u64(feeInMist)],
			})

			signAndExecute(
				{
					transaction: tx,
				},
				{
					onSuccess: (result) => {
						console.log("Transaction successful:", result)
						const message = `Lottery created successfully! Digest: ${result.digest}`
						onStatusChange(message)
						setLocalStatus(message)
						onLoadingChange(false)
						// Refresh lottery list after creating
						setTimeout(() => onLotteryCreated(), 2000)
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						const message = `Error: ${error.message}`
						onStatusChange(message)
						setLocalStatus(message)
						onLoadingChange(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error creating lottery:", error)
			const message = `Error: ${error.message}`
			onStatusChange(message)
			setLocalStatus(message)
			onLoadingChange(false)
		}
	}

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
			<h3 className="text-xl font-semibold mb-4">Create New Lottery</h3>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
				Create a 3x3 lottery with 9 slots. Configure the prize pool and entry
				fee below.
			</p>

			{/* Prize Amount Input */}
			<div className="mb-4">
				<label className="block text-sm font-medium mb-2">
					Prize Pool (SUI)
				</label>
				<input
					type="number"
					value={prizeInSui}
					onChange={(e) => setPrizeInSui(e.target.value)}
					step="0.01"
					min="0"
					placeholder="Enter prize amount in SUI"
					className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
				/>
				<p className="text-xs text-gray-500 mt-1">
					Winner receives this amount
				</p>
			</div>

			{/* Fee Input */}
			<div className="mb-4">
				<label className="block text-sm font-medium mb-2">
					Entry Fee per Slot (SUI)
				</label>
				<input
					type="number"
					value={feeInSui}
					onChange={(e) => setFeeInSui(e.target.value)}
					step="0.001"
					min="0"
					placeholder="Enter fee amount in SUI"
					className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
				/>
				<p className="text-xs text-gray-500 mt-1">
					Players pay this amount to pick a slot
				</p>
			</div>

			<button
				onClick={handleCreateLottery}
				disabled={isLoading}
				className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
			>
				{isLoading ? "Processing..." : `Create Lottery (Pay ${prizeInSui} SUI)`}
			</button>
			{localStatus && (
				<p className="mt-3 text-xs text-gray-600 dark:text-gray-400">{localStatus}</p>
			)}
		</div>
	)
}
