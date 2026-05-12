// ======================================================
// 38) WEEKLY MAINTENANCE REPORT
// ======================================================
function generateNextDayReport(selectedDate = null) {
  let startD = selectedDate ? new Date(selectedDate) : new Date(state.currentDate || new Date());

  if (!selectedDate) {
    if (state.weekStartsMonday) {
      if (startD.getDay() === 0) startD = addDays(startD, -6);
      else startD = addDays(startD, 1 - startD.getDay());
    } else {
      startD = addDays(startD, -startD.getDay());
    }
  }

  const startYMD = ymd(startD);
  if (dom.nextDayReportDateInput && dom.nextDayReportDateInput.value !== startYMD) {
    dom.nextDayReportDateInput.value = startYMD;
  }

  let fullHtml = `<div class="next-day-report">`;

  // Loop 7 days
  for (let i = 0; i < 7; i++) {
    const today = addDays(startD, i);
    const tomorrow = addDays(today, 1);
    const todayYMD = ymd(today);
    const tomorrowYMD = ymd(tomorrow);

    // Find all buses that have a trip departing tomorrow
    const busesDepartingTomorrow = new Set();
    const tripsDepartingTomorrow = state.trips.filter((t) => t.departureDate === tomorrowYMD);

    tripsDepartingTomorrow.forEach((trip) => {
      const assigns = state.assignmentsByTripKey[trip.tripKey] || [];
      assigns.forEach((a) => {
        const busId = String(a.busId || "").trim();
        if (busId && busId !== "None" && busId !== "WAITING_LIST") {
          busesDepartingTomorrow.add(busId);
        }
      });
    });

    // For these buses, find when they arrive today
    const reportData = [];
    const priorityBusesInfo = [];

    busesDepartingTomorrow.forEach((busId) => {
      // Find trips for this bus arriving today
      let arrivalTimeToday = "Already in yard / No arrival today";
      let departureTimeTomorrow = "Unknown";
      let maintenanceWindow = "Flexible (Bus is in yard)";

      // Find departure time tomorrow
      const tomorrowTrip = tripsDepartingTomorrow.find((t) => {
        const assigns = state.assignmentsByTripKey[t.tripKey] || [];
        return assigns.some((a) => String(a.busId).trim() === busId);
      });

      if (tomorrowTrip && tomorrowTrip.departureTime) {
        departureTimeTomorrow = formatTime12(tomorrowTrip.departureTime);
      }

      // Find arrival time today
      const tripsArrivingToday = state.trips.filter((t) => {
        const arrDate = t.arrivalDate || t.departureDate;
        if (arrDate !== todayYMD) return false;
        const assigns = state.assignmentsByTripKey[t.tripKey] || [];
        return assigns.some((a) => String(a.busId).trim() === busId);
      });

      // Sort by arrival time descending
      tripsArrivingToday.sort((a, b) => {
        const timeA = normalizeTime(a.arrivalTime) || "00:00";
        const timeB = normalizeTime(b.arrivalTime) || "00:00";
        return timeB.localeCompare(timeA);
      });

      if (tripsArrivingToday.length > 0) {
        const lastTripToday = tripsArrivingToday[0];
        if (lastTripToday.arrivalTime) {
          arrivalTimeToday = formatTime12(lastTripToday.arrivalTime);

          let arrHour = 0;
          const normedArr = normalizeTime(lastTripToday.arrivalTime);
          if (normedArr) {
            arrHour = parseInt(normedArr.split(":")[0], 10);
          }

          if (arrHour < 8) {
            maintenanceWindow = "8:00 AM - 4:00 PM";
          } else if (arrHour >= 8 && arrHour <= 16) {
            maintenanceWindow = "4:00 PM - 12:00 AM (Midnight)";
          } else {
            maintenanceWindow = "Night Shift (After Arrival)";
          }
        }

        let arrTimeNum = 0;
        if (lastTripToday.arrivalTime) {
          const normedArr = normalizeTime(lastTripToday.arrivalTime);
          if (normedArr) {
            arrTimeNum =
              parseInt(normedArr.split(":")[0], 10) + parseInt(normedArr.split(":")[1], 10) / 60;
          }
        }

        let depTimeNum = 32; // Default 8 AM tomorrow
        if (tomorrowTrip && tomorrowTrip.departureTime) {
          const normedDep = normalizeTime(tomorrowTrip.departureTime);
          if (normedDep) {
            depTimeNum =
              24 +
              parseInt(normedDep.split(":")[0], 10) +
              parseInt(normedDep.split(":")[1], 10) / 60;
          }
        }
        priorityBusesInfo.push({ a: arrTimeNum, d: depTimeNum });

        reportData.push({
          busId,
          arrivalTimeToday,
          departureTimeTomorrow,
          maintenanceWindow,
          priority: tripsArrivingToday.length > 0 ? 1 : 2, // 1 High Priority (arriving today), 2 Low Priority (in yard)
        });
      } else {
        reportData.push({
          busId,
          arrivalTimeToday,
          departureTimeTomorrow,
          maintenanceWindow,
          priority: 2, // Low Priority (in yard)
        });
      }
    });

    // Sort by Priority first (1 then 2), then by bus number
    reportData.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return parseInt(a.busId) - parseInt(b.busId);
    });

    // Calculate best 8-hour shift
    let shiftDisplay = "";
    if (priorityBusesInfo.length > 0) {
      let bestShift = null;
      for (let s = 12; s <= 32; s += 0.5) {
        let valid = true;
        for (const b of priorityBusesInfo) {
          const overlap = Math.min(s + 8, b.d) - Math.max(s, b.a);
          if (overlap < 2) {
            valid = false;
            break;
          }
        }
        if (valid) {
          bestShift = s;
          break; // Earliest valid 8-hour window
        }
      }

      if (bestShift !== null) {
        const formatTimeNum = (num) => {
          let isTmrw = num >= 24;
          let h = Math.floor(num) % 24;
          let m = Math.round((num - Math.floor(num)) * 60);
          let ampm = h >= 12 ? "PM" : "AM";
          h = h % 12;
          if (h === 0) h = 12;
          let ms = String(m).padStart(2, "0");
          let dayStr = isTmrw ? " (Next Day)" : "";
          if (isTmrw && h === 12 && ampm === "AM") dayStr = ""; // it's just midnight
          return `${h}:${ms} ${ampm}${dayStr}`;
        };

        shiftDisplay = `<div class="next-day-report__shift">
        <strong class="next-day-report__shift-title">Optimal 8-Hour Maintenance Shift: <span class="next-day-report__shift-title--accent">${formatTimeNum(bestShift)} - ${formatTimeNum(bestShift + 8)}</span></strong>
        <span class="next-day-report__shift-desc">This window guarantees at least 2 hours of available yard time for every priority bus.</span>
      </div>`;
      } else {
        shiftDisplay = `<div class="next-day-report__shift next-day-report__shift--danger">
        <strong class="next-day-report__shift-title next-day-report__shift-title--danger">No single 8-hour shift possible</strong>
        <span class="next-day-report__shift-desc">Cannot find a single 8-hour window that gives 2+ hours to all priority buses. You may need staggered shifts.</span>
      </div>`;
      }
    } else if (reportData.length > 0) {
      shiftDisplay = `<div class="next-day-report__shift next-day-report__shift--success">
        <strong class="next-day-report__shift-title next-day-report__shift-title--success">All Buses in Yard (Flexible)</strong>
        <span class="next-day-report__shift-desc">No priority arrivals. Maintenance shifts can be scheduled anytime.</span>
      </div>`;
    }

    // Build HTML for loop iteration
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    let dayHtml = `<div class="next-day-report__day weekly-report-day">
      <h3 class="next-day-report__day-title">
        ${dayName} Maintenance Schedule
        <span class="next-day-report__day-subtitle">
          (Handling arrivals from ${formatDateForToast(todayYMD)} for departures on ${formatDateForToast(tomorrowYMD)})
        </span>
      </h3>`;

    dayHtml += shiftDisplay;
    if (reportData.length === 0) {
      dayHtml += `<p class="next-day-report__empty">No buses found that depart tomorrow (${tomorrowYMD}).</p>`;
    } else {
      dayHtml += `<table class="next-day-report__table next-day-report-table">
        <thead>
          <tr>
            <th>Bus</th>
            <th>Status</th>
            <th>Depart Tomorrow</th>
            <th>Suggested Window</th>
          </tr>
        </thead>
        <tbody>`;
      reportData.forEach((row) => {
        const priorityLabel =
          row.priority === 1
            ? `<span class="next-day-report__badge--priority">PRIORITY</span>`
            : `<span class="next-day-report__badge--yard">IN YARD</span>`;

        dayHtml += `<tr>
          <td><strong>${row.busId}</strong><br/>${priorityLabel}</td>
          <td>${row.priority === 1 ? `Arrives Today: <br/><strong>${row.arrivalTimeToday}</strong>` : `Already in yard`}</td>
          <td><strong>${row.departureTimeTomorrow}</strong></td>
          <td>${row.maintenanceWindow}</td>
        </tr>`;
      });
      dayHtml += `</tbody></table>`;
    }

    dayHtml += `</div>`;
    fullHtml += dayHtml;
  }

  fullHtml += `</div>`;
  dom.nextDayReportBody.innerHTML = fullHtml;
  openModalA11y(dom.nextDayReportModal, dom.nextDayReportDateInput || dom.printNextDayReportBtn);
}

// Close and Print handlers
if (dom.nextDayReportDateInput) {
  dom.nextDayReportDateInput.addEventListener("change", (e) => {
    const d = parseYMD(e.target.value);
    if (d) {
      generateNextDayReport(d);
    }
  });
}
if (dom.closeNextDayReportBtn) {
  dom.closeNextDayReportBtn.addEventListener("click", () => {
    closeModalA11y(dom.nextDayReportModal);
  });
}
if (dom.closeNextDayReportBackdrop) {
  dom.closeNextDayReportBackdrop.addEventListener("click", () => {
    closeModalA11y(dom.nextDayReportModal);
  });
}
if (dom.nextDayReportModal) {
  document.addEventListener("keydown", (e) => {
    if (!dom.nextDayReportModal.hidden && e.key === "Escape") {
      closeModalA11y(dom.nextDayReportModal);
    }
  });
}
if (dom.printNextDayReportBtn) {
  dom.printNextDayReportBtn.addEventListener("click", () => {
    const printWindow = window.open("", "", "height=800,width=1000");
    printWindow.document.write("<html><head><title>Weekly Maintenance Report</title>");

    // Inject custom print styles tailored for fitting 7 days into 1 page
    printWindow.document.write(`
      <style>
        @page { size: portrait; margin: 0.5in; }
        body { 
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
          padding: 0; 
          margin: 0;
          font-size: 11px;
          color: #222; 
          line-height: 1.3;
        }
        
        /* Clean Header */
        h2 { 
          text-align: center; 
          font-size: 18px; 
          margin: 0 0 16px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 2px solid #222;
          padding-bottom: 6px;
          color: #111;
        }
        
        .print-wrapper {
          display: block;
          width: 100%;
        }
        
        /* Day Blocks */
        .weekly-report-day {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 24px !important;
          padding-bottom: 12px !important;
          border-bottom: 1px dashed #ccc !important;
        }
        
        .weekly-report-day:last-child {
          border-bottom: none !important;
        }
        
        /* Date Headers */
        h3 { 
          font-size: 14px !important; 
          margin: 0 0 8px 0 !important; 
          color: #111 !important; 
          font-weight: 700 !important;
          line-height: 1.2 !important;
        }
        h3 span { 
          color: #555 !important; 
          font-weight: 400 !important; 
          font-size: 11px !important;
          display: block;
          margin-top: 2px !important;
        }
        
        /* Shift Alert Box */
        .next-day-report__shift {
          background: #fdfdfd !important;
          border: 1px solid #e0e0e0 !important;
          border-left: 3px solid #0284c7 !important; 
          padding: 8px 12px !important;
          box-shadow: none !important;
          border-radius: 4px !important;
          margin-bottom: 12px !important;
        }
        
        .next-day-report__shift--danger { border-left-color: #dc2626 !important; }
        .next-day-report__shift--success { border-left-color: #10b981 !important; }
        
        /* Table Styling */
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 8px !important; 
          font-size: 11px !important; 
          table-layout: auto;
        }
        
        th, td { 
          padding: 6px 4px !important; 
          border-bottom: 1px solid #f0f0f0 !important; 
          text-align: left; 
          color: #222 !important;
          vertical-align: top;
        }
        th { 
          color: #444 !important; 
          font-weight: 700 !important; 
          border-bottom: 1px solid #999 !important; 
          text-transform: capitalize;
        }
        
        td strong { 
          color: #111 !important; 
          font-weight: 600;
        }
        
        /* Override dark mode / ensure print-friendly text */
        .next-day-report__shift-title { color: #111 !important; font-size: 11px !important; }
        .next-day-report__shift-title--accent { color: #0369a1 !important; }
        .next-day-report__shift-title--danger { color: #b91c1c !important; }
        .next-day-report__shift-title--success { color: #047857 !important; }
        .next-day-report__shift-desc { color: #444 !important; font-size: 10px !important; display: block; margin-top: 2px; }
        .next-day-report__day-subtitle { color: #555 !important; }
        
        .next-day-report__badge--priority,
        .next-day-report__badge--yard {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          font-size: 9px !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px;
          display: block;
          margin-top: 2px;
        }
        
        p { margin: 4px 0 !important; color: #444 !important; }
      </style>
    `);

    printWindow.document.write("</head><body>");
    printWindow.document.write("<h2>Weekly Maintenance Report</h2>");
    printWindow.document.write('<div class="print-wrapper">');
    printWindow.document.write(dom.nextDayReportBody.innerHTML);
    printWindow.document.write("</div>");
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.focus();

    // setTimeout to allow rendering before the print dialog freezes the thread
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  });
}

function generateDailyMaintenancePlan(selectedDate = null) {
  let startD = selectedDate ? new Date(selectedDate) : new Date(state.currentDate || new Date());

  if (!selectedDate) {
    if (state.weekStartsMonday) {
      if (startD.getDay() === 0) startD = addDays(startD, -6);
      else startD = addDays(startD, 1 - startD.getDay());
    } else {
      startD = addDays(startD, -startD.getDay());
    }
  }

  const startYMD = ymd(startD);
  if (dom.dailyMaintenancePlanDateInput && dom.dailyMaintenancePlanDateInput.value !== startYMD) {
    dom.dailyMaintenancePlanDateInput.value = startYMD;
  }

  const buses = ["218", "763", "470", "133", "506", "746", "607", "897", "898", "474"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const endD = addDays(startD, 6);
  let titleStr = `${monthNames[startD.getMonth()]} ${startD.getDate()} - ${endD.getDate()}, ${endD.getFullYear()}`;
  if (startD.getMonth() !== endD.getMonth()) {
    titleStr = `${monthNames[startD.getMonth()]} ${startD.getDate()} - ${monthNames[endD.getMonth()]} ${endD.getDate()}, ${endD.getFullYear()}`;
  }

  let fullHtml = `<div class="daily-plan">`;
  fullHtml += `<h1 class="daily-plan__title">Weekly Maintenance Priority Plan: <span>${titleStr}</span></h1>`;

  for (let i = 0; i < 7; i++) {
    const currentDay = addDays(startD, i);
    const currentYMD = ymd(currentDay);
    const tomorrowYMD = ymd(addDays(currentDay, 1));
    const dayName = currentDay.toLocaleDateString("en-US", { weekday: "long" });
    const formattedDate = `${monthNames[currentDay.getMonth()]} ${currentDay.getDate()}`;

    let tripsDepartingTomorrow = state.trips.filter((t) => t.departureDate === tomorrowYMD);
    let busesDepartingTomorrow = new Set();
    tripsDepartingTomorrow.forEach((trip) => {
      let assigns = state.assignmentsByTripKey[trip.tripKey] || [];
      assigns.forEach((a) => {
        let busId = String(a.busId || "").trim();
        if (busId && busId !== "None" && busId !== "WAITING_LIST") {
          busesDepartingTomorrow.add(busId);
        }
      });
    });

    let priority1 = []; // Arriving Today
    let priority3 = []; // Already in yard (Flexible)

    let nightShiftRequired = false;

    buses.forEach((busId) => {
      if (busesDepartingTomorrow.has(busId)) {
        let arrivalTimeToday = "In Yard";
        let departureTimeTomorrow = "Unknown";
        let arrivalHour = 0;
        let arrivingToday = false;

        let tomorrowTrip = tripsDepartingTomorrow.find((t) => {
          let assigns = state.assignmentsByTripKey[t.tripKey] || [];
          return assigns.some((a) => String(a.busId).trim() === busId);
        });
        if (tomorrowTrip && tomorrowTrip.departureTime) {
          departureTimeTomorrow = formatTime12(tomorrowTrip.departureTime);
        }

        let tripsArrivingToday = state.trips.filter((t) => {
          let arrDate = t.arrivalDate || t.departureDate;
          if (arrDate !== currentYMD) return false;
          let assigns = state.assignmentsByTripKey[t.tripKey] || [];
          return assigns.some((a) => String(a.busId).trim() === busId);
        });

        tripsArrivingToday.sort((a, b) => {
          let timeA = normalizeTime(a.arrivalTime) || "00:00";
          let timeB = normalizeTime(b.arrivalTime) || "00:00";
          return timeB.localeCompare(timeA);
        });

        if (tripsArrivingToday.length > 0) {
          arrivingToday = true;
          let lastTripToday = tripsArrivingToday[0];
          if (lastTripToday.arrivalTime) {
            arrivalTimeToday = formatTime12(lastTripToday.arrivalTime);
            let normedArr = normalizeTime(lastTripToday.arrivalTime);
            if (normedArr) arrivalHour = parseInt(normedArr.split(":")[0], 10);
          }
        }

        let info = { busId: busId, in: arrivalTimeToday, out: departureTimeTomorrow };

        if (arrivingToday) {
          priority1.push(info);
          if (arrivalHour >= 8) {
            nightShiftRequired = true; // Any late arrival forces a night shift to fix it
          }
        } else {
          priority3.push(info);
        }
      }
    });

    let recommendedShift = nightShiftRequired
      ? "Night Shift (6:00 PM - 2:00 AM)"
      : "Morning Shift (8:00 AM - 5:00 PM)";
    let shiftColor = nightShiftRequired ? "#b45309" : "#0e7490";
    if (priority1.length === 0 && priority3.length === 0) {
      recommendedShift = "No Shift Needed";
      shiftColor = "#9ca3af";
    }

    const shiftClass =
      recommendedShift === "No Shift Needed"
        ? "daily-plan__shift-summary--none"
        : nightShiftRequired
          ? "daily-plan__shift-summary--night"
          : "daily-plan__shift-summary--morning";

    fullHtml += `<div class="daily-plan__day">`;
    fullHtml += `<h2 class="daily-plan__day-header">${dayName} <span>- ${formattedDate}</span></h2>`;

    fullHtml += `<div class="daily-plan__shift-summary ${shiftClass}">Recommended Schedule: ${recommendedShift}</div>`;

    fullHtml += `<div class="daily-plan__section">`;
    fullHtml += `<h3 class="daily-plan__section-title daily-plan__section-title--priority">Priority:</h3>`;
    if (priority1.length > 0) {
      priority1.forEach((b) => {
        fullHtml += `<div class="daily-plan__bus-line"><b>Bus ${b.busId}</b> &nbsp;&nbsp;|&nbsp;&nbsp; <span class="daily-plan__in-arriving">In: ${b.in}</span> &nbsp;&nbsp;|&nbsp;&nbsp; <span class="daily-plan__out-tomorrow">Out: ${b.out} (Tomorrow)</span></div>`;
      });
    } else {
      fullHtml += `<div class="daily-plan__bus-line daily-plan__bus-line--muted">None</div>`;
    }

    fullHtml += `<h3 class="daily-plan__section-title daily-plan__section-title--yard">Already in Yard Today:</h3>`;
    if (priority3.length > 0) {
      priority3.forEach((b) => {
        fullHtml += `<div class="daily-plan__bus-line"><b>Bus ${b.busId}</b> &nbsp;&nbsp;|&nbsp;&nbsp; <span class="daily-plan__in-yard">In: Yard</span> &nbsp;&nbsp;|&nbsp;&nbsp; <span class="daily-plan__out-tomorrow">Out: ${b.out} (Tomorrow)</span></div>`;
      });
    } else {
      fullHtml += `<div class="daily-plan__bus-line daily-plan__bus-line--muted">None</div>`;
    }
    fullHtml += `</div></div>`;
  }

  fullHtml += `</div>`;
  dom.dailyMaintenancePlanBody.innerHTML = fullHtml;
  openModalA11y(
    dom.dailyMaintenancePlanModal,
    dom.dailyMaintenancePlanDateInput || dom.printDailyMaintenancePlanBtn,
  );
}
