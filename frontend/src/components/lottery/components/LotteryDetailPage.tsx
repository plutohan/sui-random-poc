import { FC, useEffect, useMemo, useState } from "react"
import { useNavigation } from "../../../providers/navigation/NavigationContext"
import { LotteryGrid } from "./LotteryGrid"
import { LotterySummary, fetchLotteryDetail } from "../lotteryApi"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import { mistToSui, PACKAGE_ID, RANDOM_OBJECT_ID } from "../../../config/constants"
import { Transaction } from "@mysten/sui/transactions"
import { useSecret } from "./SecretManagement"

type Props = {
	gameId: string
}

const LotteryDetailPage: FC<Props> = ({ gameId }) => {
	const { navigate } = useNavigation()
	const suiClient = useSuiClient()
	const currentAccount = useCurrentAccount()
	const { claimSecretHash, generatedSecret } = useSecret(currentAccount?.address)
	const { mutate: signAndExecute } = useSignAndExecuteTransaction()
	const [lottery, setLottery] = useState<LotterySummary | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
	const [showConfirm, setShowConfirm] = useState(false)
	const [statusMessage, setStatusMessage] = useState<string>("")
	const [showSecretModal, setShowSecretModal] = useState(false)
	const [claimSecret, setClaimSecret] = useState("")

	useEffect(() => {
		setSelectedSlot(null)
	}, [gameId])

	useEffect(() => {
		let isMounted = true
		const load = async () => {
			setIsLoading(true)
			const detail = await fetchLotteryDetail(suiClient, gameId)
			if (!isMounted) return
			setLottery(detail)
			setIsLoading(false)
			setStatusMessage("")
		}
		load()
		return () => {
			isMounted = false
		}
	}, [gameId, suiClient])

	const handleSlotSelect = (slot: number) => {
		if (!lottery) return
		if (!lottery.isActive || lottery.slots[slot]) {
			setSelectedSlot(slot)
			return
		}
		if (!claimSecretHash) {
			setStatusMessage("Secret이 없습니다. Wallet 페이지에서 먼저 생성해주세요.")
			setShowSecretModal(true)
			return
		}
		setSelectedSlot(slot)
		setShowConfirm(true)
	}

	const handlePickSlot = async () => {
		if (!lottery || selectedSlot === null || !lottery.isActive) return
		if (!claimSecretHash) {
			setStatusMessage("먼저 'My Secret' 섹션에서 Secret을 생성하거나 불러와주세요.")
			return
		}
		if (!currentAccount) {
			setStatusMessage("지갑을 연결해주세요.")
			return
		}
		setIsSubmitting(true)
		setStatusMessage("Picking slot...")

		try {
			const tx = new Transaction()
			const [coin] = tx.splitCoins(tx.gas, [lottery.feeMist])

			const secretHashBytes = Array.from(
				claimSecretHash.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
			)

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::pick_slot`,
				arguments: [
					tx.pure.u64(selectedSlot),
					tx.object(lottery.id),
					tx.object(RANDOM_OBJECT_ID),
					coin,
					tx.pure.vector("u8", secretHashBytes),
				],
			})

			signAndExecute(
				{ transaction: tx },
				{
					onSuccess: async (result) => {
						try {
							const txDetails = await suiClient.waitForTransaction({
								digest: result.digest,
								options: { showEvents: true },
							})

							const winnerEvent = txDetails.events?.find((e) =>
								e.type.includes("WinnerClaimInfoEvent")
							)

							if (winnerEvent && winnerEvent.parsedJson) {
								setStatusMessage(
									`🎉 YOU WON! Digest: ${result.digest}\n\nClaim anonymously with your secret:\n${generatedSecret}`
								)
							} else {
								setStatusMessage(`Slot picked! Digest: ${result.digest}`)
							}
						} catch {
							setStatusMessage(`Slot picked! Digest: ${result.digest}`)
						}

						setShowConfirm(false)
						setIsSubmitting(false)
						setTimeout(() => {
							fetchLotteryDetail(suiClient, gameId).then(setLottery)
						}, 800)
					},
					onError: (error) => {
						setStatusMessage(`Error: ${error.message}`)
						setIsSubmitting(false)
					},
				}
			)
		} catch (error: any) {
			setStatusMessage(`Error: ${error.message}`)
			setIsSubmitting(false)
		}
	}

	const availableSlots = useMemo(
		() => (lottery ? lottery.slots.filter((s) => !s).length : 0),
		[lottery]
	)

	const isCreator =
		currentAccount?.address && lottery?.creator
			? currentAccount.address === lottery.creator
			: false
	const isWinner =
		currentAccount?.address && lottery?.winner
			? currentAccount.address === lottery.winner
			: false
	const canCollectFee = isCreator && lottery?.remainingFeeMist && lottery.remainingFeeMist > 0
	const canCollectPrize = isWinner && lottery?.prizeMist && lottery.prizeMist > 0 && !lottery.prizeClaimed

	const handleCollectFee = async () => {
		if (!lottery || !isCreator) return
		setIsSubmitting(true)
		setStatusMessage("Collecting fees...")
		try {
			const tx = new Transaction()
			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::collect_fee`,
				arguments: [tx.object(lottery.id)],
			})
			signAndExecute(
				{ transaction: tx },
				{
					onSuccess: async (result) => {
						setStatusMessage(`Fees collected! Digest: ${result.digest}`)
						setIsSubmitting(false)
						setTimeout(() => {
							fetchLotteryDetail(suiClient, gameId).then(setLottery)
						}, 800)
					},
					onError: (error) => {
						setStatusMessage(`Error: ${error.message}`)
						setIsSubmitting(false)
					},
				}
			)
		} catch (error: any) {
			setStatusMessage(`Error: ${error.message}`)
			setIsSubmitting(false)
		}
	}

	const handleCollectPrize = async () => {
		if (!lottery || !isWinner) return
		setIsSubmitting(true)
		setStatusMessage("Collecting prize...")
		try {
			const tx = new Transaction()
			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::collect_prize`,
				arguments: [tx.object(lottery.id)],
			})
			signAndExecute(
				{ transaction: tx },
				{
					onSuccess: async (result) => {
						setStatusMessage(`Prize collected! Digest: ${result.digest}`)
						setIsSubmitting(false)
						setTimeout(() => {
							fetchLotteryDetail(suiClient, gameId).then(setLottery)
						}, 800)
					},
					onError: (error) => {
						setStatusMessage(`Error: ${error.message}`)
						setIsSubmitting(false)
					},
				}
			)
		} catch (error: any) {
			setStatusMessage(`Error: ${error.message}`)
			setIsSubmitting(false)
		}
	}

	const handleClaimPrizeWithSecret = async () => {
		if (!lottery) return
		if (!claimSecret) {
			setStatusMessage("Claim secret을 입력하세요.")
			return
		}
		setIsSubmitting(true)
		setStatusMessage("Claiming prize anonymously...")
		try {
			const tx = new Transaction()
			const secretBytes = Array.from(
				claimSecret.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
			)

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::claim_prize_with_secret`,
				arguments: [tx.object(lottery.id), tx.pure.vector("u8", secretBytes)],
			})

			signAndExecute(
				{ transaction: tx },
				{
					onSuccess: async (result) => {
						setStatusMessage(`Prize claimed anonymously! Digest: ${result.digest}`)
						setIsSubmitting(false)
						setClaimSecret("")
						setTimeout(() => fetchLotteryDetail(suiClient, gameId).then(setLottery), 800)
					},
					onError: (error) => {
						setStatusMessage(`Error: ${error.message}`)
						setIsSubmitting(false)
					},
				}
			)
		} catch (error: any) {
			setStatusMessage(`Error: ${error.message}`)
			setIsSubmitting(false)
		}
	}

	if (!lottery && !isLoading) {
		return (
			<section className="space-y-4">
				<button
					type="button"
					onClick={() => navigate("/")}
					className="text-sm text-blue-600 hover:underline"
					aria-label="Back to lottery list"
				>
					← Back to lotteries
				</button>
				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<p className="text-gray-700 dark:text-gray-200">
						The requested lottery could not be found.
					</p>
				</div>
			</section>
		)
	}

	const isActive = lottery?.isActive ?? false

	return (
		<section className="space-y-6">
			<div className="flex items-center justify-between gap-3">
				<button
					type="button"
					onClick={() => navigate("/")}
					className="text-sm text-blue-600 hover:underline"
					aria-label="Back to lottery list"
				>
					← Back to lotteries
				</button>
			</div>
			<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 md:p-8">
				{isLoading && (
					<div className="animate-pulse h-24 rounded-xl bg-gray-100 dark:bg-gray-700" aria-busy="true" />
				)}
				{lottery && (
					<div className="space-y-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<h2 className="text-3xl font-bold">Lottery {lottery.id.slice(0, 10)}...</h2>
								<p className="text-gray-600 dark:text-gray-400">
									Slots: {lottery.slotCount} • Prize: {lottery.prize} SUI • Fee: {lottery.fee} SUI • Open:{" "}
									{availableSlots}
								</p>
							</div>
							<span
								className={`rounded-full px-3 py-1 text-xs font-semibold ${
									isActive ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
								}`}
							>
								{isActive ? "Active" : "Ended"}
							</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
							<div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-3">
								<div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
								<div className="font-semibold">{isActive ? "Active" : "Ended"}</div>
							</div>
							<div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-3">
								<div className="text-xs text-gray-500 dark:text-gray-400">Prize Pool</div>
								<div className="font-semibold">{lottery.prize} SUI</div>
							</div>
							<div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-3">
								<div className="text-xs text-gray-500 dark:text-gray-400">Remaining Fee</div>
								<div className="font-semibold">{lottery.remainingFee} SUI</div>
							</div>
							<div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-3">
								<div className="text-xs text-gray-500 dark:text-gray-400">Updated</div>
								<div className="font-semibold">{lottery.createdAt || "recently"}</div>
							</div>
						</div>
						<p className="text-xs text-gray-500 dark:text-gray-400">
							Data is loaded directly from the on-chain lottery objects.
						</p>
					</div>
				)}
			</div>
			{lottery && (
				<LotteryGrid
					slots={lottery.slots}
					isActive={isActive}
					winningSlot={lottery.winningSlot}
					selectedSlot={selectedSlot}
					onSlotSelect={handleSlotSelect}
				/>
			)}
			{lottery && (
				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-3">
					<h4 className="text-lg font-semibold">Payouts</h4>
					<div className="grid gap-3 md:grid-cols-2">
						<button
							type="button"
							onClick={handleCollectFee}
							disabled={!canCollectFee || isSubmitting}
							className="w-full px-4 py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
							title={
								!isCreator
									? "Only the creator can collect fees"
									: lottery.remainingFeeMist === 0
									? "No fees remaining"
									: "Collect creator fees"
							}
						>
							{isSubmitting && canCollectFee
								? "Processing..."
								: canCollectFee
								? `Collect Fee (${lottery.remainingFee} SUI)`
								: "Collect Fee"}
						</button>
						<button
							type="button"
							onClick={handleCollectPrize}
							disabled={!canCollectPrize || isSubmitting}
							className="w-full px-4 py-3 rounded-lg bg-yellow-600 text-white font-medium hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
							title={
								!isWinner
									? "Only winner can collect prize"
									: lottery.prizeClaimed
									? "Prize already claimed"
									: "Collect prize"
							}
						>
							{isSubmitting && canCollectPrize
								? "Processing..."
								: canCollectPrize
								? `Collect Prize (${lottery.prize} SUI)`
								: lottery.prizeClaimed
								? "Prize Claimed"
								: "Collect Prize"}
						</button>
					</div>
					<div className="border-t pt-4 space-y-2">
						<p className="text-sm text-gray-700 dark:text-gray-300">
							Anonymous Prize Claim
						</p>
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
							<input
								type="text"
								value={claimSecret}
								onChange={(e) => setClaimSecret(e.target.value)}
								placeholder="Enter claim secret (hex)"
								className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
							/>
							<button
								type="button"
								onClick={handleClaimPrizeWithSecret}
								disabled={isSubmitting || !claimSecret || lottery.prizeClaimed}
								className="px-4 py-2 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
							>
								{isSubmitting ? "Processing..." : lottery.prizeClaimed ? "Claimed" : "Claim Anonymously"}
							</button>
						</div>
						{lottery.prizeClaimed && (
							<p className="text-xs text-gray-500 dark:text-gray-400">Prize already claimed.</p>
						)}
					</div>
				</div>
			)}
			{statusMessage && (
				<div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-200">
					{statusMessage}
				</div>
			)}
			{showConfirm && lottery && selectedSlot !== null && (
				<div
					className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
					role="dialog"
					aria-modal="true"
					aria-label="Confirm pick slot"
				>
					<div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
						<h3 className="text-lg font-semibold">Pick Slot {selectedSlot}?</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							This lottery is active. Do you want to pick slot {selectedSlot}? Entry fee: {mistToSui(lottery.feeMist)} SUI.
						</p>
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={() => setShowConfirm(false)}
								className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
								disabled={isSubmitting}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handlePickSlot}
								disabled={isSubmitting}
								className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
							>
								{isSubmitting ? "Processing..." : "Pick Slot"}
							</button>
						</div>
					</div>
				</div>
			)}
			{showSecretModal && (
				<div
					className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
					role="dialog"
					aria-modal="true"
					aria-label="Generate secret first"
				>
					<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-3">
						<h3 className="text-lg font-semibold">Secret Needed</h3>
						<p className="text-sm text-gray-700 dark:text-gray-300">
							이 게임을 플레이하려면 먼저 Wallet 페이지에서 My Secret을 생성해야 합니다.
						</p>
						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setShowSecretModal(false)}
								className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
							>
								닫기
							</button>
							<button
								type="button"
								onClick={() => navigate("/wallet")}
								className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
							>
								Wallet으로 이동
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	)
}

export default LotteryDetailPage
