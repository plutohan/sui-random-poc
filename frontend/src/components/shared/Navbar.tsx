import React, { useState } from "react";
import { useNavigation } from "../../providers/navigation/NavigationContext";
import { ConnectButton } from "@mysten/dapp-kit";
import { useTheme } from "../../providers/theme/ThemeContext";

const NavBar: React.FC = () => {
  const { toggleDarkMode }  = useTheme();
  const { currentPage, navigate } = useNavigation();
  const [showHowTo, setShowHowTo] = useState(false);

  return (
    <nav className="bg-gray-200 dark:bg-gray-800 p-4 shadow-md">
      <div className="flex flex-row justify-between items-center">
        <ul className="flex space-x-6">
          <li>
            <button
              onClick={() => navigate("/")}
              className={`px-4 py-2 rounded ${
                currentPage === "/" || currentPage.startsWith("/lottery/")
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-300 dark:hover:bg-gray-700"
                }`}
            >
              Home
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("/wallet")}
              className={`px-4 py-2 rounded ${currentPage === "/wallet" ? "bg-blue-500 text-white" : "hover:bg-gray-300 dark:hover:bg-gray-700"
                }`}
            >
              Wallet
            </button>
          </li>
        </ul>
        <div className="flex space-x-6 all-[initial]">
          <button
            onClick={() => setShowHowTo(true)}
            className="px-4 py-2 rounded bg-gray-300 text-gray-900 hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            How To Play
          </button>
          <button
            onClick={toggleDarkMode}
            className="px-4 py-2 rounded bg-blue-500 text-white  hover:bg-gray-300 dark:hover:bg-gray-700">
            Toggle Me
          </button>
          <ConnectButton />
        </div>
      </div>
      {showHowTo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="How to play"
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">How to Play</h3>
              <button
                onClick={() => setShowHowTo(false)}
                aria-label="Close how to play modal"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                ✕
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>Connect your wallet using the button on the right.</li>
              <li>Generate your one-time secret in the Wallet page (My Secret) to enable anonymous prize claims.</li>
              <li>Pick a lottery from the home grid; click a card to open its 3x3 board.</li>
              <li>Select an available slot and confirm to submit the pick transaction.</li>
              <li>If you win, collect your prize or claim anonymously with your secret; creators can also collect fees.</li>
            </ol>
            <div className="flex justify-end">
              <button
                onClick={() => setShowHowTo(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
