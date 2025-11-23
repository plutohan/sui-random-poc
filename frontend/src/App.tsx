import React from "react";
import { useTheme } from "./providers/theme/ThemeContext";
import NavBar from "./components/shared/Navbar";
import { NavigationProvider } from "./providers/navigation/NavigationProvider";
import { useNavigation } from "./providers/navigation/NavigationContext";
import WalletView from "./views/WalletView";
import HomeView from "./views/HomeView";
import LotteryDetailPage from "./components/lottery/components/LotteryDetailPage";

const Pages: React.FC = () => {
  const { currentPage } = useNavigation();

  if (currentPage === "/" || currentPage === "") {
    return <HomeView />;
  }

  if (currentPage === "/wallet") {
    return <WalletView />;
  }

  if (currentPage.startsWith("/lottery/")) {
    const gameId = decodeURIComponent(currentPage.replace("/lottery/", ""));
    return <LotteryDetailPage gameId={gameId} />;
  }

  return <div className="text-center">Page not found!</div>;
};

const App: React.FC = () => {
  const { darkMode } = useTheme();

  // Apply dark mode class to document root for :root.dark CSS selectors
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <NavigationProvider>
      <div className="min-h-screen gradient-bg">
        <NavBar />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
          <Pages />
        </div>
      </div>
    </NavigationProvider>
  );
};

export default App;
