import { FC, useState, useEffect, useCallback } from "react"
import {
	useSignAndExecuteTransaction,
	useSuiClient,
	useCurrentAccount,
} from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import {
	PACKAGE_ID,
	RANDOM_OBJECT_ID,
	LOTTERY_PRIZE,
	FEE,
	mistToSui,
} from "../../config/constants"

const LotteryInteraction: FC = () => {
	const client = useSuiClient()
	const currentAccount = useCurrentAccount()
	const { mutate: signAndExecute } = useSignAndExecuteTransaction()

	const [lotteryObjectId, setLotteryObjectId] = useState<string>("")
	const [slotIndex, setSlotIndex] = useState<number | null>(null)
	const [status, setStatus] = useState<string>("")
	const [isLoading, setIsLoading] = useState<boolean>(false)

	// Lottery objects list
	const [lotteryObjects, setLotteryObjects] = useState<
		Array<{
			id: string
			isActive: boolean
			slotCount: number
		}>
	>([])
	const [isLoadingLotteries, setIsLoadingLotteries] = useState<boolean>(false)

	// Lottery state visualization
	const [lotteryData, setLotteryData] = useState<{
		slots: boolean[]
		isActive: boolean
		winningSlot: number
		creator: string
		winner: string | null
		prize: number
		remainingFee: number
	} | null>(null)

	const handleQueryLottery = useCallback(async () => {
		if (!lotteryObjectId) return

		setIsLoading(true)
		setStatus("Querying lottery...")

		try {
			const object = await client.getObject({
				id: lotteryObjectId,
				options: {
					showContent: true,
				},
			})

			console.log("Lottery object:", object)

			if (object.data?.content && "fields" in object.data.content) {
				const fields = object.data.content.fields as any

				// Parse slots array
				const slots = fields.slots || []

				// Parse winner - it could be a string address or null/undefined
				const winner = fields.winner && typeof fields.winner === 'string'
					? fields.winner
					: null

				const isActive = winner === null
				const winningSlot = parseInt(fields.winning_slot || "0")
				const creator = fields.creator
				const prize = parseInt(fields.prize || "0")
				const remainingFee = parseInt(fields.remaining_fee || "0")

				setLotteryData({
					slots,
					isActive,
					winningSlot,
					creator,
					winner,
					prize,
					remainingFee,
				})

				setStatus(`Lottery Status:
  Active: ${isActive}
  Prize: ${mistToSui(LOTTERY_PRIZE)} SUI${prize === 0 ? " (Collected ✓)" : ""}
  Remaining Fee: ${mistToSui(remainingFee)} SUI${remainingFee === 0 && winner ? " (Collected ✓)" : ""}
  Taken Slots: ${slots.filter((s: boolean) => s).length}/${slots.length}
  ${winner ? `Winner: ${winner}` : "No winner yet"}`)
			} else {
				setStatus("Could not read lottery data")
			}

			setIsLoading(false)
		} catch (error: any) {
			console.error("Error querying lottery:", error)
			setStatus(`Error: ${error.message}`)
			setIsLoading(false)
		}
	}, [lotteryObjectId, client])

	// Auto-query lottery when object ID changes
	useEffect(() => {
		if (lotteryObjectId) {
			handleQueryLottery()
		} else {
			setLotteryData(null)
		}
	}, [lotteryObjectId, handleQueryLottery])

	const handleCreateLottery = async () => {
		if (isLoading) return

		setIsLoading(true)
		setStatus("Creating lottery...")

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
						setStatus(
							`Lottery created successfully! Digest: ${result.digest}`
						)
						setIsLoading(false)
						// Refresh lottery list after creating
						setTimeout(() => fetchAllLotteries(), 2000)
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						setStatus(`Error: ${error.message}`)
						setIsLoading(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error creating lottery:", error)
			setStatus(`Error: ${error.message}`)
			setIsLoading(false)
		}
	}

	const handlePickSlot = async () => {
		if (!lotteryObjectId || isLoading || slotIndex === null) return

		setIsLoading(true)
		setStatus("Picking slot...")

		try {
			const tx = new Transaction()

			const [coin] = tx.splitCoins(tx.gas, [FEE])

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::pick_slot`,
				arguments: [
					tx.pure.u64(slotIndex),
					tx.object(lotteryObjectId),
					tx.object(RANDOM_OBJECT_ID),
					coin,
				],
			})

			signAndExecute(
				{
					transaction: tx,
				},
				{
					onSuccess: async (result) => {
						console.log("Transaction successful:", result)
						setStatus(
							`Slot picked successfully! Digest: ${result.digest}`
						)
						// Auto-refresh lottery data after picking
						setTimeout(() => handleQueryLottery(), 1000)
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						setStatus(`Error: ${error.message}`)
						setIsLoading(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error picking slot:", error)
			setStatus(`Error: ${error.message}`)
			setIsLoading(false)
		}
	}

	const handleCollectFee = async () => {
		if (!lotteryObjectId || isLoading) return

		setIsLoading(true)
		setStatus("Collecting fees...")

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
						setStatus(
							`Fees collected successfully! Digest: ${result.digest}`
						)
						setTimeout(() => handleQueryLottery(), 1000)
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						setStatus(`Error: ${error.message}`)
						setIsLoading(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error collecting fees:", error)
			setStatus(`Error: ${error.message}`)
			setIsLoading(false)
		}
	}

	const handleCollectPrize = async () => {
		if (!lotteryObjectId || isLoading) return

		setIsLoading(true)
		setStatus("Collecting prize...")

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
						setStatus(
							`Prize collected successfully! Digest: ${result.digest}`
						)
						setTimeout(() => handleQueryLottery(), 1000)
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						setStatus(`Error: ${error.message}`)
						setIsLoading(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error collecting prize:", error)
			setStatus(`Error: ${error.message}`)
			setIsLoading(false)
		}
	}

	const fetchAllLotteries = async () => {
		setIsLoadingLotteries(true)
		try {
			// Query for LotteryCreatedEvent to find all lottery IDs
			const eventType = `${PACKAGE_ID}::random_poc::LotteryCreatedEvent`

			let allEvents: any[] = []
			let hasNextPage = true
			let cursor = null

			// Query events with pagination
			while (hasNextPage) {
				const response: any = await client.queryEvents({
					query: {
						MoveEventType: eventType,
					},
					cursor,
					limit: 50,
				})

				allEvents = [...allEvents, ...response.data]
				hasNextPage = response.hasNextPage
				cursor = response.nextCursor

				// Limit to prevent infinite loops
				if (allEvents.length > 100) break
			}

			console.log("Found lottery creation events:", allEvents)

			// Extract unique lottery IDs from events
			const lotteryIds = new Set<string>()

			allEvents.forEach((event) => {
				if (event.parsedJson) {
					const lotteryId = event.parsedJson.lottery_id
					lotteryIds.add(lotteryId)
				}
			})

			// Fetch current state for each lottery
			const lotteries = await Promise.all(
				Array.from(lotteryIds).map(async (id) => {
					try {
						const obj = await client.getObject({
							id,
							options: { showContent: true },
						})

						if (obj.data?.content && "fields" in obj.data.content) {
							const fields = obj.data.content.fields as any

							// Parse winner - it could be a string address or null/undefined
							const winner = fields.winner && typeof fields.winner === 'string'
								? fields.winner
								: null
							const isActive = winner === null

							return {
								id: obj.data.objectId,
								isActive,
								slotCount: fields.slots?.length || 0,
							}
						}
					} catch (error) {
						console.error(`Error fetching lottery ${id}:`, error)
					}
					return null
				})
			)

			const validLotteries = lotteries.filter(
				(l) => l !== null
			) as Array<{
				id: string
				isActive: boolean
				slotCount: number
			}>

			setLotteryObjects(validLotteries)

			if (validLotteries.length > 0 && !lotteryObjectId) {
				setLotteryObjectId(validLotteries[0].id)
			}

			setStatus(`Found ${validLotteries.length} lottery object(s)`)
		} catch (error: any) {
			console.error("Error fetching lotteries:", error)
			setStatus(
				`Error fetching lotteries: ${error.message}. Make sure you've created at least one lottery.`
			)
		}
		setIsLoadingLotteries(false)
	}

	const isCreator =
		currentAccount &&
		lotteryData &&
		currentAccount.address === lotteryData.creator
	const isWinner =
		currentAccount &&
		lotteryData &&
		lotteryData.winner &&
		currentAccount.address === lotteryData.winner
	const canCollectFee =
		isCreator && lotteryData && lotteryData.remainingFee > 0
	const canCollectPrize = isWinner && lotteryData && lotteryData.prize > 0

	return (
		<div className="max-w-4xl mx-auto p-6">
			<h2 className="text-3xl font-bold mb-8">Sui Random Lottery</h2>

			{/* Create Lottery Section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
				<h3 className="text-xl font-semibold mb-4">Create New Lottery</h3>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					Create a 3x3 lottery with 9 slots. Players pay{" "}
					{mistToSui(FEE)} SUI per pick. Winner gets {mistToSui(LOTTERY_PRIZE)}{" "}
					SUI!
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

			{/* Pick Slot Section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
				<h3 className="text-xl font-semibold mb-4">Play Lottery</h3>
				<div className="flex flex-col gap-4">
					<div>
						<div className="flex items-center justify-between mb-2">
							<label className="block text-sm font-medium">
								Select Lottery:
							</label>
							<button
								onClick={fetchAllLotteries}
								disabled={isLoadingLotteries}
								className="text-xs px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
							>
								{isLoadingLotteries ? "Loading..." : "Refresh List"}
							</button>
						</div>
						<select
							value={lotteryObjectId}
							onChange={(e) => setLotteryObjectId(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
						>
							<option value="">Select a lottery...</option>
							{lotteryObjects.map((lottery) => (
								<option key={lottery.id} value={lottery.id}>
									{lottery.id.slice(0, 10)}...{lottery.id.slice(-8)} -{" "}
									{lottery.slotCount} slots -{" "}
									{lottery.isActive ? "Active" : "Ended"}
								</option>
							))}
						</select>
						{lotteryObjects.length === 0 && (
							<p className="text-xs text-gray-500 mt-1">
								No lotteries found. Click "Refresh List" or create a
								new lottery.
							</p>
						)}
					</div>

					{lotteryData && (
						<div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
							<div className="grid grid-cols-2 gap-2 text-sm">
								<div>
									<span className="font-semibold">Prize:</span>{" "}
									{mistToSui(LOTTERY_PRIZE)} SUI
									{lotteryData.prize === 0 && (
										<span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
											(Collected ✓)
										</span>
									)}
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
								<div className="col-span-2">
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
							: `Pick Slot ${slotIndex} (Pay ${mistToSui(FEE)} SUI)`}
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
								: isCreator && lotteryData?.remainingFee === 0 && lotteryData?.winner
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
								? `Collect Prize (${mistToSui(LOTTERY_PRIZE)} SUI)`
								: isWinner && lotteryData?.prize === 0
								? "Prize Collected ✓"
								: "Collect Prize"}
						</button>
					</div>
				</div>
			</div>

			{/* Lottery Visualization Section */}
			{lotteryData && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
					<h3 className="text-xl font-semibold mb-4">Lottery Grid (3x3)</h3>
					<div className="grid grid-cols-3 gap-3 mb-4 max-w-md mx-auto">
						{lotteryData.slots.map((isTaken, index) => {
							const isWinning =
								!lotteryData.isActive &&
								index === lotteryData.winningSlot
							const isSelected = slotIndex === index
							return (
								<div
									key={index}
									onClick={() =>
										lotteryData.isActive && !isTaken
											? setSlotIndex(index)
											: null
									}
									className={`
                    aspect-square flex items-center justify-center rounded-lg font-bold text-2xl transition-all
                    ${
						isWinning
							? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg ring-4 ring-yellow-300 animate-pulse"
							: isTaken
							? "bg-red-500 text-white cursor-not-allowed"
							: !lotteryData.isActive
							? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
							: isSelected
							? "bg-blue-500 text-white ring-4 ring-blue-300 cursor-pointer"
							: "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer"
					}
                  `}
									title={`Slot ${index}${
										isTaken
											? " (Taken)"
											: !lotteryData.isActive
											? " (Lottery Ended)"
											: " (Available)"
									}${isWinning ? " - WINNER!" : ""}`}
								>
									{index}
								</div>
							)
						})}
					</div>
					<div className="flex flex-wrap gap-4 text-sm justify-center">
						<div className="flex items-center gap-2">
							<div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
							<span>Available</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-6 h-6 bg-blue-500 rounded"></div>
							<span>Selected</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-6 h-6 bg-red-500 rounded"></div>
							<span>Taken</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded"></div>
							<span>Winner</span>
						</div>
					</div>
				</div>
			)}

			{/* Status Section */}
			{status && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
					<h3 className="text-xl font-semibold mb-4">Status</h3>
					<pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-x-auto whitespace-pre-wrap text-sm">
						{status}
					</pre>
				</div>
			)}

			{/* Instructions */}
			<div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
				<h4 className="font-semibold mb-2">How to Play:</h4>
				<ol className="list-decimal list-inside space-y-1 text-sm">
					<li>Connect your wallet using the navbar</li>
					<li>
						Create a new lottery (costs {mistToSui(LOTTERY_PRIZE)} SUI) or
						select an existing one
					</li>
					<li>Click on any available slot in the 3x3 grid to select it</li>
					<li>
						Click "Pick Slot" to play (costs {mistToSui(FEE)} SUI per pick)
					</li>
					<li>If you win, your slot turns gold! Click "Collect Prize"</li>
					<li>
						If you're the creator, click "Collect Fee" to get accumulated
						fees
					</li>
				</ol>
			</div>
		</div>
	)
}

export default LotteryInteraction
