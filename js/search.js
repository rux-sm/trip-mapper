// ======================================================
// 35) SEARCH
// ======================================================

let _searchDebounce = null;

function openSearch() {
  dom.searchRow.hidden = false;
  dom.searchToggleBtn.setAttribute("aria-pressed", "true");
  requestAnimationFrame(() => dom.searchInput.focus());
}

function closeSearch() {
  dom.searchRow.hidden = true;
  dom.searchDropdown.hidden = true;
  dom.searchInput.value = "";
  dom.searchToggleBtn.setAttribute("aria-pressed", "false");
}

function toggleSearch() {
  if (!dom.searchRow.hidden) { closeSearch(); return; }
  openSearch();
}

function _positionDropdown() {
  const rect = dom.searchRow.getBoundingClientRect();
  dom.searchDropdown.style.top   = `${rect.bottom + 4}px`;
  dom.searchDropdown.style.left  = `${rect.left}px`;
  dom.searchDropdown.style.width = `${rect.width}px`;
}

async function _runSearch(query) {
  if (!query.trim()) {
    dom.searchDropdown.hidden = true;
    return;
  }
  _positionDropdown();
  dom.searchDropdown.innerHTML = `<div class="search-dropdown__loading">Searching…</div>`;
  dom.searchDropdown.hidden = false;
  try {
    const results = await api.searchTrips(query);
    _renderSearchResults(results);
  } catch {
    dom.searchDropdown.innerHTML = `<div class="search-dropdown__empty">Search failed.</div>`;
  }
}

function _fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y.slice(2)}`;
}

function _renderSearchResults(results) {
  if (!results.length) {
    dom.searchDropdown.innerHTML = `<div class="search-dropdown__empty">No trips found.</div>`;
    return;
  }
  dom.searchDropdown.innerHTML = results.map((r) => {
    const dep = _fmtDate(r.departureDate);
    const arr = _fmtDate(r.arrivalDate);
    const multiDay = r.arrivalDate && r.departureDate !== r.arrivalDate;
    const sub = [r.customer, r.contactName].filter(Boolean).join(" · ");
    return `
<button class="search-dropdown__item" type="button"
        data-tripkey="${escHtml(r.tripKey)}"
        data-departure="${escHtml(r.departureDate || "")}">
  <span class="search-dropdown__row1">
    <span class="search-dropdown__dest">${escHtml(r.destination || "—")}</span>
    <span class="search-dropdown__dates">${escHtml(dep)}</span>
  </span>
  <span class="search-dropdown__row2">
    <span class="search-dropdown__meta">${escHtml(sub)}</span>
    ${multiDay ? `<span class="search-dropdown__dates">${escHtml(arr)}</span>` : ""}
  </span>
</button>`;
  }).join("");
}

async function jumpToSearchResult(tripKey, departureDate) {
  closeSearch();
  if (!confirmDiscardIfDirty()) return;

  const targetDate = parseYMD(departureDate);
  if (targetDate) {
    state.currentDate = startOfWeek(targetDate);
    updateWeekDates();
  }

  await openTripForEdit(tripKey);

  // Select the trip bar once the schedule finishes rendering
  await waitForAgendaPaint();
  const bar = document.querySelector(
    `.schedule-grid__trip-bar[data-tripkey="${CSS.escape(tripKey)}"]`
  );
  if (bar) selectTripBar(bar);
}
