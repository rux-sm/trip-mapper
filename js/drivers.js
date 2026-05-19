// ======================================================
// 21) DRIVER WEEK CARD (LEFT PANEL)
// ======================================================
function renderDriverWeekHeader() {
  if (!dom.driverWeekHeadRow) return;

  dom.driverWeekHeadRow.innerHTML = "";

  const thName = document.createElement("th");
  thName.textContent = "Driver";
  dom.driverWeekHeadRow.appendChild(thName);

  const weekDates = getWeekDates(); // Returns 7 days in correct order
  // In a Monday-start world, index 5 is Saturday.
  // In a Sunday-start world, index 6 is Saturday.
  const dayLabels = state.weekStartsOnMonday
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  weekDates.forEach((dStr, i) => {
    const th = document.createElement("th");
    th.textContent = dayLabels[i];
    th.dataset.date = dStr;

    // Highlight today in driver week header too
    if (dStr === ymd(new Date())) {
      th.classList.add("driver-week__header-cell--today");
    }

    dom.driverWeekHeadRow.appendChild(th);
  });

}
function renderDriverWeekGrid() {
  if (!dom.driverWeekHeadRow || !dom.driverWeekBody) return;

  renderDriverWeekHeader();

  const weekDates = getWeekDates(); // Full 7 days

  const weekIndex = new Map(weekDates.map((d, i) => [d, i]));
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6]; // 7 days, so last index is 6

  const onDaysByDriver = new Map();     // primary (driver1/driver2)
  const reliefDaysByDriver = new Map(); // relief  (driver3/driver4)

  const visibleTrips = state.trips
    .map((t) => {
      const dep = parseYMD(t.departureDate);
      const arr = parseYMD(t.arrivalDate) || dep;
      return { ...t, _dep: dep, _arr: arr };
    })
    .filter((t) => t._dep && t._arr)
    .filter((t) => !(ymd(t._arr) < weekStart || ymd(t._dep) > weekEnd));

  for (const t of visibleTrips) {
    const depY = ymd(t._dep);
    const arrY = ymd(t._arr);

    const start = depY < weekStart ? weekStart : depY;
    const end = arrY > weekEnd ? weekEnd : arrY;

    const assigns = state.assignmentsByTripKey[String(t.tripKey)] || [];
    if (!assigns.length) continue;

    const startD = parseYMD(start);
    const endD = parseYMD(end);
    if (!startD || !endD) continue;

    for (let d = new Date(startD); d <= endD; d = addDays(d, 1)) {
      const k = ymd(d);
      const idx = weekIndex.get(k);
      if (idx == null) continue;

      for (const a of assigns) {
        const d1 = String(a.driver1 || "").trim();
        const d2 = String(a.driver2 || "").trim();
        const drivers = [d1, d2].filter((x) => x && x !== "None");

        for (const name of drivers) {
          if (!onDaysByDriver.has(name)) onDaysByDriver.set(name, new Set());
          onDaysByDriver.get(name).add(idx);
        }

        const d3 = String(a.driver3 || "").trim();
        const d4 = String(a.driver4 || "").trim();
        const relief = [d3, d4].filter((x) => x && x !== "None");

        for (const name of relief) {
          if (!reliefDaysByDriver.has(name)) reliefDaysByDriver.set(name, new Set());
          reliefDaysByDriver.get(name).add(idx);
        }
      }
    }
  }

  const seenDriverNames = new Set();
  const driverNames = [];
  const addDriverName = (name) => {
    if (name && !seenDriverNames.has(name.toLowerCase())) {
      seenDriverNames.add(name.toLowerCase());
      driverNames.push(name);
    }
  };

  (state.driversList || [])
    .map((d) => String(d.driverName || "").trim())
    .filter(Boolean)
    .forEach(addDriverName);

  for (const name of onDaysByDriver.keys()) addDriverName(name);
  for (const name of reliefDaysByDriver.keys()) addDriverName(name);

  dom.driverWeekBody.innerHTML = driverNames
    .map((name) => {
      const set = onDaysByDriver.get(name) || new Set();
      const displayName = getDriverFullName(name) || name;

      const cells = weekDates
        .map((dStr, idx) => {
          const on = set.has(idx);
          const relief = !on && (reliefDaysByDriver.get(name)?.has(idx) ?? false);
          const unavailable = state.unavailabilityByDriver[name]?.[dStr];
          let cls = "driver-week__cell--off";
          if (on) cls = "driver-week__cell--on";
          else if (relief) cls = "driver-week__cell--relief";
          else if (unavailable) cls = "driver-week__cell--unavailable";

          const icon = relief
            ? `<span class="material-symbols-outlined driver-week__relief-icon">emergency_home</span>`
            : "";
          return `<td class="${cls}" data-driver="${escHtml(name)}" data-date="${dStr}">${icon}</td>`;
        })
        .join("");

      return `
<tr>
<td class="driver-week__name-cell" data-driver-name="${escHtml(name)}"><span class="material-symbols-outlined driver-week__schedule-icon" data-action="showDriverWeekSchedule" data-driver-name="${escHtml(name)}" title="Week schedule for ${escHtml(displayName)}">assignment</span>${escHtml(displayName)}</td>
${cells}
</tr>
`;
    })
    .join("");
}

function updateDriverWeekIfVisible() {
  if (!dom.driverWeekCard) return;

  const driverCardVisible = getCardPanel("drivers") !== null;

  if (driverCardVisible) renderDriverWeekGrid();
}

const TRIP_CHECKLIST = [
  {
    key: "envelope",
    label: "Envelope Printed",
    show: () => true,
  },
  {
    key: "envelopeInfo",
    type: "warning",
    label: "Envelope info incomplete",
    show: (t) => !t.envelopePickup || !t.envelopeTripContact || !t.envelopeTripPhone,
  },
  {
    key: "reminder",
    tripProp: "tripReminderSent",
    label: "Trip Reminder Sent",
    show: () => true,
  },
  {
    key: "driverInfo",
    tripProp: "driverInfoSent",
    label: "Driver Info Sent",
    show: (t) => t.contactStatus !== "Not Required",
  },
  {
    key: "fuelCard",
    label: "Fuel Card Assigned",
    show: (t) => !!t.reqFuelCard,
  },
  {
    key: "hos",
    label: "Hours of Service form",
    show: (t) => {
      const asns = state.assignmentsByTripKey?.[t.tripKey] || [];
      const names = asns.flatMap((a) =>
        [a.driver1, a.driver2, a.driver3, a.driver4].filter((d) => d && d.toLowerCase() !== "none")
      );
      return names.some((name) => {
        const d = (state.driversList || []).find(
          (d) => String(d.driverName).trim().toLowerCase() === name.trim().toLowerCase()
        );
        return d?.status === "Part-Time";
      });
    },
  },
];

function updateTodoCardIfVisible() {
  if (!getCardPanel("todo")) return;
  renderTodoCard();
}

function buildTripCard(t, todayYMD, getAsns) {
  const dest       = t.destination || "—";
  const customer   = t.customer || "";
  const depart     = formatTime12(t.departureTime) || "--";
  const spot       = t.spotTime ? `· Spot ${formatTime12(t.spotTime)}` : "";
  const asns       = getAsns(t.tripKey);
  const allDrivers = asns.flatMap((a) =>
    [a.driver1, a.driver2, a.driver3, a.driver4].filter((d) => d && d.toLowerCase() !== "none")
  );
  const driverLine = [...new Set(allDrivers)].join(" · ");

  const assignedFleets = asns
    .filter((a) => a.busId && a.busId !== "WAITING_LIST")
    .map((a) => {
      const bus = (state.busesList || []).find((b) => b.busId === a.busId);
      return bus?.busNumber ? `#${bus.busNumber}` : null;
    })
    .filter(Boolean);
  const busDisplay =
    assignedFleets.length > 0
      ? assignedFleets.join(" · ")
      : t.busesNeeded > 0
      ? `${t.busesNeeded} bus${t.busesNeeded !== 1 ? "es" : ""} needed`
      : "";
  const uniqueDriverCount = new Set(allDrivers).size;
  const envelopeDisplay =
    uniqueDriverCount > 0
      ? `${uniqueDriverCount} envelope${uniqueDriverCount !== 1 ? "s" : ""}`
      : "";
  const statsLine = [busDisplay, envelopeDisplay].filter(Boolean).join('<span class="todo-stat__sep"> · </span>');

  const savedKey   = `etb-todo-${t.tripKey}-${todayYMD}`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(savedKey) || "{}"); } catch { }
  const items      = TRIP_CHECKLIST.filter(({ show }) => show(t));
  const checkItems = items.filter(({ type }) => type !== "warning");
  const checks     = items.map(({ key, label, type, tripProp }) => {
    if (type === "warning") {
      return `<li class="todo-item todo-item--warning" data-trip="${t.tripKey}" data-key="${key}">
        <span class="todo-item__label">
          <span class="material-symbols-outlined todo-item__warn-icon">warning</span>
          <span class="todo-item__text">${label}</span>
        </span>
      </li>`;
    }
    const checked = !!saved[key] || (tripProp ? !!t[tripProp] : false);
    return `<li class="todo-item${checked ? " is-done" : ""}" data-trip="${t.tripKey}" data-key="${key}">
      <label class="todo-item__label">
        <input type="checkbox" class="todo-item__check" ${checked ? "checked" : ""}>
        <span class="todo-item__text">${label}</span>
      </label>
    </li>`;
  }).join("");
  let statusClass = "";
  if (checkItems.length > 0) {
    const allDone = checkItems.every(({ key, tripProp }) => !!saved[key] || (tripProp ? !!t[tripProp] : false));
    statusClass = allDone ? " is-complete" : " has-pending";
  }
  return `<div class="todo-trip-card${statusClass}" data-trip="${t.tripKey}">
    <p class="todo-trip-card__dest">${dest}</p>
    ${customer   ? `<p class="todo-trip-card__customer">${customer}</p>`  : ""}
    <p class="todo-trip-card__meta">Depart ${depart} ${spot}</p>
    ${driverLine ? `<p class="todo-trip-card__meta">${driverLine}</p>`    : ""}
    ${statsLine   ? `<p class="todo-trip-card__stats">${statsLine}</p>`  : ""}
    ${items.length ? `<ul class="todo-trip-card__checks">${checks}</ul>` : ""}
  </div>`;
}

async function renderTodoCard() {
  const headerEl = dom.todoHeader;
  const listEl   = dom.todoList;
  if (!headerEl || !listEl) return;

  const today    = new Date();
  const todayYMD = ymd(today);
  const dow      = today.getDay(); // 0=Sun 1=Mon … 5=Fri 6=Sat

  // Weekend — not working
  if (dow === 0 || dow === 6) {
    headerEl.innerHTML = "";
    listEl.innerHTML = `<p class="todo-list__empty todo-list__empty--rest">Sergio doesn't work today.</p>`;
    return;
  }

  // Friday → prep Sat + Sun + Mon; otherwise → just tomorrow
  const daysAhead = dow === 5 ? [1, 2, 3] : [1];
  const prepDates = daysAhead.map((offset) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return d;
  });
  const prepYMDs = prepDates.map(ymd);

  // On Fridays, Monday may fall in next week which isn't loaded yet — fetch it
  let bonusTrips       = [];
  let bonusAssignments = {};
  if (dow === 5) {
    const mondayYMD   = prepYMDs[2];
    const loadedDates = new Set(getWeekDates());
    if (!loadedDates.has(mondayYMD)) {
      try {
        const { start, end, notesKey } = getWeekRange(prepDates[2]);
        // prefetchAdjacentWeeks already fetched this — reads from cache, no network call
        const resp = await fetchWeekDataCached(start, end, notesKey);
        if (resp.ok) {
          bonusTrips = resp.trips.filter((t) => t.departureDate === mondayYMD);
          for (const a of resp.assignments) {
            (bonusAssignments[a.tripKey] ||= []).push(a);
          }
        }
      } catch (_) { /* Monday cards will appear without driver info */ }
    }
  }

  const tripPool = [...(state.trips || []), ...bonusTrips];
  const getAsns  = (tripKey) =>
    state.assignmentsByTripKey?.[tripKey] || bonusAssignments[tripKey] || [];

  const allTrips = tripPool
    .filter((t) => prepYMDs.includes(t.departureDate) && t.tripColor !== "Out of Service")
    .sort((a, b) =>
      a.departureDate !== b.departureDate
        ? a.departureDate.localeCompare(b.departureDate)
        : (a.departureTime || "").localeCompare(b.departureTime || "")
    );

  // Header
  if (dow === 5) {
    headerEl.innerHTML = `
      <p class="todo-header__date">Weekend Prep</p>
      <p class="todo-header__count">${allTrips.length} trip${allTrips.length !== 1 ? "s" : ""} departing</p>`;
  } else {
    const dateLabel = prepDates[0].toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
    headerEl.innerHTML = `
      <p class="todo-header__date">Departing ${dateLabel}</p>
      <p class="todo-header__count">${allTrips.length} trip${allTrips.length !== 1 ? "s" : ""} departing</p>`;
  }

  if (allTrips.length === 0) {
    listEl.innerHTML = `<p class="todo-list__empty">No trips departing.</p>`;
    return;
  }

  // On Fridays group cards under a day label per date
  let html = "";
  if (dow === 5) {
    for (const d of prepDates) {
      const dayTrips = allTrips.filter((t) => t.departureDate === ymd(d));
      if (!dayTrips.length) continue;
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      html += `<p class="todo-day-label">${dayLabel} — ${dayTrips.length} trip${dayTrips.length !== 1 ? "s" : ""}</p>`;
      html += dayTrips.map((t) => buildTripCard(t, todayYMD, getAsns)).join("");
    }
  } else {
    html = allTrips.map((t) => buildTripCard(t, todayYMD, getAsns)).join("");
  }

  listEl.innerHTML = html;

  // Debounce timers keyed by tripKey — prevents duplicate sheet rows from rapid clicks
  const syncTimers = {};

  listEl.querySelectorAll(".todo-item__check").forEach((cb) => {
    cb.addEventListener("change", () => {
      const item     = cb.closest(".todo-item");
      const tripKey  = item.dataset.trip;
      const key      = item.dataset.key;
      const savedKey = `etb-todo-${tripKey}-${todayYMD}`;
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(savedKey) || "{}"); } catch { }
      saved[key] = cb.checked;
      try { localStorage.setItem(savedKey, JSON.stringify(saved)); } catch { }
      item.classList.toggle("is-done", cb.checked);
      // Update card status class live
      const card = cb.closest(".todo-trip-card");
      if (card) {
        const trip = (state.trips || []).find((tr) => tr.tripKey === tripKey);
        if (trip) {
          const cardItems = TRIP_CHECKLIST.filter(({ show, type }) => show(trip) && type !== "warning");
          const allDone = cardItems.length > 0 && cardItems.every(({ key: k, tripProp }) => {
            const tripVal = tripProp && trip ? !!trip[tripProp] : false;
            return !!saved[k] || tripVal;
          });
          card.classList.toggle("is-complete", allDone);
          card.classList.toggle("has-pending", cardItems.length > 0 && !allDone);
        }
      }
      // Record local write timestamp so syncChecklistFromServer can discard stale responses
      state.checklistWriteTs[tripKey] = Date.now();

      // Abort any in-flight request for this trip before starting a new debounce cycle
      if (state.checklistAbortControllers[tripKey]) {
        state.checklistAbortControllers[tripKey].abort();
        delete state.checklistAbortControllers[tripKey];
      }

      // Debounce server persist — waits 600ms after last change for this trip before POSTing
      clearTimeout(syncTimers[tripKey]);
      syncTimers[tripKey] = setTimeout(() => {
        let latest = {};
        try { latest = JSON.parse(localStorage.getItem(savedKey) || "{}"); } catch { }
        const controller = new AbortController();
        state.checklistAbortControllers[tripKey] = controller;
        api.setChecklist(tripKey, todayYMD, latest, controller.signal)
          .then(() => { delete state.checklistAbortControllers[tripKey]; })
          .catch((err) => {
            if (err?.name !== "AbortError") {
              console.warn("[checklist sync]", err);
              toast("Checklist may not have saved — check your connection.", "warning", 3500);
            }
            delete state.checklistAbortControllers[tripKey];
          });
      }, 600);
    });
  });

  // Reconcile with server state in background after rendering from localStorage
  syncChecklistFromServer(todayYMD);
}

async function syncChecklistFromServer(date) {
  // Capture timestamp before the async fetch so we can discard server data that
  // arrived after a local checkbox change made during the round-trip.
  const syncStartTs = Date.now();
  try {
    const resp = await api.getChecklist(date);
    if (!resp?.ok || !resp.rows?.length) return;
    const KEYS = ["envelope", "reminder", "driverInfo", "fuelCard", "hos"];
    for (const row of resp.rows) {
      const tripKey  = String(row.tripKey || "").trim();
      if (!tripKey) continue;
      // If the user clicked a checkbox after this fetch started, local state is newer
      if ((state.checklistWriteTs[tripKey] || 0) > syncStartTs) continue;
      const trip = (state.trips || []).find((tr) => tr.tripKey === tripKey);
      const saved = {};
      for (const k of KEYS) saved[k] = String(row[k] || "").toLowerCase() === "true";
      // Fold in trip-record fields so the two sources stay aligned
      for (const { key: k, tripProp } of TRIP_CHECKLIST) {
        if (tripProp && trip && trip[tripProp]) saved[k] = true;
      }
      try { localStorage.setItem(`etb-todo-${tripKey}-${date}`, JSON.stringify(saved)); } catch { }
      // Patch the live DOM without re-rendering
      const cardEl = dom.todoList?.querySelector(`[data-trip="${tripKey}"]`);
      if (!cardEl) continue;
      for (const k of KEYS) {
        const itemEl = cardEl.querySelector(`.todo-item[data-key="${k}"]`);
        if (!itemEl) continue;
        const itemDef = TRIP_CHECKLIST.find((i) => i.key === k);
        const tripVal = itemDef?.tripProp && trip ? !!trip[itemDef.tripProp] : false;
        const isChecked = saved[k] || tripVal;
        const cb = itemEl.querySelector(".todo-item__check");
        if (cb) cb.checked = isChecked;
        itemEl.classList.toggle("is-done", isChecked);
      }
      // Refresh card status class after server reconcile
      if (trip) {
        const cardItems = TRIP_CHECKLIST.filter(({ show, type }) => show(trip) && type !== "warning");
        const allDone = cardItems.length > 0 && cardItems.every(({ key: k, tripProp }) => {
          const tripVal = tripProp && trip ? !!trip[tripProp] : false;
          return !!saved[k] || tripVal;
        });
        cardEl.classList.toggle("is-complete", allDone);
        cardEl.classList.toggle("has-pending", cardItems.length > 0 && !allDone);
      }
    }
  } catch (err) { console.warn("[checklist getChecklist]", err); }
}
