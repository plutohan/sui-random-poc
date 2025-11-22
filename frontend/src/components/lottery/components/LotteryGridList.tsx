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
		<section className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 md:p-8">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Showing {Math.min(games.length, PAGE_SIZE)} of {total} games
					</p>
				</div>
				<div className="flex flex-col gap-2 items-start md:items-end md:flex-row md:gap-3">
					<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
						<span>Loaded from on-chain lotteries</span>
						<button
							type="button"
							onClick={() => loadPage(page)}
							disabled={isLoading}
							className="flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
									d="M4.06 4.94a7 7 0 0110.95 1.58.75.75 0 101.28-.77 8.5 8.5 0 10.28 7.42.75.75 0 10-1.42-.34A7 7 0 114.06 4.94z"
									clipRule="evenodd"
								/>
								<path d="M15 2.75a.75.75 0 01.75-.75h2a.75.75 0 01.53 1.28l-2 2a.75.75 0 01-1.28-.53v-2z" />
							</svg>
						</button>
					</div>
					<label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
						<span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
							Filter
						</span>
						<select
							value={filterMode}
							onChange={(e) => setFilterMode(e.target.value as FilterMode)}
							className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
						>
							<option value="latest">Active first • Newest</option>
							<option value="active">Active only</option>
							<option value="prize">Prize (high to low)</option>
						</select>
					</label>
					<button
						type="button"
						onClick={handleCreateClick}
						className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						Create New Lottery
					</button>
				</div>
			</div>
			<div
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
				role="grid"
				aria-live="polite"
			>
				{isLoading &&
					Array.from({ length: PAGE_SIZE }).map((_, index) => (
						<div
							key={index}
							className="animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700 aspect-square"
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
					<div className="col-span-full text-center text-gray-500 dark:text-gray-400">
						No games available right now.
					</div>
				)}
			</div>
			<Pagination
				page={page}
				pageSize={PAGE_SIZE}
				total={total}
				onPageChange={setPage}
			/>
			{showCreateModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
					role="dialog"
					aria-modal="true"
					aria-label="Create new lottery"
				>
					<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
						<button
							type="button"
							onClick={() => setShowCreateModal(false)}
							className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							aria-label="Close create lottery modal"
						>
							✕
						</button>
						<div id="create-lottery-section">
							<LotteryCreation
								isLoading={isLoading}
								onLoadingChange={setIsLoading}
								onStatusChange={() => {}}
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
