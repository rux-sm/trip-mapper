// ======================================================
function wrapSelectDropdown(sel, opts) {
  const {
    statusId,
    rebuildMenuOnOpen,
    cellClass,
    centeredMenu,
    centerMenuPosition = centeredMenu,
    centerToggle = centeredMenu,
    centerItems = centeredMenu,
    placeholderText,
  } = opts || {};
  const statusIds = new Set([
    "itineraryStatus",
    "contactStatus",
    "paymentStatus",
    "driverStatus",
    "invoiceStatus",
  ]);

  const wrapper = document.createElement("div");
  wrapper.className = "rux-dropdown" + (cellClass ? " " + cellClass : "");
  wrapper.dataset.selectName = sel.name || "";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "rux-dropdown__toggle";
  if (centerToggle) trigger.classList.add("rux-dropdown__toggle--centered");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "rux-dropdown__menu";
  if (centerMenuPosition) menu.classList.add("rux-dropdown__menu--centered");
  menu.setAttribute("role", "listbox");
  menu.hidden = true;
  let closeTimer = null;

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

    const textSpan = document.createElement("span");
    textSpan.className = "rux-dropdown__label";
    const isEmpty = !v || v === "None";
    textSpan.textContent = isEmpty && placeholderText ? placeholderText : getSelectedText();
    trigger.appendChild(textSpan);

    if (statusId && statusIds.has(statusId)) updateStatusSelect(sel);
    trigger.classList.toggle("is-empty", isEmpty);
    syncMenuSelection();
  }

  function syncMenuSelection() {
    menu.querySelectorAll(".rux-dropdown__item").forEach((btn) => {
      const isSelected = btn.dataset.value === sel.value;
      btn.classList.toggle("rux-dropdown__item--active", isSelected);
      btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  function populateMenu() {
    menu.innerHTML = "";

    Array.from(sel.options).forEach((opt) => {
      if (opt.disabled && !String(opt.value).trim()) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rux-dropdown__item";
      if (centerItems) btn.classList.add("rux-dropdown__item--centered");
      btn.setAttribute("role", "option");
      btn.dataset.value = opt.value;

      const v = String(opt.value).trim();
      const isSelected = opt.value === sel.value;
      btn.classList.toggle("rux-dropdown__item--active", isSelected);
      btn.setAttribute("aria-selected", isSelected ? "true" : "false");
      const lcValue = v.toLowerCase();
      // Add icon if applicable to the dropdown options
      const isStatusField =
        (statusId && statusIds.has(statusId)) || (sel.name && sel.name.endsWith("Status"));
      if (isStatusField && v) {
        // Apply status color class to button (icons removed, but colors remain via class)
        const colorClass = getStatusColorClass(statusId || "driverStatus", lcValue);
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
        btn.classList.add("rux-dropdown__item--conflict");
        const warnIcon = document.createElement("span");
        warnIcon.className = "material-symbols-outlined rux-dropdown__conflict-icon";
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
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    wrapper.classList.remove("is-open");
    menu.classList.remove("is-open");
    menu.classList.remove("rux-dropdown__menu--up");
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", outsideClick);
    document.removeEventListener("keydown", handleEscape);
    window.removeEventListener("scroll", positionMenu, true);
    window.removeEventListener("resize", positionMenu);
    closeTimer = setTimeout(() => {
      menu.hidden = true;
      closeTimer = null;
    }, 160);
  }

  function handleEscape(e) {
    if (e.key === "Escape") closeMenu();
  }

  function outsideClick(e) {
    if (!wrapper.contains(e.target)) closeMenu();
  }

  sel.parentNode.insertBefore(wrapper, sel);
  wrapper.appendChild(sel);
  sel.classList.add("rux-dropdown__native");

  // Portal: attach menu to body so overflow:hidden on ancestor cards can't clip it
  menu.style.position = "fixed";
  menu.style.zIndex = "10500";
  menu.style.insetInlineEnd = "auto"; // reset CSS default that would anchor to viewport right edge
  document.body.appendChild(menu);

  function positionMenu() {
    const triggerRect = trigger.getBoundingClientRect();
    const cs = getComputedStyle(menu);
    const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    function toPx(raw) {
      raw = (raw || "").trim();
      return raw.endsWith("rem") ? parseFloat(raw) * rootFs : parseFloat(raw) || 0;
    }
    const gap = toPx(cs.getPropertyValue("--dropdown-gap")) || 4;
    const edgePad = toPx(cs.getPropertyValue("--dropdown-edge-pad")) || 8;
    const spaceBelow = window.innerHeight - triggerRect.bottom - gap - edgePad;
    const spaceAbove = triggerRect.top - gap - edgePad;
    // Open upward when there's meaningfully more room above than below
    const openUpward = spaceAbove > spaceBelow && spaceAbove > 80;
    menu.classList.toggle("rux-dropdown__menu--up", openUpward);
    if (menu.classList.contains("rux-dropdown__menu--centered")) {
      menu.style.left = triggerRect.left + triggerRect.width / 2 + "px";
    } else {
      menu.style.left = triggerRect.left + "px";
    }
    menu.style.minWidth = triggerRect.width + "px";
    if (openUpward) {
      menu.style.top = "auto";
      menu.style.bottom = window.innerHeight - triggerRect.top + gap + "px";
      menu.style.maxHeight = spaceAbove + "px";
    } else {
      menu.style.top = triggerRect.bottom + gap + "px";
      menu.style.bottom = "auto";
      menu.style.maxHeight = spaceBelow + "px";
    }
  }

  if (!rebuildMenuOnOpen) populateMenu();

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.hidden) {
      closeAllFloatingMenus();
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      if (rebuildMenuOnOpen) populateMenu();
      syncMenuSelection();
      positionMenu();
      menu.hidden = false;
      requestAnimationFrame(() => {
        wrapper.classList.add("is-open");
        menu.classList.add("is-open");
      });
      trigger.setAttribute("aria-expanded", "true");
      document.addEventListener("click", outsideClick);
      document.addEventListener("keydown", handleEscape);
      window.addEventListener("scroll", positionMenu, true);
      window.addEventListener("resize", positionMenu);
    } else {
      closeMenu();
    }
  });

  wrapper.appendChild(trigger);

  sel.addEventListener("change", updateTrigger);
  updateTrigger();
}

function initSelectWrappers() {
  const statusIds = new Set([
    "itineraryStatus",
    "contactStatus",
    "paymentStatus",
    "driverStatus",
    "invoiceStatus",
  ]);
  const ids = [
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
    wrapSelectDropdown(sel, { statusId: id });
  });

  // Bus assignment and driver selects (dynamic options, rebuild menu on open)
  dom.busGrid?.querySelectorAll("select").forEach((sel) => {
    if (sel.closest(".rux-dropdown")) return;
    const isStatus = sel.name && sel.name.endsWith("Status");
    const isBus = !!sel.closest(".bus-assign__bus-cell");
    const cellClass = isStatus
      ? "bus-assign__status-cell"
      : isBus
        ? "bus-assign__cell bus-assign__bus-select"
        : "bus-assign__cell bus-assign__driver-select";
    wrapSelectDropdown(sel, {
      rebuildMenuOnOpen: true,
      cellClass,
      statusId: isStatus ? "driverStatus" : null,
      centeredMenu: isBus,
      centerMenuPosition: !isStatus,
      placeholderText: isBus ? "Bus #" : isStatus ? "" : "Assign driver",
    });
  });
}
