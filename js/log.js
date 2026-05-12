// ======================================================
// 33) DATA LOADING (DRIVERS/BUSES)
// ======================================================
const LOG_ACTION_LABELS = {
  trip_added:         () => "Trip added",
  trip_deleted:       () => "Trip deleted",
  itinerary_uploaded: () => "Itinerary uploaded",
  field_changed: (field, oldVal, newVal) => {
    const labels = {
      departureDate:   "Departure date",  arrivalDate:      "Arrival date",
      departureTime:   "Departure time",  spotTime:         "Spot time",
      arrivalTime:     "Arrival time",    destination:      "Destination",
      customer:        "Customer",        contactName:      "Contact name",
      phone:           "Phone",           invoiceNumber:    "Invoice #",
      tripColor:       "Trip color",      busesNeeded:      "Bus assignment",
      busId:           "Bus",             itinerary:        "Itinerary notes",
      notes:           "Notes",           comments:         "Comments",
      itineraryStatus: "Itinerary status", contactStatus:   "Contact status",
      paymentStatus:   "Payment status",  driverStatus:     "Driver status",
      invoiceStatus:   "Invoice status",
      envelopePickup:       "Pickup address",
      envelopeTripContact:  "Trip contact",
      envelopeTripPhone:    "Trip contact phone",
      envelopeTripNotes:    "Trip contact notes",
      driver1: "Driver 1", driver2: "Driver 2",
      driver3: "Driver 3", driver4: "Driver 4",
      driver1Status: "Driver 1 status", driver2Status: "Driver 2 status",
      driver3Status: "Driver 3 status", driver4Status: "Driver 4 status",
    };
    const label = labels[field] || field;
    const fmt = (v) => {
      if (!v || v === "None") return "";
      const iso = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
      return iso ? iso[1] : String(v);
    };
    const old = fmt(oldVal);
    const nw  = fmt(newVal);
    if (old === nw || (!old && !nw)) return null;
    if (old && nw) return `${label}: ${old} → ${nw}`;
    if (nw)        return `${label}: ${nw}`;
    return `${label} removed`;
  },
};

let logActiveTripKey = null;

function shortTripId(tripId) {
  return tripId ? tripId.replace(/^TRIP-20/, "") : "—";
}

async function loadActivityLog(tripKey = null) {
  const tk = toastShow("Loading log…", "loading", { source: "log-load" });
  try {
    const params = tripKey ? { tripKey } : {};
    const data = await fetchAPI("listLog", params);
    if (!data.ok) throw new Error(data.error);
    renderLogList(data.log || []);
  } catch (err) {
    console.error("[log fetch]", err);
    toast("Could not load activity log — check your connection.", "danger", 2500);
  } finally {
    toastHide(tk);
  }
}

function setLogFilter(tripKey) {
  logActiveTripKey = tripKey || null;
  const badge = dom.logFilterBadge;
  const clearBtn = dom.logClearFilterBtn;
  if (logActiveTripKey) {
    const trip = state.tripByKey?.[logActiveTripKey];
    const label = shortTripId(trip?.tripId || logActiveTripKey);
    if (badge) { badge.textContent = label; badge.classList.remove("is-hidden"); }
    if (clearBtn) clearBtn.classList.remove("is-hidden");
  } else {
    if (badge) { badge.textContent = ""; badge.classList.add("is-hidden"); }
    if (clearBtn) clearBtn.classList.add("is-hidden");
  }
  if (getCardPanel("log")) {
    loadActivityLog(logActiveTripKey);
  }
}

function renderLogList(entries) {
  if (!dom.logList) return;
  if (logActiveTripKey && entries?.length > 0 && entries[0].tripId && dom.logFilterBadge) {
    dom.logFilterBadge.textContent = shortTripId(entries[0].tripId);
  }
  if (!entries || entries.length === 0) {
    dom.logList.innerHTML = '<p class="log-empty">No activity recorded yet.</p>';
    return;
  }
  const LOG_GROUP_THRESHOLD_MS = 60 * 1000; // group entries within 1 minute

  const groups = [];
  let currentGroup = null;
  let prevTs = 0;

  for (const e of entries) {
    const ts = e.timestamp ? new Date(e.timestamp).getTime() : 0;
    const key = e.tripKey || "";
    if (!currentGroup || key !== currentGroup.key || (prevTs - ts) > LOG_GROUP_THRESHOLD_MS) {
      currentGroup = { key, tripId: e.tripId || e.tripKey || "—", timestamp: e.timestamp, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(e);
    prevTs = ts;
  }

  const rows = groups.map((group) => {
    const ts = group.timestamp ? new Date(group.timestamp) : null;
    const date = ts ? ts.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
    const time = ts ? ts.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: undefined }) : "—";

    // Build driver name map from this group's field changes (driver1 → name)
    const driverNames = {};
    for (const e of group.items) {
      if (e.action === "field_changed" && /^driver[1-4]$/.test(e.field)) {
        const name = e.newValue || e.oldValue;
        if (name && name !== "None") driverNames[e.field] = name;
      }
    }

    const actionLines = group.items
      .map((e) => {
        if (e.action !== "field_changed") {
          const labelFn = LOG_ACTION_LABELS[e.action];
          return labelFn ? labelFn(e.field, e.oldValue, e.newValue) : (e.action || null);
        }

        const fmt = (v) => {
          if (!v || v === "None") return "";
          const s = String(v);
          // Strip ISO timestamp to YYYY-MM-DD only if it looks like a full datetime
          const iso = s.match(/^(\d{4}-\d{2}-\d{2})T/);
          return iso ? iso[1] : s;
        };
        const old = fmt(e.oldValue);
        const nw  = fmt(e.newValue);
        if (old === nw || (!old && !nw)) return null;

        // Suppress busNumber — internal sequencing, not useful
        if (e.field === "busNumber") return null;

        // Driver status: use driver's name as label if known
        const statusMatch = e.field.match(/^(driver[1-4])Status$/);
        if (statusMatch) {
          const name = driverNames[statusMatch[1]];
          const label = name ? `${name} status` : `Driver ${statusMatch[1].slice(-1)} status`;
          if (!nw) return null; // suppress "status removed" — driver unassign covers it
          if (old && nw) return `${label}: ${old} → ${nw}`;
          return `${label}: ${nw}`;
        }

        // Driver name change
        const driverMatch = e.field.match(/^driver([1-4])$/);
        if (driverMatch) {
          const n = driverMatch[1];
          if (!nw) return `Driver ${n} unassigned`;
          if (!old) return `Driver ${n}: ${nw}`;
          return `Driver ${n}: ${old} → ${nw}`;
        }

        // All other fields
        const labels = LOG_ACTION_LABELS.field_changed;
        return labels ? labels(e.field, e.oldValue, e.newValue) : null;
      })
      .filter(Boolean)
      .map(action => `<div class="log-entry__action">${action}</div>`)
      .join("");
    if (!actionLines) return null;
    return `<div class="log-entry">
      <div class="log-entry__meta">
        <span class="log-entry__trip">${shortTripId(group.tripId)}</span>
        <span class="log-entry__time">${date} · ${time}</span>
      </div>
      ${actionLines}
    </div>`;
  });
  dom.logList.innerHTML = `<div class="log-entries">${rows.filter(Boolean).join("")}</div>`;
}

async function loadDriversAndBuses(forceRefresh = false) {
  if (!forceRefresh) {
    const cDrivers = CACHE.get("cache_drivers");
    const cBuses   = CACHE.get("cache_buses");
    if (cDrivers) state.driversList = cDrivers;
    if (cBuses)   state.busesList   = cBuses;
  }

  const [driversResp, busesResp] = await Promise.all([
    forceRefresh || !state.driversList.length
      ? api.listDrivers(true, forceRefresh)
      : Promise.resolve({ ok: true, drivers: state.driversList }),
    forceRefresh || !state.busesList.length
      ? api.listBuses(true, forceRefresh)
      : Promise.resolve({ ok: true, buses: state.busesList }),
  ]);

  const freshDrivers = driversResp?.ok && driversResp.drivers?.length ? driversResp.drivers : null;
  const freshBuses   = busesResp?.ok  && busesResp.buses?.length   ? busesResp.buses   : null;

  // Only replace existing state when the response has valid data — a transient API
  // failure returning an empty list must not wipe good state that other code depends on.
  if (freshDrivers) {
    state.driversList = freshDrivers
      .map((d) => ({
        ...d,
        driverId: String(d.driverId || "").trim(),
        driverName:
          d.driverName && String(d.driverName).trim()
            ? String(d.driverName).trim()
            : String(d.driverId || "").trim(),
      }))
      .filter((d) => d.driverName);
  }

  if (freshBuses) {
    state.busesList = freshBuses
      .map((b) => ({
        ...b,
        busId: String(b.busId || "").trim(),
        busName: b.busName && String(b.busName).trim() ? String(b.busName).trim() : `Bus ${b.busId}`,
      }))
      .filter((b) => b.busId);
  }

  if (state.driversList.length)
    CACHE.set("cache_drivers", state.driversList, CONFIG.CACHE_TTL_DRIVERS);
  if (state.busesList.length)
    CACHE.set("cache_buses", state.busesList, CONFIG.CACHE_TTL_BUSES);

  refreshBusSelectOptions();

  buildAgendaRows();
  setHeaderOrder();
  scheduleAgendaReflow();
}

