import { FC, useEffect, useState } from "react"
import { useSecret } from "../../../hooks/useSecret"
import { useUserAllowlist } from "../../../hooks/useUserAllowlist"

interface SecretManagementProps {
	currentAccountAddress: string | undefined
	onStatusChange?: (status: string) => void
}

export const SecretManagement: FC<SecretManagementProps> = ({
	currentAccountAddress,
	onStatusChange,
}) => {
	const {
		claimSecretHash,
		walrusBlobId,
		generatedSecret,
		isGeneratingSecret,
		isEncryptingAndUploading,
		isFetchingAndDecrypting,
		status: secretStatus,
		blobOptions,
		handleGenerateAndUploadSecret,
		handleEncryptAndUploadSecret,
		handleFetchAndDecryptSecret,
	} = useSecret(currentAccountAddress)

	const {
		allowlistId,
		capId,
		isCreatingAllowlist,
		status: allowlistStatus,
		handleCreateUserAllowlist,
	} = useUserAllowlist(currentAccountAddress)

	const [allowlistIdInput, setAllowlistIdInput] = useState<string>("")
	const [blobIdInput, setBlobIdInput] = useState<string>("")
	const [allowlistIdForDecrypt, setAllowlistIdForDecrypt] =
		useState<string>("")

	// Auto-populate allowlist ID when it's available
	useEffect(() => {
		if (allowlistId && !allowlistIdInput) {
			setAllowlistIdInput(allowlistId)
		}
	}, [allowlistId, allowlistIdInput])

	// Auto-populate fields for decryption when available
	useEffect(() => {
		if (allowlistId && !allowlistIdForDecrypt) {
			setAllowlistIdForDecrypt(allowlistId)
		}
	}, [allowlistId, allowlistIdForDecrypt])

	// Notify parent of status changes using useEffect
	useEffect(() => {
		const combinedStatus = secretStatus || allowlistStatus
		if (onStatusChange && combinedStatus) {
			onStatusChange(combinedStatus)
		}
	}, [secretStatus, allowlistStatus, onStatusChange])

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
			<h3 className="text-xl font-semibold mb-4">
				Secret & Allowlist Setup
			</h3>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
				Set up your personal allowlist and secret for anonymous prize
				claiming. Do this once and use for all lotteries!
			</p>
			<div className="flex flex-col gap-4">
				{/* Step 1: Create User Allowlist */}
				<div className="border-b dark:border-gray-700 pb-4">
					<h4 className="font-semibold mb-2">
						Step 1: Create Your Allowlist (Optional)
					</h4>
					<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
						Create your personal allowlist to enable encrypted
						secret storage on Walrus. You'll be automatically added
						to it. Only needed if you want to use Walrus.
					</p>
					<button
						onClick={handleCreateUserAllowlist}
						disabled={isCreatingAllowlist || !!allowlistId}
						className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{isCreatingAllowlist
							? "Creating..."
							: allowlistId
							? "✓ Allowlist Created"
							: "Create My Allowlist"}
					</button>
					{allowlistId && (
						<div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded">
							<p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
								✓ Allowlist ready for encryption!
							</p>
							<div className="space-y-2">
								<div>
									<p className="text-xs font-medium mb-1">
										Allowlist ID:
									</p>
									<code className="block text-xs bg-white dark:bg-gray-800 p-2 rounded break-all font-mono">
										{allowlistId}
									</code>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Step 2: Generate Secret Button */}
				<div className="border-b dark:border-gray-700 pb-4">
					<h4 className="font-semibold mb-2">
						Step 2: Generate Your Secret
					</h4>
					<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
						Generate your secret for anonymous prize claiming.
						Stored in browser local storage.
					</p>
					<button
						onClick={handleGenerateAndUploadSecret}
						disabled={isGeneratingSecret}
						className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{isGeneratingSecret
							? "Generating..."
							: claimSecretHash && generatedSecret
							? "✓ Secret Active - Click to Regenerate"
							: "Generate Secret"}
					</button>
				</div>

				{/* Fetch Secret Section - COMMENTED OUT (Walrus disabled) */}
				{/*
				<div className="border-t dark:border-gray-700 pt-4">
					<h4 className="font-semibold mb-2">Or Fetch Existing Secret</h4>
					<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
						If you already created a secret before, enter your Walrus Blob ID
						to retrieve it.
					</p>
					<div className="flex gap-2">
						<input
							type="text"
							value={blobIdInput}
							onChange={(e) => setBlobIdInput(e.target.value)}
							placeholder="Enter Walrus Blob ID (hex)"
							className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
						/>
						<button
							onClick={handleFetchSecret}
							disabled={isRetrievingSecret || !blobIdInput.trim()}
							className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
						>
							{isRetrievingSecret ? "Fetching..." : "Fetch Secret"}
						</button>
					</div>
				</div>
				*/}

				{/* Display Current Secret */}
				{generatedSecret && claimSecretHash && (
					<div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
						<p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-2">
							✓ Secret Active - Use this for all lottery picks!
						</p>
						<div className="space-y-2">
							<div>
								<p className="text-xs font-medium mb-1">
									Your Secret:
								</p>
								<code className="block text-xs bg-white dark:bg-gray-800 p-2 rounded break-all font-mono">
									{generatedSecret}
								</code>
							</div>
							<div>
								<p className="text-xs font-medium mb-1">
									Hash (sent with picks):
								</p>
								<code className="block text-xs bg-white dark:bg-gray-800 p-2 rounded break-all font-mono">
									{claimSecretHash}
								</code>
							</div>
						</div>
					</div>
				)}

				{/* Step 3: Encrypt & Upload Section */}
				{generatedSecret && (
					<div className="pt-4">
						<h4 className="font-semibold mb-2">
							Step 3: Encrypt & Upload to Walrus (Optional)
						</h4>
						<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
							Encrypt your secret with Seal and upload to Walrus
							for secure, decentralized storage. Requires Step 1
							allowlist.
						</p>
						<button
							onClick={() =>
								handleEncryptAndUploadSecret(allowlistId, capId)
							}
							disabled={
								isEncryptingAndUploading ||
								!allowlistId ||
								!capId
							}
							className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
						>
							{isEncryptingAndUploading
								? "Processing..."
								: walrusBlobId
								? "✓ Encrypted & Uploaded - Click to Re-upload"
								: "Encrypt & Upload"}
						</button>

						{walrusBlobId && (
							<div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
								<p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">
									✓ Secret encrypted and uploaded to Walrus!
								</p>
								<div className="space-y-2">
									<div>
										<p className="text-xs font-medium mb-1">
											Walrus Blob ID:
										</p>
										<code className="block text-xs bg-white dark:bg-gray-800 p-2 rounded break-all font-mono">
											{walrusBlobId}
										</code>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Step 4: Fetch & Decrypt Section */}
				<div className="border-b dark:border-gray-700 pb-4">
					<h4 className="font-semibold mb-2">
						Step 4: Fetch & Decrypt from Walrus (Optional)
					</h4>
					<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
						If you uploaded your secret to Walrus, you can fetch and
						decrypt it here. Useful for recovering your secret or
						verifying the upload.
					</p>
					<div className="space-y-3">
						<div>
							<label className="block text-xs font-medium mb-1">
								Walrus Blob ID:
							</label>
							{blobOptions.length > 0 && (
								<select
									value={
										blobOptions.some(
											(option) =>
												option.blobId === blobIdInput
										)
											? blobIdInput
											: ""
									}
									onChange={(e) => {
										const selectedBlobId = e.target.value
										setBlobIdInput(selectedBlobId)
										// Auto-populate allowlist ID for the selected blob
										const selectedOption = blobOptions.find(
											(opt) =>
												opt.blobId === selectedBlobId
										)
										if (selectedOption) {
											setAllowlistIdForDecrypt(
												selectedOption.allowlistId
											)
										}
									}}
									className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
								>
									<option value="" disabled>
										Select from detected blob IDs
									</option>
									{blobOptions.map((option) => (
										<option
											key={`${option.allowlistId}-${option.blobId}`}
											value={option.blobId}
										>
											{option.blobId}
										</option>
									))}
								</select>
							)}
							<input
								type="text"
								value={blobIdInput}
								onChange={(e) => setBlobIdInput(e.target.value)}
								placeholder="Enter Blob ID (auto-filled from Step 3)"
								className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium mb-1">
								Allowlist ID:
							</label>
							<input
								type="text"
								value={allowlistIdForDecrypt}
								onChange={(e) =>
									setAllowlistIdForDecrypt(e.target.value)
								}
								placeholder="Enter Allowlist ID (auto-filled from Step 1)"
								className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
							/>
						</div>
						<button
							onClick={() =>
								handleFetchAndDecryptSecret(
									blobIdInput,
									allowlistIdForDecrypt
								)
							}
							disabled={
								isFetchingAndDecrypting ||
								!blobIdInput.trim() ||
								!allowlistIdForDecrypt.trim()
							}
							className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
						>
							{isFetchingAndDecrypting
								? "Fetching & Decrypting..."
								: "Fetch & Decrypt Secret"}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

// Export the hook as well for use in parent component
export { useSecret }
