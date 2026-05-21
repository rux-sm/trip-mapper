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
  profile: { card: dom.profileCard, btn: dom.avatarBtn },
};

const MAX_CARDS_PER_PANEL = 1;
const PANEL_ANIMATION_MS = 300;
let panelTransitionToken = 0;

function getCardPanel(cardType) {
  return state.cardPanelAssignments[cardType] || null;
}

function getPanelContent(panel) {
  const panelEl = panel === "left" ? dom.panelStart : dom.panelEnd;
  return panelEl?.querySelector(".sidebar__content") || null;
}

function getPanelElement(panel) {
  return panel === "left" ? dom.panelStart : dom.panelEnd;
}

function getPanelForButton(btn) {
  return btn.closest("#panelStart") ? "left" : "right";
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

function syncCardButtonStates() {
  document.querySelectorAll(".sidebar__icon-btn[data-card]").forEach((btn) => {
    const cardType = btn.dataset.card;
    const panel = getPanelForButton(btn);
    const active = !!cardType && state.cardPanelAssignments[cardType] === panel;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    if (active) {
      clearTimeout(btn._deactivatingTimeout);
      btn._deactivatingTimeout = null;
      btn.classList.remove("is-deactivating");
    }
  });

  Object.entries(CARD_CONFIG).forEach(([cardType, config]) => {
    if (config.btn) {
      config.btn.setAttribute("aria-pressed", getCardPanel(cardType) ? "true" : "false");
    }
  });
}

function markRailButtonDeactivating(cardType, panel) {
  document.querySelectorAll(".sidebar__icon-btn[data-card]").forEach((btn) => {
    if (btn.dataset.card !== cardType || getPanelForButton(btn) !== panel) return;
    clearTimeout(btn._deactivatingTimeout);
    btn.classList.remove("is-deactivating");
    void btn.offsetWidth;
    btn.classList.add("is-deactivating");
    btn._deactivatingTimeout = setTimeout(() => {
      btn.classList.remove("is-deactivating");
      btn._deactivatingTimeout = null;
    }, PANEL_ANIMATION_MS);
  });
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
  if (dom.panelEnd && !document.body.classList.contains("right-rail-hidden") &&
      getOpenCardTypesInPanel("right").length < MAX_CARDS_PER_PANEL) return "right";
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
    config.card._hideResolve?.();
    config.card._hideResolve = null;
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

  updatePanelCollapsedStates();
  syncCardButtonStates();

  // Special handling for specific cards
  if (cardType === "trip") {
    state.tripFormOpen = true;
    state.tripFormWeekKey = getWeekRange().start;
    if (typeof resetTripEditorTabs === "function") resetTripEditorTabs();
  }
  if (cardType === "notes") {
    updateNotesWeekTitle();
  }
  if (cardType === "drivers") {
    updateDriverWeekIfVisible();
  }
  if (cardType === "todo") {
    renderTodoCard();
  }
  if (cardType === "profile") {
    openProfilePopover();
  }

  scheduleAgendaReflow();
}

function hideCard(cardType, options = {}) {
  const config = CARD_CONFIG[cardType];
  if (!config || !config.card) return Promise.resolve();

  suppressScrollbarDuringResize();

  const panel = state.cardPanelAssignments[cardType];
  if (!panel && config.card.classList.contains("is-hidden")) return Promise.resolve();
  const isProfilePanelCard = cardType === "profile" && config.card.classList.contains("profile-settings-card");

  if (!options.immediate) markRailButtonDeactivating(cardType, panel);

  state.cardPanelAssignments[cardType] = null;

  if (cardType === "trip") {
    state.tripFormOpen = false;
    state.tripFormWeekKey = null;
  }
  if (cardType === "profile") {
    if (isProfilePanelCard) {
      dom.avatarBtn?.setAttribute("aria-expanded", "false");
    } else {
      closeProfilePopover();
    }
  }

  syncCardButtonStates();

  if (config.card._hideTimeout) {
    clearTimeout(config.card._hideTimeout);
    config.card._hideTimeout = null;
    config.card._hideResolve?.();
    config.card._hideResolve = null;
  }

  if (options.immediate) {
    config.card.classList.remove("slide-in-left", "slide-in-right", "slide-out-left", "slide-out-right");
    config.card.classList.add("is-hidden");
    if (isProfilePanelCard) config.card.hidden = true;
    updatePanelCollapsedStates();
    scheduleAgendaReflow();
    return Promise.resolve();
  }

  // Explicitly trigger the slide-out animation independently from the wrapper's CSS
  const outClass = panel === "right" ? "slide-out-right" : "slide-out-left";
  config.card.classList.remove("slide-in-left", "slide-in-right", "slide-out-left", "slide-out-right");
  void config.card.offsetWidth; // force reflow
  config.card.classList.add(outClass);

  updatePanelCollapsedStates();

  // Delay "display: none" so the closing animation can visually complete
  const hidePromise = new Promise((resolve) => {
    config.card._hideTimeout = setTimeout(() => {
      config.card.classList.add("is-hidden");
      if (isProfilePanelCard) config.card.hidden = true;
      config.card._hideTimeout = null;
      config.card._hideResolve = null;
      resolve();
    }, PANEL_ANIMATION_MS);
    config.card._hideResolve = resolve;
  });

  scheduleAgendaReflow();
  return hidePromise;
}

async function activateRailCard(cardType, panel) {
  const config = CARD_CONFIG[cardType];
  const panelEl = getPanelElement(panel);
  if (!config || !panelEl) return;

  const transitionToken = ++panelTransitionToken;
  const isCurrentCardOpen = state.cardPanelAssignments[cardType] === panel;
  if (isCurrentCardOpen && !panelEl.classList.contains("is-collapsed")) {
    await hideCard(cardType);
    return;
  }

  const closingCards = getOpenCardTypesInPanel(panel).filter((openCardType) => openCardType !== cardType);
  for (const openCardType of closingCards) {
    await hideCard(openCardType);
    if (transitionToken !== panelTransitionToken) return;
  }

  showCardInPanel(cardType, panel);
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
async function setSidePanelMode(mode) {
  const transitionToken = ++panelTransitionToken;

  if (mode === "off") {
    state.tripFormOpen = false;
    state.tripFormWeekKey = null;
    // Close all cards
    await Promise.all(Object.keys(CARD_CONFIG).map((cardType) => hideCard(cardType)));
  } else {
    if (mode === "trip") {
      state.tripFormOpen = true;
      state.tripFormWeekKey = getWeekRange().start;
    }
    // Ensure card is shown exclusively on the left
    const currentPanel = getCardPanel(mode);
    if (!currentPanel) {
      // Close anything else
      await Promise.all(Object.keys(CARD_CONFIG).map((cardType) => hideCard(cardType)));
      if (transitionToken !== panelTransitionToken) return;
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
      const panel = getPanelForButton(btn);
      activateRailCard(cardType, panel);
    });
  });

  syncCardButtonStates();
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
