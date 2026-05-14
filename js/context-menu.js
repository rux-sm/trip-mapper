// ======================================================
// 34) DELEGATED BAR EVENTS
// ======================================================
// ======================================================
// 34) DELEGATED BAR EVENTS (CONTEXT MENU)
// ======================================================
let activeContextTripKey = null;
let activeCellContext = null;
let selectedTripBar = null;
let selectedDriverName = null;

function selectDriverBars(driverName) {
  // Clear existing trip bar selection
  if (selectedTripBar) {
    const prevKey = selectedTripBar.dataset.tripkey;
    document
      .querySelectorAll(`.schedule-grid__trip-bar[data-tripkey="${CSS.escape(prevKey)}"]`)
      .forEach((el) => el.classList.remove("selected"));
    document.body.classList.remove("trip-bar-selected");
    selectedTripBar = null;
  }

  // Clear previous driver name highlight
  document
    .querySelectorAll(".driver-week__name-cell.is-selected")
    .forEach((el) => el.classList.remove("is-selected"));

  // Toggle off if same driver clicked again
  if (selectedDriverName === driverName) {
    selectedDriverName = null;
    document
      .querySelectorAll(".schedule-grid__trip-bar.selected")
      .forEach((el) => el.classList.remove("selected"));
    document.body.classList.remove("driver-filter-active");
    return;
  }

  selectedDriverName = driverName;
  document.body.classList.add("driver-filter-active");

  // Highlight the name cell
  document
    .querySelectorAll(`.driver-week__name-cell[data-driver-name="${CSS.escape(driverName)}"]`)
    .forEach((el) => el.classList.add("is-selected"));

  // Clear any previously selected bars then select matching ones
  document
    .querySelectorAll(".schedule-grid__trip-bar.selected")
    .forEach((el) => el.classList.remove("selected"));

  document.querySelectorAll(".schedule-grid__trip-bar").forEach((bar) => {
    const names = Array.from(bar.querySelectorAll(".schedule-grid__trip-bar__driver"))
      .map((el) => el.textContent.trim())
      .filter(Boolean);
    if (names.includes(driverName)) bar.classList.add("selected");
  });
}

function selectTripBar(barEl) {
  // Clear driver selection
  if (selectedDriverName) {
    selectedDriverName = null;
    document.body.classList.remove("driver-filter-active");
    document
      .querySelectorAll(".driver-week__name-cell.is-selected")
      .forEach((el) => el.classList.remove("is-selected"));
  }

  // Toggle off only when clicking the exact same bar element (not a sibling
  // bar of a multi-bus trip — clicking 2/2 when 1/2 is selected should
  // select and expand 2/2 rather than deselecting the whole trip).
  if (selectedTripBar && barEl === selectedTripBar) {
    const key = selectedTripBar.dataset.tripkey;
    document
      .querySelectorAll(`.schedule-grid__trip-bar[data-tripkey="${CSS.escape(key)}"]`)
      .forEach((el) => el.classList.remove("selected"));
    document.body.classList.remove("trip-bar-selected");
    document
      .querySelectorAll(
        ".driver-week__cell--trip-highlight, .driver-week__header-cell--trip-highlight",
      )
      .forEach((el) =>
        el.classList.remove(
          "driver-week__cell--trip-highlight",
          "driver-week__header-cell--trip-highlight",
        ),
      );
    const overlay = document.getElementById("driver-col-hl");
    if (overlay) overlay.hidden = true;
    selectedTripBar = null;
    setLogFilter(null);
    return;
  }

  if (selectedTripBar) {
    const prevKey = selectedTripBar.dataset.tripkey;
    document
      .querySelectorAll(`.schedule-grid__trip-bar[data-tripkey="${CSS.escape(prevKey)}"]`)
      .forEach((el) => el.classList.remove("selected"));
  }
  // Clear previous driver column highlights
  document
    .querySelectorAll(
      ".driver-week__cell--trip-highlight, .driver-week__header-cell--trip-highlight",
    )
    .forEach((el) =>
      el.classList.remove(
        "driver-week__cell--trip-highlight",
        "driver-week__header-cell--trip-highlight",
      ),
    );
  const existingOverlay = document.getElementById("driver-col-hl");
  if (existingOverlay) existingOverlay.hidden = true;

  selectedTripBar = barEl || null;
  if (!selectedTripBar) {
    document.body.classList.remove("trip-bar-selected");
    return;
  }

  const tripKey = selectedTripBar.dataset.tripkey;
  document
    .querySelectorAll(`.schedule-grid__trip-bar[data-tripkey="${CSS.escape(tripKey)}"]`)
    .forEach((el) => el.classList.add("selected"));
  document.body.classList.add("trip-bar-selected");
  setLogFilter(tripKey);

  const sidx = parseInt(selectedTripBar.dataset.sidx, 10);
  const eidx = parseInt(selectedTripBar.dataset.eidx, 10);
  const weekDates = getWeekDates();
  const targetDates = new Set(weekDates.slice(sidx, eidx + 1));
  const leftDate = weekDates[sidx];
  const rightDate = weekDates[eidx];

  // Background tint on matching cells
  [
    ...(dom.driverWeekHeadRow?.querySelectorAll("[data-date]") ?? []),
    ...(dom.driverWeekBody?.querySelectorAll("[data-date]") ?? []),
  ].forEach((el) => {
    if (!targetDates.has(el.dataset.date)) return;
    el.classList.add(
      el.tagName === "TH"
        ? "driver-week__header-cell--trip-highlight"
        : "driver-week__cell--trip-highlight",
    );
  });

  // Overlay for border + glow
  const wrap = dom.driverWeekBody?.closest(".driver-week__wrap");
  if (!wrap) return;
  const leftHeaderCell = dom.driverWeekHeadRow?.querySelector(`[data-date="${leftDate}"]`);
  const bodyRows = Array.from(dom.driverWeekBody?.querySelectorAll("tr") ?? []);
  const lastBodyRow = bodyRows[bodyRows.length - 1];
  const rightLastCell = lastBodyRow?.querySelector(`[data-date="${rightDate}"]`);
  if (!leftHeaderCell || !rightLastCell) return;

  let overlay = document.getElementById("driver-col-hl");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "driver-col-hl";
    wrap.appendChild(overlay);
  }

  const wrapRect = wrap.getBoundingClientRect();
  const topRect = leftHeaderCell.getBoundingClientRect();
  const bottomRect = rightLastCell.getBoundingClientRect();

  overlay.style.left = `${topRect.left - wrapRect.left - wrap.clientLeft + wrap.scrollLeft}px`;
  overlay.style.top = `${topRect.top - wrapRect.top - wrap.clientTop + wrap.scrollTop}px`;
  overlay.style.width = `${bottomRect.right - topRect.left}px`;
  overlay.style.height = `${bottomRect.bottom - topRect.top}px`;

  overlay.hidden = false;
}

function closeTripContextMenu() {
  if (dom.ctxMenu) dom.ctxMenu.hidden = true;
  activeContextTripKey = null;
}

function closeCellContextMenu() {
  if (dom.cellCtxMenu) dom.cellCtxMenu.hidden = true;
  activeCellContext = null;
}

// ── Central Management for Floating Menus (Context & Custom Dropdowns) ─────────
function closeAllFloatingMenus() {
  closeTripContextMenu();
  closeCellContextMenu();
  // Dispatch custom event to close any "glass select" dropdowns
  window.dispatchEvent(new CustomEvent("close-all-floating-menus"));
}

// Auto-close menus on Escape
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAllFloatingMenus();
  }
});

function showTripContextMenu(x, y, tripKey) {
  if (!dom.ctxMenu) return;

  closeQuickEditPopover();
  closeAllFloatingMenus();

  activeContextTripKey = tripKey;

  // Update Header (optional, could fetch trip details to show dest)
  // For now just generic "Trip Actions" or maybe the destination from the DOM?
  // Let's keep it simple for now.

  dom.ctxMenu.style.left = `${x}px`;
  dom.ctxMenu.style.top = `${y}px`;
  dom.ctxMenu.hidden = false;

  // Adjust if off-screen (using clientX to avoid scroll math complexity)
  const rect = dom.ctxMenu.getBoundingClientRect();
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const scrollX = window.scrollX || 0;
  const scrollY = window.scrollY || 0;

  // Calculate viewport-relative X
  const clientX = x - scrollX;

  // If click is in the right 250px of the screen, force alignment to LEFT of cursor
  // This avoids waiting for rect.width to be valid (which might be 0 during animation)
  if (clientX > winW - 250) {
    // Force menu to be ~200px wide properties to left
    // x is pageX.
    dom.ctxMenu.style.left = `${Math.max(scrollX, x - 210)}px`;
  }

  // Check overflow bottom
  if (rect.bottom > winH) {
    dom.ctxMenu.style.top = `${y - rect.height}px`;
  }
}

function showCellContextMenu(x, y, busId, dateStr) {
  closeAllFloatingMenus();
  // console.log("showCellContextMenu called", { x, y, busId, dateStr, menu: dom.cellCtxMenu });
  if (!dom.cellCtxMenu) {
    console.error("cellCtxMenu DOM element not found!");
    return;
  }

  activeCellContext = { busId, dateStr };

  dom.cellCtxMenu.style.left = `${x}px`;
  dom.cellCtxMenu.style.top = `${y}px`;
  dom.cellCtxMenu.hidden = false;
  // dom.cellCtxMenu.style.display = "block"; // Removed, relies on hidden attribute
  // dom.cellCtxMenu.style.zIndex = "99999"; // Removed
  // ... rest of function default ...

  // Adjust if off-screen
  const rect = dom.cellCtxMenu.getBoundingClientRect();
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const scrollX = window.scrollX || 0;
  const scrollY = window.scrollY || 0;

  // X adjustment
  const clientX = x - scrollX;
  if (clientX > winW - 200) {
    dom.cellCtxMenu.style.left = `${Math.max(scrollX, x - 180)}px`;
  }

  // Y adjustment
  if (rect.bottom > winH) {
    dom.cellCtxMenu.style.top = `${Math.max(scrollY, y - rect.height)}px`;
  }
}

function handleScheduleInteraction(e, isContext) {
  // 1. Check for Trip Bar
  const tripBar = e.target.closest(".schedule-grid__trip-bar");

  if (tripBar) {
    if (isContext) e.preventDefault(); // Stop browser menu
    e.stopPropagation();

    const tripKey = tripBar.dataset.tripkey;
    if (!tripKey) return;

    selectTripBar(tripBar);
    showTripContextMenu(e.pageX, e.pageY, tripKey);
    return;
  }

  // 2. Check for Day Cell (Context Menu)
  const cell = e.target.closest("td.schedule-grid__day-cell");
  if (cell) {
    if (isContext) e.preventDefault(); // Stop browser menu
    e.stopPropagation(); // Prevent immediate close via document listener

    // Get the bus ID from the row
    const tr = cell.closest("tr");
    if (!tr) return;

    let busId = "";
    const busCell = tr.querySelector(".schedule-grid__bus-num");
    if (busCell) {
      busId = busCell.textContent.trim();
    } else if (tr.classList.contains("waiting-list-row")) {
      busId = "Waiting List";
    }

    // Get the date
    const colIdx = cell.cellIndex;
    if (colIdx < 1) return;
    const dayIndex = colIdx - 1;
    const weekDates = getWeekDates();
    if (dayIndex < 0 || dayIndex >= weekDates.length) return;
    const dateStr = weekDates[dayIndex];

    if (busId && dateStr) {
      showCellContextMenu(e.pageX, e.pageY, busId, dateStr);
    } else {
      console.warn("Missing busId or dateStr", { busId, dateStr });
    }
  }
}

// ======================================================
// ======================================================
// 34B) TRIP BAR QUICK-EDIT POPOVER
// ======================================================

let quickEditTripKey = null;
let quickEditDirty = false;
let pendingQuickEdits = { tripEdits: {}, assignEdits: [] };

function mergeAssignEdits(base, incoming) {
  const result = base.map((e) => ({ ...e }));
  incoming.forEach((edit) => {
    const existing = result.find((e) => e.busNumber === edit.busNumber);
    if (existing) Object.assign(existing, edit);
    else result.push({ ...edit });
  });
  return result;
}

const QUICK_EDIT_TABS = [
  { id: "details", label: "Trip" },
  { id: "billing", label: "Billing" },
  { id: "bus", label: "Dispatch" },
  { id: "envelope", label: "Envelope" },
  { id: "checklist", label: "Checklist" },
];

function closeQuickEditPopover() {
  const el = $("tripQuickEdit");
  if (el) el.classList.add("is-hidden");
  quickEditTripKey = null;
  quickEditDirty = false;
  pendingQuickEdits = { tripEdits: {}, assignEdits: [] };
}

function renderQuickEditTab(tabId, trip, assigns) {
  const body = $("quickEditBody");
  if (!body) return;
  body.innerHTML = "";

  if (tabId === "billing") {
    const fields = [
      {
        label: "Contract",
        key: "paymentStatus",
        type: "select",
        options: [
          ["", ""],
          ["Pending Quote", "Unconfirmed"],
          ["Contract Signed", "Contract Signed"],
          ["PO Received", "PO Received"],
          ["Not Required", "Not Required"],
        ],
      },
      {
        label: "Invoice",
        key: "invoiceStatus",
        type: "select",
        options: [
          ["", ""],
          ["Pending Invoice", "Pending"],
          ["Invoiced", "Invoiced"],
          ["Deposit Received", "Deposit Paid"],
          ["Paid in Full", "Paid in Full"],
        ],
      },
      { label: "Invoice #", key: "invoiceNumber", type: "text" },
      { label: "PO / Payment", key: "paymentType", type: "text" },
      { label: "Est. Mileage", key: "estimatedMileage", type: "text" },
      { label: "Quoted Price", key: "quotedPrice", type: "text" },
      { label: "Trip Miles", key: "tripMiles", type: "text" },
      { label: "Date Paid", key: "datePaid", type: "date" },
      { label: "Notes", key: "notes", type: "text" },
    ];
    fields.forEach(({ label, key, type, options }) => {
      const wrap = document.createElement("div");
      wrap.className = "trip-quick-edit__field";
      const lbl = document.createElement("span");
      lbl.className = "trip-quick-edit__label";
      lbl.textContent = label;
      wrap.appendChild(lbl);
      let input;
      if (type === "select") {
        input = document.createElement("select");
        input.className = "trip-quick-edit__select";
        options.forEach(([val, txt]) => {
          const o = document.createElement("option");
          o.value = val;
          o.textContent = txt;
          input.appendChild(o);
        });
        input.value = trip[key] || "";
      } else {
        input = document.createElement("input");
        input.type = type === "date" ? "date" : "text";
        input.className = "trip-quick-edit__input";
        input.value = trip[key] || "";
      }
      input.dataset.key = key;
      wrap.appendChild(input);
      body.appendChild(wrap);
    });
  } else if (tabId === "bus") {
    if (!assigns.length) {
      const empty = document.createElement("span");
      empty.className = "trip-quick-edit__label";
      empty.textContent = "No bus assignments";
      body.appendChild(empty);
      return;
    }

    const STATUS_STATES = [
      { value: "Pending", icon: "schedule", cls: "status-pending" },
      { value: "Assigned", icon: "pending", cls: "status-assigned" },
      { value: "Confirmed", icon: "check_circle", cls: "status-ok" },
    ];

    const makeStatusCycle = (currentValue, busNumber, statusKey) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.busNumber = busNumber;
      btn.dataset.statusKey = statusKey;
      btn.dataset.value = currentValue || "Pending";
      const sync = () => {
        const s = STATUS_STATES.find((st) => st.value === btn.dataset.value) || STATUS_STATES[0];
        btn.innerHTML = `<span class="material-symbols-outlined">${s.icon}</span>`;
        btn.className = `driver-status-cycle ${s.cls}`;
      };
      sync();
      btn.addEventListener("click", () => {
        const cur = STATUS_STATES.findIndex((st) => st.value === btn.dataset.value);
        btn.dataset.value = STATUS_STATES[(cur + 1) % STATUS_STATES.length].value;
        sync();
      });
      return btn;
    };

    assigns.forEach((a) => {
      // Bus header
      const header = document.createElement("div");
      header.className = "trip-quick-edit__bus-header";
      header.textContent = `Bus ${a.busId}`;
      body.appendChild(header);

      // One row per assigned driver
      const slots = [
        {
          name: a.driver1,
          pay: a.driver1Pay,
          status: a.driver1Status,
          payKey: "driver1Pay",
          statusKey: "driver1Status",
        },
        {
          name: a.driver2,
          pay: a.driver2Pay,
          status: a.driver2Status,
          payKey: "driver2Pay",
          statusKey: "driver2Status",
        },
        {
          name: a.driver3,
          pay: a.driver3Pay,
          status: a.driver3Status,
          payKey: "driver3Pay",
          statusKey: "driver3Status",
        },
        {
          name: a.driver4,
          pay: a.driver4Pay,
          status: a.driver4Status,
          payKey: "driver4Pay",
          statusKey: "driver4Status",
        },
      ].filter((s) => s.name && s.name !== "None" && s.name !== "");

      slots.forEach(({ name, pay, status, payKey, statusKey }) => {
        const row = document.createElement("div");
        row.className = "trip-quick-edit__driver-row";

        const nameEl = document.createElement("span");
        nameEl.className = "trip-quick-edit__value";
        nameEl.textContent = name;

        const payInput = document.createElement("input");
        payInput.type = "text";
        payInput.className = "trip-quick-edit__input";
        payInput.placeholder = "$";
        payInput.value = pay || "";
        payInput.dataset.busNumber = a.busNumber;
        payInput.dataset.payKey = payKey;

        const statusBtn = makeStatusCycle(status, a.busNumber, statusKey);

        row.appendChild(nameEl);
        row.appendChild(payInput);
        row.appendChild(statusBtn);
        body.appendChild(row);
      });
    });
  } else if (tabId === "envelope") {
    const fields = [
      { label: "Pick Up Address", key: "envelopePickup" },
      { label: "Trip Contact", key: "envelopeTripContact" },
      { label: "Contact Phone", key: "envelopeTripPhone" },
      { label: "Driver Instructions", key: "envelopeTripNotes" },
    ];
    fields.forEach(({ label, key }) => {
      const wrap = document.createElement("div");
      wrap.className = "trip-quick-edit__field";
      const lbl = document.createElement("span");
      lbl.className = "trip-quick-edit__label";
      lbl.textContent = label;
      wrap.appendChild(lbl);
      const input = document.createElement("input");
      input.type = "text";
      input.className = "trip-quick-edit__input";
      input.value = trip[key] || "";
      input.dataset.key = key;
      wrap.appendChild(input);
      body.appendChild(wrap);
    });
  } else if (tabId === "checklist") {
    const items = [
      { key: "tripReminderSent", label: "Reminder Sent", icon: "notifications" },
      { key: "driverInfoSent", label: "Driver Info Sent", icon: "send" },
    ];
    const row = document.createElement("div");
    row.className = "trip-quick-edit__toggle-row";
    items.forEach(({ key, label, icon }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rux-btn rux-btn--toggle";
      const isOn = !!trip[key] && trip[key] !== false && trip[key] !== "false";
      btn.setAttribute("aria-pressed", String(isOn));
      btn.dataset.key = key;
      btn.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${icon}</span>${label}`;
      btn.addEventListener("click", () => {
        const pressed = btn.getAttribute("aria-pressed") === "true";
        btn.setAttribute("aria-pressed", String(!pressed));
      });
      row.appendChild(btn);
    });
    body.appendChild(row);
  } else if (tabId === "details") {
    const fields = [
      { label: "Destination", key: "destination", readonly: true },
      { label: "Customer", key: "customer", readonly: true },
      { label: "Departure", key: "departureDate", readonly: true },
      { label: "Arrival", key: "arrivalDate", readonly: true },
      { label: "Name", key: "contactName", type: "text" },
      { label: "Phone", key: "phone", type: "tel" },
      { label: "Depart Time", key: "departureTime", type: "time" },
      { label: "Spot Time", key: "spotTime", type: "time" },
      { label: "Arrival Time", key: "arrivalTime", type: "time" },
      {
        label: "Trip Color",
        key: "tripColor",
        type: "select",
        options: [
          ["", "None"],
          ["blue", "Blue"],
          ["green", "Green"],
          ["one-way", "One-Way"],
          ["out-of-service", "Out of Service"],
        ],
      },
      { label: "Buses", key: "busesNeeded", readonly: true },
    ];
    fields.forEach(({ label, key, readonly, type, options }) => {
      const wrap = document.createElement("div");
      wrap.className = "trip-quick-edit__field";
      const lbl = document.createElement("span");
      lbl.className = "trip-quick-edit__label";
      lbl.textContent = label;
      wrap.appendChild(lbl);
      if (readonly) {
        const val = document.createElement("span");
        val.className = "trip-quick-edit__value";
        val.textContent = trip[key] || "—";
        wrap.appendChild(val);
      } else if (type === "select") {
        const sel = document.createElement("select");
        sel.className = "trip-quick-edit__select";
        sel.dataset.key = key;
        options.forEach(([v, t]) => {
          const o = document.createElement("option");
          o.value = v;
          o.textContent = t;
          sel.appendChild(o);
        });
        sel.value = trip[key] || "";
        wrap.appendChild(sel);
      } else {
        const input = document.createElement("input");
        input.type = type;
        input.className = "trip-quick-edit__input";
        input.value = trip[key] || "";
        input.dataset.key = key;
        wrap.appendChild(input);
      }
      body.appendChild(wrap);
    });
  }
}

function showQuickEditPopover(tripKey, barEl) {
  const trip = state.tripByKey?.[String(tripKey)];
  if (!trip) return;
  const assigns = (state.assignmentsByTripKey?.[String(tripKey)] || []).filter(
    (a) => a.busId && a.busId !== "None",
  );

  quickEditTripKey = tripKey;
  quickEditDirty = false;
  pendingQuickEdits = { tripEdits: {}, assignEdits: [] };

  const el = $("tripQuickEdit");
  const titleEl = el.querySelector(".trip-quick-edit__title");
  const tabsEl = $("quickEditTabs");

  titleEl.textContent = "Quick Edit";

  // Build tabs
  tabsEl.innerHTML = "";
  QUICK_EDIT_TABS.forEach((tab, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "trip-quick-edit__tab" + (i === 0 ? " is-active" : "");
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    btn.addEventListener("click", () => {
      const current = collectQuickEditData();
      Object.assign(pendingQuickEdits.tripEdits, current.tripEdits);
      pendingQuickEdits.assignEdits = mergeAssignEdits(
        pendingQuickEdits.assignEdits,
        current.assignEdits,
      );

      tabsEl
        .querySelectorAll(".trip-quick-edit__tab")
        .forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      const mergedTrip = { ...trip, ...pendingQuickEdits.tripEdits };
      const mergedAssigns = assigns.map((a) => {
        const edit = pendingQuickEdits.assignEdits.find(
          (e) => String(e.busNumber) === String(a.busNumber),
        );
        return edit ? { ...a, ...edit } : a;
      });
      renderQuickEditTab(tab.id, mergedTrip, mergedAssigns);
    });
    tabsEl.appendChild(btn);
  });

  renderQuickEditTab("details", trip, assigns);
  el.classList.remove("is-hidden");

  // Position
  const scrollX = window.scrollX,
    scrollY = window.scrollY;
  const barRect = barEl.getBoundingClientRect();
  const popW = 320,
    popH = el.offsetHeight;
  const arrow = el.querySelector(".trip-quick-edit__arrow");

  let left = barRect.right + 10 + scrollX;
  let top = barRect.top + scrollY;
  arrow.classList.remove("arrow-right");

  if (left + popW > window.innerWidth + scrollX - 16) {
    left = barRect.left - popW - 10 + scrollX;
    arrow.classList.add("arrow-right");
  }
  if (top + popH > window.innerHeight + scrollY - 12) {
    top = window.innerHeight + scrollY - popH - 12; // --rux-space-4
  }
  if (top < scrollY + 8) top = scrollY + 8;

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

function collectQuickEditData() {
  const body = $("quickEditBody");
  if (!body) return { tripEdits: {}, assignEdits: [] };
  const tripEdits = {};
  body.querySelectorAll("[data-key]").forEach((el) => {
    if (el.tagName === "SELECT" || el.tagName === "INPUT") {
      tripEdits[el.dataset.key] = el.value;
    } else if (el.tagName === "BUTTON" && el.dataset.key) {
      tripEdits[el.dataset.key] = el.getAttribute("aria-pressed") === "true";
    }
  });
  const assignEdits = [];
  body.querySelectorAll("[data-bus-number]").forEach((el) => {
    const bn = String(el.dataset.busNumber);
    let entry = assignEdits.find((a) => a.busNumber === bn);
    if (!entry) {
      entry = { busNumber: bn };
      assignEdits.push(entry);
    }
    if (el.dataset.payKey) entry[el.dataset.payKey] = el.value;
    if (el.dataset.statusKey) entry[el.dataset.statusKey] = el.dataset.value;
  });
  return { tripEdits, assignEdits };
}

function saveQuickEdit() {
  if (!quickEditTripKey) return;
  const trip = state.tripByKey?.[String(quickEditTripKey)];
  if (!trip) return;

  if (state.pendingWrite || dom.saveBtn?.disabled) {
    if (!confirmDiscardIfDirty("You have unsaved trip changes. Save quick edit instead?")) return;

    const current = collectQuickEditData();
    const allTripEdits = { ...pendingQuickEdits.tripEdits, ...current.tripEdits };
    const allAssignEdits = mergeAssignEdits(pendingQuickEdits.assignEdits, current.assignEdits);
    const tripKey = quickEditTripKey;

    closeQuickEditPopover();
    toastShow("Saving changes…", "sync", { source: "quick-edit-queue" });

    state.pendingQuickEditSave.push(() => {
      const trip = state.tripByKey?.[String(tripKey)];
      if (!trip) return;
      const merged = { ...trip, ...allTripEdits };
      const baseAssigns = (state.assignmentsByTripKey?.[String(merged.tripKey)] || []).map((a) => {
        const edit = allAssignEdits.find((e) => String(e.busNumber) === String(a.busNumber));
        return edit ? { ...a, ...edit } : a;
      });
      populateFormFromData(merged, baseAssigns);
      state.tripFormDirty = true;
      dom.saveBtn.click();
    });
    return;
  }

  if (!confirmDiscardIfDirty("You have unsaved trip changes. Save quick edit instead?")) return;

  const current = collectQuickEditData();
  const allTripEdits = { ...pendingQuickEdits.tripEdits, ...current.tripEdits };
  const allAssignEdits = mergeAssignEdits(pendingQuickEdits.assignEdits, current.assignEdits);

  closeQuickEditPopover();

  const merged = { ...trip, ...allTripEdits };
  const baseAssigns = (state.assignmentsByTripKey?.[String(merged.tripKey)] || []).map((a) => {
    const edit = allAssignEdits.find((e) => String(e.busNumber) === String(a.busNumber));
    return edit ? { ...a, ...edit } : a;
  });

  populateFormFromData(merged, baseAssigns);
  state.tripFormDirty = true;
  dom.saveBtn.click();
}

function wireQuickEditPopover() {
  $("quickEditSaveBtn")?.addEventListener("click", saveQuickEdit);
  $("quickEditCloseBtn")?.addEventListener("click", closeQuickEditPopover);

  $("quickEditBody")?.addEventListener("input", () => {
    quickEditDirty = true;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && quickEditTripKey) closeQuickEditPopover();
  });

  document.addEventListener("click", (e) => {
    if (!quickEditTripKey) return;
    const el = $("tripQuickEdit");
    const path = e.composedPath ? e.composedPath() : [e.target];
    const insidePopover = path.some((n) => n === el);
    const onBar = path.some((n) => n?.classList?.contains?.("schedule-grid__trip-bar"));
    if (insidePopover || onBar) return;
    if (quickEditDirty && !confirm("Discard unsaved changes?")) return;
    closeQuickEditPopover();
  });
}
