import { FC, useState, useEffect } from "react"
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import {
	PACKAGE_ID,
	RANDOM_OBJECT_ID,
	mistToSui,
} from "../../../config/constants"

interface LotteryData {
	slots: boolean[]
	isActive: boolean
	winningSlot: number
	creator: string
	winner: string | null
	prize: number
	remainingFee: number
	prizeClaimed: boolean
	fee: number  // Fee per slot for this lottery
}

interface LotteryPlayProps {
	lotteryObjectId: string
	lotteryData: LotteryData | null
	slotIndex: number | null
	currentAccountAddress: string | undefined
	claimSecretHash: string
	generatedSecret: string
	isLoading: boolean
	onLoadingChange: (loading: boolean) => void
	onStatusChange: (status: string) => void
	onLotteryUpdate: () => void
}

export const LotteryPlay: FC<LotteryPlayProps> = ({
	lotteryObjectId,
	lotteryData,
	slotIndex,
	currentAccountAddress,
	claimSecretHash,
	generatedSecret,
	isLoading,
	onLoadingChange,
	onStatusChange,
	onLotteryUpdate,
}) => {
	const client = useSuiClient()
	const { mutate: signAndExecute } = useSignAndExecuteTransaction()
	const [claimSecret, setClaimSecret] = useState<string>("")

	// Auto-populate claim secret from localStorage
	useEffect(() => {
		const savedSecret = localStorage.getItem("lotterySecret")
		if (savedSecret && !claimSecret) {
			setClaimSecret(savedSecret)
		}
	}, [claimSecret])

	const handlePickSlot = async () => {
		if (!lotteryObjectId || isLoading || slotIndex === null || !lotteryData)
			return

		if (!claimSecretHash) {
			onStatusChange(
				"Please generate or fetch your secret first in the 'My Secret' section above!"
			)
			return
		}

		onLoadingChange(true)
		onStatusChange("Picking slot...")

		try {
			const tx = new Transaction()

			const [coin] = tx.splitCoins(tx.gas, [lotteryData.fee])

			// Convert secret hash to byte array
			const secretHashBytes = Array.from(
				claimSecretHash
					.match(/.{1,2}/g)
					?.map((byte) => parseInt(byte, 16)) || []
			)

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::pick_slot`,
				arguments: [
					tx.pure.u64(slotIndex),
					tx.object(lotteryObjectId),
					tx.object(RANDOM_OBJECT_ID),
					coin,
					tx.pure.vector("u8", secretHashBytes),
				],
			})

			signAndExecute(
				{
					transaction: tx,
				},
				{
					onSuccess: async (result) => {
						console.log("Transaction successful:", result)

						// Check for WinnerClaimInfoEvent in the transaction result
						try {
							const txDetails = await client.waitForTransaction({
								digest: result.digest,
								options: { showEvents: true },
							})

							const winnerEvent = txDetails.events?.find((e) =>
								e.type.includes("WinnerClaimInfoEvent")
							)

							if (winnerEvent && winnerEvent.parsedJson) {
								onStatusChange(
									`🎉 YOU WON! Digest: ${result.digest}\n\nYou can now claim your prize anonymously using your secret!\nYour secret: ${generatedSecret}`
								)
							} else {
								onStatusChange(
									`Slot picked successfully! Digest: ${result.digest}`
								)
							}
						} catch (_e) {
							onStatusChange(
								`Slot picked successfully! Digest: ${result.digest}`
							)
						}

						// Auto-refresh lottery data after picking
						setTimeout(() => onLotteryUpdate(), 1000)
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						onStatusChange(`Error: ${error.message}`)
						onLoadingChange(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error picking slot:", error)
			onStatusChange(`Error: ${error.message}`)
			onLoadingChange(false)
		}
	}

	const handleCollectFee = async () => {
		if (!lotteryObjectId || isLoading) return

		onLoadingChange(true)
		onStatusChange("Collecting fees...")

		try {
			const tx = new Transaction()

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::collect_fee`,
				arguments: [tx.object(lotteryObjectId)],
			})

			signAndExecute(
				{
					transaction: tx,
				},
				{
					onSuccess: async (result) => {
						console.log("Transaction successful:", result)
						onStatusChange(
							`Fees collected successfully! Digest: ${result.digest}`
						)
						setTimeout(() => onLotteryUpdate(), 1000)
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						onStatusChange(`Error: ${error.message}`)
						onLoadingChange(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error collecting fees:", error)
			onStatusChange(`Error: ${error.message}`)
			onLoadingChange(false)
		}
	}

	const handleCollectPrize = async () => {
		if (!lotteryObjectId || isLoading) return

		onLoadingChange(true)
		onStatusChange("Collecting prize...")

		try {
			const tx = new Transaction()

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::collect_prize`,
				arguments: [tx.object(lotteryObjectId)],
			})

			signAndExecute(
				{
					transaction: tx,
				},
				{
					onSuccess: async (result) => {
						console.log("Transaction successful:", result)
						onStatusChange(
							`Prize collected successfully! Digest: ${result.digest}`
						)
						setTimeout(() => onLotteryUpdate(), 1000)
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						onStatusChange(`Error: ${error.message}`)
						onLoadingChange(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error collecting prize:", error)
			onStatusChange(`Error: ${error.message}`)
			onLoadingChange(false)
		}
	}

	const handleClaimPrizeWithSecret = async () => {
		if (!lotteryObjectId || isLoading || !claimSecret) {
			onStatusChange("Please provide the claim secret")
			return
		}

		onLoadingChange(true)
		onStatusChange("Claiming prize anonymously...")

		try {
			const tx = new Transaction()

			// Convert secret string to byte array
			const secretBytes = Array.from(
				claimSecret
					.match(/.{1,2}/g)
					?.map((byte) => parseInt(byte, 16)) || []
			)

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::claim_prize_with_secret`,
				arguments: [tx.object(lotteryObjectId), tx.pure.vector("u8", secretBytes)],
			})

			signAndExecute(
				{
					transaction: tx,
				},
				{
					onSuccess: async (result) => {
						console.log("Transaction successful:", result)
						onStatusChange(
							`Prize claimed anonymously! Digest: ${result.digest}`
						)
						setClaimSecret("")
						setTimeout(() => onLotteryUpdate(), 1000)
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						onStatusChange(`Error: ${error.message}`)
						onLoadingChange(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error claiming prize:", error)
			onStatusChange(`Error: ${error.message}`)
			onLoadingChange(false)
		}
	}

	const isCreator =
		currentAccountAddress &&
		lotteryData &&
		currentAccountAddress === lotteryData.creator
	const isWinner =
		currentAccountAddress &&
		lotteryData &&
		lotteryData.winner &&
		currentAccountAddress === lotteryData.winner
	const canCollectFee =
		isCreator && lotteryData && lotteryData.remainingFee > 0
	const canCollectPrize = isWinner && lotteryData && lotteryData.prize > 0

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
			<h3 className="text-xl font-semibold mb-4">Play Lottery</h3>
			<div className="flex flex-col gap-4">
				{lotteryData && (
					<div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div>
								<span className="font-semibold">Prize:</span>{" "}
								{mistToSui(lotteryData.prize)} SUI
								{lotteryData.prize === 0 && (
									<span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
										(Collected ✓)
									</span>
								)}
							</div>
							<div>
								<span className="font-semibold">Entry Fee:</span>{" "}
								{mistToSui(lotteryData.fee)} SUI
							</div>
							<div>
								<span className="font-semibold">Fees Collected:</span>{" "}
								{mistToSui(lotteryData.remainingFee)} SUI
								{lotteryData.remainingFee === 0 && lotteryData.winner && (
									<span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
										(Collected ✓)
									</span>
								)}
							</div>
							<div>
								<span className="font-semibold">Status:</span>{" "}
								{lotteryData.isActive ? (
									<span className="text-green-600 dark:text-green-400">
										Active
									</span>
								) : (
									<span className="text-red-600 dark:text-red-400">
										Ended
									</span>
								)}
							</div>
						</div>
					</div>
				)}

				<button
					onClick={handlePickSlot}
					disabled={
						isLoading ||
						!lotteryObjectId ||
						!lotteryData ||
						!lotteryData.isActive ||
						slotIndex === null ||
						(slotIndex !== null && lotteryData.slots[slotIndex])
					}
					className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
					title={
						!lotteryData
							? "Select a lottery first"
							: !lotteryData.isActive
							? "This lottery has ended"
							: slotIndex === null
							? "Select a slot from the grid"
							: slotIndex !== null && lotteryData.slots[slotIndex]
							? "This slot is already taken"
							: "Click to pick this slot"
					}
				>
					{isLoading
						? "Processing..."
						: !lotteryData
						? "Pick Slot"
						: !lotteryData.isActive
						? "Lottery Ended"
						: slotIndex === null
						? "Pick Slot (Select from Grid)"
						: lotteryData.slots[slotIndex]
						? "Slot Taken"
						: `Pick Slot ${slotIndex} (Pay ${mistToSui(lotteryData.fee)} SUI)`}
				</button>

				<div className="flex gap-3">
					<button
						onClick={handleCollectFee}
						disabled={isLoading || !canCollectFee}
						className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
						title={
							!isCreator
								? "Only creator can collect fees"
								: !lotteryData?.remainingFee
								? "No fees to collect"
								: "Collect accumulated fees"
						}
					>
						{isLoading
							? "Processing..."
							: canCollectFee
							? `Collect Fee (${mistToSui(lotteryData!.remainingFee)} SUI)`
							: isCreator &&
							  lotteryData?.remainingFee === 0 &&
							  lotteryData?.winner
							? "Fees Collected ✓"
							: "Collect Fee"}
					</button>

					<button
						onClick={handleCollectPrize}
						disabled={isLoading || !canCollectPrize}
						className="flex-1 px-6 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
						title={
							!isWinner
								? "Only winner can collect prize"
								: !lotteryData?.prize
								? "Prize already collected"
								: "Collect your prize!"
						}
					>
						{isLoading
							? "Processing..."
							: canCollectPrize
							? `Collect Prize (${mistToSui(lotteryData!.prize)} SUI)`
							: isWinner && lotteryData?.prize === 0
							? "Prize Collected ✓"
							: "Collect Prize"}
					</button>
				</div>

				{/* Anonymous Claim Section */}
				<div className="border-t dark:border-gray-700 pt-4 mt-4">
					<h4 className="text-lg font-semibold mb-3">Anonymous Prize Claim</h4>
					<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
						If you have the claim secret, you can collect the prize
						anonymously from any wallet.
					</p>
					<div className="flex gap-2">
						<input
							type="text"
							value={claimSecret}
							onChange={(e) => setClaimSecret(e.target.value)}
							placeholder="Enter claim secret (hex)"
							className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
						/>
						<button
							onClick={handleClaimPrizeWithSecret}
							disabled={
								isLoading || !claimSecret || lotteryData?.prizeClaimed
							}
							className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
							title={
								lotteryData?.prizeClaimed
									? "Prize already claimed"
									: !claimSecret
									? "Enter claim secret"
									: "Claim prize anonymously"
							}
						>
							{isLoading
								? "Processing..."
								: lotteryData?.prizeClaimed
								? "Claimed ✓"
								: "Claim Anonymously"}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
