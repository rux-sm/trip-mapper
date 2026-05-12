// ======================================================
// 31) TOP CONTROLS MOVE (DESKTOP)
// ======================================================

// ======================================================
// 32) PRINT
// ======================================================

/**
 * Build Legal-landscape print layout by cloning the live schedule-grid.
 * Layout: 2 pages, 5 bus rows each, 2 empty note rows below each bus.
 * Trip bars are in the clone; repositionBarsForPrint sets pixel-based left/width.
 */
function buildPrintScheduleTwoPages() {
  const printRoot = document.getElementById("printRoot");
  if (!printRoot) return;

  const weekTable = getScheduleGridTableEl();
  if (!weekTable) return;

  const weekTitle = document.getElementById("headerWeek")?.textContent || "Schedule";

  /** Reposition trip bars using fixed column metrics for print alignment */
  function repositionBarsForPrint(table, col) {
    if (!col) return;
    const body = table.querySelector("tbody:not([hidden])");
    if (!body) return;
    const total = Math.round(col.total);
    body.querySelectorAll(".schedule-grid__row-bars").forEach((bars) => {
      bars.style.width = `${total}px`;
      bars.querySelectorAll(".schedule-grid__trip-bar").forEach((bar) => {
        const sidx = Number(bar.dataset.sidx);
        const eidx = Number(bar.dataset.eidx);
        if (!Number.isFinite(sidx) || !Number.isFinite(eidx)) return;
        positionBarWithinOverlay(bar, bars, col, sidx, eidx, { insetL: 0, insetR: 0 });
        // Re-apply handoff arrival clip (takes priority over half-day)
        const handoffArrStr = bar.dataset.handoffArr;
        const handoffDepStr = bar.dataset.handoffDep;
        if (handoffArrStr) {
          const frac = parseFloat(handoffArrStr);
          const clip = (1 - frac) * (col.widths[eidx] ?? 0);
          bar.style.width = `${Math.max(0, (parseFloat(bar.style.width) || 0) - clip)}px`;
        } else if (bar.classList.contains("half-day-return")) {
          const lastColW = col.widths[eidx] ?? 0;
          const curW = parseFloat(bar.style.width) || 0;
          bar.style.width = `${Math.max(0, curW - lastColW / 2)}px`;
        }
        // Re-apply handoff departure shift (takes priority over half-day)
        if (handoffDepStr) {
          const frac = parseFloat(handoffDepStr);
          const shift = frac * (col.widths[sidx] ?? 0);
          bar.style.left  = `${(parseFloat(bar.style.left) || 0) + shift}px`;
          bar.style.width = `${Math.max(0, (parseFloat(bar.style.width) || 0) - shift)}px`;
        } else if (bar.classList.contains("half-day-depart")) {
          const firstColW = col.widths[sidx] ?? 0;
          const half = firstColW / 2;
          const curLeft = parseFloat(bar.style.left) || 0;
          const curW = parseFloat(bar.style.width) || 0;
          bar.style.left = `${curLeft + half}px`;
          bar.style.width = `${Math.max(0, curW - half)}px`;
        }
        const rawLeft = parseFloat(bar.style.left) || 0;
        const rawW = parseFloat(bar.style.width) || 0;
        bar.style.left = `${Math.round(rawLeft)}px`;
        bar.style.width = `${Math.round(rawW)}px`;
      });
    });
  }

  /** Fit to page: Legal landscape — scale to fit both width and height */
  function computePrintScale() {
    const card = printRoot.querySelector(".print-card");
    if (!card) return 1;
    const contentW = card.scrollWidth || card.offsetWidth;
    const contentH = card.scrollHeight || card.offsetHeight;
    const legalPrintableW = 1296;
    const legalPrintableH = 720;
    const scaleW = contentW > 0 ? legalPrintableW / contentW : 1;
    const scaleH = contentH > 0 ? legalPrintableH / contentH : 1;
    const scale = Math.min(1, scaleW, scaleH) * 0.97;
    return Math.max(0.6, Math.min(1, scale));
  }

  function makeTableForRows(startIdx, endIdx) {
    const clone = weekTable.cloneNode(true);
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

    const body = clone.querySelector("tbody:not([hidden])");
    if (!body) return null;

    clone.querySelectorAll("tbody[hidden]").forEach((el) => el.remove());

    const rows = Array.from(body.querySelectorAll("tr"));
    rows.forEach((tr, idx) => {
      if (idx < startIdx || idx >= endIdx) {
        tr.remove();
      } else {
        for (let j = 0; j < 2; j++) {
          const notesRow = document.createElement("tr");
          notesRow.className = "schedule-grid__row--notes";
          const tdEmpty = document.createElement("td");
          tdEmpty.className = "schedule-grid__cell schedule-grid__bus-cell";
          notesRow.appendChild(tdEmpty);
          for (let i = 0; i < 7; i++) {
            const td = document.createElement("td");
            td.className = "schedule-grid__cell schedule-grid__day-cell";
            notesRow.appendChild(td);
          }
          tr.parentNode.insertBefore(notesRow, tr.nextSibling);
        }
      }
    });

    const page = document.createElement("div");
    page.className = "print-page";
    const card = document.createElement("div");
    card.className = "print-card";

    const agendaHeader = getScheduleAgendaHeaderEl();
    const headerClone = agendaHeader ? agendaHeader.cloneNode(true) : null;
    if (headerClone) {
      headerClone.classList.add("print-header");
      headerClone
        .querySelectorAll(
          ".rux-header__actions, .agenda-header__date-left .rux-btn--tertiary, .weekpicker-trigger-wrap, .agenda-header__sync-center, .agenda-header__date-right",
        )
        .forEach((el) => el.remove());

      const dateLeft = headerClone.querySelector(".agenda-header__date-left");
      if (dateLeft) {
        const logoImg = document.createElement("img");
        logoImg.src = "assets/logo.png";
        logoImg.className = "print-header-logo-img";
        logoImg.alt = "Logo";
        dateLeft.insertBefore(logoImg, dateLeft.firstChild);
      }
      card.appendChild(headerClone);
    } else {
      const title = document.createElement("div");
      title.className = "print-title";
      title.textContent = weekTitle;
      card.appendChild(title);
    }
    clone.classList.add("print-table");
    card.appendChild(clone);
    page.appendChild(card);
    return page;
  }

  printRoot.innerHTML = "";
  printRoot.appendChild(makeTableForRows(0, 5));
  printRoot.appendChild(makeTableForRows(5, 10));

  const printCardWidth = 1440;

  // Force layout before measuring so getBoundingClientRect() returns accurate values
  printRoot.classList.add("print-mode-legal");
  printRoot.classList.remove("is-hidden");
  printRoot.style.cssText = `position:absolute;left:-9999px;visibility:hidden;width:${printCardWidth}px;`;
  void printRoot.offsetHeight;

  // Measure actual rendered column widths from the DOM.
  // Use a body row (same rows where bars live) as the baseline — mirrors getColMetricsCached.
  function measurePrintCols(table) {
    const tbody = table?.querySelector("tbody:not([hidden])");
    const firstBodyRow = tbody?.rows?.[0];
    if (!firstBodyRow || firstBodyRow.cells.length < 8) return null;
    const baseLeft = firstBodyRow.cells[1].getBoundingClientRect().left;
    const starts = [], widths = [];
    let total = 0;
    for (let i = 1; i <= 7; i++) {
      const cell = firstBodyRow.cells[i];
      if (!cell) continue;
      const rect = cell.getBoundingClientRect();
      starts.push(rect.left - baseLeft);
      widths.push(rect.width);
      total += rect.width;
    }
    return starts.length === 7 ? { starts, widths, total } : null;
  }

  const firstTable = printRoot.querySelector(".print-table");
  const colMetrics = measurePrintCols(firstTable) ?? (() => {
    // Fallback to hard-coded values if DOM measurement fails
    const dayColWidth = (1296 - 34 - 22) / 7;
    return {
      starts: Array.from({ length: 7 }, (_, i) => i * dayColWidth),
      widths: Array(7).fill(dayColWidth),
      total: dayColWidth * 7,
    };
  })();

  printRoot.querySelectorAll(".print-table").forEach((t) => repositionBarsForPrint(t, colMetrics));
  const scale = computePrintScale();
  printRoot.classList.add("is-hidden");
  printRoot.style.cssText = "";
  printRoot.style.setProperty("--print-scale", String(scale));
}

/**
 * Build Legal-landscape print layout using CSS Grid.
 * Bars are positioned with grid-column (sidx/eidx) — no pixel measurement,
 * no zoom, no requestAnimationFrame needed.
 * 5 bus rows per page × 2 pages = 10 total rows.
 */
function buildPrintScheduleLegalCSSGrid() {
  const printRoot = document.getElementById("printRoot");
  if (!printRoot) return;

  const weekTable = getScheduleGridTableEl();
  if (!weekTable) return;

  // Day header cells from the live schedule thead (index 1-7, skipping bus col)
  const theadRow = weekTable.querySelector("thead tr");
  const dayHeaderCells = theadRow ? Array.from(theadRow.cells).slice(1) : [];

  function buildPage(startIdx, endIdx) {
    const page = document.createElement("div");
    page.className = "print-page";

    const card = document.createElement("div");
    card.className = "print-card";

    // Agency header (logo + date range) — same approach as existing function
    const agendaHeader = getScheduleAgendaHeaderEl();
    const headerClone = agendaHeader ? agendaHeader.cloneNode(true) : null;
    if (headerClone) {
      headerClone.classList.add("print-header");
      headerClone
        .querySelectorAll(
          ".rux-header__actions, .agenda-header__date-left .rux-btn--tertiary, .weekpicker-trigger-wrap, .agenda-header__sync-center, .agenda-header__date-right",
        )
        .forEach((el) => el.remove());
      const dateLeft = headerClone.querySelector(".agenda-header__date-left");
      if (dateLeft) {
        const logoImg = document.createElement("img");
        logoImg.src = "assets/logo.png";
        logoImg.className = "print-header-logo-img";
        logoImg.alt = "Logo";
        dateLeft.insertBefore(logoImg, dateLeft.firstChild);
      }
      card.appendChild(headerClone);
    }

    // CSS Grid schedule
    const grid = document.createElement("div");
    grid.className = "pgv2-grid";

    // Header row: empty bus cell + 7 day cells
    const busHeaderCell = document.createElement("div");
    busHeaderCell.className = "pgv2-hcell pgv2-hcell--bus";
    grid.appendChild(busHeaderCell);

    for (let d = 0; d < 7; d++) {
      const hcell = document.createElement("div");
      hcell.className = "pgv2-hcell";
      const srcCell = dayHeaderCells[d];
      if (srcCell) {
        const label = srcCell.querySelector(".schedule-grid__day-label");
        hcell.appendChild(label ? label.cloneNode(true) : document.createTextNode(srcCell.textContent.trim()));
      }
      grid.appendChild(hcell);
    }

    // Bus rows
    const tbody = weekTable.querySelector("tbody:not([hidden])");
    if (tbody) {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      for (let i = startIdx; i < Math.min(endIdx, rows.length); i++) {
        const tr = rows[i];

        // Bus cell — clone indicator div (bus number + icons)
        const busCell = document.createElement("div");
        busCell.className = "pgv2-bus-cell";
        const srcBusCell = tr.cells[0];
        if (srcBusCell) {
          const indicator = srcBusCell.querySelector(".schedule-grid__bus-indicator");
          if (indicator) busCell.appendChild(indicator.cloneNode(true));
        }
        const busAccent = tr.style.getPropertyValue("--bus-accent-color");
        if (busAccent) busCell.style.setProperty("--bus-accent-color", busAccent);
        grid.appendChild(busCell);

        // Bars area — inner 7-col grid; each bar placed by grid-column
        const barsArea = document.createElement("div");
        barsArea.className = "pgv2-bars-area";

        const srcBarsCell = tr.cells[1];
        if (srcBarsCell) {
          srcBarsCell.querySelectorAll(".schedule-grid__trip-bar").forEach((bar) => {
            const sidx = Number(bar.dataset.sidx);
            const eidx = Number(bar.dataset.eidx);
            if (!Number.isFinite(sidx) || !Number.isFinite(eidx)) return;
            const barClone = bar.cloneNode(true);
            // Set positioning inline with !important so it beats the base class's
            // height: var(--tripbar-height) !important and position: absolute rules
            barClone.style.removeProperty("left");
            barClone.style.removeProperty("width");
            barClone.style.setProperty("position", "absolute", "important");
            barClone.style.setProperty("top", "0", "important");
            barClone.style.setProperty("left", "0", "important");
            barClone.style.setProperty("width", "100%", "important");
            barClone.style.setProperty("height", "100%", "important");
            barClone.style.setProperty("max-height", "none", "important");
            // Wrapper is the grid item — grid-column placed here, not on the bar
            const lane = Number(bar.dataset.lane) || 0;
            const wrapper = document.createElement("div");
            wrapper.className = "pgv2-bar-wrapper";
            wrapper.style.gridColumn = `${sidx + 1} / ${eidx + 2}`;
            wrapper.style.gridRow = String(lane + 1);
            wrapper.appendChild(barClone);
            barsArea.appendChild(wrapper);
          });
        }
        grid.appendChild(barsArea);

        // Two empty notes rows for handwritten notes
        for (let n = 0; n < 2; n++) {
          const notesRow = document.createElement("div");
          notesRow.className = "pgv2-notes-row";
          grid.appendChild(notesRow);
        }
      }
    }

    card.appendChild(grid);
    page.appendChild(card);
    return page;
  }

  printRoot.innerHTML = "";
  printRoot.classList.remove("print-mode-legal", "print-mode-legal-v2", "print-mode-letter-full");
  printRoot.classList.add("print-mode-legal-v2");
  printRoot.appendChild(buildPage(0, 5));
  printRoot.appendChild(buildPage(5, 10));
}

/**
 * Build Letter-landscape print layout (Full 10-row schedule on 1 page).
 */
function buildPrintScheduleFullLetter() {
  const printRoot = document.getElementById("printRoot");
  if (!printRoot) return;

  const weekTitle = document.getElementById("headerWeek")?.textContent || "Schedule";
  const dates = getWeekDates();
  const dayIds = getDayIds();

  // Create the fresh static tabular HTML based on State
  let html = `
    <div class="print-page print-page-letter">
      <div class="print-header">
        <h2 class="print-title">${escHtml(weekTitle)}</h2>
      </div>
      <table class="print-data-table">
        <thead>
          <tr>
            <th class="schedule-grid__col-bus">Bus</th>
            ${dates
      .map((d, i) => {
        const dObj = parseYMD(d);
        const dayStr = dObj
          ? dObj.toLocaleDateString("en-US", { weekday: "short" })
          : dayIds[i];
        const dateStr = dObj ? `${dObj.getMonth() + 1}/${dObj.getDate()}` : d;
        return `<th class="schedule-grid__col-day">${escHtml(dayStr)} ${escHtml(dateStr)}</th>`;
      })
      .join("")}
          </tr>
        </thead>
        <tbody>
  `;

  const buses = state.busesList || [];
  for (const bus of buses) {
    const busId = String(bus.busId || bus.id || "").trim();
    if (!busId || busId === "None" || busId === "WAITING_LIST") continue;

    const busTrips = state.trips.filter((t) => {
      const a = state.assignmentsByTripKey[t.tripKey] || {};
      return String(a.busId).trim() === busId;
    });

    html += `<tr>`;
    html += `<td class="schedule-grid__bus-cell"><strong>${escHtml(busId)}</strong></td>`;

    let skipDays = 0;
    for (let i = 0; i < 7; i++) {
      if (skipDays > 0) {
        skipDays--;
        continue;
      }

      const currentYMD = dates[i];
      const tripsToday = busTrips.filter((t) => {
        const start = ymd(parseYMD(t.departureDate));
        const end = ymd(parseYMD(t.arrivalDate) || parseYMD(t.departureDate));
        return currentYMD >= start && currentYMD <= end;
      });

      if (tripsToday.length === 0) {
        html += `<td></td>`;
      } else {
        tripsToday.sort((a, b) => (a.departureTime || "").localeCompare(b.departureTime || ""));
        const t = tripsToday[0];
        const a = state.assignmentsByTripKey[t.tripKey] || {};

        const tEndYMD = ymd(parseYMD(t.arrivalDate) || parseYMD(t.departureDate));
        let colspan = 1;
        for (let j = i + 1; j < 7; j++) {
          if (dates[j] <= tEndYMD) colspan++;
          else break;
        }

        html += `<td colspan="${colspan}" class="trip-cell">
          <div class="trip-content">
            <div class="trip-dest-cust"><strong>${escHtml(t.destination)}</strong> - ${escHtml(t.customer)}</div>
            <div class="trip-times">⏱ ${normalizeTime(t.departureTime)} - ${normalizeTime(t.arrivalTime)}</div>
            <div class="trip-drivers">👤 D1: ${escHtml(a.driver1 || "—")} | D2: ${escHtml(a.driver2 || "—")}</div>
            <div class="trip-notes">📝 ${escHtml(t.notes || "")}</div>
          </div>
        </td>`;

        skipDays = colspan - 1;
      }
    }
    html += `</tr>`;
  }

  html += `</tbody></table></div>`;

  printRoot.innerHTML = html;
  printRoot.classList.add("print-mode-letter-full");
}

function clearPrintRoot() {
  const printRoot = document.getElementById("printRoot");
  if (printRoot) {
    printRoot.innerHTML = "";
    printRoot.classList.remove("print-mode-letter-full", "print-mode-legal", "print-mode-legal-v2");
  }
}

function setPrintPageSize(size) {
  let el = document.getElementById("dynamicPrintPageSize");
  if (!el) {
    el = document.createElement("style");
    el.id = "dynamicPrintPageSize";
    document.head.appendChild(el);
  }
  const css =
    size === "letter"
      ? `@media print { @page { size: letter landscape; margin: 0.5in; } }`
      : `@media print { @page { size: legal landscape; margin: 0.25in; } }`;
  el.textContent = css;
}

window.addEventListener("afterprint", clearPrintRoot);

