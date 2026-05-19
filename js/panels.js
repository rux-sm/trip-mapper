// ======================================================
// 22) LEFT PANEL MODE + DESKTOP ENFORCEMENT
// ======================================================
// Card-to-panel mapping
const TIME_SEVERITY_CONFIG = {
  depart: { flagBeforeMinutes: 4 * 60 + 30 }, // before 4:30 AM → flagged
  arrive: { flagAfter: 23, flagBefore: 3 },    // 11:00 PM+ or midnight–2:59 AM → flagged
};

function getTimeSeverity(timeStr, role) {
  const hhmm = normalizeTime(timeStr);
  if (!hhmm) return "normal";
  const [h, m] = hhmm.split(":").map(Number);
  const cfg = TIME_SEVERITY_CONFIG[role];
  if (role === "depart" && h * 60 + m < cfg.flagBeforeMinutes) return "flagged";
  if (role === "arrive" && (h >= cfg.flagAfter || h < cfg.flagBefore)) return "flagged";
  return "normal";
}

const CARD_CONFIG = {
  trip: { card: dom.tripInfoCard, btn: dom.tripInputBtn },
  drivers: { card: dom.driverWeekCard, btn: dom.driversBtn },
  notes: { card: dom.notesCard, btn: dom.notesBtn },
  quote: { card: dom.quoteCard, btn: dom.quoteBtn },
  todo: { card: dom.todoCard, btn: dom.todoBtn },
  log: { card: dom.logCard, btn: dom.logBtn },
};

const MAX_CARDS_PER_PANEL = 2;

function getCardPanel(cardType) {
  return state.cardPanelAssignments[cardType] || null;
}

function getPanelContent(panel) {
  const panelEl = panel === "left" ? dom.panelStart : dom.panelEnd;
  return panelEl?.querySelector(".sidebar__content") || null;
}

function getCardTypeForElement(cardEl) {
  return Object.keys(CARD_CONFIG).find((cardType) => CARD_CONFIG[cardType]?.card === cardEl) || null;
}

function getOpenCardTypesInPanel(panel) {
  const content = getPanelContent(panel);
  if (!content) return [];

  return Array.from(content.children)
    .map(getCardTypeForElement)
    .filter((cardType) =>
      cardType &&
      state.cardPanelAssignments[cardType] === panel &&
      !CARD_CONFIG[cardType].card.classList.contains("is-hidden")
    );
}

function updatePanelCollapsedStates() {
  const leftHasCards = Object.values(state.cardPanelAssignments).includes("left");
  const rightHasCards = Object.values(state.cardPanelAssignments).includes("right");

  dom.panelStart?.classList.toggle("is-collapsed", !leftHasCards);
  dom.panelEnd?.classList.toggle("is-collapsed", !rightHasCards);
}

function ensurePanelCapacity(panel, incomingCardType) {
  const openCards = getOpenCardTypesInPanel(panel).filter((cardType) => cardType !== incomingCardType);

  while (openCards.length >= MAX_CARDS_PER_PANEL) {
    const oldestCard = openCards.shift();
    if (oldestCard) hideCard(oldestCard, { immediate: true });
  }
}

/** Suppress horizontal scrollbar during layout changes (panel open/close, window resize) */
let _resizeTimer = 0;
function suppressScrollbarDuringResize() {
  const layout = getLayoutPanelsEl();
  if (!layout) return;
  layout.classList.add("is-resizing");
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => layout.classList.remove("is-resizing"), 800);
}

function getFirstAvailablePanel() {
  if (dom.panelStart && getOpenCardTypesInPanel("left").length < MAX_CARDS_PER_PANEL) return "left";
  if (dom.panelEnd && getOpenCardTypesInPanel("right").length < MAX_CARDS_PER_PANEL) return "right";
  return null; // Both panels occupied
}

function showCardInPanel(cardType, panel) {
  const config = CARD_CONFIG[cardType];
  if (!config || !config.card) return;

  suppressScrollbarDuringResize();

  const panelStart = dom.panelStart;
  const panelEndEl = dom.panelEnd;

  // Cancel any pending exit animation
  if (config.card._hideTimeout) {
    clearTimeout(config.card._hideTimeout);
    config.card._hideTimeout = null;
  }

  // Remove card from current location if it's inside a sidebar__content
  const currentParent = config.card.parentElement;
  const leftContent  = panelStart?.querySelector('.sidebar__content');
  const rightContent = panelEndEl?.querySelector('.sidebar__content');
  if (currentParent === leftContent || currentParent === rightContent) {
    currentParent.removeChild(config.card);
  }

  ensurePanelCapacity(panel, cardType);

  // Add to target panel's content slot
  if (panel === "left" && leftContent) {
    leftContent.appendChild(config.card);
    panelStart.classList.remove("is-collapsed");
  } else if (panel === "right" && rightContent) {
    rightContent.appendChild(config.card);
    panelEndEl.classList.remove("is-collapsed");
  }

  // Mark all icon buttons for this card active
  document.querySelectorAll(`.sidebar__icon-btn[data-card="${cardType}"]`)
    .forEach(b => b.classList.add("is-active"));

  // Show the card
  config.card.classList.remove("is-hidden");

  // Reset animation
  const inClass = panel === "right" ? "slide-in-right" : "slide-in-left";
  const outClass = panel === "right" ? "slide-out-right" : "slide-out-left";
  config.card.classList.remove("slide-in-left", "slide-in-right", "slide-out-left", "slide-out-right", "fade-in");
  void config.card.offsetWidth; // force reflow
  config.card.classList.add(inClass);

  // Update state
  state.cardPanelAssignments[cardType] = panel;

  // Update button state
  if (config.btn) {
    config.btn.setAttribute("aria-pressed", "true");
  }

  // Special handling for specific cards
  if (cardType === "notes") {
    updateNotesWeekTitle();
  }
  if (cardType === "drivers") {
    updateDriverWeekIfVisible();
  }
  if (cardType === "todo") {
    renderTodoCard();
  }

  scheduleAgendaReflow();
}

function hideCard(cardType, options = {}) {
  const config = CARD_CONFIG[cardType];
  if (!config || !config.card) return;

  suppressScrollbarDuringResize();

  const panel = state.cardPanelAssignments[cardType];

  state.cardPanelAssignments[cardType] = null;

  // Update button state
  if (config.btn) {
    config.btn.setAttribute("aria-pressed", "false");
  }

  // Deactivate all icon buttons for this card
  document.querySelectorAll(`.sidebar__icon-btn[data-card="${cardType}"]`)
    .forEach(b => b.classList.remove("is-active"));

  if (config.card._hideTimeout) {
    clearTimeout(config.card._hideTimeout);
    config.card._hideTimeout = null;
  }

  if (options.immediate) {
    config.card.classList.remove("slide-in-left", "slide-in-right", "slide-out-left", "slide-out-right");
    config.card.classList.add("is-hidden");
    updatePanelCollapsedStates();
    scheduleAgendaReflow();
    return;
  }

  // Explicitly trigger the slide-out animation independently from the wrapper's CSS
  const outClass = panel === "right" ? "slide-out-right" : "slide-out-left";
  config.card.classList.remove("slide-in-left", "slide-in-right", "slide-out-left", "slide-out-right");
  void config.card.offsetWidth; // force reflow
  config.card.classList.add(outClass);

  updatePanelCollapsedStates();

  // Delay "display: none" so the closing animation can visually complete
  config.card._hideTimeout = setTimeout(() => {
    config.card.classList.add("is-hidden");
    config.card._hideTimeout = null;
  }, 300);

  scheduleAgendaReflow();
}

function toggleCard(cardType) {
  const currentPanel = getCardPanel(cardType);

  if (currentPanel) {
    // Card is open — close it
    hideCard(cardType);
  } else {
    const panel = getFirstAvailablePanel() || "right";
    showCardInPanel(cardType, panel);
  }
}

// Legacy function for backward compatibility (if needed)
function setSidePanelMode(mode) {
  if (mode === "off") {
    state.tripFormOpen = false;
    state.tripFormWeekKey = null;
    // Close all cards
    Object.keys(CARD_CONFIG).forEach((cardType) => hideCard(cardType));
  } else {
    if (mode === "trip") {
      state.tripFormOpen = true;
      state.tripFormWeekKey = getWeekRange().start;
    }
    // Ensure card is shown exclusively on the left
    const currentPanel = getCardPanel(mode);
    if (!currentPanel) {
      // Close anything else
      Object.keys(CARD_CONFIG).forEach((cardType) => hideCard(cardType));
      showCardInPanel(mode, "left");
    } else {
      // Card is assigned to a panel — ensure that panel is actually expanded
      const panelEl = currentPanel === "left" ? dom.panelStart : dom.panelEnd;
      if (panelEl?.classList.contains("is-collapsed")) {
        panelEl.classList.remove("is-collapsed");
      }
    }
  }
}

function setPanelStartMode(show) {
  const panelStart = dom.panelStart;
  if (!panelStart) return;

  panelStart.classList.toggle("is-collapsed", !show);

  const btn = document.getElementById("panelStartBtn");
  if (btn) {
    btn.setAttribute("aria-pressed", show ? "true" : "false");
  }

  if (dom.agendaBody?.rows?.length) scheduleAgendaReflow();
}

function wireIconRail() {
  document.querySelectorAll(".sidebar__icon-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cardType = btn.dataset.card;
      const panel = btn.closest("#panelStart") ? "left" : "right";
      if (getCardPanel(cardType)) {
        hideCard(cardType);
      } else {
        showCardInPanel(cardType, panel);
      }
    });
  });
}

function enforceDesktopEditing() {
  const mobile = isMobileOnly();

  if (dom.tripInputBtn) {
    dom.tripInputBtn.disabled = mobile;
    dom.tripInputBtn.title = mobile ? "Trip editing is available on desktop" : "Trip Editor";
    dom.tripInputBtn.setAttribute("aria-disabled", mobile ? "true" : "false");
  }

  if (mobile) setSidePanelMode("off");
}
