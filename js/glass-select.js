// ======================================================
function wrapSelectInGlassDropdown(sel, opts) {
  const { statusId, rebuildMenuOnOpen, cellClass, searchable } = opts || {};
  const statusIds = new Set([
    "itineraryStatus",
    "contactStatus",
    "paymentStatus",
    "driverStatus",
    "invoiceStatus",
  ]);

  const wrapper = document.createElement("div");
  wrapper.className = "dropdown select-dropdown" + (cellClass ? " " + cellClass : "");
  wrapper.dataset.selectName = sel.name || "";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "dropdown__menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  // Mutually Exclusive: Close when any other floating menu opens
  window.addEventListener("close-all-floating-menus", closeMenu);

  function getSelectedText() {
    const opt = sel.options[sel.selectedIndex];
    return opt ? opt.textContent.trim() : "";
  }

  function getBusDriverRoleIcon(name) {
    if (name.includes("_driver1Status")) return "person";
    if (name.includes("_driver2Status")) return "person";
    if (name.includes("_driver3Status") || name.includes("_driver4Status")) return "emergency_home";
    return "";
  }

  function getBusDriverNameIcon(name) {
    if (!name) return "";
    if (/_driver1$/.test(name)) return "person";
    if (/_driver2$/.test(name)) return "group";
    if (/_driver3$/.test(name) || /_driver4$/.test(name)) return "emergency_home";
    return "";
  }

  function getSelectedIcon() {
    const opt = sel.options[sel.selectedIndex];
    if (opt) {
      // Bus grid driver status selects: check slot name first for role icon
      if (sel.name) {
        const roleIcon = getBusDriverRoleIcon(sel.name);
        if (roleIcon) return roleIcon;
      }
      // All other status fields: use statusId-based icon
      if (statusId && statusIds.has(statusId)) {
        return getStatusIcon(statusId, opt.value);
      }
    }
    return "";
  }

  function getStatusColorClass(id, v) {
    if (!v) return "";
    let addClass = "";
    if (id === "driverStatus") {
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
    return addClass;
  }

  function updateTrigger() {
    trigger.innerHTML = "";
    const v = (sel.value ?? "").trim();

    const roleIcon = getBusDriverNameIcon(sel.name);
    if (roleIcon) {
      const iconSpan = document.createElement("span");
      iconSpan.className = "material-symbols-outlined driver-role-icon";
      iconSpan.setAttribute("aria-hidden", "true");
      iconSpan.textContent = roleIcon;
      trigger.appendChild(iconSpan);
    }

    const textSpan = document.createElement("span");
    textSpan.style.flex = "1";
    textSpan.style.textAlign = "left";
    textSpan.textContent = getSelectedText();
    trigger.appendChild(textSpan);

    if (statusId && statusIds.has(statusId)) updateStatusSelect(sel);
    trigger.classList.toggle("is-empty", !v || v === "None");
  }

  function populateMenu() {
    menu.innerHTML = "";

    if (searchable) {
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.className = "dropdown__search";
      searchInput.placeholder = "Search…";
      searchInput.setAttribute("aria-label", "Search options");
      // Prevent clicks inside input from closing the menu
      searchInput.addEventListener("click", (e) => e.stopPropagation());
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const first = menu.querySelector(".dropdown__item:not([hidden])");
          if (first) first.click();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const first = menu.querySelector(".dropdown__item:not([hidden])");
          if (first) first.focus();
        } else if (e.key === "Escape") {
          closeMenu();
        }
      });
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        menu.querySelectorAll(".dropdown__item").forEach((btn) => {
          btn.hidden = q !== "" && !btn.textContent.trim().toLowerCase().includes(q);
        });
      });
      menu.appendChild(searchInput);
    }

    Array.from(sel.options).forEach((opt) => {
      if (opt.disabled && !String(opt.value).trim()) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dropdown__item";
      btn.setAttribute("role", "option");
      btn.dataset.value = opt.value;

      const v = String(opt.value).trim();
      const lcValue = v.toLowerCase();
      // Add icon if applicable to the dropdown options
      const isStatusField =
        (statusId && statusIds.has(statusId)) || (sel.name && sel.name.endsWith("Status"));
      if (isStatusField && v) {
        // Apply status color class to button (icons removed, but colors remain via class)
        const colorClass = getStatusColorClass(
          statusId || "driverStatus",
          lcValue,
        );
        if (colorClass) {
          btn.classList.add(colorClass);
        }
      }

      const itemTextSpan = document.createElement("span");
      itemTextSpan.style.flex = "1";
      itemTextSpan.textContent = opt.textContent.trim();
      btn.appendChild(itemTextSpan);

      // Warn if this driver is already booked on another overlapping trip
      const isPrimaryConflict = v && v !== "None" && state.driverConflicts?.has(v);
      const isReliefConflict = v && v !== "None" && state.driverReliefConflicts?.has(v);
      if (isPrimaryConflict || isReliefConflict) {
        btn.classList.add("driver-conflict-item");
        const warnIcon = document.createElement("span");
        warnIcon.className = "material-symbols-outlined dropdown__conflict-icon";
        warnIcon.textContent = isPrimaryConflict ? "person" : "emergency_home";
        warnIcon.title = isPrimaryConflict
          ? `${v} is already assigned as a driver on these dates`
          : `${v} is already assigned as a relief driver on these dates`;
        btn.appendChild(warnIcon);
      }

      btn.addEventListener("click", () => {
        sel.value = opt.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        updateTrigger();
        closeMenu();

        // If this is part of the bus grid, sync the empty states (e.g., hide/show status)
        if (sel.closest(".bus-assign")) {
          syncBusSelectEmptyState();
        }
      });
      menu.appendChild(btn);
    });
  }

  function closeMenu() {
    menu.hidden = true;
    menu.classList.remove("dropdown__menu--up");
    trigger.setAttribute("aria-expanded", "false");
    trigger.classList.remove("is-open");
    document.removeEventListener("click", outsideClick);
    document.removeEventListener("keydown", handleEscape);
  }

  function handleEscape(e) {
    if (e.key === "Escape") closeMenu();
  }

  function outsideClick(e) {
    if (!wrapper.contains(e.target)) closeMenu();
  }

  sel.parentNode.insertBefore(wrapper, sel);
  wrapper.appendChild(sel);
  sel.classList.add("select-native");

  // Portal: attach menu to body so overflow:hidden on ancestor cards can't clip it
  menu.style.position = "fixed";
  menu.style.zIndex = "10500";
  menu.style.insetInlineEnd = "auto"; // reset CSS default that would anchor to viewport right edge
  document.body.appendChild(menu);

  function positionMenu() {
    const triggerRect = trigger.getBoundingClientRect();
    const gap = 4;
    const cssMaxH = 300; // must match dropdown.css max-height
    const spaceBelow = window.innerHeight - triggerRect.bottom - gap;
    const spaceAbove = triggerRect.top - gap;
    // Open upward when there's meaningfully more room above than below
    const openUpward = spaceAbove > spaceBelow && spaceAbove > 80;
    menu.classList.toggle("dropdown__menu--up", openUpward);
    menu.style.left = triggerRect.left + "px";
    menu.style.minWidth = triggerRect.width + "px";
    if (openUpward) {
      menu.style.top = "auto";
      menu.style.bottom = (window.innerHeight - triggerRect.top + gap) + "px";
      menu.style.maxHeight = Math.min(cssMaxH, spaceAbove) + "px";
    } else {
      menu.style.top = (triggerRect.bottom + gap) + "px";
      menu.style.bottom = "auto";
      menu.style.maxHeight = Math.min(cssMaxH, spaceBelow) + "px";
    }
  }

  if (!rebuildMenuOnOpen) populateMenu();

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.hidden) {
      closeAllFloatingMenus();
      if (rebuildMenuOnOpen) populateMenu();
      positionMenu();
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      trigger.classList.add("is-open");
      document.addEventListener("click", outsideClick);
      document.addEventListener("keydown", handleEscape);
      if (searchable) {
        const searchInput = menu.querySelector(".dropdown__search");
        if (searchInput) {
          searchInput.value = "";
          menu.querySelectorAll(".dropdown__item").forEach((btn) => (btn.hidden = false));
          requestAnimationFrame(() => searchInput.focus());
        }
      }
    } else {
      closeMenu();
    }
  });

  wrapper.appendChild(trigger);

  sel.addEventListener("change", updateTrigger);
  updateTrigger();
}

function initGlassSelects() {
  const statusIds = new Set([
    "itineraryStatus",
    "contactStatus",
    "paymentStatus",
    "driverStatus",
    "invoiceStatus",
  ]);
  const ids = [
    "busesNeeded",
    "itineraryStatus",
    "contactStatus",
    "paymentStatus",
    "driverStatus",
    "invoiceStatus",
    "quoteLDRate",
    "quoteSeasonalRate",
    "quoteDiscountType",
    "quoteReliefDriver",
    "quoteCCFeeToggle",
    "quoteHalfDay",
    "quoteTotalDaysInput",
  ];
  ids.forEach((id) => {
    const sel = $(id);
    if (!sel || sel.tagName !== "SELECT") return;
    wrapSelectInGlassDropdown(sel, { statusId: id });
  });

  // Bus assignment and driver selects (dynamic options, rebuild menu on open)
  dom.busGrid?.querySelectorAll("select").forEach((sel) => {
    const isStatus = sel.name && sel.name.endsWith("Status");
    wrapSelectInGlassDropdown(sel, {
      rebuildMenuOnOpen: true,
      cellClass: isStatus ? "bus-assign__status-cell" : "bus-assign__cell",
      statusId: isStatus ? "driverStatus" : null,
      searchable: !isStatus,
    });
  });
}

