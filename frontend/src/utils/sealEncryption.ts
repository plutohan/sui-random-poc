import { SuiClient } from "@mysten/sui/client"
import { EncryptedObject, SealClient, SessionKey } from "@mysten/seal"
import { fromHex, toHex } from "@mysten/sui/utils"
import { Transaction } from "@mysten/sui/transactions"

// Seal server object IDs for testnet
const SEAL_SERVER_OBJECT_IDS = [
	"0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
	"0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
]

/**
 * Encrypt data using Seal threshold cryptography
 * @param data - The data to encrypt (hex string)
 * @param allowlistId - The allowlist ID for access control
 * @param packageId - The package ID for encryption
 * @param suiClient - Sui client instance
 * @returns Encrypted data and encryption ID
 */
export async function encryptWithSeal(
	data: string,
	allowlistId: string,
	packageId: string,
	suiClient: SuiClient
): Promise<{
	encryptedData: Uint8Array
	encryptionId: string
}> {
	try {
		// Create SealClient instance
		const sealClient = new SealClient({
			suiClient: suiClient,
			serverConfigs: SEAL_SERVER_OBJECT_IDS.map((id) => ({
				objectId: id,
				weight: 1,
			})),
			verifyKeyServers: false,
		})

		console.log("SealClient initialized")

		// Generate encryption ID: allowlist ID + nonce
		const policyObjectBytes = fromHex(
			allowlistId.startsWith("0x") ? allowlistId.slice(2) : allowlistId
		)
		const nonce = crypto.getRandomValues(new Uint8Array(5))
		const encryptionId = toHex(new Uint8Array([...policyObjectBytes, ...nonce]))

		console.log("Encryption ID:", encryptionId)
		console.log("Nonce (hex):", toHex(nonce))

		// Convert hex string data to bytes
		const dataBytes = fromHex(data.startsWith("0x") ? data.slice(2) : data)

		console.log("Encrypting data with Seal...")

		// Encrypt data using Seal with threshold = 2
		const { encryptedObject: encryptedData } = await sealClient.encrypt({
			threshold: 2,
			packageId: packageId,
			id: encryptionId,
			data: dataBytes,
		})

		console.log(
			`Data encrypted successfully! Encrypted size: ${encryptedData.length} bytes`
		)

		return {
			encryptedData,
			encryptionId,
		}
	} catch (error) {
		console.error("Seal encryption error:", error)
		throw new Error(`Failed to encrypt data with Seal: ${error}`)
	}
}

/**
 * Decrypt data using Seal threshold cryptography
 * @param encryptedData - The encrypted data to decrypt
 * @param encryptionId - The encryption ID used during encryption
 * @param allowlistId - The allowlist ID for access control
 * @param packageId - The package ID
 * @param suiClient - Sui client instance
 * @param walletAddress - Current wallet address
 * @param signPersonalMessage - Function to sign personal messages (from wallet)
 * @returns Decrypted data as hex string
 */
export async function decryptWithSeal(
	encryptedData: Uint8Array,
	allowlistId: string,
	packageId: string,
	suiClient: SuiClient,
	walletAddress: string,
	signPersonalMessage: (message: { message: Uint8Array }) => Promise<{ signature: string }>
): Promise<string> {
	try {
		// Create SealClient instance
		const sealClient = new SealClient({
			suiClient: suiClient,
			serverConfigs: SEAL_SERVER_OBJECT_IDS.map((id) => ({
				objectId: id,
				weight: 1,
			})),
			verifyKeyServers: false,
		})

		console.log("SealClient initialized for decryption")

		// Step 1: Create SessionKey
		console.log("Creating SessionKey...")
		const sessionKey = await SessionKey.create({
			address: walletAddress,
			packageId: packageId,
			ttlMin: 10, // 10 minutes TTL
			suiClient,
		})

		// Step 2: Sign the personal message
		console.log("Signing SessionKey personal message...")
		const personalMessage = sessionKey.getPersonalMessage()
		const { signature } = await signPersonalMessage({ message: personalMessage })
		await sessionKey.setPersonalMessageSignature(signature)
		console.log("SessionKey created and signed")

		// Step 3: Build approval transaction (NOT executed, just for authentication)
		const tx = new Transaction()

		// Convert encryption ID to bytes
		// const encryptionIdBytes = fromHex(
			// encryptionId.startsWith("0x") ? encryptionId.slice(2) : encryptionId
		// )

		const id = EncryptedObject.parse(new Uint8Array(encryptedData)).id;
		const idStr = typeof id === 'string' ? id : toHex(id);

		// console.log("Encryption ID:", encryptionId)
		console.log("Allowlist ID:", allowlistId)

		tx.moveCall({
			target: `${packageId}::allowlist::seal_approve`,
			arguments: [
				tx.pure.vector('u8', fromHex(idStr)),
				tx.object(allowlistId),
			],
		})

		// Build transaction bytes (authentication token)
		console.log("Building transaction for authentication...")
		const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true })
		console.log("Transaction bytes built")

		// Step 4: Decrypt using Seal
		console.log("Decrypting with Seal...")
		const decryptedData = await sealClient.decrypt({
			data: encryptedData,
			sessionKey,
			txBytes,
		})

		// Convert decrypted bytes to hex string
		const decryptedHex = toHex(decryptedData)

		console.log("Data decrypted successfully!")
		console.log(`Decrypted data length: ${decryptedData.length} bytes`)

		return decryptedHex
	} catch (error) {
		console.error("Seal decryption error:", error)
		throw new Error(`Failed to decrypt data with Seal: ${error}`)
	}
}

