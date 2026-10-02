import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getDataStatus, getDataUpdateStatus, startDataUpdate } from "../api/dataStatus";
import { refreshCoreData } from "../api/refresh";
import { getSearch } from "../api/search";
import { ApiError, isAbortError } from "../api/client";
import type { ApiResponse, DataStatusData, DataUpdateStatusData, SearchData } from "../api/types";
import { useApiResource } from "../hooks/useApiResource";
import { TeamMark } from "./ui/TeamMark";
import { ManualUpdateProvider } from "../contexts/ManualUpdateContext";
import { useMotionReduced } from "../contexts/UserPreferencesContext";


interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: "/", label: "總覽", end: true },
  { to: "/schedule", label: "賽程", end: false },
  { to: "/teams", label: "隊伍", end: false },
  { to: "/players", label: "選手", end: false },
  { to: "/settings", label: "設定", end: false }
];

const ROUTE_EASING = [0.16, 1, 0.3, 1] as const;
const HEADER_MENU_MAX_WIDTH = 1110;
const SEARCH_COLLAPSED_DESKTOP_WIDTH = 100;
const SEARCH_COLLAPSED_NARROW_WIDTH = 48;
const SEARCH_EXPANDED_DESKTOP_WIDTH = 360;
const SEARCH_DEBOUNCE_MS = 200;

interface SearchOption {
  id: string;
  href: string;
  label: string;
  secondary: string | null;
  logoUrl?: string | null;
}

type SearchPhase = "closed" | "opening" | "open" | "closing";

const getUpdateStartFailureMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return "資料更新未完成，已保留上一次成功資料。";
  }

  if (error.code === "NETWORK_ERROR") {
    return "目前無法連線至 API 服務，請確認服務已啟動。";
  }

  if (error.statusCode === 404 || error.statusCode === 405) {
    return "API 服務版本不相容，請更新並重新啟動服務。";
  }

  if (error.code === "INVALID_RESPONSE") {
    return "API 服務版本不相容，請更新並重新啟動服務。";
  }

  if (error.code === "DATA_UNAVAILABLE") {
    return "目前無法取得資料，請稍後再試。";
  }

  if (error.code === "UPDATE_UNAVAILABLE") {
    return "目前無法啟動資料更新，請稍後再試。";
  }

  if (error.statusCode !== null && error.statusCode >= 500) {
    return "資料更新未完成，已保留上一次成功資料。";
  }

  return "資料更新未完成，已保留上一次成功資料。";
};

const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const shouldReduceMotion = useMotionReduced();
  const dataStatusResource = useApiResource<ApiResponse<DataStatusData>>(
    "data-status",
    getDataStatus,
    { keepPreviousData: true }
  );
  const [dataUpdateStatus, setDataUpdateStatus] = useState<DataUpdateStatusData | null>(null);
  const [isCurrentPageUpdate, setIsCurrentPageUpdate] = useState(false);
  const [updateApiState, setUpdateApiState] = useState<"checking" | "ready" | "unavailable">("checking");
  const [updateApiMessage, setUpdateApiMessage] = useState<string | null>(null);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const shouldRefreshAfterUpdate = useRef(false);
  const updateSubmissionLock = useRef(false);
  const updateStartRequest = useRef<AbortController | null>(null);
  const updateStatusRequestVersion = useRef(0);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => (
    window.matchMedia(`(max-width: ${HEADER_MENU_MAX_WIDTH}px)`).matches
  ));
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [searchPhase, setSearchPhase] = useState<SearchPhase>("closed");
  const [isSearchAdornmentPositioned, setIsSearchAdornmentPositioned] = useState(false);
  const [searchExpandedWidth, setSearchExpandedWidth] = useState(SEARCH_EXPANDED_DESKTOP_WIDTH);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [searchState, setSearchState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const mobileNavTriggerRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchControlRef = useRef<HTMLFormElement>(null);
  const navHomeRef = useRef<HTMLAnchorElement>(null);
  const searchRequestId = useRef(0);
  const isSearchOpen = searchPhase === "opening" || searchPhase === "open";
  const searchCollapsedWidth = viewportWidth <= 900
    ? SEARCH_COLLAPSED_NARROW_WIDTH
    : SEARCH_COLLAPSED_DESKTOP_WIDTH;
  const teamSearchOptions: SearchOption[] = (searchData?.teams ?? []).flatMap((team, index) => (
    team.slug
      ? [{
        id: `search-team-${index}`,
        href: `/teams/${team.slug}`,
        label: team.name ?? team.shortName ?? "隊伍名稱尚未提供",
        secondary: team.shortName,
        logoUrl: team.logoUrl
      }]
      : []
  ));
  const playerSearchOptions: SearchOption[] = (searchData?.players ?? []).flatMap((player, index) => (
    player.slug
      ? [{
        id: `search-player-${index}`,
        href: `/players/${player.slug}`,
        label: player.handle ?? "選手名稱尚未提供",
        secondary: player.currentTeam?.shortName ?? null
      }]
      : []
  ));
  const searchOptions = [...teamSearchOptions, ...playerSearchOptions];
  const isSearchDropdownVisible = isSearchOpen && searchQuery.trim().length > 0;
  const isUpdateActive = isSubmittingUpdate
    || dataUpdateStatus?.status === "running"
    || dataUpdateStatus?.status === "busy";

  useEffect(() => {
    const controller = new AbortController();
    const requestVersion = ++updateStatusRequestVersion.current;
    getDataUpdateStatus(controller.signal)
      .then((response) => {
        if (requestVersion !== updateStatusRequestVersion.current) {
          return;
        }
        setUpdateApiState("ready");
        setUpdateApiMessage(null);
        setDataUpdateStatus(response.data);
        if (response.data.status === "running" || response.data.status === "busy") {
          setIsCurrentPageUpdate(true);
          shouldRefreshAfterUpdate.current = true;
        }
      })
      .catch((error) => {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        setUpdateApiState("unavailable");
        setUpdateApiMessage(getUpdateStartFailureMessage(error));
      });
    return () => controller.abort();
  }, []);

  useEffect(() => () => updateStartRequest.current?.abort(), []);

  useEffect(() => {
    if (!isUpdateActive || isSubmittingUpdate) {
      return;
    }

    let isActive = true;
    let timeoutId: number | null = null;
    let controller: AbortController | null = null;
    const requestVersion = ++updateStatusRequestVersion.current;
    const pollStatus = async () => {
      controller = new AbortController();
      try {
        const response = await getDataUpdateStatus(controller.signal);
        if (!isActive || requestVersion !== updateStatusRequestVersion.current) {
          return;
        }
        setDataUpdateStatus(response.data);
        if (response.data.status !== "running" && response.data.status !== "busy") {
          setIsSubmittingUpdate(false);
          if (shouldRefreshAfterUpdate.current) {
            shouldRefreshAfterUpdate.current = false;
            refreshCoreData();
          }
        }
      } catch (error) {
        if (!isActive || isAbortError(error)) {
          return;
        }
      }

      if (isActive && requestVersion === updateStatusRequestVersion.current) {
        timeoutId = window.setTimeout(() => void pollStatus(), 1500);
      }
    };

    void pollStatus();
    return () => {
      isActive = false;
      controller?.abort();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isUpdateActive, isSubmittingUpdate]);

  const handleDataUpdate = async () => {
    if (updateApiState !== "ready" || isUpdateActive || updateSubmissionLock.current) {
      return;
    }

    updateSubmissionLock.current = true;
    updateStatusRequestVersion.current += 1;
    const currentStatus = dataStatusResource.state.status === "success"
      ? dataStatusResource.state.data.data
      : null;
    const previousJobId = dataUpdateStatus?.jobId ?? null;
    shouldRefreshAfterUpdate.current = true;
    setIsCurrentPageUpdate(true);
    setIsSubmittingUpdate(true);
    setDataUpdateStatus((previous) => ({
      jobId: null,
      status: "running",
      startedAt: null,
      finishedAt: null,
      failureMessage: null,
      phase: "getting_source",
      dataAsOf: currentStatus?.dataAsOf ?? previous?.dataAsOf ?? null,
      lastImportedAt: currentStatus?.lastImportedAt ?? previous?.lastImportedAt ?? null,
      summary: null
    }));

    const startController = new AbortController();
    updateStartRequest.current = startController;
    try {
      const response = await startDataUpdate(startController.signal);
      setUpdateApiState("ready");
      setDataUpdateStatus((previous) => ({
        jobId: response.data.jobId,
        status: response.data.status,
        startedAt: response.data.status === "running" ? response.data.acceptedAt : previous?.startedAt ?? null,
        finishedAt: null,
        failureMessage: null,
        phase: previous?.phase ?? "getting_source",
        dataAsOf: previous?.dataAsOf ?? null,
        lastImportedAt: previous?.lastImportedAt ?? null,
        summary: previous?.summary ?? null
      }));
    } catch (startError) {
      if (isAbortError(startError)) {
        return;
      }

      try {
        const latest = (await getDataUpdateStatus()).data;
        if (latest.status === "running" || latest.status === "busy") {
          setDataUpdateStatus(latest);
          return;
        }
        if (latest.finishedAt !== null && latest.jobId !== null && latest.jobId !== previousJobId) {
          setDataUpdateStatus(latest);
          shouldRefreshAfterUpdate.current = false;
          refreshCoreData();
          return;
        }
      } catch {
        console.log("Ciallo～(∠・ω< )⌒☆");
      }

      shouldRefreshAfterUpdate.current = false;
      setDataUpdateStatus((previous) => ({
        jobId: previous?.jobId ?? null,
        status: "failed",
        startedAt: previous?.startedAt ?? null,
        finishedAt: previous?.finishedAt ?? null,
        failureMessage: getUpdateStartFailureMessage(startError),
        phase: null,
        dataAsOf: previous?.dataAsOf ?? currentStatus?.dataAsOf ?? null,
        lastImportedAt: previous?.lastImportedAt ?? currentStatus?.lastImportedAt ?? null,
        summary: previous?.summary ?? null
      }));
    } finally {
      if (updateStartRequest.current === startController) {
        updateStartRequest.current = null;
      }
      updateSubmissionLock.current = false;
      setIsSubmittingUpdate(false);
    }
  };

  const measureSearchExpandedWidth = () => {
    const currentWidth = window.innerWidth;
    if (currentWidth <= 900) {
      return Math.max(
        SEARCH_COLLAPSED_NARROW_WIDTH,
        Math.min(SEARCH_EXPANDED_DESKTOP_WIDTH, currentWidth - 132)
      );
    }

    return SEARCH_EXPANDED_DESKTOP_WIDTH;
  };

  const beginSearchClose = (restoreFocus = false) => {
    if (searchPhase === "closed" || searchPhase === "closing") {
      if (restoreFocus) {
        window.requestAnimationFrame(() => searchTriggerRef.current?.focus());
      }
      return;
    }

    if (shouldReduceMotion) {
      setSearchPhase("closed");
      setIsSearchAdornmentPositioned(false);
    } else {
      setSearchPhase("closing");
    }
    setSearchQuery("");
    setSearchData(null);
    setSearchState("idle");
    setActiveSearchIndex(-1);
    setSearchMessage("");

    if (restoreFocus) {
      window.requestAnimationFrame(() => searchTriggerRef.current?.focus());
    }
  };

  useEffect(() => {
    setIsMobileNavOpen(false);
    beginSearchClose();
    setSearchState("idle");
  }, [location.pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${HEADER_MENU_MAX_WIDTH}px)`);
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };
    const handleWindowResize = () => {
      setViewportWidth(window.innerWidth);

      if (isSearchOpen) {
        setSearchExpandedWidth(measureSearchExpandedWidth());
      }
    };

    mediaQuery.addEventListener("change", handleViewportChange);
    window.addEventListener("resize", handleWindowResize);
    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!searchControlRef.current?.contains(target)) {
        beginSearchClose();
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);

    return () => document.removeEventListener("pointerdown", handleDocumentPointerDown);
  }, [isSearchOpen]);

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTypingTarget = target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (event.key === "/" && !event.ctrlKey && !event.altKey && !event.metaKey && !isTypingTarget) {
        event.preventDefault();
        setIsSearchAdornmentPositioned(true);
        setSearchExpandedWidth(measureSearchExpandedWidth());
        setSearchPhase("opening");
        setIsMobileNavOpen(false);
        setSearchMessage("");
        return;
      }

      if (event.key !== "Escape") {
        return;
      }

      if (isSearchOpen) {
        beginSearchClose(true);
        return;
      }

      if (isMobileNavOpen) {
        setIsMobileNavOpen(false);

        mobileNavTriggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [isMobileNavOpen, isSearchOpen]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (!isSearchOpen || !query) {
      setSearchData(null);
      setSearchState("idle");
      setActiveSearchIndex(-1);
      setSearchMessage("");

      return;
    }

    const controller = new AbortController();
    const requestId = searchRequestId.current + 1;

    searchRequestId.current = requestId;

    setSearchData(null);
    setSearchState("loading");
    setSearchMessage("");
    setActiveSearchIndex(-1);

    const timeoutId = window.setTimeout(() => {
      getSearch(query, controller.signal)
        .then((response) => {
          if (controller.signal.aborted || searchRequestId.current !== requestId) {
            return;
          }
          setSearchData(response.data);
          setSearchState("success");
          const total = typeof response.meta.total === "number"
            ? response.meta.total
            : response.data.teams.length + response.data.players.length;
          setSearchMessage(`搜尋完成，共找到 ${total} 筆結果。`);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || isAbortError(error) || searchRequestId.current !== requestId) {
            return;
          }

          setSearchData(null);
          setSearchState("error");
          setSearchMessage("目前無法取得資料，請稍後再試。");
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();

      if (searchRequestId.current === requestId) {
        searchRequestId.current += 1;
      }
    };
  }, [isSearchOpen, searchQuery]);

  const handleSearchOpen = () => {
    if (searchPhase === "open") {
      searchInputRef.current?.focus();

      return;
    }

    if (searchPhase === "opening") {
      return;
    }

    setSearchExpandedWidth(measureSearchExpandedWidth());
    setSearchPhase("opening");
    setIsSearchAdornmentPositioned(true);
    setIsMobileNavOpen(false);
    setSearchMessage("");
  };

  const handleSearchClose = () => {
    beginSearchClose(true);
  };

  const handleMobileNavToggle = () => {
    setIsMobileNavOpen((current) => !current);
    beginSearchClose();
  };

  const handleSearchSelection = (href: string) => {
    beginSearchClose();
    setSearchState("idle");
    navigate(href);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchOptions.length === 0) {
      return;
    }

    const selectedOption = searchOptions[activeSearchIndex] ?? searchOptions[0];

    if (selectedOption) {
      handleSearchSelection(selectedOption.href);
    }
  };

  const handleNavigation = () => {
    setIsMobileNavOpen(false);
    beginSearchClose();
    setSearchState("idle");
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && searchOptions.length > 0) {
      event.preventDefault();
      setActiveSearchIndex((current) => current < 0 ? 0 : (current + 1) % searchOptions.length);

      return;
    }

    if (event.key === "ArrowUp" && searchOptions.length > 0) {
      event.preventDefault();
      setActiveSearchIndex((current) => current < 0
        ? searchOptions.length - 1
        : (current - 1 + searchOptions.length) % searchOptions.length);
    }
  };

  const handleNavLinkClick = (event: MouseEvent<HTMLAnchorElement>, destination: string) => {
    handleNavigation();
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    navigate(destination);
  };

  const isNavItemActive = (destination: string, exact: boolean) => (
    exact
      ? location.pathname === destination
      : location.pathname === destination || location.pathname.startsWith(`${destination}/`)
  );

  const handleNavAnimationComplete = () => {
    if (isMobileViewport && isMobileNavOpen) {
      navHomeRef.current?.focus();
    }
  };

  const currentDataStatus = dataStatusResource.state.status === "success"
    ? dataStatusResource.state.data.data
    : null;
  const displayedDataAsOf = dataUpdateStatus?.dataAsOf ?? currentDataStatus?.dataAsOf ?? null;
  const displayedLastImportedAt = dataUpdateStatus?.lastImportedAt ?? currentDataStatus?.lastImportedAt ?? null;
  const updateStatus = isSubmittingUpdate ? "running" : dataUpdateStatus?.status ?? "idle";
  const manualUpdateValue = {
    apiState: updateApiState,
    apiMessage: updateApiMessage,
    status: updateStatus,
    isHistorical: !isCurrentPageUpdate
      && dataUpdateStatus !== null
      && ["success", "partial", "failed"].includes(dataUpdateStatus.status),
    phase: dataUpdateStatus?.phase ?? null,
    failureMessage: dataUpdateStatus?.failureMessage ?? null,
    dataAsOf: displayedDataAsOf,
    lastImportedAt: displayedLastImportedAt,
    summary: dataUpdateStatus?.summary ?? null,
    onStart: () => void handleDataUpdate()
  } as const;

  return (
    <ManualUpdateProvider value={manualUpdateValue}>
      <>
        <a className="skip-link" href="#main-content">略過導覽，前往主要內容</a>
        <div className="app-shell">
          <header className="app-header">
            <div className="header-inner">
              <Link className="brand" to="/" onClick={handleNavigation} aria-label="VCT Champions 2026 總覽">
                <img
                  className="brand-logo"
                  src="/brand/valorant-logomark-off-white.png"
                  alt=""
                  width="88"
                  height="50"
                />
                <span className="brand-copy">
                  <strong>VCT ANALYTICS</strong>
                  <span>CHAMPIONS 2026</span>
                </span>
              </Link>

              <motion.nav
                id="site-navigation"
                className={`main-nav${isMobileNavOpen ? " is-open" : ""}`}
                aria-label="主要導覽"
                aria-hidden={isMobileViewport && !isMobileNavOpen}
                inert={isMobileViewport && !isMobileNavOpen}
                initial={false}
                animate={{
                  height: isMobileViewport ? (isMobileNavOpen ? "auto" : 0) : "auto",
                  opacity: isMobileViewport ? (isMobileNavOpen ? 1 : 0) : 1,
                  y: isMobileViewport && !isMobileNavOpen && !shouldReduceMotion ? -8 : 0,
                  transition: {
                    height: {
                      duration: shouldReduceMotion ? 0 : isMobileNavOpen ? 0.3 : 0.12,
                      delay: shouldReduceMotion ? 0 : isMobileNavOpen ? 0.04 : 0.12,
                      ease: ROUTE_EASING
                    },
                    opacity: {
                      duration: shouldReduceMotion ? 0 : isMobileNavOpen ? 0.2 : 0.08,
                      delay: shouldReduceMotion ? 0 : isMobileNavOpen ? 0.04 : 0.12,
                      ease: ROUTE_EASING
                    },
                    y: {
                      duration: shouldReduceMotion ? 0 : isMobileNavOpen ? 0.3 : 0.12,
                      delay: shouldReduceMotion ? 0 : isMobileNavOpen ? 0.04 : 0.12,
                      ease: ROUTE_EASING
                    }
                  }
                }}
                onAnimationComplete={handleNavAnimationComplete}
              >
                <AnimatePresence mode="sync" initial={false}>
                  {(!isMobileViewport || isMobileNavOpen) && NAV_ITEMS.map((item) => (
                    <motion.a
                      key={item.to}
                      href={item.to}
                      ref={item.end ? navHomeRef : undefined}
                      onClick={(event) => handleNavLinkClick(event, item.to)}
                      initial={isMobileViewport
                        ? { opacity: 0, y: shouldReduceMotion ? 0 : -6 }
                        : false}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: shouldReduceMotion ? 0 : 0.18,
                          delay: shouldReduceMotion ? 0 : isMobileViewport ? 0.06 : 0,
                          ease: ROUTE_EASING
                        }
                      }}
                      exit={{
                        opacity: 0,
                        y: shouldReduceMotion ? 0 : -6,
                        transition: {
                          duration: shouldReduceMotion ? 0 : 0.12,
                          ease: ROUTE_EASING
                        }
                      }}
                      aria-current={isNavItemActive(item.to, item.end) ? "page" : undefined}
                      className={`nav-link${isNavItemActive(item.to, item.end) ? " is-active" : ""}`}
                    >
                      {item.label}
                    </motion.a>
                  ))}
                </AnimatePresence>
              </motion.nav>

              <div className="header-actions">
                <motion.form
                  ref={searchControlRef}
                  id="site-search-control"
                  className={`search-control${isSearchAdornmentPositioned ? " is-open" : ""}${searchPhase === "opening" ? " is-opening" : ""}${searchPhase === "closing" ? " is-collapsing" : ""}`}
                  role="search"
                  aria-label="搜尋隊伍或選手"
                  initial={false}
                  animate={{
                    width: isSearchOpen
                      ? searchExpandedWidth
                      : searchCollapsedWidth
                  }}
                  transition={{
                    duration: shouldReduceMotion
                      ? 0
                      : searchPhase === "opening"
                        ? 0.3
                        : searchPhase === "closing"
                          ? 0.16
                          : 0,
                    ease: ROUTE_EASING
                  }}
                  onAnimationComplete={() => {
                    if (searchPhase === "opening") {
                      searchInputRef.current?.focus();
                      setSearchPhase("open");

                      return;
                    }

                    if (searchPhase === "closing") {
                      setSearchPhase("closed");
                      setIsSearchAdornmentPositioned(false);
                    }
                  }}
                  onSubmit={handleSearchSubmit}
                >
                  <button
                    ref={searchTriggerRef}
                    className="search-icon-trigger"
                    type="button"
                    aria-label={isSearchOpen ? "將焦點移至搜尋欄" : "開啟搜尋，快捷鍵斜線"}
                    aria-expanded={isSearchOpen}
                    aria-controls="site-search-input"
                    onClick={handleSearchOpen}
                  >
                    <motion.svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      animate={{ x: searchPhase === "opening" ? [8, 0] : searchPhase === "closing" ? 8 : 0 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : searchPhase === "opening" || searchPhase === "closing" ? 0.16 : 0,
                        ease: ROUTE_EASING
                      }}
                    >
                      <circle cx="8.7" cy="8.7" r="5.7" />
                      <path d="m13 13 4 4" />
                    </motion.svg>
                    <motion.span
                      className="search-trigger-copy"
                      aria-hidden="true"
                      animate={{
                        opacity: searchPhase === "closed" || searchPhase === "closing" ? 1 : 0,
                        x: shouldReduceMotion ? 0 : searchPhase === "closed" || searchPhase === "closing" ? 0 : -5
                      }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : searchPhase === "closing" ? 0.08 : 0.12,
                        delay: shouldReduceMotion || searchPhase !== "closing" ? 0 : 0.08,
                        ease: ROUTE_EASING
                      }}
                    >
                      <span>搜尋</span>
                    </motion.span>
                  </button>
                  {isSearchAdornmentPositioned ? (
                    <motion.div
                      className="search-input-area"
                      aria-hidden={!isSearchOpen}
                      inert={!isSearchOpen}
                      animate={{
                        opacity: isSearchOpen ? 1 : 0,
                        x: shouldReduceMotion ? 0 : isSearchOpen ? 0 : 8
                      }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : isSearchOpen ? 0.16 : 0.06,
                        delay: shouldReduceMotion || !isSearchOpen ? 0 : 0.12,
                        ease: ROUTE_EASING
                      }}
                    >
                      <label className="visually-hidden" htmlFor="site-search-input">搜尋隊伍或選手</label>
                      <input
                        ref={searchInputRef}
                        id="site-search-input"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.currentTarget.value)}
                        onKeyDown={handleSearchKeyDown}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={isSearchDropdownVisible}
                        aria-controls={isSearchDropdownVisible ? "search-dropdown" : undefined}
                        aria-activedescendant={searchOptions[activeSearchIndex]?.id}
                        maxLength={80}
                        placeholder="輸入隊伍或選手名稱"
                      />
                      <button
                        className="search-close-button"
                        type="button"
                        aria-label="關閉搜尋"
                        onClick={handleSearchClose}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="m5 5 10 10M15 5 5 15" />
                        </svg>
                      </button>
                    </motion.div>
                  ) : null}
                  <div className="search-result-transition" aria-hidden={!isSearchOpen} inert={!isSearchOpen}>
                    <AnimatePresence initial={false}>
                      {isSearchDropdownVisible ? (
                        <motion.div
                          id="search-dropdown"
                          className="search-dropdown"
                          role="listbox"
                          aria-label="搜尋結果"
                          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{
                            opacity: 0,
                            y: shouldReduceMotion ? 0 : -2,
                            transition: { duration: shouldReduceMotion ? 0 : 0.08, ease: ROUTE_EASING }
                          }}
                          transition={{
                            duration: shouldReduceMotion ? 0 : 0.18,
                            ease: ROUTE_EASING
                          }}
                          style={{ pointerEvents: isSearchOpen ? "auto" : "none" }}
                        >
                          {searchState === "loading" ? (
                            <div className="search-dropdown-message" role="option" aria-disabled="true">正在搜尋…</div>
                          ) : null}
                          {searchState === "error" ? (
                            <div className="search-dropdown-message" role="option" aria-disabled="true">目前無法取得資料，請稍後再試。</div>
                          ) : null}
                          {searchState === "success" && searchOptions.length === 0 ? (
                            <div className="search-dropdown-message" role="option" aria-disabled="true">找不到符合的隊伍或選手</div>
                          ) : null}
                          {searchState === "success" && teamSearchOptions.length > 0 ? (
                            <div className="search-result-group" role="group" aria-label="隊伍">
                              <span className="search-result-heading" aria-hidden="true">隊伍</span>
                              {teamSearchOptions.map((option, index) => (
                                <Link
                                  key={option.id}
                                  id={option.id}
                                  role="option"
                                  aria-selected={activeSearchIndex === index}
                                  className={`search-result-option${activeSearchIndex === index ? " is-active" : ""}`}
                                  to={option.href}
                                  onMouseMove={() => setActiveSearchIndex(index)}
                                  onClick={handleNavigation}
                                >
                                  <span className="search-result-team">
                                    <TeamMark
                                      name={option.label}
                                      shortName={option.secondary}
                                      logoUrl={option.logoUrl}
                                      size="small"
                                    />
                                    <span>{option.label}</span>
                                  </span>
                                  {option.secondary ? <small>{option.secondary}</small> : null}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                          {searchState === "success" && playerSearchOptions.length > 0 ? (
                            <div className="search-result-group" role="group" aria-label="選手">
                              <span className="search-result-heading" aria-hidden="true">選手</span>
                              {playerSearchOptions.map((option, index) => {
                                const optionIndex = teamSearchOptions.length + index;
                                return (
                                  <Link
                                    key={option.id}
                                    id={option.id}
                                    role="option"
                                    aria-selected={activeSearchIndex === optionIndex}
                                    className={`search-result-option${activeSearchIndex === optionIndex ? " is-active" : ""}`}
                                    to={option.href}
                                    onMouseMove={() => setActiveSearchIndex(optionIndex)}
                                    onClick={handleNavigation}
                                  >
                                    <span>{option.label}</span>
                                    {option.secondary ? <small>{option.secondary}</small> : null}
                                  </Link>
                                );
                              })}
                            </div>
                          ) : null}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  <span className="visually-hidden" aria-live="polite" aria-atomic="true">{searchMessage}</span>
                </motion.form>
                <button
                  ref={mobileNavTriggerRef}
                  className={`mobile-nav-trigger${isMobileNavOpen ? " is-open" : ""}`}
                  type="button"
                  aria-label={isMobileNavOpen ? "收合導覽" : "展開導覽"}
                  aria-expanded={isMobileNavOpen}
                  aria-controls="site-navigation"
                  onClick={handleMobileNavToggle}
                >
                  <span className="menu-icon" aria-hidden="true"><i /><i /><i /></span>
                </button>
              </div>

            </div>
          </header>

          <div className="app-content">{children}</div>
        </div>
        <footer className="app-footer">
          <span className="footer-copyright">Copyright © 2026 oF | 原始程式碼採 Apache-2.0 授權</span>
        </footer>
      </>
    </ManualUpdateProvider>
  );
};

export { AppShell };