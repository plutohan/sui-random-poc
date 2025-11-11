import { FC, useState, useEffect, useCallback } from "react"
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { PACKAGE_ID, RANDOM_OBJECT_ID } from "../../config/constants"

const LotteryInteraction: FC = () => {
	const client = useSuiClient()
	const { mutate: signAndExecute } = useSignAndExecuteTransaction()

	const [maxSlots, setMaxSlots] = useState<number>(10)
	const [lotteryObjectId, setLotteryObjectId] = useState<string>("")
	const [slotIndex, setSlotIndex] = useState<number>(0)
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
				const isActive = fields.is_active
				const winningSlot = parseInt(fields.winning_slot)

				setLotteryData({
					slots,
					isActive,
					winningSlot,
				})

				setStatus(`Lottery Status:
  Active: ${isActive}
  Total Slots: ${slots.length}
  Taken Slots: ${slots.filter((s: boolean) => s).length}
  Winning Slot: ${winningSlot}`)
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

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::create_lottery`,
				arguments: [tx.pure.u64(maxSlots)],
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
		if (!lotteryObjectId || isLoading) return

		setIsLoading(true)
		setStatus("Picking slot...")

		try {
			const tx = new Transaction()

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::pick_slot`,
				arguments: [
					tx.pure.u64(slotIndex),
					tx.object(lotteryObjectId),
					tx.object(RANDOM_OBJECT_ID),
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
			const lotteryMetadata = new Map<
				string,
				{ id: string; maxSlots: number }
			>()

			allEvents.forEach((event) => {
				if (event.parsedJson) {
					const lotteryId = event.parsedJson.lottery_id
					const maxSlots = parseInt(event.parsedJson.max_slots)
					lotteryIds.add(lotteryId)
					lotteryMetadata.set(lotteryId, {
						id: lotteryId,
						maxSlots,
					})
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
							return {
								id: obj.data.objectId,
								isActive: fields.is_active,
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

	return (
		<div className="max-w-4xl mx-auto p-6">
			<h2 className="text-3xl font-bold mb-8">Sui Random Lottery</h2>

			{/* Create Lottery Section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
				<h3 className="text-xl font-semibold mb-4">
					Create New Lottery
				</h3>
				<div className="flex flex-col gap-4">
					<div>
						<label className="block text-sm font-medium mb-2">
							Number of Slots:
						</label>
						<input
							type="number"
							min="2"
							max="100"
							value={maxSlots}
							onChange={(e) =>
								setMaxSlots(parseInt(e.target.value))
							}
							className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
						/>
					</div>
					<button
						onClick={handleCreateLottery}
						disabled={isLoading}
						className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{isLoading ? "Processing..." : "Create Lottery"}
					</button>
				</div>
			</div>

			{/* Pick Slot Section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
				<h3 className="text-xl font-semibold mb-4">Pick a Slot</h3>
				<div className="flex flex-col gap-4">
					<div>
						<div className="flex items-center justify-between mb-2">
							<label className="block text-sm font-medium">
								Lottery Object ID:
							</label>
							<button
								onClick={fetchAllLotteries}
								disabled={isLoadingLotteries}
								className="text-xs px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
							>
								{isLoadingLotteries
									? "Loading..."
									: "Refresh List"}
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
									{lottery.id.slice(0, 10)}...
									{lottery.id.slice(-8)} - {lottery.slotCount}{" "}
									slots -{" "}
									{lottery.isActive ? "Active" : "Ended"}
								</option>
							))}
						</select>
						{lotteryObjects.length === 0 && (
							<p className="text-xs text-gray-500 mt-1">
								No lotteries found. Click "Refresh List" or
								create a new lottery.
							</p>
						)}
					</div>
					<div>
						<label className="block text-sm font-medium mb-2">
							Slot Index:
						</label>
						<input
							type="number"
							min="0"
							value={slotIndex}
							onChange={(e) =>
								setSlotIndex(parseInt(e.target.value))
							}
							className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
						/>
					</div>
					<button
						onClick={handlePickSlot}
						disabled={
							isLoading ||
							!lotteryObjectId ||
							!lotteryData ||
							!lotteryData.isActive ||
							lotteryData.slots[slotIndex]
						}
						className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
						title={
							!lotteryData
								? "Select a lottery first"
								: !lotteryData.isActive
								? "This lottery has ended"
								: lotteryData.slots[slotIndex]
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
							: lotteryData.slots[slotIndex]
							? "Slot Taken"
							: "Pick Slot"}
					</button>
				</div>
			</div>

			{/* Lottery Visualization Section */}
			{lotteryData && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
					<h3 className="text-xl font-semibold mb-4">
						Lottery Slots
					</h3>
					<div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-4">
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
                    aspect-square flex items-center justify-center rounded-lg font-semibold text-sm transition-all
                    ${
						isWinning
							? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg ring-2 ring-yellow-300 animate-pulse"
							: isTaken
							? "bg-red-500 text-white cursor-not-allowed"
							: !lotteryData.isActive
							? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
							: isSelected
							? "bg-blue-500 text-white ring-2 ring-blue-300 cursor-pointer"
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
					<div className="flex flex-wrap gap-4 text-sm">
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
						Create a new lottery or click "Refresh List" to see all
						available lotteries
					</li>
					<li>
						Select a lottery from the dropdown - the slots grid will
						appear automatically
					</li>
					<li>
						Click on an available (gray) slot to select it - it will
						turn blue
					</li>
					<li>Click "Pick Slot" to submit your choice</li>
					<li>
						If you win, your slot will turn gold! Otherwise, pick
						another slot and try again
					</li>
				</ol>
			</div>
		</div>
	)
}

export default LotteryInteraction
