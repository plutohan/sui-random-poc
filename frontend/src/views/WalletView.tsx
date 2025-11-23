import { FC, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { MySecretPanel } from "../components/wallet/MySecretPanel";

const WalletView: FC = () => {
  const account = useCurrentAccount();
  const [secretStatus, setSecretStatus] = useState("");

  return (
    <>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Wallet Info</h1>
      </div>
      <div className="flex flex-col items-center gap-6">
        <div className="w-full max-w-5xl">
          <MySecretPanel
            currentAccountAddress={account?.address}
            onStatus={(msg) => setSecretStatus(msg)}
          />
        </div>
        {secretStatus && (
          <div className="w-full max-w-5xl p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
            {secretStatus}
          </div>
        )}
      </div>
    </>
  )
}

export default WalletView;
