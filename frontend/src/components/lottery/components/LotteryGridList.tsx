import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useNavigation } from "../../../providers/navigation/NavigationContext"
import LotteryCard from "./LotteryCard"
import Pagination from "./Pagination"
import { LotterySummary, fetchAllLotteries } from "../lotteryApi"
import { useSuiClient } from "@mysten/dapp-kit"
import { LotteryCreation } from "./LotteryCreation"

const PAGE_SIZE = 12
type FilterMode = "latest" | "active" | "prize"

const LotteryGridList: FC = () => {
	const { navigate } = useNavigation()
	const suiClient = useSuiClient()
	const [games, setGames] = useState<LotterySummary[]>([])
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)
	const [isLoading, setIsLoading] = useState(false)
	const [filterMode, setFilterMode] = useState<FilterMode>("latest")
	const [showCreateModal, setShowCreateModal] = useState(false)

	const loadPage = useCallback(
		async (targetPage: number) => {
			setIsLoading(true)
			const response = await fetchAllLotteries(suiClient, targetPage, PAGE_SIZE)
			setGames(response.data)
			setTotal(response.total)
			setIsLoading(false)
		},
		[suiClient]
	)

	const handleCreateClick = () => {
		setShowCreateModal(true)
	}

	useEffect(() => {
		loadPage(page)
	}, [page, loadPage])

	const handleSelect = (gameId: string) => {
		navigate(`/lottery/${gameId}`)
	}

	const displayedGames = useMemo(() => {
		const sorted = games.slice().sort((a, b) => {
			if (filterMode === "prize") {
				return (b.prizeValue || 0) - (a.prizeValue || 0)
			}
			if (filterMode === "active") {
				if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
				return (b.createdAtMs || 0) - (a.createdAtMs || 0)
			}
			// default: active first, newest first
			if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
			return (b.createdAtMs || 0) - (a.createdAtMs || 0)
		})

		if (filterMode === "active") {
			return sorted.filter((game) => game.isActive)
		}
		return sorted
	}, [filterMode, games])

	return (
		<section className="glass rounded-3xl shadow-xl p-6 md:p-8 border border-emerald-200/20 dark:border-emerald-500/20">
			{/* Header Section */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
				<div>
					<h2 className="text-3xl font-bold text-gradient mb-2">Active Lotteries</h2>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Showing {Math.min(games.length, PAGE_SIZE)} of {total} games
					</p>
				</div>

				<div className="flex flex-col gap-3 items-start md:items-end md:flex-row md:gap-3">
					{/* Refresh Button */}
					<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
						<span>📡 On-chain</span>
						<button
							type="button"
							onClick={() => loadPage(page)}
							disabled={isLoading}
							className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
							aria-label="Refresh lotteries"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M4.06 4.94a7 7 0 0110.95 1.58.75.75 0 101.28-.77 8.5 8.5 0 00.28 7.42.75.75 0 10-1.42-.34A7 7 0 114.06 4.94z"
									clipRule="evenodd"
								/>
								<path d="M15 2.75a.75.75 0 01.75-.75h2a.75.75 0 01.53 1.28l-2 2a.75.75 0 01-1.28-.53v-2z" />
							</svg>
						</button>
					</div>

					{/* Filter Dropdown */}
					<label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
						<span className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">
							🔍 Filter
						</span>
						<select
							value={filterMode}
							onChange={(e) => setFilterMode(e.target.value as FilterMode)}
							className="px-4 py-2 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-purple-200 dark:border-purple-500/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
						>
							<option value="latest">Active first • Newest</option>
							<option value="active">Active only</option>
							<option value="prize">Prize (high to low)</option>
						</select>
					</label>

					{/* Create Button */}
					<button
						type="button"
						onClick={handleCreateClick}
						className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5"
					>
						➕ Create New
					</button>
				</div>
			</div>

			{/* Lottery Grid */}
			<div
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
				role="grid"
				aria-live="polite"
			>
				{isLoading &&
					Array.from({ length: PAGE_SIZE }).map((_, index) => (
						<div
							key={index}
							className="animate-pulse rounded-2xl bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-900/30 dark:to-pink-900/30 aspect-square"
							role="presentation"
						/>
					))}
				{!isLoading &&
					displayedGames.map((game) => (
						<div role="gridcell" key={game.id}>
							<LotteryCard game={game} onSelect={handleSelect} />
						</div>
					))}
				{!isLoading && displayedGames.length === 0 && (
					<div className="col-span-full text-center py-16">
						<div className="text-6xl mb-4"></div>
						<p className="text-xl font-semibold text-gray-600 dark:text-gray-400">
							No games available
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
							Be the first to create one!
						</p>
					</div>
				)}
			</div>

			{/* Pagination */}
			<Pagination
				page={page}
				pageSize={PAGE_SIZE}
				total={total}
				onPageChange={setPage}
			/>

			{/* Create Modal */}
			{showCreateModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-slide-up"
					role="dialog"
					aria-modal="true"
					aria-label="Create new lottery"
					onClick={() => setShowCreateModal(false)}
				>
					<div
						className="glass-strong rounded-2xl shadow-2xl max-w-lg w-full p-8 relative"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							type="button"
							onClick={() => setShowCreateModal(false)}
							className="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
							aria-label="Close create lottery modal"
						>
							✕
						</button>
						<div id="create-lottery-section">
							<LotteryCreation
								isLoading={isLoading}
								onLoadingChange={setIsLoading}
								onStatusChange={() => { }}
								onLotteryCreated={() => {
									setShowCreateModal(false)
									loadPage(page)
								}}
							/>
						</div>
					</div>
				</div>
			)}
		</section>
	)
}

export default LotteryGridList
