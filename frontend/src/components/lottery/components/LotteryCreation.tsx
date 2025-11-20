import { FC } from "react"
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { PACKAGE_ID, LOTTERY_PRIZE, mistToSui } from "../../../config/constants"

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

	const handleCreateLottery = async () => {
		if (isLoading) return

		onLoadingChange(true)
		onStatusChange("Creating lottery...")

		try {
			const tx = new Transaction()

			const [coin] = tx.splitCoins(tx.gas, [LOTTERY_PRIZE])

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::create_lottery`,
				arguments: [coin],
			})

			signAndExecute(
				{
					transaction: tx,
				},
				{
					onSuccess: (result) => {
						console.log("Transaction successful:", result)
						onStatusChange(
							`Lottery created successfully! Digest: ${result.digest}`
						)
						onLoadingChange(false)
						// Refresh lottery list after creating
						setTimeout(() => onLotteryCreated(), 2000)
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						onStatusChange(`Error: ${error.message}`)
						onLoadingChange(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error creating lottery:", error)
			onStatusChange(`Error: ${error.message}`)
			onLoadingChange(false)
		}
	}

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
			<h3 className="text-xl font-semibold mb-4">Create New Lottery</h3>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
				Create a 3x3 lottery with 9 slots. Players pay {mistToSui(15_000_000)}{" "}
				SUI per pick. Winner gets {mistToSui(LOTTERY_PRIZE)} SUI!
			</p>
			<button
				onClick={handleCreateLottery}
				disabled={isLoading}
				className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
			>
				{isLoading
					? "Processing..."
					: `Create Lottery (Pay ${mistToSui(LOTTERY_PRIZE)} SUI)`}
			</button>
		</div>
	)
}
