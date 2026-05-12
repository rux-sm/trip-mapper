// ======================================================
// 39) BOOT
// ======================================================
(function boot() {
  warnOnMissingRequiredHooks();

  try {
    const style = document.createElement("style");
    style.textContent = `
  ${SELECTORS.scheduleGridWrapHook}.is-loading-bars .schedule-grid__trip-bar { opacity: 0.18; pointer-events: none; }
`;
    document.head.appendChild(style);
  } catch { }

  setSidePanelMode("off");
  enforceDesktopEditing();

  loadPrefs();
  syncWeekStartUI();

  const today = new Date();
  state.currentDate = startOfWeek(today);

  buildBusRowsOnce();
  syncBusPanelState();

  buildAgendaRows();
  setHeaderOrder();

  syncEmptyStateForForm();
  setModeNew();

  wireSettingsMenu();
  wireEvents();
  wireDelegatedBarEvents();
  wireQuickEditPopover();

  window.addEventListener(
    "resize",
    () => {
      suppressScrollbarDuringResize();
      enforceDesktopEditing();
      state.lastColMetrics = null;
      state.barMetrics = null;
      scheduleAgendaReflow();
    },
    { passive: true },
  );

  const tableWrap = getScheduleGridWrapEl();
  const scheduleCard = getScheduleMainCardEl();
  if (tableWrap && "ResizeObserver" in window) {
    const onResize = () => {
      state.lastColMetrics = null;
      scheduleAgendaReflow();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(tableWrap);
    if (scheduleCard && scheduleCard !== tableWrap) ro.observe(scheduleCard);
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      state.lastColMetrics = null;
      scheduleAgendaReflow();
    });
  }

  (async function init() {
    setWeekSyncStatus("loading");
    try {
      await loadDriversAndBuses();
    } catch (e) {
      console.warn("Could not load drivers/buses yet. Using placeholders.", e);
      state.driversList = [
        { driverName: "None" },
        { driverName: "Driver A" },
        { driverName: "Driver B" },
      ];
      state.busesList = [
        { busId: "218", busName: "Bus 218" },
        { busId: "763", busName: "Bus 763" },
      ];
      refreshBusSelectOptions();
    }
    updateWeekDates();
  })();

  window.addEventListener("error", (e) => {
    console.error("Global error:", e?.error || e?.message || e);
    toast("Something went wrong (see console)", "danger", 2200);
  });

  window.addEventListener("unhandledrejection", (e) => {
    console.error("Unhandled promise rejection:", e?.reason || e);
    toast("Network / async error occurred", "danger", 2200);
  });
})();

// ======================================================
// HELPER: Auto-scale Title Font (Mobile)
// ======================================================
function fitDateTitle() {
  const title = document.querySelector(".week-heading");
  if (!title) return;

  title.style.fontSize = "";

  if (window.innerWidth >= 900) return;

  let size = 22;
  const minSize = 12;

  title.style.fontSize = "";

  if (title.scrollWidth > title.clientWidth) {
    size = parseFloat(window.getComputedStyle(title).fontSize);

    while (title.scrollWidth > title.clientWidth && size > minSize) {
      size--;
      title.style.fontSize = size + "px";
    }
  }
}

window.addEventListener("resize", fitDateTitle);
window.addEventListener("load", fitDateTitle);
