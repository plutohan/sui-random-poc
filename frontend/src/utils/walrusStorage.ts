// Walrus HTTP API configuration
const WALRUS_PUBLISHER_URL =
	import.meta.env.VITE_WALRUS_PUBLISHER_URL ||
	"https://publisher.walrus-testnet.walrus.space"
const WALRUS_AGGREGATOR_URL =
	import.meta.env.VITE_WALRUS_AGGREGATOR_URL ||
	"https://aggregator.walrus-testnet.walrus.space"

const NUM_EPOCHS = 1

/**
 * Upload encrypted data to Walrus storage using HTTP API
 * @param encryptedData - The encrypted data to upload
 * @returns Blob ID and storage info
 */
export async function uploadToWalrus(
	encryptedData: Uint8Array
): Promise<{
	blobId: string
	endEpoch: string
	suiRefType: string
	suiRef: string
	status: string
}> {
	try {
		const publisherUrl = `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=${NUM_EPOCHS}`

		console.log(`📤 Uploading to Walrus publisher: ${publisherUrl}`)

		const response = await fetch(publisherUrl, {
			method: "PUT",
			body: encryptedData,
		})

		if (response.status !== 200) {
			const errorText = await response.text()
			throw new Error(`Failed to upload blob: HTTP ${response.status} - ${errorText}`)
		}

		const storageInfo = await response.json()
		const blobInfo = extractBlobInfo(storageInfo)

		console.log(`✅ Upload successful!`)
		console.log(`📦 Status: ${blobInfo.status}`)
		console.log(`📦 Blob ID: ${blobInfo.blobId}`)
		console.log(`📅 End Epoch: ${blobInfo.endEpoch}`)
		console.log(`🔗 ${blobInfo.suiRefType}: ${blobInfo.suiRef}`)

		return blobInfo
	} catch (error) {
		console.error("Walrus upload error:", error)
		throw new Error(`Failed to upload to Walrus: ${error}`)
	}
}

/**
 * Extract blob information from upload response
 */
function extractBlobInfo(storageInfo: any): {
	blobId: string
	endEpoch: string
	suiRefType: string
	suiRef: string
	status: string
} {
	if ("alreadyCertified" in storageInfo) {
		return {
			blobId: storageInfo.alreadyCertified.blobId,
			endEpoch: storageInfo.alreadyCertified.endEpoch,
			suiRefType: "Previous Sui Certified Event",
			suiRef: storageInfo.alreadyCertified.event.txDigest,
			status: "Already certified",
		}
	} else if ("newlyCreated" in storageInfo) {
		return {
			blobId: storageInfo.newlyCreated.blobObject.blobId,
			endEpoch: storageInfo.newlyCreated.blobObject.storage.endEpoch,
			suiRefType: "Associated Sui Object",
			suiRef: storageInfo.newlyCreated.blobObject.id,
			status: "Newly created",
		}
	} else {
		throw new Error("Unhandled successful response!")
	}
}

/**
 * Download encrypted data from Walrus storage using HTTP API
 * @param blobId - The blob ID to download
 * @returns Encrypted data as Uint8Array
 */
export async function downloadFromWalrus(
	blobId: string
): Promise<Uint8Array> {
	try {
		const aggregatorUrl = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`

		console.log(`📥 Downloading from Walrus aggregator: ${aggregatorUrl}`)

		const response = await fetch(aggregatorUrl)

		if (!response.ok) {
			throw new Error(`Failed to download blob: HTTP ${response.status}`)
		}

		const arrayBuffer = await response.arrayBuffer()
		const encryptedData = new Uint8Array(arrayBuffer)

		console.log(`✅ Downloaded encrypted data, size: ${encryptedData.length} bytes`)

		return encryptedData
	} catch (error) {
		console.error("Walrus download error:", error)
		throw new Error(`Failed to download from Walrus: ${error}`)
	}
}
