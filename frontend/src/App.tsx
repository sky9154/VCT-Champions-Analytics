import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OverviewPage } from "./pages/OverviewPage";
import { PlayerDetailPage } from "./pages/PlayerDetailPage";
import { PlayersPage } from "./pages/PlayersPage";
import { SchedulePage } from "./pages/SchedulePage";
import { TeamDetailPage } from "./pages/TeamDetailPage";
import { TeamsPage } from "./pages/TeamsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useMotionReduced } from "./contexts/UserPreferencesContext";


const RoutedContent = () => {
  const location = useLocation();
  const shouldReduceMotion = useMotionReduced();
  const mainRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleTransitionComplete = () => {
    mainRef.current?.querySelector("h1")?.focus({ preventScroll: true });
  };

  return (
    <AnimatePresence mode="wait">
      <motion.main
        ref={mainRef}
        id="main-content"
        className="page-stage"
        key={location.pathname}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={handleTransitionComplete}
      >
        <Routes location={location}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:slug" element={<TeamDetailPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/players/:slug" element={<PlayerDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
};

const App = () => (
  <AppShell>
    <RoutedContent />
  </AppShell>
);

export default App;