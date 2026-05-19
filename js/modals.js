// ======================================================
// 27) ITINERARY MODAL
// ======================================================
function openItineraryModal() {
  dom.itineraryModalField.value = dom.itineraryField.value || "";
  openModalA11y(dom.itineraryModal, dom.itineraryModalField);
}

function closeItineraryModal() {
  dom.itineraryField.value = dom.itineraryModalField.value || "";
  dom.itineraryField.dispatchEvent(new Event("input", { bubbles: true }));
  closeModalA11y(dom.itineraryModal);
}

// ======================================================
// 28) MOBILE TRIP DETAILS MODAL
// ======================================================
// ======================================================
function renderTripDetailsModalFromData(t, assigns) {
  let html = "";

  function detailGridItem(label, val, itemClass) {
    const display = val ? escHtml(val) : "—";
    const wrapClass = itemClass
      ? `trip-details__grid-item ${itemClass}`
      : "trip-details__grid-item";
    return `<div class="${wrapClass}"><span class="trip-details__label">${label}:</span> <span class="trip-details__value">${display}</span></div>`;
  }

  function getDetailStatusClass(fieldId, val) {
    const v = String(val || "")
      .trim()
      .toLowerCase();
    if (!v) return "";
    if (fieldId === "driverStatus") {
      if (v === "pending") return "status-pending";
      if (v === "assigned") return "status-assigned";
      return "status-ok";
    }
    if (fieldId === "paymentStatus") {
      if (v === "pending quote") return "status-pending";
      if (v === "quoted") return "status-assigned";
      return "status-ok";
    }
    if (fieldId === "invoiceStatus") {
      if (v === "pending invoice") return "status-pending";
      if (v === "invoiced") return "status-assigned";
      if (v === "deposit received") return "status-blue";
      if (v === "paid in full") return "status-ok";
      return "";
    }
    if (v === "pending") return "status-pending";
    return "status-ok";
  }

  function rowStatus(label, val, fieldId, extraClass) {
    const display = val ? escHtml(val) : "—";
    const cls = val ? getDetailStatusClass(fieldId, val) : "";
    const wrapClass = extraClass
      ? `trip-details__grid-item ${extraClass}`
      : "trip-details__grid-item";
    const valueSpan = cls
      ? `<span class="trip-details__value ${cls}">${display}</span>`
      : `<span class="trip-details__value">${display}</span>`;
    return `<div class="${wrapClass}"><span class="trip-details__label">${label}:</span> ${valueSpan}</div>`;
  }

  function section(title) {
    return `<div class="trip-details__section-title trip-details__label">${title}</div>`;
  }

  html += `<div class="trip-details__meta-grid detail-status-grid">`;
  html += rowStatus(
    "Itinerary Status",
    t.itineraryStatus,
    "itineraryStatus",
    "trip-details__hide-mobile",
  );
  html += rowStatus(
    "Contact Status",
    t.contactStatus,
    "contactStatus",
    "trip-details__hide-mobile",
  );
  html += rowStatus(
    "Approval Status",
    t.paymentStatus,
    "paymentStatus",
    "trip-details__hide-mobile",
  );
  html += rowStatus("Driver Status", t.driverStatus, "driverStatus", "trip-details__hide-mobile");
  html += rowStatus(
    "Invoice Status",
    t.invoiceStatus,
    "invoiceStatus",
    "trip-details__hide-mobile",
  );
  html += detailGridItem("Invoice Number", t.invoiceNumber, "trip-details__hide-mobile");
  html += detailGridItem("Contact", t.contactName);
  html += detailGridItem("Phone", t.phone);
  html += `</div>`;

  html += `<div class="detail-divider"></div>`;

  if (t.itinerary) {
    html += `<div class="trip-details__itinerary-scroll pre-wrap">${escHtml(t.itinerary)}</div>`;
  }

  dom.tripDetailsBody.innerHTML = html;
  const firstBtn = dom.tripDetailsModal.querySelector("button");
  openModalA11y(dom.tripDetailsModal, firstBtn);
}

async function openTripDetailsModal(tripKey) {
  try {
    toastShow("Loading details… 0%", "loading");
    toastProgress(0);

    const k = String(tripKey || "").trim();
    if (!k) throw new Error("Missing tripKey");

    toastProgress(15, "Checking cache… 15%");

    const cachedTrip = state.tripByKey?.[k] || null;
    const cachedAssigns = state.assignmentsByTripKey?.[k] || [];

    const hasCore =
      cachedTrip &&
      (cachedTrip.destination ||
        cachedTrip.customer ||
        cachedTrip.departureDate ||
        cachedTrip.arrivalDate);

    let t = cachedTrip || {};
    let assigns = Array.isArray(cachedAssigns) ? cachedAssigns : [];

    if (hasCore) {
      toastProgress(55, "Rendering… 55%");
      renderTripDetailsModalFromData(t, assigns);
      toastProgress(100, "Loaded ✓");
      toastHide(800);
      return;
    }

    const startTime = Date.now();
    toastProgress(30, "Fetching trip… 30%");

    const [tripResp, assignResp] = await Promise.all([api.getTrip(k), api.getBusAssignments(k)]);

    // Force minimum delay for UX consistency
    const elapsed = Date.now() - startTime;
    if (elapsed < 600) {
      toastProgress(50, "Processing…");
      await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
    }

    if (!tripResp?.ok) throw new Error(tripResp?.error || "Trip not found");

    t = tripResp.trip || {};
    assigns = assignResp?.ok && Array.isArray(assignResp.assignments) ? assignResp.assignments : [];

    toastProgress(70, "Rendering… 70%");
    renderTripDetailsModalFromData(t, assigns);

    toastProgress(100, "Loaded ✓");
    toastHide(800);
  } catch (e) {
    console.error(e);
    toast("Could not load details", "danger", 2200);
  }
}

function closeTripDetailsModal() {
  closeModalA11y(dom.tripDetailsModal);
}

// ======================================================
// DRIVER CONTACT MODAL
// ======================================================

function openDriverWeekScheduleModal(driverName) {
  const weekDates = getWeekDates();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];
  const startDate = parseYMD(weekStart);
  const endDate = parseYMD(weekEnd);
  const driverFullName = getDriverFullName(driverName) || driverName;
  const titleEl = $("driverWeekScheduleTitle");
  if (titleEl) {
    titleEl.textContent = `${driverFullName} Schedule`;
  }

  const fmtLong = (d) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const fmtDayLabel = (ymdStr) => {
    const d = parseYMD(ymdStr);
    if (!d) return "";
    return `${d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} ${d.getMonth() + 1}/${d.getDate()}`;
  };

  const statusClass = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("confirm")) return "drv-card__status--confirmed";
    if (s.includes("assign"))  return "drv-card__status--assigned";
    return "drv-card__status--pending";
  };

  const tripsInWeek = (state.trips || []).filter((t) => {
    const dep = t.departureDate || "";
    const arr = t.arrivalDate || dep;
    return !(arr < weekStart || dep > weekEnd);
  });

  const driverTrips = tripsInWeek
    .filter((trip) => {
      const assigns = state.assignmentsByTripKey[String(trip.tripKey)] || [];
      return assigns.some((a) =>
        [a.driver1, a.driver2, a.driver3, a.driver4].some(
          (d) => d && d.trim().toLowerCase() === driverName.trim().toLowerCase()
        )
      );
    })
    .sort((a, b) => {
      if (a.departureDate !== b.departureDate)
        return a.departureDate.localeCompare(b.departureDate);
      return (a.departureTime || "").localeCompare(b.departureTime || "");
    });

  const fmtShortDate = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();

  const fmtFullDayLine = (depYmd, arrYmd) => {
    const d = parseYMD(depYmd);
    if (!d) return "";
    const depWeekday = d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const depStr = `${depWeekday} - ${fmtShortDate(d)}`;
    if (arrYmd && arrYmd !== depYmd) {
      const a = parseYMD(arrYmd);
      if (a) {
        const arrWeekday = a.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
        return `${depStr} → ${arrWeekday} - ${fmtShortDate(a)}`;
      }
    }
    return depStr;
  };

  const fmtDayHeader = (ymdStr) => {
    const d = parseYMD(ymdStr);
    if (!d) return "🔹 TBD";
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const month   = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
    return `🔹 ${weekday}, ${month} ${d.getDate()}`;
  };

  let msg = `UPCOMING TRIPS:\n`;

  if (driverTrips.length === 0) {
    msg += "\nNo trips assigned this week.";
  } else {
    for (let i = 0; i < driverTrips.length; i++) {
      const trip = driverTrips[i];
      const assigns = state.assignmentsByTripKey[String(trip.tripKey)] || [];
      const myAssign = assigns.find((a) =>
        [a.driver1, a.driver2, a.driver3, a.driver4].some(
          (d) => d && d.trim().toLowerCase() === driverName.trim().toLowerCase()
        )
      );

      const busNum  = myAssign?.busNumber || "TBD";
      const client  = `${trip.customer || "TBD"} (${trip.destination || "TBD"})`;
      const spot    = envFormatTime(trip.spotTime || "") || "TBD";
      const contact = `${trip.contactName || "TBD"} - ${trip.phone || "TBD"}`;

      if (i > 0) msg += `\n• • •\n`;
      msg += `\n${fmtDayHeader(trip.departureDate)}\n`;
      msg += `Bus: ${busNum}\n`;
      msg += `Client: ${client}\n`;
      msg += `Spot: ${spot}\n`;
      msg += `Contact: ${contact}\n`;
      msg += `Itinerary: ${trip.itineraryPdfUrl || "TBD"}\n`;
    }
  }

  msg += `\n✅ Please reply "CONFIRMED" to acknowledge receipt of your assignments.`;

  dom.driverWeekSchedulePreview.textContent = msg;
  openModalA11y(dom.driverWeekScheduleModal, null);
}

function openDriverContactModal(tripKey) {
  const trip = state.tripByKey[tripKey];
  if (!trip) return;

  // Retrieve assignments for the trip
  const rowA = state.assignmentsByTripKey[tripKey];

  const isAssigned = (name) => {
    const n = String(name || "").trim();
    return n && n.toLowerCase() !== "none";
  };

  const driverContactBlock = (name, busId, role = "") => {
    const driver = findDriverByName(name);
    const fullName = getDriverFullName(driver || name) || name;
    const phone = getDriverPhone(driver || name) || "None";
    const notes = getDriverNotes(driver || name);
    const nameLine = role ? `Name:  ${fullName} (${role})` : `Name:  ${fullName}`;

    return [
      nameLine,
      `Phone: ${phone}`,
      `Bus:   ${busId}`,
      notes ? `Notes: ${notes}` : "",
    ].filter(Boolean).join("\n");
  };

  // --- 1. Generate OFFICE/CUSTOMER Message ---
  const dDate = trip.departureDate ? parseYMD(trip.departureDate) : null;
  const dDateStr = dDate
    ? dDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : "the upcoming date";
  const destName = trip.destination || "your destination";

  let officeText = `Hello,\n\nBelow is the driver contact information for your trip on ${dDateStr} going to ${destName}:\n\n`;
  const officeBlocks = [];

  if (rowA && rowA.length > 0) {
    rowA.forEach((assignment) => {
      const busId =
        assignment.busId && assignment.busId !== "—" ? assignment.busId : trip.busId || "None";
      const d1Name = assignment.driver1 && assignment.driver1 !== "—" ? assignment.driver1 : "";
      const d2Name = assignment.driver2 && assignment.driver2 !== "—" ? assignment.driver2 : "";

      if (isAssigned(d1Name)) {
        officeBlocks.push(driverContactBlock(d1Name, busId));
      }
      if (isAssigned(d2Name)) {
        officeBlocks.push(driverContactBlock(d2Name, busId));
      }

      const d3Name = assignment.driver3 && assignment.driver3 !== "—" ? assignment.driver3 : "";
      const d4Name = assignment.driver4 && assignment.driver4 !== "—" ? assignment.driver4 : "";

      if (isAssigned(d3Name)) {
        officeBlocks.push(driverContactBlock(d3Name, busId, "Relief"));
      }
      if (isAssigned(d4Name)) {
        officeBlocks.push(driverContactBlock(d4Name, busId, "Relief"));
      }
    });
  }

  if (officeBlocks.length === 0) {
    officeText += `No drivers assigned yet.\n\n`;
  } else {
    officeText += officeBlocks.join("\n\n") + "\n\n";
  }
  officeText += `Thank you!`;

  // --- 2. Generate DRIVER REMINDER Message ---
  let reminderText = "";
  if (dDate) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isTomorrow =
      dDate.getFullYear() === tomorrow.getFullYear() &&
      dDate.getMonth() === tomorrow.getMonth() &&
      dDate.getDate() === tomorrow.getDate();

    const dateLabel = isTomorrow
      ? "Tomorrow"
      : dDate.toLocaleDateString("en-US", { weekday: "long" });
    const fullDate = dDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const spotTime = envFormatTime(trip.spotTime || trip.departureTime || "");

    reminderText = `Reminder for your trip ${dateLabel}, ${fullDate} at ${spotTime}\n\n`;

    if (officeBlocks.length > 0) {
      reminderText += officeBlocks.join("\n\n");
    } else {
      reminderText += "No drivers assigned yet.";
    }
  } else {
    reminderText = "No trip date set.";
  }

  reminderText += `\n\nPlease remember to:\n\nFinal Inspection: Perform a walkthrough to ensure no belongings are left behind.\n\nBus Tidiness: Kindly ask passengers to take all trash with them upon arrival.\n\nService Excellence: Prioritize professional and courteous customer service.`;

  if (trip.itineraryPdfUrl) {
    reminderText += `\n\nItinerary: ${trip.itineraryPdfUrl}`;
  }

  // --- 3. Generate TRIP INFORMATION Message (SMS-friendly) ---
  let tripInfoText = "";
  if (dDate) {
    const aDate = trip.arrivalDate ? parseYMD(trip.arrivalDate) : null;
    const fmtShortDate = (d) => {
      const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const md  = `${d.getMonth() + 1}/${d.getDate()}`;
      return `${day} ${md}`;
    };
    const fmtLongDate = (d) => {
      const day = d.toLocaleDateString("en-US", { weekday: "long" });
      return `${day}, ${d.getMonth() + 1}/${d.getDate()}`;
    };
    const assignmentDate = (aDate && aDate > dDate)
      ? `${fmtLongDate(dDate)} – ${fmtLongDate(aDate)}`
      : fmtLongDate(dDate);
    const firstAsn = rowA && rowA.length > 0 ? rowA[0] : null;
    const busNum   = (firstAsn?.busId && firstAsn.busId !== "—") ? firstAsn.busId : (trip.busId || "");
    const yardTime = envFormatTime(trip.departureTime || "");
    const spotTime2 = envFormatTime(trip.spotTime || "");
    // First driver's first name for greeting
    const firstDriverName = (() => {
      const asns = rowA || [];
      for (const a of asns) {
        for (const key of ["driver1", "driver2", "driver3", "driver4"]) {
          const n = String(a[key] || "").trim();
          if (n && n.toLowerCase() !== "none") return (getDriverFullName(n) || n).split(" ")[0];
        }
      }
      return "[Name]";
    })();

    tripInfoText += `Hello ${firstDriverName}, here is your trip assignment for ${assignmentDate}:\n\n`;
    if (busNum)              tripInfoText += `BUS: ${busNum}\n`;
    if (yardTime)            tripInfoText += `YARD: ${yardTime}\n`;
    if (spotTime2)           tripInfoText += `SPOT: ${spotTime2}\n`;
    if (trip.envelopePickup) tripInfoText += `FROM: ${trip.envelopePickup}\n`;
    if (trip.destination)    tripInfoText += `DEST: ${trip.destination}\n`;
    if (trip.itineraryPdfUrl) tripInfoText += `LINK: ${trip.itineraryPdfUrl}`;
  } else {
    tripInfoText = "No trip date set.";
  }

  // Set values and show modal
  dom.driverContactBody.value = officeText;
  dom.driverReminderBody.value = reminderText;
  dom.tripInfoBody.value = tripInfoText;
  openModalA11y(dom.driverContactModal, dom.driverContactBody);
}
