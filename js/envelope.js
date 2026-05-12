// ======================================================
// TRIP ENVELOPE MODAL (from schedule trip data)
// ======================================================

const ENVELOPE_BRAND_ADDR =
  "2801 Zinnia Ave. McAllen TX 78504\n(956) 994-1169 / Fax 994-9491 / Cell 648-9691";

function envFormatDate(ymdStr) {
  if (!ymdStr) return "";
  const d = parseYMD(ymdStr);
  if (!d) return String(ymdStr).slice(0, 10);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function envFormatWeekday(ymdStr) {
  if (!ymdStr) return "";
  const d = parseYMD(ymdStr);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
}

function envFormatTime(val) {
  if (val == null || val === "") return "";
  const s = String(val).trim();
  // Already 12-hour (e.g. "7:30 PM") — normalize to "7:30 PM"
  const match12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    const h = parseInt(match12[1], 10);
    const m = match12[2];
    const ampm = (match12[3] || "").toUpperCase();
    return `${h}:${m} ${ampm}`;
  }
  // Parse 24-hour or time-only and format as 12-hour (e.g. 7:30 PM)
  const iso = s.length <= 5 ? s + ":00" : s.replace(" ", "");
  const d = new Date("1970-01-01T" + iso);
  if (isNaN(d.getTime())) return s;
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function createEnvelopePageElement() {
  const page = document.createElement("div");
  page.className = "envelope-page env-yellow";

  const brandAddr = ENVELOPE_BRAND_ADDR.replace(/\n/g, "<br>");
  page.innerHTML = `
    <div class="env-panel">
      <div class="env-header">
        <div class="env-day" data-field="day"></div>
        <div class="env-brand">
          <img src="assets/logo.png" alt="Logo" onerror="this.style.display='none'">
          <div class="env-addr">${brandAddr}</div>
        </div>
      </div>
      <div class="env-section-title">TRIP INFORMATION</div>
      <div class="env-trip-contact">
        <div class="env-trip">
          <div class="env-trip-row env-cols-3">
            <div class="env-cell"><span class="env-label">BUS:</span><span class="env-value" data-field="busno"></span></div>
            <div class="env-cell"><span class="env-label" data-field="driverlabel">DRIVER:</span><span class="env-value" data-field="driver"></span></div>
            <div class="env-cell"><span class="env-label" data-field="codriverlabel">CO-DRIVER:</span><span class="env-value" data-field="codriver"></span></div>
          </div>
          <div class="env-trip-row env-cols-2">
            <div class="env-cell">
              <div style="display:flex;justify-content:space-between;align-items:baseline;width:100%;">
                <span class="env-label">TRIP DATE:</span>
                <span class="env-label" data-field="returnlabel" style="text-align:right;">RETURN:</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;gap:0.08in;">
                <span class="env-value" data-field="tripdate" style="width:120px;"></span>
                <span style="flex:1 1 auto;"></span>
                <span class="env-value" data-field="returndate" style="width:120px;text-align:right;"></span>
              </div>
            </div>
            <div class="env-cell"><span class="env-label">SPOT TIME:</span><span class="env-value" data-field="spottime"></span></div>
          </div>
          <div class="env-trip-row env-cols-1">
            <div class="env-cell"><span class="env-label">PICK UP ADDRESS:</span><span class="env-value" data-field="pickup"></span></div>
          </div>
          <div class="env-trip-row env-cols-1">
            <div class="env-cell"><span class="env-label">DESTINATION:</span><span class="env-value" data-field="destination"></span></div>
          </div>
        </div>
        <div class="env-grid-row">
          <div class="env-cell"><span class="env-label">CONTACT:</span><span class="env-value" data-field="contact"></span></div>
          <div class="env-cell"><span class="env-label">PHONE:</span><span class="env-value" data-field="phone"></span></div>
        </div>
      </div>
      <div class="env-odometer-box">
        <div class="env-grid-row">
          <div class="env-cell"><span class="env-label">STARTING ODOMETER:</span><span class="env-value" data-field="startodo"></span></div>
          <div class="env-cell"><span class="env-label">ENDING ODOMETER:</span><span class="env-value" data-field="endodo"></span></div>
        </div>
      </div>
      <div class="env-mini env-mini-standard">
        <table>
          <tr><td>ELD VERIFIED</td><td class="env-choice-cell"><span class="env-choice">DRV</span><span class="env-choice">OFC</span></td><td>HOTEL</td><td><div class="money"><span class="dollar">$</span><span class="amount-space"></span></div></td></tr>
          <tr><td>ELD BACKUP USED</td><td class="env-choice-cell"><span class="env-choice">YES</span><span class="env-choice">NO</span></td><td>DIESEL/BLUE DEF</td><td><div class="money"><span class="dollar">$</span><span class="amount-space"></span></div></td></tr>
          <tr><td>CC FOR TRIP</td><td class="env-choice-cell"><span class="env-choice" data-field="ccYes">YES</span><span class="env-choice" data-field="ccNo">NO</span></td><td>REPAIRS</td><td><div class="money"><span class="dollar">$</span><span class="amount-space"></span></div></td></tr>
          <tr><td colspan="2" class="env-mini-td-left">CC RECEIVED BY</td><td>MISCELLANEOUS</td><td><div class="money"><span class="dollar">$</span><span class="amount-space"></span></div></td></tr>
          <tr><td colspan="2" class="env-mini-td-left">TOTAL TRIP MILES</td><td>TOTAL</td><td><div class="money"><span class="dollar">$</span><span class="amount-space"></span></div></td></tr>
        </table>
      </div>
      <div class="env-footer">
        <span class="env-label">NOTES:</span>
        <div class="env-notes-lines">
          <span class="env-value env-notes-line" data-field="notes1"></span>
          <span class="env-value env-notes-line" data-field="notes2"></span>
          <span class="env-value env-notes-line" data-field="notes3"></span>
          <span class="env-value env-notes-line" data-field="notes4"></span>
        </div>
      </div>
    </div>
  `;
  return page;
}

function createAlternateEnvelopePageElement() {
  const page = document.createElement("div");
  page.className = "envelope-page env-yellow";

  const brandAddr = ENVELOPE_BRAND_ADDR.replace(/\n/g, "<br>");
  page.innerHTML = `
    <div class="env-panel">
      <div class="env-header">
        <div class="env-day" data-field="day"></div>
        <div class="env-brand">
          <img src="assets/logo.png" alt="Logo" onerror="this.style.display='none'">
          <div class="env-addr">${brandAddr}</div>
        </div>
      </div>
      <div class="env-section-title">TRIP INFORMATION</div>
      <div class="env-trip-contact">
        <div class="env-trip">
          <div class="env-trip-row env-cols-3">
            <div class="env-cell"><span class="env-label">BUS:</span><span class="env-value" data-field="busno"></span></div>
            <div class="env-cell"><span class="env-label" data-field="driverlabel">DRIVER:</span><span class="env-value" data-field="driver"></span></div>
            <div class="env-cell"><span class="env-label" data-field="codriverlabel">CO-DRIVER:</span><span class="env-value" data-field="codriver"></span></div>
          </div>
          <div class="env-trip-row env-cols-2">
            <div class="env-cell">
              <span class="env-label">TRIP DATE:</span>
              <span class="env-value" data-field="tripdate"></span>
            </div>
            <div class="env-cell">
              <span class="env-label">SPOT TIME:</span>
              <span class="env-value" data-field="spottime"></span>
            </div>
          </div>
        </div>
        
        <div class="env-grid-row" style="grid-template-columns: 1fr;">
          <div class="env-cell">
            <span class="env-label">PICK UP ADDRESS:</span>
            <span class="env-value">(MVM) 220 S K CENTER ST, MCALLEN, TX 78501</span>
          </div>
        </div>
        
        <div class="env-grid-row">
          <div class="env-cell">
            <span class="env-label">CONTACT PERSON:</span>
            <span class="env-value">ESCAMILLA</span>
          </div>
          <div class="env-cell">
            <span class="env-label">PHONE:</span>
            <span class="env-value">(956) 648-9691</span>
          </div>
        </div>
        
      </div>
      
      <table class="env-alt-table">
        <thead>
          <tr>
            <th style="width: 45%;">LOCATION</th>
            <th style="width: 15%;">TIME IN</th>
            <th style="width: 15%;">TIME OUT</th>
            <th style="width: 25%;">ODOMETER</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="font-size: 0.12in; text-transform:uppercase;"></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td></tr>
        </tbody>
      </table>
      
      <div class="env-mini">
        <table>
          <tr><td>ELD VERIFIED</td><td class="env-choice-cell"><span class="env-choice">DRV</span><span class="env-choice">OFC</span></td><td>HOTEL</td><td><div class="money"><span class="dollar">$</span><span class="amount-space"></span></div></td></tr>
          <tr><td>ELD BACKUP USED</td><td class="env-choice-cell"><span class="env-choice">YES</span><span class="env-choice">NO</span></td><td>DIESEL/BLUE DEF</td><td><div class="money"><span class="dollar">$</span><span class="amount-space"></span></div></td></tr>
          <tr><td>CC FOR TRIP</td><td class="env-choice-cell"><span class="env-choice" data-field="ccYes">YES</span><span class="env-choice" data-field="ccNo">NO</span></td><td>REPAIRS</td><td><div class="money"><span class="dollar">$</span><span class="amount-space"></span></div></td></tr>
          <tr><td colspan="2" class="env-mini-td-left">CC RECEIVED BY</td><td>MISCELLANEOUS</td><td><div class="money"><span class="dollar">$</span><span class="amount-space"></span></div></td></tr>
          <tr><td colspan="2" class="env-mini-td-left">TOTAL TRIP MILES</td><td>TOTAL</td><td><div class="money"><span class="dollar">$</span><span class="amount-space"></span></div></td></tr>
        </table>
      </div>
    </div>
  `;
  return page;
}

function fillEnvelopePage(pageEl, trip, assignment) {
  if (!pageEl || !trip) return;
  const busId = assignment ? assignment.busId || trip.busId || "" : trip.busId || "";
  const driver1 = assignment ? assignment.driver1 || "" : "";
  const rawDriver2 = assignment ? assignment.driver2 || "" : "";
  // Treat common \"no co-driver\" markers as empty
  const driver2 =
    rawDriver2 && rawDriver2.toString().trim().toLowerCase() !== "none" && rawDriver2 !== "—"
      ? rawDriver2
      : "";

  const fullName = (shortName) => {
    if (!shortName) return shortName;
    const d = (state.driversList || []).find(
      (d) => String(d.driverName).trim().toLowerCase() === String(shortName).trim().toLowerCase(),
    );
    return (d && d.driverNameFull) ? d.driverNameFull : shortName;
  };

  const set = (field, text) => {
    const el = pageEl.querySelector(`[data-field="${field}"]`);
    if (!el) return;
    let val = String(text ?? "").trim();
    // Uppercase envelope display fields (driver names, trip text, dates, notes)
    const upperFields = new Set([
      "day",
      "busno",
      "driver",
      "codriver",
      "tripdate",
      "returndate",
      "arrivaltime",
      "pickup",
      "destination",
      "contact",
      "notes1",
      "notes2",
      "notes3",
    ]);
    if (upperFields.has(field)) {
      val = val.toUpperCase();
    }
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.value = val;
      el.setAttribute("value", val);
      if (el.tagName === "TEXTAREA")
        el.innerHTML = String(val)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
    } else {
      el.textContent = val;
    }
  };

  const setHTML = (field, html) => {
    const el = pageEl.querySelector(`[data-field="${field}"]`);
    if (el) el.innerHTML = html;
  };

  const busIndex  = assignment.busIndex  ?? 0;
  const totalBuses = assignment.totalBuses ?? (parseInt(trip.busesNeeded, 10) || 1);

  const tripDateStr = envFormatDate(trip.departureDate);
  const returnDateStr = envFormatDate(trip.arrivalDate);
  const showReturn = !!returnDateStr && (!tripDateStr || returnDateStr !== tripDateStr); // blank if same as trip date

  set("day", envFormatWeekday(trip.departureDate));
  set("busno", busId);
  set("driver", fullName(driver1));
  // If there is no real co-driver, field stays blank
  set("codriver", fullName(driver2));
  set("driverlabel", assignment?.isConsolidatedCo ? "CO-DRIVER:" : assignment?.isRelief ? "RELIEF DRIVER:" : "DRIVER:");
  const coDriverLabel = assignment?.isConsolidatedCo ? "DRIVER(S):" : assignment?.driver2IsRelief ? "RELIEF:" : assignment?.isRelief ? "DRIVER:" : "CO-DRIVER:";
  set("codriverlabel", coDriverLabel);
  set("tripdate", tripDateStr);
  set("returndate", showReturn ? returnDateStr : "");
  set("returnlabel", showReturn ? "RETURN" : "");
  set("spottime", envFormatTime(trip.spotTime || trip.departureTime));
  set("pickup", trip.envelopePickup || "");
  set("destination", trip.destination || "");
  set("contact", trip.envelopeTripContact || "");
  set("phone", trip.envelopeTripPhone || "");
  set("startodo", "");
  set("endodo", "");
  const REQ_ITEMS = [
    { key: "req56Pass",  icon: "tatami_seat",      label: "56 Pass" },
    { key: "reqSleeper", icon: "airline_seat_flat", label: "Sleeper" },
    { key: "reqLift",    icon: "accessible",        label: "Lift"    },
    { key: "reqHotel",   icon: "apartment",         label: "Hotel"   },
    { key: "reqWifi",    icon: "wifi",              label: "Wifi"    },
  ];

  const notesLines = [];

  const comments = (trip.comments || "").trim().toUpperCase();
  if (comments) notesLines.push({ text: comments });

  const activeReqs = REQ_ITEMS.filter((r) => trip[r.key]);
  if (activeReqs.length) {
    const html = activeReqs
      .map((r) => `<span class="env-req-item"><span class="material-symbols-outlined env-req-icon">${r.icon}</span><span class="env-req-label">${r.label}</span></span>`)
      .join("");
    notesLines.push({ html });
  }

  if (trip.reqFuelCard) {
    notesLines.push({ html: `<span class="env-req-item"><span class="material-symbols-outlined env-req-icon">credit_card</span><span class="env-req-label">Fuel Card  _______________</span></span>` });
  }

  if (totalBuses > 1) {
    notesLines.push({ text: `Bus ${busIndex + 1} of ${totalBuses}` });
  }

  ["notes1", "notes2", "notes3", "notes4"].forEach((slot, i) => {
    const line = notesLines[i];
    if (line?.html) setHTML(slot, line.html);
    else set(slot, line?.text ?? "");
  });

  // CC FOR TRIP checkbox — pre-check YES if fuel card required
  const ccYesEl = pageEl.querySelector('[data-field="ccYes"]');
  const ccNoEl  = pageEl.querySelector('[data-field="ccNo"]');
  if (ccYesEl && ccNoEl) {
    ccYesEl.classList.toggle("is-checked", !!trip.reqFuelCard);
    ccNoEl.classList.toggle("is-checked", !trip.reqFuelCard);
  }
}

let stateEnvelope = {
  tripKey: null,
  trip: null,
  assignments: [],
  bg: "yellow",
  format: "standard",
};

function openEnvelopeModal(tripKey) {
  let trip = state.tripByKey?.[tripKey];
  if (!trip) {
    toast("Trip not found.", "danger", 2000);
    return;
  }

  // If the envelope is opened for the trip currently being edited,
  // merge the unsaved form values so the envelope preview is accurate.
  if (dom.action?.value === "update" && dom.tripKey?.value === tripKey) {
    trip = {
      ...trip,
      destination: $("destination")?.value || trip.destination,
      departureDate: $("tripDate")?.value || trip.departureDate,
      spotTime: $("spotTime")?.value || trip.spotTime,
      departureTime: $("departureTime")?.value || trip.departureTime,
      arrivalDate: $("arrivalDate")?.value || trip.arrivalDate,
      contactName: $("contactName")?.value || trip.contactName,
      phone: $("phone")?.value || trip.phone,
      envelopePickup: $("envelopePickup") ? $("envelopePickup").value : trip.envelopePickup || "",
      envelopeTripContact: $("envelopeTripContact")
        ? $("envelopeTripContact").value
        : trip.envelopeTripContact || "",
      envelopeTripPhone: $("envelopeTripPhone")
        ? $("envelopeTripPhone").value
        : trip.envelopeTripPhone || "",
      envelopeTripNotes: trip.envelopeTripNotes || "",
    };
  }

  state.lastFocusedElement = document.activeElement;
  stateEnvelope.tripKey = tripKey;
  stateEnvelope.trip = trip;
  stateEnvelope.bg = "yellow";
  if (!stateEnvelope.format) stateEnvelope.format = "standard";

  if (dom.envelopeFormatSelect) {
    dom.envelopeFormatSelect.value = stateEnvelope.format;
  }

  const pagesContainer = dom.envelopeModalPages;
  if (!pagesContainer) return;
  pagesContainer.innerHTML = "";

  // Build envelope assignments. For trips with a co-driver, we create
  // two variants so each driver gets a version where they are BUS DRIVER.
  const rawAssignments = state.assignmentsByTripKey?.[tripKey] || [];
  const assignments = [];

  if (rawAssignments.length) {
    const totalBuses = rawAssignments.length;

    // Find any driver2 who appears on every bus — they get one consolidated envelope
    const coDriverCount = {};
    rawAssignments.forEach((a) => {
      const d2 = (a.driver2 || "").toString().trim();
      if (d2 && d2.toLowerCase() !== "none" && d2 !== "—") {
        coDriverCount[d2] = (coDriverCount[d2] || 0) + 1;
      }
    });
    const universalCodrivers = new Set(
      Object.entries(coDriverCount)
        .filter(([, cnt]) => cnt === rawAssignments.length && rawAssignments.length > 1)
        .map(([name]) => name)
    );

    rawAssignments.forEach((a, busIndex) => {
      const busId = a.busId || trip.busId || "";
      const d1 = (a.driver1 || "").toString().trim();

      const d2Raw = (a.driver2 || "").toString().trim();
      const hasD2 = d2Raw && d2Raw.toLowerCase() !== "none" && d2Raw !== "—";
      const d2 = hasD2 ? d2Raw : "";

      const d3Raw = (a.driver3 || "").toString().trim();
      const hasD3 = d3Raw && d3Raw.toLowerCase() !== "none" && d3Raw !== "—";

      const d4Raw = (a.driver4 || "").toString().trim();
      const hasD4 = d4Raw && d4Raw.toLowerCase() !== "none" && d4Raw !== "—";

      const pos = { busIndex, totalBuses };

      // Variant 1: driver1 primary; if no co-driver, show relief 1 in that spot
      const d1CoDriver = d2 || (hasD3 ? d3Raw : "");
      const d1CoIsRelief = !hasD2 && hasD3;
      assignments.push({ busId, driver1: d1, driver2: d1CoDriver, driver2IsRelief: d1CoIsRelief, ...pos });

      // Variant 2: swapped (co-driver primary), only if real co-driver exists
      // Skip per-bus variant for universal co-drivers — they get one consolidated envelope below
      if (hasD2 && !universalCodrivers.has(d2)) {
        assignments.push({ busId, driver1: d2, driver2: d1, ...pos });
      }

      // Relief driver variants — co-driver field: relief 1 gets primary driver;
      // relief 2 gets relief 1 as co (if present), otherwise primary driver.
      if (hasD3) assignments.push({ busId, driver1: d3Raw, driver2: d1, isRelief: true, ...pos });
      if (hasD4) assignments.push({ busId, driver1: d4Raw, driver2: d1, isRelief: true, ...pos });
    });

    // Add one consolidated envelope per universal co-driver listing all buses
    universalCodrivers.forEach((coDriverName) => {
      const allBusIds = rawAssignments.map((a) => a.busId || "").filter(Boolean).join(" · ");
      const primaryDrivers = rawAssignments
        .map((a) => (a.driver1 || "").toString().trim())
        .filter(Boolean)
        .join(" / ");
      assignments.push({
        busId: allBusIds,
        driver1: coDriverName,
        driver2: primaryDrivers,
        isConsolidatedCo: true,
        busIndex: 0,
        totalBuses,
      });
    });
  } else {
    assignments.push({ busId: trip.busId || "", driver1: "", driver2: "", busIndex: 0, totalBuses: 1 });
  }

  // Store the envelope assignments so print/save logic uses the same variants
  stateEnvelope.assignments = assignments;

  const select = dom.envelopeAssignmentSelect;
  if (select) {
    select.innerHTML = "";
    assignments.forEach((a, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      const bus = a.busId || "—";
      const d1 = a.driver1 || "—";
      const d2 = a.driver2 ? ` / ${a.driver2}` : "";
      opt.textContent = a.isConsolidatedCo
        ? `All Buses — ${d1} (Co-Driver)`
        : a.isRelief
          ? `Bus ${bus} — ${d1} (Relief)`
          : `Bus ${bus} — ${d1}${d2}`;
      select.appendChild(opt);
    });
    select.selectedIndex = 0;
    // Notify glass wrapper so trigger text & menu stay in sync
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const isAlternate = stateEnvelope.format === "alternate";
  assignments.forEach((assignment, idx) => {
    const pageEl = isAlternate ? createAlternateEnvelopePageElement() : createEnvelopePageElement();
    pageEl.classList.add(stateEnvelope.bg === "white" ? "env-white" : "env-yellow");
    fillEnvelopePage(pageEl, trip, assignment);
    if (assignments.length > 1) pageEl.style.display = idx === 0 ? "block" : "none";
    pageEl.dataset.index = String(idx);
    pagesContainer.appendChild(pageEl);
  });

  if (dom.envelopeYellowBtn)
    dom.envelopeYellowBtn.classList.toggle("active", stateEnvelope.bg === "yellow");
  if (dom.envelopeWhiteBtn)
    dom.envelopeWhiteBtn.classList.toggle("active", stateEnvelope.bg === "white");

  dom.envelopeModal.hidden = false;
}

function updateEnvelopeModalSelection(index) {
  const pages = dom.envelopeModalPages?.querySelectorAll(".envelope-page");
  if (!pages || !pages.length) return;
  pages.forEach((p, i) => {
    p.style.display = String(i) === String(index) ? "block" : "none";
  });
}

function printEnvelopePages() {
  const trip = stateEnvelope.trip;
  const assignments = stateEnvelope.assignments.length
    ? stateEnvelope.assignments
    : [{ busId: trip?.busId || "", driver1: "", driver2: "" }];
  if (!trip || !assignments.length) return;

  const tripForPrint = trip;

  // Always print the white style, regardless of screen toggle
  const isAlternate = stateEnvelope.format === "alternate";
  const bgClass = "env-white";
  const pagesHtml = assignments
    .map((assignment) => {
      const page = isAlternate ? createAlternateEnvelopePageElement() : createEnvelopePageElement();
      page.classList.add(bgClass);
      fillEnvelopePage(page, tripForPrint, assignment);
      return page.outerHTML;
    })
    .join("");

  const cssLink =
    document.querySelector('link[href*="main.css"]')?.getAttribute("href") || "css/main.css";
  const cssHref = new URL(cssLink, window.location.href).href;
  const printDoc = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Trip envelope</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${cssHref}">
<style>
  /* Base page setup for envelopes */
  @page {
    size: 6in 9in;
    margin: 0;
  }

  body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* Hide modal chrome from the main app; only show the envelope page(s) */
  .modal--envelope .modal__card--envelope,
  .envelope-modal__toolbar,
  .rux-header--modal,
  .modal__foot,
  .modal__backdrop {
    display: none !important;
  }

  .envelope-modal__body {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 0;
  }

  .envelope-page {
    box-shadow: none !important;
    margin: 0 auto;
    page-break-after: always;
    break-after: page;
  }

  .envelope-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  @media print {
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }

    .envelope-modal__body {
      justify-content: center !important;
      align-items: flex-start !important;
    }

    .envelope-page {
      page-break-after: always;
    }

    .envelope-page:last-child {
      page-break-after: auto;
    }
  }
</style>
</head><body class="modal--envelope"><div class="envelope-modal__body">${pagesHtml}</div></body></html>`;

  const win = window.open("", "_blank");
  if (!win) {
    toast("Popup blocked. Allow popups to print envelopes.", "danger", 3000);
    return;
  }
  win.document.write(printDoc);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
    win.onafterprint = () => win.close();
  };
}

function closeEnvelopeModal() {
  dom.envelopeModal.hidden = true;
  stateEnvelope.tripKey = null;
  stateEnvelope.trip = null;
  stateEnvelope.assignments = [];
  if (state.lastFocusedElement) {
    state.lastFocusedElement.focus();
    state.lastFocusedElement = null;
  }
}

/** Removed editable envelope functions */

/** Set main trip form from state (for saving envelope edits via existing submit flow) */
