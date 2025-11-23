import { useState, useEffect } from "react"
import {
	useSignAndExecuteTransaction,
	useSignPersonalMessage,
	useSuiClient,
} from "@mysten/dapp-kit"
import { keccak256 as keccakHash } from "js-sha3"
import { PACKAGE_ID } from "../config/constants"
import { SuiClient } from "@mysten/sui/client"

// Helper function to generate random bytes
const generateRandomBytes = (length: number): Uint8Array => {
	const bytes = new Uint8Array(length)
	crypto.getRandomValues(bytes)
	return bytes
}

// Helper function to convert bytes to hex string
const bytesToHex = (bytes: Uint8Array): string => {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

// Helper function to compute Keccak256 hash
export const keccak256 = (data: Uint8Array): Uint8Array => {
	const hashHex = keccakHash(data)
	const hashBytes = new Uint8Array(hashHex.length / 2)
	for (let i = 0; i < hashBytes.length; i++) {
		hashBytes[i] = parseInt(hashHex.substring(i * 2, i * 2 + 2), 16)
	}
	return hashBytes
}

const getAllCaps = async (
	suiClient: SuiClient,
	currentAccountAddress: string
): Promise<CapObjectInfo[]> => {
	console.log(
		`\n🔍 Loading all Cap objects for address: ${currentAccountAddress}`
	)

	const caps: CapObjectInfo[] = []
	let cursor: string | null = null

	while (true) {
		const res = await suiClient.getOwnedObjects({
			owner: currentAccountAddress,
			options: {
				showContent: true,
				showType: true,
			},
			filter: {
				StructType: `${PACKAGE_ID}::allowlist::Cap`,
			},
			cursor: cursor ?? undefined,
			limit: 50,
		})

		const parsedCaps = res.data
			.map(parseCapObject)
			.filter((item): item is CapObjectInfo => item !== null)

		caps.push(...parsedCaps)

		if (!res.hasNextPage || !res.nextCursor) {
			break
		}

		cursor = res.nextCursor
	}

	console.log(`✅ Found ${caps.length} Cap object(s)`)
	return caps
}

const parseCapObject = (obj: any): CapObjectInfo | null => {
	const content = obj.data?.content
	if (!content || content.dataType !== "moveObject") {
		return null
	}

	const fields = (content as { fields?: any }).fields
	if (!fields) {
		return null
	}

	const idField = fields.id
	const allowlistField = fields.allowlist_id

	const capId =
		typeof idField === "object" && idField !== null
			? idField.id ?? idField
			: idField
	const allowlistId =
		typeof allowlistField === "object" && allowlistField !== null
			? allowlistField.id ?? allowlistField
			: allowlistField

	if (typeof capId !== "string" || typeof allowlistId !== "string") {
		return null
	}

	return {
		id: capId,
		allowlistId,
	}
}
const getBlobIdsFromAllowlist = async (
	allowlistId: string,
	suiClient: SuiClient
): Promise<string[]> => {
	const blobIds: string[] = []
	let cursor: string | null = null

	while (true) {
		const dynamicFields = await suiClient.getDynamicFields({
			parentId: allowlistId,
			cursor: cursor ?? undefined,
			limit: 50,
		})

		const extracted = dynamicFields.data
			.map((field) => {
				if (typeof field.name === "string") {
					return field.name
				}

				if (
					field.name &&
					typeof field.name === "object" &&
					"value" in field.name &&
					typeof field.name.value === "string"
				) {
					return field.name.value
				}

				return null
			})
			.filter((id): id is string => id !== null)

		blobIds.push(...extracted)

		if (!dynamicFields.hasNextPage || !dynamicFields.nextCursor) {
			break
		}

		cursor = dynamicFields.nextCursor
	}

	return blobIds
}

type CapObjectInfo = {
	id: string
	allowlistId: string
}

export type AllowlistBlobOption = {
	blobId: string
	allowlistId: string
}

export const useSecret = (currentAccountAddress: string | undefined) => {
	const suiClient = useSuiClient()
	const { mutate: signAndExecute } = useSignAndExecuteTransaction()
	const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()

	const [claimSecretHash, setClaimSecretHash] = useState<string>("")
	const [walrusBlobId, setWalrusBlobId] = useState<string>("")
	const [generatedSecret, setGeneratedSecret] = useState<string>("")
	const [isGeneratingSecret, setIsGeneratingSecret] = useState<boolean>(false)
	const [isEncryptingAndUploading, setIsEncryptingAndUploading] =
		useState<boolean>(false)
	const [isFetchingAndDecrypting, setIsFetchingAndDecrypting] =
		useState<boolean>(false)
	const [status, setStatus] = useState<string>("")
	const [blobOptions, setBlobOptions] = useState<AllowlistBlobOption[]>([])
	const [decryptedSecret, setDecryptedSecret] = useState<string>("")
	const [decryptedSecretHash, setDecryptedSecretHash] = useState<string>("")

	// Load secret from localStorage on mount
	useEffect(() => {
		const storedHash = localStorage.getItem("lotterySecretHash")
		const storedSecret = localStorage.getItem("lotterySecret")

		if (storedHash) setClaimSecretHash(storedHash)
		if (storedSecret) setGeneratedSecret(storedSecret)
	}, [])

	// Load Walrus blob IDs owned by the current account via caps/dynamic fields
	useEffect(() => {
		if (!currentAccountAddress) {
			setBlobOptions([])
			return
		}

		let isCancelled = false

		const fetchBlobOptions = async () => {
			try {
				const caps = await getAllCaps(suiClient, currentAccountAddress)
				if (isCancelled) {
					return
				}

				const allowlistIds = Array.from(
					new Set(caps.map((cap) => cap.allowlistId).filter(Boolean))
				)

				console.log("allowlistIds", allowlistIds)

				if (allowlistIds.length === 0) {
					if (!isCancelled) {
						setBlobOptions([])
						setWalrusBlobId("")
					}
					return
				}

				const collected: AllowlistBlobOption[] = []

				for (const allowlistId of allowlistIds) {
					const blobIds = await getBlobIdsFromAllowlist(
						allowlistId,
						suiClient
					)
					if (isCancelled) {
						return
					}
					console.log(
						`✅ Found total ${blobIds.length} blobs in the user's allowlist(${allowlistId})`
					)
					blobIds.forEach((blobId) => {
						collected.push({
							blobId,
							allowlistId,
						})
					})
				}

				if (isCancelled) {
					return
				}

				console.log("collected", collected)
				setBlobOptions(collected)
			} catch (error) {
				console.error("⚠️ Failed to load Walrus blob IDs:", error)
				setBlobOptions([])
			}
		}

		fetchBlobOptions()

		return () => {
			isCancelled = true
		}
	}, [currentAccountAddress, suiClient])

	const handleGenerateAndUploadSecret = async () => {
		if (!currentAccountAddress) {
			setStatus("Please connect your wallet first")
			return
		}

		setIsGeneratingSecret(true)
		setStatus("Generating claim secret...")

		try {
			// Generate random secret (32 bytes)
			const secretBytes = generateRandomBytes(32)
			const secretHex = bytesToHex(secretBytes)

			// Compute hash of the secret
			const hashBytes = keccak256(secretBytes)
			const hashHex = bytesToHex(hashBytes)

			// Store the generated values in state and localStorage
			setGeneratedSecret(secretHex)
			setClaimSecretHash(hashHex)
			setWalrusBlobId("") // No Walrus blob ID anymore

			// Persist to localStorage
			localStorage.setItem("lotterySecret", secretHex)
			localStorage.setItem("lotterySecretHash", hashHex)
			// localStorage.removeItem("lotteryWalrusBlobId") // Remove old Walrus blob ID if any

			setStatus(
				`Secret generated and saved to local storage!\nSecret: ${secretHex}\nHash: ${hashHex}\n\n✓ Secret saved! You can now use this for all lottery picks.`
			)
			setIsGeneratingSecret(false)

			/* WALRUS UPLOAD - COMMENTED OUT
			// Create a WalrusFile with the secret as text (hex string)
			const file = WalrusFile.from({
				contents: new TextEncoder().encode(secretHex),
				identifier: `lottery-secret-${Date.now()}.txt`,
				tags: {
					"content-type": "text/plain",
				},
			})

			// Create upload flow
			setStatus("Creating Walrus upload flow...")
			const flow = client.walrus.writeFilesFlow({ files: [file] })
			await flow.encode()

			// Step 1: Register the blob (requires wallet signature)
			setStatus("Please sign the transaction to register blob on Walrus...")
			const registerTx = flow.register({
				epochs: 5,
				owner: currentAccountAddress,
				deletable: false,
			})

			await new Promise<void>((resolve, reject) => {
				signAndExecute(
					{ transaction: registerTx },
					{
						onSuccess: async (result) => {
							console.log("Register transaction successful:", result)
							setStatus("Uploading blob to Walrus storage nodes...")

							try {
								// Step 2: Upload the blob
								await flow.upload({ digest: result.digest })

								// Step 3: Certify (requires another wallet signature)
								setStatus("Please sign the transaction to certify the blob...")
								const certifyTx = flow.certify()

								signAndExecute(
									{ transaction: certifyTx },
									{
										onSuccess: async (certifyResult) => {
											console.log("Certify transaction successful:", certifyResult)

											// Wait for transaction and get the blob ID from events
											const txDetails = await client.waitForTransaction({
												digest: certifyResult.digest,
												options: {
													showEvents: true,
													showObjectChanges: true,
												},
											})

											// Extract blob ID from events
											let blobId = ""
											if (txDetails.events) {
												for (const event of txDetails.events) {
													if (event.type.includes("Blob")) {
														const parsedJson = event.parsedJson as any
														if (parsedJson.blob_id) {
															const { blobIdFromInt } = await import("@mysten/walrus")
															blobId = blobIdFromInt(parsedJson.blob_id)
															break
														}
													}
												}
											}

											if (!blobId) {
												throw new Error("Could not extract blob ID from transaction")
											}

											console.log("Extracted Blob ID:", blobId)

											// Store the generated values in state and localStorage
											setGeneratedSecret(secretHex)
											setClaimSecretHash(hashHex)
											setWalrusBlobId(blobId)

											// Persist to localStorage
											localStorage.setItem("lotterySecret", secretHex)
											localStorage.setItem("lotterySecretHash", hashHex)
											localStorage.setItem("lotteryWalrusBlobId", blobId)

											setStatus(
												`Secret generated and uploaded!\nSecret: ${secretHex}\nHash: ${hashHex}\nWalrus Blob ID: ${blobId}\n\n✓ Secret saved! You can now use this for all lottery picks.`
											)
											setIsGeneratingSecret(false)
											resolve()
										},
										onError: (error) => {
											console.error("Certify transaction failed:", error)
											setStatus(`Error certifying blob: ${error.message}`)
											setIsGeneratingSecret(false)
											reject(error)
										},
									}
								)
							} catch (error: any) {
								console.error("Error uploading blob:", error)
								setStatus(`Error uploading: ${error.message}`)
								setIsGeneratingSecret(false)
								reject(error)
							}
						},
						onError: (error) => {
							console.error("Register transaction failed:", error)
							setStatus(`Error registering blob: ${error.message}`)
							setIsGeneratingSecret(false)
							reject(error)
						},
					}
				)
			})
			*/
		} catch (error: any) {
			console.error("Error generating secret:", error)
			setStatus(`Error: ${error.message}`)
			setIsGeneratingSecret(false)
		}
	}

	// Encrypt and upload secret to Walrus with Seal
	const handleEncryptAndUploadSecret = async (
		allowlistId: string,
		capId: string
	) => {
		if (!currentAccountAddress) {
			setStatus("Please connect your wallet first")
			return
		}

		if (!generatedSecret) {
			setStatus("Please generate a secret first")
			return
		}

		if (!allowlistId || !capId) {
			setStatus("Please create your allowlist first (Step 1)")
			return
		}

		setIsEncryptingAndUploading(true)
		setStatus("Encrypting secret with Seal...")

		try {
			// Step 1: Encrypt with Seal
			const { encryptWithSeal } = await import("../utils/sealEncryption")
			const { encryptedData, encryptionId: newEncryptionId } =
				await encryptWithSeal(
					generatedSecret,
					allowlistId,
					PACKAGE_ID,
					suiClient
				)

			setStatus("Uploading encrypted secret to Walrus...")

			// Step 2: Upload to Walrus
			const { uploadToWalrus } = await import("../utils/walrusStorage")
			const { blobId, status: uploadStatus } = await uploadToWalrus(
				encryptedData
			)

			setStatus("Publishing blob to allowlist...")

			// Step 3: Publish to allowlist
			const { Transaction } = await import("@mysten/sui/transactions")
			const tx = new Transaction()

			tx.moveCall({
				target: `${PACKAGE_ID}::allowlist::publish`,
				arguments: [
					tx.object(allowlistId),
					tx.object(capId),
					tx.pure.string(blobId),
				],
			})

			tx.setGasBudget(10000000)

			await new Promise<void>((resolve, reject) => {
				signAndExecute(
					{ transaction: tx },
					{
						onSuccess: async (result) => {
							console.log(
								"Publish transaction successful:",
								result.digest
							)
							console.log(
								`🔗 SuiScan: https://suiscan.xyz/testnet/tx/${result.digest}`
							)

							// Step 4: Store results
							setWalrusBlobId(blobId)
							setBlobOptions((prev) => {
								if (
									prev.some(
										(option) => option.blobId === blobId
									) ||
									!allowlistId
								) {
									return prev
								}

								return [
									...prev,
									{
										blobId,
										allowlistId,
									},
								]
							})

							setStatus(
								`✓ Secret encrypted and uploaded!\nBlob ID: ${blobId}\nStatus: ${uploadStatus}\n\nYour secret is now securely stored on Walrus with Seal encryption!`
							)
							setIsEncryptingAndUploading(false)
							resolve()
						},
						onError: (error) => {
							console.error("Publish transaction failed:", error)
							setStatus(
								`Error publishing to allowlist: ${error.message}`
							)
							setIsEncryptingAndUploading(false)
							reject(error)
						},
					}
				)
			})

			return { blobId, encryptionId: newEncryptionId }
		} catch (error: any) {
			console.error("Error encrypting/uploading secret:", error)
			setStatus(`Error: ${error.message}`)
			setIsEncryptingAndUploading(false)
			throw error
		}
	}

	// Fetch and decrypt secret from Walrus
	const handleFetchAndDecryptSecret = async (
		blobId: string,
		allowlistId: string
	) => {
		if (!currentAccountAddress) {
			setStatus("Please connect your wallet first")
			return
		}

		if (!blobId || !allowlistId) {
			setStatus("Please provide blob ID and allowlist ID")
			return
		}

		setIsFetchingAndDecrypting(true)
		setStatus("Downloading encrypted secret from Walrus...")

		try {
			// Step 1: Download encrypted data from Walrus
			const { downloadFromWalrus } = await import(
				"../utils/walrusStorage"
			)
			const encryptedData = await downloadFromWalrus(blobId)

			setStatus("Decrypting secret with Seal...")

			// Step 2: Decrypt with Seal
			const { decryptWithSeal } = await import("../utils/sealEncryption")
			const decryptedSecret = await decryptWithSeal(
				encryptedData,
				allowlistId,
				PACKAGE_ID,
				suiClient,
				currentAccountAddress,
				signPersonalMessage
			)

			console.log("Secret decrypted successfully!")

			// Step 3: Compute hash
			const { fromHex } = await import("@mysten/sui/utils")
			const secretBytes = fromHex(
				decryptedSecret.startsWith("0x")
					? decryptedSecret.slice(2)
					: decryptedSecret
			)
			const hashBytes = keccak256(secretBytes)
			const hashHex = bytesToHex(hashBytes)

			// Step 4: Update state and localStorage
			setGeneratedSecret(decryptedSecret)
			setClaimSecretHash(hashHex)
			setWalrusBlobId(blobId)
			setBlobOptions((prev) => {
				if (
					prev.some((option) => option.blobId === blobId) ||
					!allowlistId
				) {
					return prev
				}

				return [
					...prev,
					{
						blobId,
						allowlistId,
					},
				]
			})

			localStorage.setItem("lotterySecret", decryptedSecret)
			localStorage.setItem("lotterySecretHash", hashHex)
			localStorage.setItem("lotteryWalrusBlobId", blobId)

			setStatus(
				`✓ Secret fetched and decrypted!\nSecret: ${decryptedSecret}\nHash: ${hashHex}\n\nYou can now use this secret for lottery picks!`
			)
			setDecryptedSecret(decryptedSecret)
			setDecryptedSecretHash(hashHex)
			setIsFetchingAndDecrypting(false)

			return { secret: decryptedSecret, hash: hashHex }
		} catch (error: any) {
			console.error("Error fetching/decrypting secret:", error)
			setStatus(`Error: ${error.message}`)
			setIsFetchingAndDecrypting(false)
			throw error
		}
	}

	return {
		claimSecretHash,
		walrusBlobId,
		generatedSecret,
		isGeneratingSecret,
		isEncryptingAndUploading,
		isFetchingAndDecrypting,
		blobOptions,
		decryptedSecret,
		decryptedSecretHash,
		status,
		handleGenerateAndUploadSecret,
		handleEncryptAndUploadSecret,
		handleFetchAndDecryptSecret,
	}
}
