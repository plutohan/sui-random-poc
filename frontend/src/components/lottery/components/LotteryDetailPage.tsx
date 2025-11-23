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

	// Auto-populate claim secret from localStorage
	useEffect(() => {
		const savedSecret = localStorage.getItem("lotterySecret")
		if (savedSecret && !claimSecret) {
			setClaimSecret(savedSecret)
		}
	}, [claimSecret])

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
					className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5"
					aria-label="Back to lottery list"
				>
					← Back to Lotteries
				</button>
				<div className="glass rounded-2xl shadow-xl p-8 text-center">
					<div className="text-6xl mb-4">🎰</div>
					<p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
						Lottery not found
					</p>
				</div>
			</section>
		)
	}

	const isActive = lottery?.isActive ?? false

	return (
		<section className="space-y-6 animate-slide-up">
			<div className="flex items-center justify-between gap-3">
				<button
					type="button"
					onClick={() => navigate("/")}
					className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5"
					aria-label="Back to lottery list"
				>
					← Back
				</button>
			</div>
			<div className="glass rounded-3xl shadow-xl p-6 md:p-8 border border-emerald-200/20 dark:border-emerald-500/20">
				{isLoading && (
					<div className="animate-pulse h-24 rounded-xl bg-gray-100 dark:bg-gray-700" aria-busy="true" />
				)}
				{lottery && (
					<div className="space-y-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<h2 className="text-3xl font-bold text-gradient">Lottery {lottery.id.slice(0, 10)}...</h2>
								<p className="text-gray-600 dark:text-gray-400 mt-1">
									🎯 {lottery.slotCount} slots • 💰 {lottery.prize} SUI prize • 💵 {lottery.fee} SUI fee • 🔓 {availableSlots} open
								</p>
							</div>
							<span
								className={`rounded-full px-4 py-2 text-sm font-bold shadow-md ${isActive ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white" : "bg-gradient-to-r from-red-400 to-rose-500 text-white"
									}`}
							>
								{isActive ? "🟢 LIVE" : "🔴 ENDED"}
							</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
							<div className="rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 p-4 border border-purple-200/30 dark:border-purple-400/40">
								<div className="text-xs text-purple-700 dark:text-purple-300 font-semibold">📊 Status</div>
								<div className="font-bold text-lg mt-1 text-gray-900 dark:text-white">{isActive ? "Active" : "Ended"}</div>
							</div>
							<div className="rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 p-4 border border-blue-200/30 dark:border-blue-400/40">
								<div className="text-xs text-blue-700 dark:text-blue-300 font-semibold">💰 Prize Pool</div>
								<div className="font-bold text-lg mt-1 text-gray-900 dark:text-white">{lottery.prize} SUI</div>
							</div>
							<div className="rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 p-4 border border-green-200/30 dark:border-green-400/40">
								<div className="text-xs text-green-700 dark:text-green-300 font-semibold">💵 Creator Fee</div>
								<div className="font-bold text-lg mt-1 text-gray-900 dark:text-white">{lottery.remainingFee} SUI</div>
							</div>
							<div className="rounded-xl bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/50 dark:to-yellow-900/50 p-4 border border-orange-200/30 dark:border-orange-400/40">
								<div className="text-xs text-orange-700 dark:text-orange-300 font-semibold">📅 Updated</div>
								<div className="font-bold text-sm mt-1 text-gray-900 dark:text-white">{lottery.createdAt || "Recently"}</div>
							</div>
						</div>
						<p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
							⛓️ Data loaded directly from on-chain lottery objects
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
				<div className="glass rounded-2xl shadow-xl p-6 md:p-8 space-y-6 border border-emerald-200/20 dark:border-emerald-500/20">
					<h4 className="text-2xl font-bold text-gradient">Collect Payouts</h4>
					<div className="grid gap-4 md:grid-cols-2">
						<button
							type="button"
							onClick={handleCollectFee}
							disabled={!canCollectFee || isSubmitting}
							className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							title={
								!isCreator
									? "Only the creator can collect fees"
									: lottery.remainingFeeMist === 0
										? "No fees remaining"
										: "Collect creator fees"
							}
						>
							{isSubmitting && canCollectFee
								? "⏳ Processing..."
								: canCollectFee
									? `💵 Collect Fee (${lottery.remainingFee} SUI)`
									: "💵 Collect Fee"}
						</button>
						<button
							type="button"
							onClick={handleCollectPrize}
							disabled={!canCollectPrize || isSubmitting}
							className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							title={
								!isWinner
									? "Only winner can collect prize"
									: lottery.prizeClaimed
										? "Prize already claimed"
										: "Collect prize"
							}
						>
							{isSubmitting && canCollectPrize
								? "⏳ Processing..."
								: canCollectPrize
									? `🏆 Collect Prize (${lottery.prize} SUI)`
									: lottery.prizeClaimed
										? "✅ Prize Claimed"
										: "🏆 Collect Prize"}
						</button>
					</div>
					<div className="border-t border-purple-200/30 dark:border-purple-500/20 pt-6 space-y-3">
						<div className="flex items-center gap-2">
							<span className="text-2xl">🕵️</span>
							<h5 className="text-lg font-bold">Anonymous Prize Claim</h5>
						</div>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Claim your prize anonymously using your secret key from any wallet
						</p>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<input
								type="text"
								value={claimSecret}
								onChange={(e) => setClaimSecret(e.target.value)}
								placeholder="Enter claim secret (hex)"
								className="flex-1 px-4 py-3 border-2 border-purple-300 dark:border-purple-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 font-mono text-sm"
							/>
							<button
								type="button"
								onClick={handleClaimPrizeWithSecret}
								disabled={isSubmitting || !claimSecret || lottery.prizeClaimed}
								className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none whitespace-nowrap"
							>
								{isSubmitting ? "⏳ Processing..." : lottery.prizeClaimed ? "✅ Claimed" : "🔒 Claim Anonymously"}
							</button>
						</div>
						{lottery.prizeClaimed && (
							<p className="text-sm text-gray-500 dark:text-gray-400">✅ Prize has already been claimed</p>
						)}
					</div>
				</div>
			)}
			{statusMessage && (
				<div className="glass rounded-2xl shadow-md p-6 border border-blue-200/30 dark:border-blue-500/20 animate-slide-up">
					<p className="text-sm font-medium whitespace-pre-wrap">{statusMessage}</p>
				</div>
			)}
			{showConfirm && lottery && selectedSlot !== null && (
				<div
					className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-slide-up"
					role="dialog"
					aria-modal="true"
					aria-label="Confirm pick slot"
					onClick={() => !isSubmitting && setShowConfirm(false)}
				>
					<div
						className="glass-strong rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-5"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="text-center">
							<div className="text-5xl mb-3">🎯</div>
							<h3 className="text-2xl font-bold text-gradient">Confirm Pick</h3>
						</div>
						<p className="text-center text-gray-600 dark:text-gray-300">
							Entry fee: <strong className="text-gradient">{mistToSui(lottery.feeMist)} SUI</strong>
						</p>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => setShowConfirm(false)}
								className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 font-semibold hover:bg-white/20 dark:hover:bg-white/10 transition-all"
								disabled={isSubmitting}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handlePickSlot}
								disabled={isSubmitting}
								className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
							>
								{isSubmitting ? "⏳ Processing..." : "🎯 Pick Slot!"}
							</button>
						</div>
					</div>
				</div>
			)}
			{showSecretModal && (
				<div
					className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-slide-up"
					role="dialog"
					aria-modal="true"
					aria-label="Generate secret first"
					onClick={() => setShowSecretModal(false)}
				>
					<div
						className="glass-strong rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-5"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="text-center">
							<div className="text-5xl mb-3">🔐</div>
							<h3 className="text-2xl font-bold text-gradient">Secret Required</h3>
						</div>
						<p className="text-center text-gray-600 dark:text-gray-300">
							You need to generate your secret in the Wallet page first before playing.
						</p>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => setShowSecretModal(false)}
								className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 font-semibold hover:bg-white/20 dark:hover:bg-white/10 transition-all"
							>
								Close
							</button>
							<button
								type="button"
								onClick={() => navigate("/wallet")}
								className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5"
							>
								💼 Go to Wallet
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	)
}

export default LotteryDetailPage
