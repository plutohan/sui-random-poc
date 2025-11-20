import { FC } from "react"

interface LotteryGridProps {
	slots: boolean[]
	isActive: boolean
	winningSlot: number
	selectedSlot: number | null
	onSlotSelect: (index: number) => void
}

export const LotteryGrid: FC<LotteryGridProps> = ({
	slots,
	isActive,
	winningSlot,
	selectedSlot,
	onSlotSelect,
}) => {
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
			<h3 className="text-xl font-semibold mb-4">Lottery Grid (3x3)</h3>
			<div className="grid grid-cols-3 gap-3 mb-4 max-w-md mx-auto">
				{slots.map((isTaken, index) => {
					const isWinning = !isActive && index === winningSlot
					const isSelected = selectedSlot === index
					return (
						<div
							key={index}
							onClick={() =>
								isActive && !isTaken ? onSlotSelect(index) : null
							}
							className={`
                aspect-square flex items-center justify-center rounded-lg font-bold text-2xl transition-all
                ${
									isWinning
										? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg ring-4 ring-yellow-300 animate-pulse"
										: isTaken
										? "bg-red-500 text-white cursor-not-allowed"
										: !isActive
										? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
										: isSelected
										? "bg-blue-500 text-white ring-4 ring-blue-300 cursor-pointer"
										: "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer"
								}
              `}
							title={`Slot ${index}${
								isTaken
									? " (Taken)"
									: !isActive
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
	)
}
