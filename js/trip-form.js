// ======================================================
// 13) STATUS SELECT CLASSES & ICONS
// ======================================================
function getEffectiveDriverStatus(t) {
  const assigns = state.assignmentsByTripKey?.[String(t?.tripKey)] || [];
  const statuses = [];
  for (const a of assigns) {
    const d1 = String(a.driver1 || "").trim();
    const d2 = String(a.driver2 || "").trim();
    const d3 = String(a.driver3 || "").trim();
    const d4 = String(a.driver4 || "").trim();
    if (d1 && d1 !== "None") statuses.push(String(a.driver1Status || "").trim() || "Pending");
    if (d2 && d2 !== "None") statuses.push(String(a.driver2Status || "").trim() || "Pending");
    if (d3 && d3 !== "None") statuses.push(String(a.driver3Status || "").trim() || "Pending");
    if (d4 && d4 !== "None") statuses.push(String(a.driver4Status || "").trim() || "Pending");
  }
  if (statuses.length === 0) return (t?.driverStatus || "Pending").trim();
  const statusOrder = { Pending: 0, Assigned: 1, Confirmed: 2 };
  return statuses.reduce((a, b) => ((statusOrder[a] ?? 0) <= (statusOrder[b] ?? 0) ? a : b));
}

function getStatusIcon(fieldId, statusValue) {
  const s = String(statusValue || "")
    .trim()
    .toLowerCase();
  if (fieldId === "driverStatus") {
    if (s === "assigned") return "sentiment_neutral";
    if (s === "confirmed") return "sentiment_satisfied";
    if (s === "driver info sent") return "mood";
    return "sentiment_dissatisfied"; // default fallback for pending/empty
  }

  if (!s || s === "none") return "";

  if (fieldId === "itineraryStatus") {
    return "attach_file_off"; // Base icon, overridden by has-pdf logic elsewhere
  }
  if (fieldId === "contactStatus") {
    return "phone_enabled"; // Base icon
  }
  if (fieldId === "paymentStatus") {
    if (s === "contract signed") return "edit_document";
    if (s === "pending quote" || s === "quoted") return "draft";
    if (s === "po received") return "request_quote";
    if (s === "not required") return "scan_delete";
    return "description";
  }
  if (fieldId === "invoiceStatus") {
    return "attach_money";
  }
  return "";
}

function syncStatusToggle(fieldId, value) {
  const input = document.getElementById(fieldId);
  if (input) input.value = value || "";
  const group = document.querySelector(`.status-toggle-group[data-field="${fieldId}"]`);
  if (!group) return;

  let activeBtn = null;
  group.querySelectorAll(".status-toggle-btn").forEach((btn) => {
    const active = btn.dataset.value === value;
    btn.classList.toggle("is-active", active);
    if (active) activeBtn = btn;
  });

  const pill = group.querySelector(".seg-ctrl__pill");
  if (!pill) return;

  function positionPill() {
    if (activeBtn) {
      pill.style.width = activeBtn.offsetWidth + "px";
      pill.style.transform = `translateX(${activeBtn.offsetLeft - 4}px)`;
    } else {
      pill.style.width = "0";
      pill.style.transform = "translateX(0)";
    }
  }

  if (activeBtn && activeBtn.offsetWidth === 0) {
    let prev = 0;
    function poll() {
      const w = activeBtn.offsetWidth;
      if (w > 0 && w === prev) {
        positionPill();
      } else {
        prev = w;
        requestAnimationFrame(poll);
      }
    }
    requestAnimationFrame(poll);
  } else {
    positionPill();
  }
}

function updateStatusSelect(el) {
  if (!el) return;

  const id = el.id || (el.name && el.name.endsWith("Status") ? "driverStatus" : "");
  const v = String(el.value || "")
    .trim()
    .toLowerCase();

  const classes = [
    "status-pending",
    "status-ok",
    "status-assigned",
    "status-confirmed",
    "status-blue",
  ];
  el.classList.remove(...classes);
  const trigger = el.closest?.(".select-dropdown")?.querySelector(".select-trigger");
  if (trigger) trigger.classList.remove(...classes);
  if (!v) return;

  let addClass = "";
  if (id === "driverStatus" || (id && id.includes("driver"))) {
    if (v === "pending") addClass = "status-pending";
    else if (v === "assigned") addClass = "status-assigned";
    else if (v === "confirmed") addClass = "status-ok";
    else addClass = "status-ok";
  } else if (id === "paymentStatus") {
    if (v === "pending quote") addClass = "status-pending";
    else if (v === "quoted") addClass = "status-assigned";
    else addClass = "status-ok";
  } else if (id === "invoiceStatus") {
    if (v === "pending invoice") addClass = "status-pending";
    else if (v === "invoiced") addClass = "status-assigned";
    else if (v === "deposit received") addClass = "status-blue";
    else if (v === "paid in full") addClass = "status-ok";
  } else {
    addClass = v === "pending" ? "status-pending" : "status-ok";
  }
  if (addClass) {
    el.classList.add(addClass);
    if (trigger) trigger.classList.add(addClass);
  }
}

function syncTripColorSwatches(value) {
  const normalizedValue = value === "Round-Trip" ? "" : value;
  const sel = $("tripColor");
  if (sel) sel.value = value;

  document.querySelectorAll("#tripColorDropdown .trip-color-swatch").forEach((s) => {
    s.classList.toggle("is-selected", s.dataset.value === normalizedValue);
  });

  // Sync trigger preview to the selected swatch's appearance
  const preview = document.querySelector(".trip-color-trigger__preview");
  if (preview) {
    preview.className = "trip-color-trigger__preview";
    if (value === "Out of Service") {
      preview.classList.add("trip-color-swatch--oos");
      preview.style.background = "";
    } else if (!normalizedValue) {
      preview.classList.add("trip-color-swatch--none");
      preview.style.background = "";
    } else {
      const src = document.querySelector(`#tripColorDropdown [data-value="${normalizedValue}"]`);
      preview.style.background = src ? src.style.background : "";
    }
  }
}

function setSelectToPlaceholder(id) {
  const el = $(id);
  if (!el) return;
  el.selectedIndex = 0;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function hasSelectedBusForTrip() {
  const busSel = dom.busGrid?.querySelector("select[name='bus1']");
  if (!busSel) return false;
  const v = String(busSel.value || "").trim();
  return v && v !== "None";
}

function confirmDiscardIfDirty(msg = "You have unsaved trip changes. Discard them?") {
  if (!state.tripFormDirty) return true;
  return confirm(msg);
}

function maybeApplyPendingDefaults() {
  if (!dom.tripForm || dom.action?.value !== "create") return;

  const dep = $("tripDate")?.value;
  if (!dep || !hasSelectedBusForTrip()) return;

  const ids = [
    "itineraryStatus",
    "contactStatus",
    "paymentStatus",
    "driverStatus",
    "invoiceStatus",
  ];
  let changed = false;

  ids.forEach((id) => {
    const el = $(id);
    if (!el || el.value) return;

    if (id === "paymentStatus") {
      syncStatusToggle("paymentStatus", "Pending Quote");
    } else if (id === "invoiceStatus") {
      syncStatusToggle("invoiceStatus", "Pending Invoice");
    } else {
      el.value = "Pending";
    }

    el.dispatchEvent(new Event("change", { bubbles: true }));
    changed = true;
  });

  if (changed) ids.forEach((id) => updateStatusSelect($(id)));

  const tc = $("tripColor");
  if (tc && !tc.value) {
    syncTripColorSwatches("Round-Trip");
    tc.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function updateInvoiceNumberColor() {
  const numInput = $("invoiceNumber");
  if (!numInput) return;
  const icon = numInput.closest(".invoice-num-wrap")?.querySelector(".invoice-num-icon");
  numInput.classList.remove("status-pending", "status-assigned", "status-ok");
  if (icon) icon.style.color = "";
  const invoiceStatus = String($("invoiceStatus")?.value || "")
    .trim()
    .toLowerCase();
  if (!invoiceStatus) return;
  const hasNumber = !!numInput.value.trim();
  let cls, iconColor;
  if (invoiceStatus === "paid in full") {
    cls = "status-ok";
    iconColor = "var(--rux-status-green)";
  } else if (hasNumber) {
    cls = "status-assigned";
    iconColor = "var(--rux-status-yellow)";
  } else {
    cls = "status-pending";
    iconColor = "var(--rux-status-red)";
  }
  numInput.classList.add(cls);
  if (icon) icon.style.color = iconColor;
}

function updateInvoiceNumberVisibility() {
  const el = $("invoiceStatus");
  const numGroup = $("invoiceNumberGroup");
  const numInput = $("invoiceNumber");
  if (!el || !numGroup) return;

  const v = String(el.value || "")
    .trim()
    .toLowerCase();
  // Show if Invoiced, Deposit Received, or Paid in Full
  const show = v === "invoiced" || v === "deposit received" || v === "paid in full";

  if (numInput) {
    if (!numInput.value) numInput.classList.add("is-empty");
  }

  // Intentionally DO NOT clear numInput.value when hiding, so toggling status
  // does not wipe an already-entered invoice number.
  updateInvoiceNumberColor();
}

function refreshEmptyStateUI() {
  const ids = [
    "destination",
    "customer",
    "contactName",
    "phone",
    "tripDate",
    "arrivalDate",
    "departureTime",
    "arrivalTime",
    "busesNeeded",
    "itineraryStatus",
    "contactStatus",
    "paymentStatus",
    "contactStatus",
    "paymentStatus",
    "driverStatus",
    "invoiceStatus",
    "invoiceNumber",
    "tripColor",
    "itinerary",
    "paymentType",
    "estimatedMileage",
    "quotedPrice",
    "tripMiles",
    "datePaid",
    "ref1",
    "ref2",
    "ref3",
    "notes",
    "comments",
  ];

  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;

    const v = el.value ?? "";
    const empty = el.tagName === "TEXTAREA" ? !String(v).trim() : !String(v);
    el.classList.toggle("is-empty", empty);
  }
}

function parseTimeToMinutes(timeValue) {
  const hhmm = normalizeTime(timeValue);
  if (!hhmm) return null;
  const [hours, minutes] = hhmm.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function formatDurationAsHours(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function getSameDayOnDutyHoursPlaceholder() {
  const departureDate = String($("tripDate")?.value || "").slice(0, 10);
  const arrivalDate = String($("arrivalDate")?.value || departureDate || "").slice(0, 10);
  if (!departureDate || !arrivalDate || departureDate !== arrivalDate) return "";

  const departureMinutes = parseTimeToMinutes($("departureTime")?.value);
  const arrivalMinutes = parseTimeToMinutes($("arrivalTime")?.value);
  if (departureMinutes == null || arrivalMinutes == null) return "";

  const durationMinutes =
    arrivalMinutes > departureMinutes
      ? arrivalMinutes - departureMinutes
      : arrivalMinutes + 24 * 60 - departureMinutes;
  return durationMinutes > 0 ? formatDurationAsHours(durationMinutes) : "";
}

function syncOnDutyHoursPlaceholder() {
  const input = $("onDutyHours");
  if (!input) return;
  input.placeholder = getSameDayOnDutyHoursPlaceholder();
}

function syncEmptyStateForForm() {
  const form = dom.tripForm;
  if (!form) return;

  const fields = Array.from(form.querySelectorAll("input, select, textarea")).filter(
    (el) => el.id && el.type !== "hidden",
  );

  function isEmpty(el) {
    const v = el.value ?? "";
    if (el.tagName === "TEXTAREA") return !String(v).trim();
    if (el.tagName === "SELECT") return !String(v);
    return !String(v);
  }

  function syncOne(el) {
    el.classList.toggle("is-empty", isEmpty(el));
  }

  // Always sync current state
  fields.forEach(syncOne);
  syncOnDutyHoursPlaceholder();

  // Only wire event listeners once to prevent memory leak
  if (!state.formListenersWired) {
    state.formListenersWired = true;

    fields.forEach((el) => {
      const markDirtyAndSync = () => {
        state.tripFormDirty = true;
        syncOne(el);
      };

      el.addEventListener("input", markDirtyAndSync);
      el.addEventListener("change", markDirtyAndSync);
      el.addEventListener("blur", () => syncOne(el));
    });

    ["tripDate", "arrivalDate", "departureTime", "arrivalTime"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", syncOnDutyHoursPlaceholder);
      el.addEventListener("change", syncOnDutyHoursPlaceholder);
    });

    // Status toggle groups — click any button to set the hidden input and sync
    document.querySelectorAll(".status-toggle-group").forEach((group) => {
      group.addEventListener("click", (e) => {
        const btn = e.target.closest(".status-toggle-btn");
        if (!btn) return;
        const fieldId = group.dataset.field;
        syncStatusToggle(fieldId, btn.dataset.value);
        state.tripFormDirty = true;
        const hiddenInput = document.getElementById(fieldId);
        if (hiddenInput) hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
        if (fieldId === "invoiceStatus") {
          updateInvoiceNumberVisibility();
          if (btn.dataset.value === "Paid in Full") {
            const datePaid = $("datePaid");
            if (datePaid && !datePaid.value) datePaid.value = ymd(new Date());
          }
        }
      });
    });

    // invoiceStatus hidden input change → update visibility (handles programmatic changes)
    const invSel = $("invoiceStatus");
    if (invSel) {
      invSel.addEventListener("change", () => {
        updateInvoiceNumberVisibility();
      });
    }

    const invNumInput = $("invoiceNumber");
    if (invNumInput) {
      invNumInput.addEventListener("input", updateInvoiceNumberColor);
    }

    // PO number auto-confirm: typing a PO number advances paymentStatus to "PO Received"
    const poInput = $("paymentType");
    if (poInput) {
      poInput.addEventListener("input", () => {
        const cur = $("paymentStatus")?.value;
        if (poInput.value.trim() && (cur === "Pending Quote" || cur === "Contract Signed")) {
          syncStatusToggle("paymentStatus", "PO Received");
          $("paymentStatus")?.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    }

    // Auto-set Contact status to Received when both Trip contact and Trip contact phone are filled
    const syncContactStatusFromEnvelope = () => {
      const contactSel = $("contactStatus");
      const envelopeContact = String($("envelopeTripContact")?.value || "").trim();
      const envelopePhone = String($("envelopeTripPhone")?.value || "").trim();
      if (contactSel && envelopeContact && envelopePhone) {
        contactSel.value = "Received";
        contactSel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };
    [$("envelopeTripContact"), $("envelopeTripPhone")].filter(Boolean).forEach((el) => {
      el.addEventListener("input", syncContactStatusFromEnvelope);
      el.addEventListener("change", syncContactStatusFromEnvelope);
    });

    form.addEventListener("reset", () =>
      setTimeout(() => {
        fields.forEach(syncOne);
        state.tripFormDirty = false;
      }, 0),
    );
  }
}

// ======================================================
// 23) BUS ASSIGNMENTS UI
// ======================================================
function makeSelect(name) {
  const sel = document.createElement("select");
  sel.name = name;
  return sel;
}

function setSelectOptions(sel, options, selectedValue) {
  const prev = selectedValue ?? sel.value;
  sel.innerHTML = "";
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    sel.appendChild(opt);
  }
  const prevTrimmed = String(prev).trim();
  const match = options.find((o) => String(o.value).trim() === prevTrimmed);
  sel.value = match ? match.value : "None";
}

function getBusOptions() {
  const base = [
    { value: "None", label: "" },
    { value: "WAITING_LIST", label: "W/L" },
  ];
  const mapped = state.busesList.map((b) => ({
    value: String(b.busId),
    label: b.busName ? `${b.busName}` : `Bus ${b.busId}`,
  }));
  return base.concat(mapped);
}

function getDriverOptions() {
  const base = [{ value: "None", label: "" }];
  const mapped = state.driversList.map((d) => ({
    value: d.driverName ? String(d.driverName) : String(d.driverId),
    label: getDriverFullName(d) || (d.driverName ? String(d.driverName) : String(d.driverId)),
  }));
  return base.concat(mapped);
}

const DRIVER_STATUS_STATES = [
  { value: "Pending", cls: "status-pending" },
  { value: "Assigned", cls: "status-assigned" },
  { value: "Confirmed", cls: "status-ok" },
];

function getDriverStatusRoleIcon(name) {
  if (/_driver3Status$/.test(name) || /_driver4Status$/.test(name)) return "emergency_home";
  if (/_driver2Status$/.test(name)) return "group";
  return "person";
}

function makeDriverStatusSelect(name) {
  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = name;
  hidden.value = "";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "driver-status-cycle";
  btn.setAttribute("aria-label", "Driver status");
  btn.innerHTML = `<span class="material-symbols-outlined">${getDriverStatusRoleIcon(name)}</span>`;

  const syncBtn = () => {
    const state = DRIVER_STATUS_STATES.find((s) => s.value === hidden.value);
    const visualState = state || DRIVER_STATUS_STATES[0];
    btn.querySelector("span").textContent = getDriverStatusRoleIcon(name);
    btn.className = `driver-status-cycle ${visualState.cls}`;
    btn.title = `Driver status: ${state?.value || "Pending"}`;
    btn.setAttribute("aria-label", btn.title);
  };

  btn.addEventListener("click", () => {
    const cur = DRIVER_STATUS_STATES.findIndex((s) => s.value === hidden.value);
    const next = DRIVER_STATUS_STATES[(cur + 1) % DRIVER_STATUS_STATES.length];
    hidden.value = next.value;
    syncBtn();
    hidden.dispatchEvent(new Event("change", { bubbles: true }));
    state.tripFormDirty = true;
  });

  hidden.addEventListener("change", syncBtn);

  // Override value property so external .value = "..." updates the button too
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  Object.defineProperty(hidden, "value", {
    get: () => proto.get.call(hidden),
    set: (v) => {
      proto.set.call(hidden, v);
      syncBtn();
    },
    configurable: true,
  });

  const wrap = document.createElement("div");
  wrap.className = "driver-status-cycle-wrap";
  wrap.appendChild(btn);
  wrap.appendChild(hidden);

  // Proxy disabled to both button and hidden
  Object.defineProperty(wrap, "disabled", {
    set: (v) => {
      btn.disabled = v;
      hidden.disabled = v;
    },
    get: () => btn.disabled,
    configurable: true,
  });

  // Proxy value/dispatchEvent through to hidden input
  Object.defineProperty(wrap, "value", {
    get: () => hidden.value,
    set: (v) => {
      hidden.value = v;
    },
    configurable: true,
  });

  wrap.dispatchEvent = (e) => hidden.dispatchEvent(e);
  wrap.addEventListener = (type, fn, opts) => hidden.addEventListener(type, fn, opts);

  return wrap;
}

function syncBusSelectEmptyState() {
  dom.busGrid?.querySelectorAll("select").forEach((el) => {
    const v = (el.value ?? "").trim();
    const cell = el.closest(".select-dropdown") || el;
    cell.classList.toggle("is-empty", !v || v === "None");
  });
  checkDriverDoubleBookings();
}

function refreshBusSelectOptions() {
  const busOpts = getBusOptions();
  const drvOpts = getDriverOptions();
  state.busRows.forEach((r) => {
    setSelectOptions(r.busSel, busOpts);
    setSelectOptions(r.d1Sel, drvOpts);
    setSelectOptions(r.d2Sel, drvOpts);
    setSelectOptions(r.d3Sel, drvOpts);
    setSelectOptions(r.d4Sel, drvOpts);
  });
  syncBusSelectEmptyState();
}

function updateBusRowVisibility() {
  const raw = Number(dom.busesNeeded.value);
  const n = raw > 0 ? Math.min(10, raw) : 0;

  const wantsD2 = document.getElementById("reqCoDriver")?.getAttribute("aria-pressed") === "true";
  const wantsD3 = document.getElementById("reqRelief")?.getAttribute("aria-pressed") === "true";
  const wantsD4 = document.getElementById("reqRelief2")?.getAttribute("aria-pressed") === "true";

  state.busRows.forEach((r, idx) => {
    const show = idx < n || idx === 0;
    const enabled = raw > 0 && idx < n;

    const showD2 = show && (wantsD2 || (r.d2Sel.value && r.d2Sel.value !== "None"));
    const showD3 = show && (wantsD3 || (r.d3Sel.value && r.d3Sel.value !== "None"));
    const showD4 = show && (wantsD4 || (r.d4Sel.value && r.d4Sel.value !== "None"));

    r.rowGroup.classList.toggle("is-hidden", !show);
    r.d1Row.classList.toggle("is-hidden", false);
    r.d2Row.classList.toggle("is-hidden", !showD2);
    r.d3Row.classList.toggle("is-hidden", !showD3);
    r.d4Row.classList.toggle("is-hidden", !showD4);

    r.busSel.disabled = !enabled;
    r.d1Sel.disabled = !enabled;
    r.d1StatusSel.disabled = !enabled;
    r.d1Pay.disabled = !enabled;
    r.d2Sel.disabled = !enabled || !showD2;
    r.d2StatusSel.disabled = !enabled || !showD2;
    r.d2Pay.disabled = !enabled || !showD2;
    r.d3Sel.disabled = !enabled || !showD3;
    r.d3StatusSel.disabled = !enabled || !showD3;
    r.d3Pay.disabled = !enabled || !showD3;
    r.d4Sel.disabled = !enabled || !showD4;
    r.d4StatusSel.disabled = !enabled || !showD4;
    r.d4Pay.disabled = !enabled || !showD4;

    if (!show) {
      r.busSel.value = "None";
      r.d1Sel.value = "None";
      r.d1StatusSel.value = "";
      if (r.d1Pay) r.d1Pay.value = "";
      r.d2Sel.value = "None";
      r.d2StatusSel.value = "";
      if (r.d2Pay) r.d2Pay.value = "";
      r.d3Sel.value = "None";
      r.d3StatusSel.value = "";
      if (r.d3Pay) r.d3Pay.value = "";
      r.d4Sel.value = "None";
      r.d4StatusSel.value = "";
      if (r.d4Pay) r.d4Pay.value = "";
    }
  });

  syncBusSelectEmptyState();
}

function syncBusPanelState() {
  const unlocked = Number(dom.busesNeeded.value) > 0;
  dom.assignmentsOverridesSection.classList.toggle("is-disabled", !unlocked);
}

function setBusesNeededAndSync(value) {
  dom.busesNeeded.value = value;
  updateBusRowVisibility();
  syncBusPanelState();
}

function syncBusSegButtons() {
  const n = parseInt(dom.busesNeeded.value) || 0;
  const display = document.getElementById("busesNeededDisplay");
  if (display) display.textContent = n > 0 ? String(n) : "–";
  document.querySelectorAll("#busesNeededDropdown .dropdown__item").forEach((btn) => {
    btn.classList.toggle("is-selected", Number(btn.dataset.value) === n);
  });
}

// ── Dispatch row helpers (module-level so rebuildBusRows can use them) ────────

function _makePayInput(name) {
  const input = document.createElement("input");
  input.type = "text";
  input.name = name;
  input.className = "bus-assign__pay-input text-right";
  return input;
}

function _makeDriverRow(dSel, dStatusSel, payInput) {
  const row = document.createElement("div");
  row.className = "bus-assign__driver-row";
  const driverField = document.createElement("div");
  driverField.className = "bus-assign__driver-field";
  const payWrapper = document.createElement("div");
  payWrapper.className = "fld-affix fld-affix--prefix";
  const payPrefix = document.createElement("span");
  payPrefix.className = "fld-affix__prefix";
  payPrefix.textContent = "$";
  payWrapper.append(payPrefix, payInput);
  driverField.append(dSel, dStatusSel);
  row.appendChild(driverField);
  row.appendChild(payWrapper);
  return row;
}

function _buildOneBusRow(i) {
  const busSel = makeSelect(`bus${i}`);
  const d1Sel = makeSelect(`bus${i}_driver1`);
  const d1StatusSel = makeDriverStatusSelect(`bus${i}_driver1Status`);
  const d1Pay = _makePayInput(`bus${i}_driver1Pay`);
  const d2Sel = makeSelect(`bus${i}_driver2`);
  const d2StatusSel = makeDriverStatusSelect(`bus${i}_driver2Status`);
  const d2Pay = _makePayInput(`bus${i}_driver2Pay`);
  const d3Sel = makeSelect(`bus${i}_driver3`);
  const d3StatusSel = makeDriverStatusSelect(`bus${i}_driver3Status`);
  const d3Pay = _makePayInput(`bus${i}_driver3Pay`);
  const d4Sel = makeSelect(`bus${i}_driver4`);
  const d4StatusSel = makeDriverStatusSelect(`bus${i}_driver4Status`);
  const d4Pay = _makePayInput(`bus${i}_driver4Pay`);

  const busCell = document.createElement("div");
  busCell.className = "bus-assign__bus-cell";
  busCell.appendChild(busSel);

  const d1Row = _makeDriverRow(d1Sel, d1StatusSel, d1Pay);
  const d2Row = _makeDriverRow(d2Sel, d2StatusSel, d2Pay);
  const d3Row = _makeDriverRow(d3Sel, d3StatusSel, d3Pay);
  const d4Row = _makeDriverRow(d4Sel, d4StatusSel, d4Pay);

  const driverStack = document.createElement("div");
  driverStack.className = "bus-assign__driver-stack";
  driverStack.append(d1Row, d2Row, d3Row, d4Row);

  const rowGroup = document.createElement("div");
  rowGroup.className = "bus-assign__row-group";
  rowGroup.append(busCell, driverStack);

  return {
    rowGroup,
    busCell,
    busSel,
    d1Sel,
    d1StatusSel,
    d1Pay,
    d1Row,
    d2Sel,
    d2StatusSel,
    d2Pay,
    d2Row,
    d3Sel,
    d3StatusSel,
    d3Pay,
    d3Row,
    d4Sel,
    d4StatusSel,
    d4Pay,
    d4Row,
  };
}

function _wrapBusAssignmentSelects(row) {
  if (typeof wrapSelectInGlassDropdown !== "function") return;

  wrapSelectInGlassDropdown(row.busSel, {
    rebuildMenuOnOpen: true,
    cellClass: "bus-assign__cell",
    searchable: false,
    useBusesNeededTray: true,
  });

  [row.d1Sel, row.d2Sel, row.d3Sel, row.d4Sel].forEach((sel) => {
    wrapSelectInGlassDropdown(sel, {
      rebuildMenuOnOpen: true,
      cellClass: "bus-assign__cell",
      searchable: true,
      useBusesNeededTray: true,
    });
  });
}

function _syncWrappedBusAssignmentSelects(row) {
  [row.busSel, row.d1Sel, row.d2Sel, row.d3Sel, row.d4Sel].forEach((sel) => {
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function buildBusRowsOnce() {
  dom.busGrid.innerHTML = "";
  state.busRows.length = 0;
  dom.busGrid.classList.add("bus-assign");
  syncBusSelectEmptyState();
  refreshEmptyStateUI();
}

function rebuildBusRows(targetN) {
  const n = Math.min(10, Math.max(0, targetN));
  const currentN = state.busRows.length;
  const addedRows = [];

  if (n > currentN) {
    for (let i = currentN + 1; i <= n; i++) {
      const row = _buildOneBusRow(i);
      dom.busGrid.appendChild(row.rowGroup);
      _wrapBusAssignmentSelects(row);
      state.busRows.push(row);
      addedRows.push(row);
    }
    refreshBusSelectOptions();
    addedRows.forEach(_syncWrappedBusAssignmentSelects);
  } else if (n < currentN) {
    for (let i = currentN - 1; i >= n; i--) {
      state.busRows[i].rowGroup.remove();
    }
    state.busRows.length = n;
  }

  updateBusRowVisibility();
  syncBusSelectEmptyState();
  syncBusPanelState();
  refreshEmptyStateUI();
}

// ======================================================
// 26) TRIP MODE + CLEAR
// ======================================================
function setTripIdBadge(text, show = true) {
  if (!dom.tripIdBadge) return;
  dom.tripIdBadge.textContent = text;
  dom.tripIdBadge.classList.toggle("is-hidden", !show);
}

function setModeNew() {
  dom.action.value = "create";
  dom.tripKey.value = "";
  dom.tripId.value = "";
  setTripIdBadge("", false);
  dom.deleteBtn.disabled = true;
}

function setModeEdit(tripKey, tripId) {
  dom.action.value = "update";
  dom.tripKey.value = tripKey;
  dom.tripId.value = tripId || "";
  setTripIdBadge(shortTripId(tripId), true);
  dom.deleteBtn.disabled = false;
}

function clearTripInfoCardForNextTrip() {
  dom.tripInfoCard?.classList.add("is-loading");
  setTimeout(() => dom.tripInfoCard?.classList.remove("is-loading"), 500);

  const conflictBanner = document.getElementById("tripConflictBanner");
  if (conflictBanner) conflictBanner.classList.add("is-hidden");

  dom.tripForm.reset();
  state.busRows.forEach((r) => {
    r.busSel.value = "None";
    r.d1Sel.value = "None";
    r.d1StatusSel.value = "";
    if (r.d1Pay) r.d1Pay.value = "";
    r.d2Sel.value = "None";
    r.d2StatusSel.value = "";
    if (r.d2Pay) r.d2Pay.value = "";
    r.d3Sel.value = "None";
    r.d3StatusSel.value = "";
    if (r.d3Pay) r.d3Pay.value = "";
    r.d4Sel.value = "None";
    r.d4StatusSel.value = "";
    if (r.d4Pay) r.d4Pay.value = "";
    // Fire change events so custom dropdown triggers update their display labels
    r.busSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d1Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d1StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d2Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d2StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d3Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d3StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d4Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d4StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  resetRequirementToggles();
  refreshEmptyStateUI();
  syncOnDutyHoursPlaceholder();
  setModeNew();

  setSelectToPlaceholder("busesNeeded");
  syncTripColorSwatches("Round-Trip");
  setSelectToPlaceholder("itineraryStatus");
  setSelectToPlaceholder("contactStatus");
  syncStatusToggle("paymentStatus", "");
  setSelectToPlaceholder("driverStatus");
  syncStatusToggle("invoiceStatus", "");

  dom.busesNeeded.value = "";
  syncBusSegButtons();
  rebuildBusRows(0);

  ["paymentStatus", "driverStatus", "invoiceStatus"].forEach((id) => updateStatusSelect($(id)));
  updateInvoiceNumberVisibility();

  // Form has been cleared intentionally; mark as not dirty.
  state.tripFormDirty = false;
  refreshShortcutRow();
  if (typeof resetTripEditorTabs === "function") resetTripEditorTabs();
}

function setTripFormFromState(tripKey) {
  const t = state.tripByKey?.[tripKey];
  const assigns = state.assignmentsByTripKey?.[tripKey] || [];
  if (!t) return false;

  $("destination").value = t.destination || "";
  $("customer").value = t.customer || "";
  $("contactName").value = t.contactName || "";
  $("phone").value = t.phone || "";

  $("tripDate").value = String(t.departureDate || "").slice(0, 10);
  $("arrivalDate").value = String(t.arrivalDate || "").slice(0, 10);
  $("departureTime").value = normalizeTime(t.departureTime) || "";
  $("spotTime").value = normalizeTime(t.spotTime) || "";
  $("arrivalTime").value = normalizeTime(t.arrivalTime) || "";

  $("itineraryStatus").value = t.itineraryStatus || "";
  $("contactStatus").value = t.contactStatus || "";
  syncStatusToggle("paymentStatus", t.paymentStatus || "");
  $("driverStatus").value = t.driverStatus || "";
  syncStatusToggle("invoiceStatus", t.invoiceStatus || "");
  $("invoiceNumber").value = t.invoiceNumber || "";
  syncTripColorSwatches(t.tripColor || "");
  setRequirementTogglesFromTrip(t);

  // Envelope-specific fields (when editing in the main Trip Editor)
  if ($("envelopePickup")) $("envelopePickup").value = t.envelopePickup || "";
  if ($("envelopeTripContact")) $("envelopeTripContact").value = t.envelopeTripContact || "";
  if ($("envelopeTripPhone")) $("envelopeTripPhone").value = t.envelopeTripPhone || "";

  if ($("envelopeTripNotes")) $("envelopeTripNotes").value = t.envelopeTripNotes || "";

  ["paymentStatus", "driverStatus", "invoiceStatus", "tripColor"].forEach((id) => {
    const el = $(id);
    if (el) el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  if (typeof updateInvoiceNumberVisibility === "function") updateInvoiceNumberVisibility();

  dom.itineraryField.value = t.itinerary || "";
  $("notes").value = t.notes || "";
  $("comments").value = t.comments || "";

  setBusesNeededAndSync(t.busesNeeded ? String(t.busesNeeded) : "");
  dom.busesNeeded?.dispatchEvent(new Event("change", { bubbles: true }));
  setModeEdit(String(t.tripKey || tripKey), String(t.tripId || ""));

  const fallbackDriverStatus = t.driverStatus || "Pending";
  state.busRows.forEach((r) => {
    r.busSel.value = "None";
    r.d1Sel.value = "None";
    r.d1StatusSel.value = "";
    if (r.d1Pay) r.d1Pay.value = "";
    r.d2Sel.value = "None";
    r.d2StatusSel.value = "";
    if (r.d2Pay) r.d2Pay.value = "";
    r.d3Sel.value = "None";
    r.d3StatusSel.value = "";
    if (r.d3Pay) r.d3Pay.value = "";
    r.d4Sel.value = "None";
    r.d4StatusSel.value = "";
    if (r.d4Pay) r.d4Pay.value = "";
  });
  assigns.forEach((a, i) => {
    const row = state.busRows[i];
    if (!row) return;
    if (a.busId) row.busSel.value = String(a.busId);
    if (a.driver1) row.d1Sel.value = String(a.driver1);
    if (a.driver2) row.d2Sel.value = String(a.driver2);
    if (a.driver3) row.d3Sel.value = String(a.driver3);
    if (a.driver4) row.d4Sel.value = String(a.driver4);
    row.d1StatusSel.value = String(a.driver1Status || "").trim() || fallbackDriverStatus;
    row.d2StatusSel.value = String(a.driver2Status || "").trim() || fallbackDriverStatus;
    row.d3StatusSel.value = String(a.driver3Status || "").trim() || fallbackDriverStatus;
    row.d4StatusSel.value = String(a.driver4Status || "").trim() || fallbackDriverStatus;
  });
  updateBusRowVisibility();
  state.busRows.forEach((r) => {
    r.busSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d1Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d1StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d2Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d2StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d3Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d3StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d4Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d4StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  syncBusPanelState();
  if (typeof syncBusSelectEmptyState === "function") syncBusSelectEmptyState();
  if (typeof refreshEmptyStateUI === "function") refreshEmptyStateUI();
  syncOnDutyHoursPlaceholder();
  if (typeof syncEmptyFields === "function") syncEmptyFields();

  dom.action.value = "update";
  dom.tripKey.value = tripKey;
  return true;
}

// Removed saveEnvelopeEdits

// ======================================================
// 29) TRIP OPEN (DESKTOP EDIT)
// ======================================================
let tripLoadInFlight = false;

function populateFormFromData(t, assigns) {
  $("destination").value = t.destination || "";
  $("customer").value = t.customer || "";
  $("contactName").value = t.contactName || "";
  $("phone").value = t.phone || "";

  $("tripDate").value = String(t.departureDate || "").slice(0, 10);
  $("arrivalDate").value = String(t.arrivalDate || "").slice(0, 10);
  $("departureTime").value = normalizeTime(t.departureTime) || "";
  $("spotTime").value = normalizeTime(t.spotTime) || "";
  $("arrivalTime").value = normalizeTime(t.arrivalTime) || "";

  $("itineraryStatus").value = t.itineraryStatus || "";
  $("contactStatus").value = t.contactStatus || "";
  syncStatusToggle("paymentStatus", t.paymentStatus || "");
  $("driverStatus").value = t.driverStatus || "";
  syncStatusToggle("invoiceStatus", t.invoiceStatus || "");
  $("invoiceNumber").value = t.invoiceNumber || "";
  syncTripColorSwatches(t.tripColor || "");
  setRequirementTogglesFromTrip(t);

  ["paymentStatus", "driverStatus", "invoiceStatus"].forEach((id) => {
    const el = $(id);
    if (el) el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  updateInvoiceNumberVisibility();

  if ($("itinerary")) dom.itineraryField.value = t.itinerary || "";
  if ($("itineraryPdfUrl")) $("itineraryPdfUrl").value = t.itineraryPdfUrl || "";
  if ($("paymentType")) $("paymentType").value = t.paymentType || "";
  if ($("estimatedMileage")) $("estimatedMileage").value = t.estimatedMileage || "";
  if ($("drivingHours")) $("drivingHours").value = t.drivingHours || "";
  if ($("onDutyHours")) $("onDutyHours").value = t.onDutyHours || "";
  if ($("quotedPrice")) $("quotedPrice").value = String(t.quotedPrice || "");
  if ($("tripMiles")) $("tripMiles").value = t.tripMiles || "";
  if ($("datePaid")) $("datePaid").value = String(t.datePaid || "").slice(0, 10);
  if ($("ref1")) $("ref1").value = t.ref1 || "";
  if ($("ref2")) $("ref2").value = t.ref2 || "";
  if ($("ref3")) $("ref3").value = t.ref3 || "";
  if ($("notes")) $("notes").value = t.notes || "";
  if ($("comments")) $("comments").value = t.comments || "";
  if ($("envelopePickup")) $("envelopePickup").value = t.envelopePickup || "";
  if ($("envelopeTripContact")) $("envelopeTripContact").value = t.envelopeTripContact || "";
  if ($("envelopeTripPhone")) $("envelopeTripPhone").value = t.envelopeTripPhone || "";
  if ($("envelopeTripNotes")) $("envelopeTripNotes").value = t.envelopeTripNotes || "";

  const effectiveBusCount =
    t.busesNeeded && Number(t.busesNeeded) > 0
      ? String(t.busesNeeded)
      : assigns?.length > 0
        ? String(assigns.length)
        : "";
  setBusesNeededAndSync(effectiveBusCount);
  dom.busesNeeded?.dispatchEvent(new Event("change", { bubbles: true }));
  setModeEdit(String(t.tripKey), String(t.tripId || ""));

  const fallbackDriverStatus = t.driverStatus || "Pending";
  state.busRows.forEach((r) => {
    r.busSel.value = "None";
    r.d1Sel.value = "None";
    r.d1StatusSel.value = "";
    if (r.d1Pay) r.d1Pay.value = "";
    r.d2Sel.value = "None";
    r.d2StatusSel.value = "";
    if (r.d2Pay) r.d2Pay.value = "";
    r.d3Sel.value = "None";
    r.d3StatusSel.value = "";
    if (r.d3Pay) r.d3Pay.value = "";
    r.d4Sel.value = "None";
    r.d4StatusSel.value = "";
    if (r.d4Pay) r.d4Pay.value = "";
  });

  refreshBusSelectOptions();
  (assigns || []).forEach((a, idx) => {
    let n = Number(a.busNumber);
    if (!n || n < 1 || n > 10) n = idx + 1;
    if (n < 1 || n > 10) return;
    const row = state.busRows[n - 1];
    if (!row) return;
    if (a.busId) row.busSel.value = String(a.busId).trim();
    if (a.driver1) row.d1Sel.value = String(a.driver1).trim();
    if (a.driver2) row.d2Sel.value = String(a.driver2).trim();
    if (a.driver3) row.d3Sel.value = String(a.driver3).trim();
    if (a.driver4) row.d4Sel.value = String(a.driver4).trim();
    row.d1StatusSel.value = String(a.driver1Status || "").trim() || fallbackDriverStatus;
    row.d2StatusSel.value = String(a.driver2Status || "").trim() || fallbackDriverStatus;
    row.d3StatusSel.value = String(a.driver3Status || "").trim() || "Pending";
    row.d4StatusSel.value = String(a.driver4Status || "").trim() || "Pending";
    if (a.driver1Pay && row.d1Pay) row.d1Pay.value = String(a.driver1Pay).trim().replace(/^\$/, "");
    if (a.driver2Pay && row.d2Pay) row.d2Pay.value = String(a.driver2Pay).trim().replace(/^\$/, "");
    if (a.driver3Pay && row.d3Pay) row.d3Pay.value = String(a.driver3Pay).trim().replace(/^\$/, "");
    if (a.driver4Pay && row.d4Pay) row.d4Pay.value = String(a.driver4Pay).trim().replace(/^\$/, "");
  });

  updateBusRowVisibility();
  state.busRows.forEach((r) => {
    r.busSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d1Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d1StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d2Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d2StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d3Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d3StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d4Sel.dispatchEvent(new Event("change", { bubbles: true }));
    r.d4StatusSel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  syncBusPanelState();
  syncBusSelectEmptyState();
  refreshEmptyStateUI();
  syncOnDutyHoursPlaceholder();
  if (typeof syncEmptyFields === "function") syncEmptyFields();
  refreshShortcutRow();
}

function refreshShortcutRow() {
  const key = dom.tripKey?.value;
  const pdfUrl = key ? state.tripByKey?.[key]?.itineraryPdfUrl || "" : "";
  const pdfBtn = dom.shortcutPdfBtn;
  if (!pdfBtn) return;
  const glyph = pdfBtn.querySelector(".material-symbols-outlined");
  const label = pdfBtn.querySelector(".shortcut-pdf-label");
  if (pdfUrl) {
    if (glyph) glyph.textContent = "picture_as_pdf";
    if (label) label.textContent = "View PDF";
  } else {
    if (glyph) glyph.textContent = "upload_file";
    if (label) label.textContent = "Upload PDF";
  }
}

async function openTripForEdit(tripKey) {
  dom.tripInfoCard?.classList.add("is-loading");
  setTimeout(() => dom.tripInfoCard?.classList.remove("is-loading"), 500);
  if (tripLoadInFlight) {
    toast("Trip is already loading…", "info", 1200);
    return;
  }
  tripLoadInFlight = true;
  if (isMobileOnly()) {
    tripLoadInFlight = false;
    return openTripDetailsModal(tripKey);
  }

  showHeaderStatusNotice("Loading trip…", "loading", {
    sticky: true,
    source: "trip-load",
    priority: 55,
    force: true,
  });
  startProgressCreep({
    from: 5,
    to: 80,
    label: "Loading trip… ",
    toastOpts: { source: "trip-load", priority: 55, force: true },
  });

  // Disable/enable all form inputs during load — defined outside try so finally can call it
  const setFormDisabled = (disabled) => {
    if (!dom.tripForm) return;
    dom.tripForm.querySelectorAll("input, select, textarea").forEach((el) => {
      el.disabled = disabled;
    });
    [
      "oneWay",
      "req56Pass",
      "reqSleeper",
      "reqLift",
      "reqRelief",
      "reqRelief2",
      "reqCoDriver",
      "reqHotel",
      "reqFuelCard",
    ].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = disabled;
    });
  };

  try {
    const conflictBanner = document.getElementById("tripConflictBanner");
    if (conflictBanner) conflictBanner.classList.add("is-hidden");

    // If the trip panel is already open, keep old data visible but lock all inputs.
    // If the panel is closed, it will open after the fetch with fresh data.
    const panelAlreadyOpen = getCardPanel("trip") !== null;

    // Helper to populate the form fully
    // populateFormFromData is now a module-level function above openTripForEdit

    if (panelAlreadyOpen) {
      // Panel is visible — lock inputs so old data stays readable but not editable
      setFormDisabled(true);
    } else {
      // Panel is closed — blank the form while we fetch
      if (dom.tripForm) dom.tripForm.reset();
      refreshShortcutRow();
      state.busRows.forEach((r) => {
        r.busSel.value = "None";
        r.d1Sel.value = "None";
        r.d1StatusSel.value = "";
        if (r.d1Pay) r.d1Pay.value = "";
        r.d2Sel.value = "None";
        r.d2StatusSel.value = "";
        if (r.d2Pay) r.d2Pay.value = "";
        r.d3Sel.value = "None";
        r.d3StatusSel.value = "";
        if (r.d3Pay) r.d3Pay.value = "";
        r.d4Sel.value = "None";
        r.d4StatusSel.value = "";
        if (r.d4Pay) r.d4Pay.value = "";
      });
      $("tripIdBadge").textContent = "";
      $("tripIdBadge").classList.add("is-hidden");
      updateBusRowVisibility();
    }
    dom.saveBtn.disabled = true;
    if (dom.deleteBtn) dom.deleteBtn.disabled = true;

    const startTime = Date.now();

    // Use state assignments first — already loaded from weekData (reliable).
    // Only hit the API if state has nothing for this trip (rare: trip outside current week cache).
    const localAssigns = state.assignmentsByTripKey[String(tripKey)] || [];

    const fetchPromises = [api.getTrip(tripKey)];
    if (!localAssigns.length) fetchPromises.push(api.getBusAssignments(tripKey));

    const [tripResp, assignResp] = await Promise.all(fetchPromises);

    // Minor loading flash prevention
    const elapsed = Date.now() - startTime;
    if (elapsed < 200) {
      await new Promise((resolve) => setTimeout(resolve, 200 - elapsed));
    }

    stopProgressCreep();

    // Fall back to optimistic local state if Supabase hasn't committed the new trip yet
    const serverTrip = tripResp?.trip || state.tripByKey?.[String(tripKey)] || null;
    if (!serverTrip) throw new Error("Trip not found");
    const rawAssigns = localAssigns.length
      ? localAssigns
      : assignResp?.ok && assignResp.assignments?.length
        ? assignResp.assignments
        : [];

    // Fill empty driver/status fields from weekData local state — guards against
    // getBusAssignments returning a partial record (transient GAS error, partial write)
    // and against the race where driver options aren't loaded yet when values are set.
    const mergedAssigns = rawAssigns.map((a) => {
      const normalizedA = normalizeAssignment(a);
      // Find local assignment by busNumber first, then by busId as fallback
      let local = localAssigns.find(
        (l) => Number(l.busNumber) === normalizedA.busNumber && normalizedA.busNumber > 0,
      );
      if (!local && normalizedA.busId) {
        local = localAssigns.find((l) => l.busId === normalizedA.busId);
      }
      const merged = {
        ...normalizedA,
        driver1: normalizedA.driver1 || local?.driver1 || "",
        driver2: normalizedA.driver2 || local?.driver2 || "",
        driver3: normalizedA.driver3 || local?.driver3 || "",
        driver4: normalizedA.driver4 || local?.driver4 || "",
        driver1Status: normalizedA.driver1Status || local?.driver1Status || "",
        driver2Status: normalizedA.driver2Status || local?.driver2Status || "",
        driver3Status: normalizedA.driver3Status || local?.driver3Status || "",
        driver4Status: normalizedA.driver4Status || local?.driver4Status || "",
      };
      // Log if local fallback filled missing data
      if (
        local &&
        (!normalizedA.driver1 ||
          !normalizedA.driver2 ||
          !normalizedA.driver3 ||
          !normalizedA.driver4)
      ) {
        console.warn(
          `Trip ${tripKey}: Merged assignment for bus ${normalizedA.busId || normalizedA.busNumber} using local fallback data.`,
        );
      }
      return merged;
    });

    // Ensure driver/bus select options are populated before setting values —
    // weekData can resolve from cache before loadDriversAndBuses completes.
    if (!state.driversList.length || !state.busesList.length) {
      await loadDriversAndBuses(false);
    }

    populateFormFromData(serverTrip, mergedAssigns);
    setFormDisabled(false);
    setSidePanelMode("trip");
    if (typeof resetTripEditorTabs === "function") resetTripEditorTabs();
    state.tripFormDirty = false;

    showHeaderStatusNotice("Trip ready", "success", {
      duration: 1200,
      source: "trip-load",
      priority: 55,
    });
  } catch (e) {
    stopProgressCreep();
    showHeaderStatusNotice("Could not load trip", "danger", {
      duration: 2200,
      source: "trip-load",
      priority: 60,
    });
    console.error(e);
    alert("Could not open trip for editing.");
  } finally {
    stopProgressCreep();
    tripLoadInFlight = false;
    // Safety net: if neither success nor error notice replaced the loading bar, clear it now.
    if (
      state.activeStatusNotice?.source === "trip-load" &&
      state.activeStatusNotice?.entry?.mode === "loading"
    ) {
      toastHide(0, { source: "trip-load" });
    }
    setFormDisabled(false);
    dom.saveBtn.disabled = false;
    if (dom.deleteBtn) dom.deleteBtn.disabled = dom.action.value === "create";
    state.tripFormDirty = false;
  }
}
