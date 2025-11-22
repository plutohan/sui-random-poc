import { FC, useState, useEffect, useCallback } from "react"
import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit"
import { PACKAGE_ID, mistToSui } from "../../config/constants"
import { SecretManagement, useSecret } from "./components/SecretManagement"
import { LotteryCreation } from "./components/LotteryCreation"
import { LotteryPlay } from "./components/LotteryPlay"
import { LotteryGrid } from "./components/LotteryGrid"

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

const LotteryInteraction: FC = () => {
	const suiClient = useSuiClient()
	const currentAccount = useCurrentAccount()
	const { claimSecretHash, generatedSecret } = useSecret(currentAccount?.address)

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
	const [lotteryData, setLotteryData] = useState<LotteryData | null>(null)

	const handleQueryLottery = useCallback(async () => {
		if (!lotteryObjectId) return

		setIsLoading(true)
		setStatus("Querying lottery...")

		try {
			const object = await suiClient.getObject({
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

				// Parse winner
				const winner =
					fields.winner && typeof fields.winner === "string"
						? fields.winner
						: null

				const isActive = winner === null
				const winningSlot = parseInt(fields.winning_slot || "0")
				const creator = fields.creator
				const prize = parseInt(fields.prize || "0")
				const remainingFee = parseInt(fields.remaining_fee || "0")
				const prizeClaimed = fields.prize_claimed || false
				const fee = parseInt(fields.fee || "0")

				setLotteryData({
					slots,
					isActive,
					winningSlot,
					creator,
					winner,
					prize,
					remainingFee,
					prizeClaimed,
					fee,
				})

				setStatus(`Lottery Status:
  Active: ${isActive}
  Prize: ${mistToSui(prize)} SUI${
					prizeClaimed
						? " (Claimed Anonymously ✓)"
						: prize === 0
						? " (Collected ✓)"
						: ""
				}
  Entry Fee: ${mistToSui(fee)} SUI per slot
  Remaining Fee: ${mistToSui(remainingFee)} SUI${
					remainingFee === 0 && winner ? " (Collected ✓)" : ""
				}
  Taken Slots: ${slots.filter((s: boolean) => s).length}/${slots.length}
  ${winner ? `Winner: ${winner}` : "No winner yet"}
  ${prizeClaimed ? "Prize has been claimed anonymously" : ""}`)
			} else {
				setStatus("Could not read lottery data")
			}

			setIsLoading(false)
		} catch (error: any) {
			console.error("Error querying lottery:", error)
			setStatus(`Error: ${error.message}`)
			setIsLoading(false)
		}
	}, [lotteryObjectId, suiClient])

	// Auto-query lottery when object ID changes
	useEffect(() => {
		if (lotteryObjectId) {
			handleQueryLottery()
		} else {
			setLotteryData(null)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lotteryObjectId])

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
				const response: any = await suiClient.queryEvents({
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
						const obj = await suiClient.getObject({
							id,
							options: { showContent: true },
						})

						if (obj.data?.content && "fields" in obj.data.content) {
							const fields = obj.data.content.fields as any

							// Parse winner
							const winner =
								fields.winner && typeof fields.winner === "string"
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

			const validLotteries = lotteries.filter((l) => l !== null) as Array<{
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

			{/* My Secret Section */}
			<SecretManagement
				currentAccountAddress={currentAccount?.address}
				onStatusChange={setStatus}
			/>

			{/* Create Lottery Section */}
			<LotteryCreation
				isLoading={isLoading}
				onLoadingChange={setIsLoading}
				onStatusChange={setStatus}
				onLotteryCreated={fetchAllLotteries}
			/>

			{/* Lottery Selection */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
				<div className="flex items-center justify-between mb-2">
					<label className="block text-sm font-medium">Select Lottery:</label>
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
						No lotteries found. Click "Refresh List" or create a new lottery.
					</p>
				)}
			</div>

			{/* Lottery Grid Visualization */}
			{lotteryData && (
				<LotteryGrid
					slots={lotteryData.slots}
					isActive={lotteryData.isActive}
					winningSlot={lotteryData.winningSlot}
					selectedSlot={slotIndex}
					onSlotSelect={setSlotIndex}
				/>
			)}

			{/* Play Lottery Section */}
			{lotteryObjectId && (
				<LotteryPlay
					lotteryObjectId={lotteryObjectId}
					lotteryData={lotteryData}
					slotIndex={slotIndex}
					currentAccountAddress={currentAccount?.address}
					claimSecretHash={claimSecretHash}
					generatedSecret={generatedSecret}
					isLoading={isLoading}
					onLoadingChange={setIsLoading}
					onStatusChange={setStatus}
					onLotteryUpdate={handleQueryLottery}
				/>
			)}

			{/* Status Section */}
			{status && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
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
						<strong>One-time setup:</strong> In the "My Secret" section,
						click "Generate Secret" to create your personal claim secret.
						This secret is saved in your browser's local storage and used for
						all your lottery picks.
					</li>
					<li>
						<strong>Creating a lottery:</strong> Click "Create Lottery" and
						configure the prize pool and entry fee. The prize pool you set
						will be locked in the lottery contract.
					</li>
					<li>
						<strong>Playing:</strong> Select an existing lottery from the
						dropdown, click any available slot in the 3x3 grid, then "Pick
						Slot". The entry fee per lottery is shown in the lottery details.
						Your secret hash is automatically included with each pick.
					</li>
					<li>
						<strong>Winning:</strong> If you win, your slot turns gold! You
						already have your secret, so you can immediately claim
						anonymously.
					</li>
					<li>
						<strong>Claiming prizes:</strong> Winners can either (a) collect
						directly as the known winner using "Collect Prize", or (b) use
						their secret to collect anonymously from any wallet address via
						"Claim Anonymously".
					</li>
					<li>
						<strong>Creator fees:</strong> If you created the lottery, click
						"Collect Fee" to get accumulated player fees.
					</li>
				</ol>
			</div>
		</div>
	)
}

export default LotteryInteraction
