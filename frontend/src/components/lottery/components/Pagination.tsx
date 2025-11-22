import { FC, useMemo } from "react"

type PaginationProps = {
	page: number
	pageSize: number
	total: number
	onPageChange: (page: number) => void
}

const Pagination: FC<PaginationProps> = ({
	page,
	pageSize,
	total,
	onPageChange,
}) => {
	const totalPages = useMemo(
		() => Math.max(1, Math.ceil(total / pageSize)),
		[pageSize, total]
	)

	if (totalPages <= 1) return null

	const handleChange = (nextPage: number) => {
		if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
		onPageChange(nextPage)
	}

	return (
		<div className="flex items-center justify-center gap-2 mt-6" role="navigation" aria-label="Pagination">
			<button
				type="button"
				onClick={() => handleChange(page - 1)}
				disabled={page <= 1}
				className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
				aria-label="Previous page"
			>
				Previous
			</button>
			{Array.from({ length: totalPages }).map((_, index) => {
				const pageNumber = index + 1
				const isCurrent = pageNumber === page
				return (
					<button
						key={pageNumber}
						type="button"
						onClick={() => handleChange(pageNumber)}
						className={`h-9 w-9 rounded-lg text-sm font-semibold ${
							isCurrent
								? "bg-blue-500 text-white"
								: "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
						}`}
						aria-label={`Page ${pageNumber}`}
						aria-current={isCurrent ? "page" : undefined}
					>
						{pageNumber}
					</button>
				)
			})}
			<button
				type="button"
				onClick={() => handleChange(page + 1)}
				disabled={page >= totalPages}
				className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
				aria-label="Next page"
			>
				Next
			</button>
		</div>
	)
}

export default Pagination
