// ======================================================
// REFERENCE MANAGER — drivers + vehicles
// ======================================================
const REF_DRIVER_FIELDS = [
  { key: "driverId", label: "Driver ID", required: true },
  { key: "driverName", label: "Display Name", required: true },
  { key: "driverNameFull", label: "Legal Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "addressLine1", label: "Address" },
  { key: "addressLine2", label: "Address 2" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "ZIP" },
  { key: "cdlNumber", label: "CDL #" },
  { key: "cdlClass", label: "CDL Class" },
  { key: "cdlState", label: "CDL State" },
  { key: "cdlExpiration", label: "CDL Expiration", type: "date" },
  { key: "medicalCardExpiration", label: "Medical Card Exp.", type: "date" },
  { key: "hireDate", label: "Hire Date", type: "date" },
  { key: "dateOfBirth", label: "Date of Birth", type: "date" },
  { key: "ssnLast4", label: "SSN Last 4" },
  { key: "emergencyContactName", label: "Emergency Contact" },
  { key: "emergencyContactPhone", label: "Emergency Phone" },
  {
    key: "status",
    label: "Status",
    options: [
      ["", ""],
      ["Full-Time", "Full-Time"],
      ["Part-Time", "Part-Time"],
    ],
  },
  { key: "priority", label: "Order", type: "number" },
  { key: "notes", label: "Notes", type: "textarea" },
];

const REF_DRIVER_FIELD_GROUPS = [
  {
    key: "profile",
    label: "Profile",
    fields: [
      { key: "driverId", label: "Driver ID", required: true },
      { key: "driverName", label: "Display Name", required: true },
      { key: "driverNameFull", label: "Legal Name" },
      {
        key: "status",
        label: "Status",
        options: [
          ["", ""],
          ["Full-Time", "Full-Time"],
          ["Part-Time", "Part-Time"],
        ],
      },
      { key: "priority", label: "Order", type: "number" },
      { key: "hireDate", label: "Hire Date", type: "date" },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      { key: "ssnLast4", label: "SSN Last 4" },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    fields: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email", type: "email" },
      { key: "addressLine1", label: "Address" },
      { key: "addressLine2", label: "Address 2" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip", label: "ZIP" },
    ],
  },
  {
    key: "compliance",
    label: "CDL",
    fields: [
      { key: "cdlNumber", label: "CDL #" },
      { key: "cdlExpiration", label: "CDL Expiration", type: "date" },
      { key: "cdlClass", label: "CDL Class" },
      { key: "cdlState", label: "CDL State" },
      { key: "medicalCardExpiration", label: "Medical Card Exp.", type: "date" },
    ],
  },
  {
    key: "emergency",
    label: "Emergency",
    fields: [
      { key: "emergencyContactName", label: "Emergency Contact" },
      { key: "emergencyContactPhone", label: "Emergency Phone" },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    fields: [{ key: "notes", label: "Notes", type: "textarea" }],
  },
];

const REF_BUS_FIELDS = [
  { key: "busId", label: "Bus ID", required: true },
  { key: "busName", label: "Schedule Name", required: true },
  { key: "orderNum", label: "Schedule Order", type: "number" },
  { key: "vin", label: "VIN" },
  { key: "year", label: "Year", type: "number" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "color", label: "Color" },
  { key: "plateNumber", label: "Plate #" },
  { key: "plateState", label: "Plate State" },
  { key: "registrationExpiration", label: "Registration Exp.", type: "date" },
  { key: "insuranceExpiration", label: "Insurance Exp.", type: "date" },
  { key: "capacity", label: "Capacity", type: "number" },
  { key: "liftCapacity", label: "Lift Capacity", type: "number" },
  { key: "wheelchairCapacity", label: "Wheelchair Capacity", type: "number" },
  { key: "fuelType", label: "Fuel Type" },
  { key: "mileage", label: "Mileage", type: "number" },
  { key: "busColor", label: "Schedule Color" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes", type: "textarea" },
];

let refManagerDrivers = [];
let refManagerBuses = [];
let refManagerSelectedIds = {
  drivers: "",
  buses: "",
};
let refManagerDraftDriver = null;
let refManagerLoaded = false;

function makeRefId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function refBool(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function refSortDrivers(drivers) {
  return sortDriversForDisplay(drivers);
}

function refSortBuses(buses) {
  return [...buses].sort((a, b) => {
    const ao = Number(a.orderNum) || 9999;
    const bo = Number(b.orderNum) || 9999;
    return (
      ao - bo ||
      String(a.busName || a.busId || "").localeCompare(String(b.busName || b.busId || ""))
    );
  });
}

function countTripsForDriver(driverName) {
  const needle = String(driverName || "")
    .trim()
    .toLowerCase();
  if (!needle) return 0;
  let count = 0;
  for (const assigns of Object.values(state.assignmentsByTripKey || {})) {
    if (
      (assigns || []).some((a) =>
        [a.driver1, a.driver2, a.driver3, a.driver4].some(
          (name) =>
            String(name || "")
              .trim()
              .toLowerCase() === needle,
        ),
      )
    )
      count++;
  }
  return count;
}

function countTripsForBus(busId) {
  const id = String(busId || "").trim();
  if (!id) return 0;
  let count = 0;
  for (const assigns of Object.values(state.assignmentsByTripKey || {})) {
    if ((assigns || []).some((a) => String(a.busId || "").trim() === id)) count++;
  }
  return count;
}

function getRefItems(kind) {
  return kind === "drivers" ? refSortDrivers(refManagerDrivers) : refSortBuses(refManagerBuses);
}

function getRefBody(kind) {
  return kind === "drivers" ? dom.driverManagerBody : dom.fleetManagerBody;
}

function getSelectedRefItem(kind) {
  const idKey = kind === "drivers" ? "driverId" : "busId";
  if (
    kind === "drivers" &&
    refManagerDraftDriver &&
    String(refManagerDraftDriver.driverId || "") === refManagerSelectedIds.drivers
  ) {
    return refManagerDraftDriver;
  }
  return (
    getRefItems(kind).find((item) => String(item[idKey] || "") === refManagerSelectedIds[kind]) ||
    null
  );
}

function getReferenceScrollState(body) {
  const list = body?.querySelector?.(".reference-manager__items");
  return {
    bodyScrollTop: body?.scrollTop || 0,
    listScrollTop: list?.scrollTop || 0,
  };
}

function restoreReferenceScrollState(body, scrollState, focusRefId = "") {
  if (!body || !scrollState) return;
  const list = body.querySelector?.(".reference-manager__items");
  if (typeof body.scrollTop === "number") body.scrollTop = scrollState.bodyScrollTop || 0;
  if (list && typeof list.scrollTop === "number") {
    list.scrollTop = scrollState.listScrollTop || 0;
  }

  if (!focusRefId) return;
  const keepCardVisible = () => {
    const container = list || body;
    if (!container?.getBoundingClientRect) return;
    const card = Array.from(body.querySelectorAll?.("[data-ref-id]") || []).find(
      (el) => el.dataset.refId === focusRefId,
    );
    if (!card?.getBoundingClientRect) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const breathingRoom = 8;
    if (cardRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - cardRect.top + breathingRoom;
    } else if (cardRect.bottom > containerRect.bottom) {
      container.scrollTop += cardRect.bottom - containerRect.bottom + breathingRoom;
    }
  };

  if (typeof requestAnimationFrame === "function") requestAnimationFrame(keepCardVisible);
  else keepCardVisible();
}

function renderReferenceManager(kind, options = {}) {
  const body = getRefBody(kind);
  if (!body) return;
  const scrollState = options.preserveScroll ? getReferenceScrollState(body) : null;
  const isDrivers = kind === "drivers";
  const items = getRefItems(kind);
  const selected = getSelectedRefItem(kind);
  const idKey = isDrivers ? "driverId" : "busId";

  if (isDrivers) {
    const driverItems = refManagerDraftDriver ? [refManagerDraftDriver, ...items] : items;
    body.innerHTML = renderDriverAccordionManager(driverItems, idKey, kind);
    restoreReferenceScrollState(body, scrollState, options.focusRefId || "");
    return;
  }

  body.innerHTML = `
    <div class="reference-manager__layout" data-ref-kind="${kind}">
      <aside class="reference-manager__list">
        <div class="reference-manager__list-head">
          <strong>${isDrivers ? "Drivers" : "Vehicles"}</strong>
          <button type="button" class="rux-btn rux-btn--secondary rux-btn--sm" data-ref-action="new">
            <span class="material-symbols-outlined">add</span>
            Add
          </button>
        </div>
        <div class="reference-manager__items">
          ${items.map((item, idx) => renderRefListItem(item, idx, idKey, isDrivers, kind)).join("")}
        </div>
      </aside>
      <section class="reference-manager__editor">
        ${renderRefEditor(selected, isDrivers, kind)}
      </section>
    </div>
  `;
  restoreReferenceScrollState(body, scrollState, options.focusRefId || "");
}

function renderDriverAccordionManager(items, idKey, kind) {
  return `
    <div class="reference-manager__layout reference-manager__layout--drivers" data-ref-kind="${kind}">
      <section class="reference-manager__list reference-manager__list--drivers">
        <div class="reference-manager__list-head">
          <strong>Drivers</strong>
        </div>
        <div class="reference-manager__items reference-manager__items--drivers">
          ${items.length ? items.map((item, idx) => renderRefDriverCard(item, idx, idKey)).join("") : renderRefEmptyDrivers()}
        </div>
        <div class="reference-manager__list-foot reference-manager__list-foot--drivers">
          <button type="button" class="rux-btn rux-btn--secondary" data-ref-action="new">
            <span class="material-symbols-outlined">add</span>
            Add Driver
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderRefEmptyDrivers() {
  return `
    <div class="reference-manager__empty">
      No drivers loaded.
    </div>
  `;
}

function renderRefDriverCard(item, idx, idKey) {
  const id = String(item[idKey] || "");
  const active = refBool(item.active);
  const expanded = id === refManagerSelectedIds.drivers;
  const title =
    getRefDriverValue(item, "driverName") ||
    getRefDriverValue(item, "driverNameFull") ||
    id ||
    "New Driver";
  const phone = getRefDriverValue(item, "phone") || "No phone";
  const employmentType = getRefDriverEmploymentType(item);
  const panelId = `driverAccordion_${idx}_${id.replace(/[^a-zA-Z0-9_-]/g, "") || "new"}`;

  return `
    <article class="reference-manager__driver-card ${expanded ? "is-expanded" : ""} ${active ? "" : "is-inactive"}" data-ref-id="${escHtml(id)}">
      <button
        type="button"
        class="reference-manager__driver-summary"
        data-ref-driver-toggle
        aria-expanded="${expanded ? "true" : "false"}"
        aria-controls="${escHtml(panelId)}"
      >
        ${renderRefDriverAvatar(item, title)}
        <span class="reference-manager__driver-copy">
          <span class="reference-manager__driver-row reference-manager__driver-row--top">
            <strong class="reference-manager__driver-name">${escHtml(title)}</strong>
            <span class="reference-manager__driver-status ${active ? "" : "is-inactive"}">
              <span class="reference-manager__status-dot"></span>
              ${active ? "Active" : "Inactive"}
            </span>
          </span>
          <span class="reference-manager__driver-row reference-manager__driver-row--middle">
            <span class="reference-manager__driver-phone">
              <span class="material-symbols-outlined" aria-hidden="true">call</span>
              <span>${escHtml(phone)}</span>
            </span>
            <span class="reference-manager__driver-employment">${escHtml(employmentType)}</span>
          </span>
          <span class="reference-manager__driver-row reference-manager__driver-row--compliance">
            ${renderRefDriverCompliance(item)}
          </span>
        </span>
      </button>
      <button
        type="button"
        class="reference-manager__driver-chevron"
        data-ref-driver-toggle
        aria-label="${expanded ? "Collapse driver" : "Expand driver"}"
        aria-expanded="${expanded ? "true" : "false"}"
        aria-controls="${escHtml(panelId)}"
      >
        <span class="material-symbols-outlined">${expanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}</span>
      </button>
      <div class="reference-manager__driver-accordion" id="${escHtml(panelId)}">
        ${expanded ? renderRefDriverInlineEditor(item) : ""}
      </div>
    </article>
  `;
}

function renderRefDriverAvatar(item, title) {
  const avatarUrl = item.avatarUrl || item.avatar_url || item.photoUrl || item.photo_url || "";
  const initials = getRefDriverInitials(title);
  if (avatarUrl) {
    return `
      <span class="reference-manager__driver-avatar">
        <img src="${escHtml(avatarUrl)}" alt="${escHtml(title)}" loading="lazy" />
      </span>
    `;
  }
  return `
    <span class="reference-manager__driver-avatar reference-manager__driver-avatar--initials" aria-hidden="true">
      ${escHtml(initials)}
    </span>
  `;
}

function getRefDriverInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "DR";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getRefDriverEmploymentType(item) {
  return (
    item.employmentType ||
    item.employment_type ||
    item.driverType ||
    item.driver_type ||
    getRefDriverValue(item, "status") ||
    "Full-Time"
  );
}

function getRefDriverValue(source, key) {
  if (!source) return "";
  const aliasKeyByCanonical = {
    driverNameFull: ["full_name", "fullName"],
    phone: ["phone_number", "driverPhone"],
    notes: ["driver_notes", "driverNotes"],
    dateOfBirth: ["date_of_birth"],
    ssnLast4: ["ssn_last4"],
  };
  if (source[key] != null && source[key] !== "") return source[key];
  const aliases = aliasKeyByCanonical[key] || [];
  for (const alias of aliases) {
    if (source[alias] != null && source[alias] !== "") return source[alias];
  }
  return "";
}

function renderRefDriverCompliance(item) {
  return `
    <span class="reference-manager__driver-date">
      <span>CDL #</span>
      <strong>${escHtml(getRefDriverValue(item, "cdlNumber") || "Not set")}</strong>
    </span>
    ${renderRefDriverDate("EXP", getRefDriverValue(item, "cdlExpiration"))}
    ${renderRefDriverDate("Med EXP", getRefDriverValue(item, "medicalCardExpiration"))}
  `;
}

function renderRefDriverDate(label, value) {
  const warning = isRefDateExpiredOrSoon(value);
  return `
    <span class="reference-manager__driver-date">
      <span>${escHtml(label)}</span>
      <strong class="${warning ? "is-warning" : ""}">${escHtml(formatRefDate(value))}</strong>
    </span>
  `;
}

function formatRefDate(value) {
  if (!value) return "Not set";
  const date = parseYMD(value);
  if (!date) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function isRefDateExpiredOrSoon(value) {
  const date = parseYMD(value);
  if (!date) return false;
  const today = parseYMD(ymd(new Date()));
  const soon = addDays(today, 30);
  return date <= soon;
}

function renderRefDriverInlineEditor(item) {
  return `
    <form class="reference-manager__form reference-manager__driver-form" data-ref-form="drivers">
      <div class="reference-manager__driver-form-head">
        <label class="reference-manager__active reference-manager__driver-active">
          <input type="checkbox" name="active" ${refBool(item.active) ? "checked" : ""} />
          Active
        </label>
      </div>
      <div class="reference-manager__driver-tabs">
        ${REF_DRIVER_FIELD_GROUPS.map((group, idx) => renderRefDriverTab(group, idx === 0)).join("")}
      </div>
      <div class="reference-manager__driver-panels">
        ${REF_DRIVER_FIELD_GROUPS.map((group, idx) => renderRefDriverPanel(group, item, idx === 0)).join("")}
      </div>
      <div class="reference-manager__actions reference-manager__driver-actions">
        <button type="button" class="rux-btn rux-btn--danger" data-ref-action="delete-driver">
          <span class="material-symbols-outlined">delete</span>
          Delete
        </button>
        <button type="submit" class="rux-btn rux-btn--primary">
          <span class="material-symbols-outlined">save</span>
          Save
        </button>
      </div>
    </form>
  `;
}

function renderRefDriverTab(group, active) {
  return `
    <button
      type="button"
      class="reference-manager__driver-tab ${active ? "is-active" : ""}"
      data-ref-driver-tab="${escHtml(group.key)}"
    >
      ${escHtml(group.label)}
    </button>
  `;
}

function renderRefDriverPanel(group, item, active) {
  return `
    <section class="reference-manager__driver-panel ${active ? "is-active" : ""}" data-driver-panel="${escHtml(group.key)}" ${active ? "" : "hidden"}>
      <div class="reference-manager__driver-fields">
        ${group.fields.map((field) => renderRefField(field, item)).join("")}
      </div>
    </section>
  `;
}

function renderRefListItem(item, idx, idKey, isDrivers, kind) {
  const id = String(item[idKey] || "");
  const active = refBool(item.active);
  const selected = id === refManagerSelectedIds[kind];
  const title = isDrivers ? item.driverName || item.driverNameFull || id : item.busName || id;
  const meta = isDrivers
    ? `${countTripsForDriver(item.driverName)} trips loaded`
    : `${countTripsForBus(item.busId)} trips loaded`;
  return `
    <button type="button" class="reference-manager__item ${selected ? "is-selected" : ""} ${active ? "" : "is-inactive"}" data-ref-id="${escHtml(id)}">
      <span>
        <strong>${escHtml(title || "Untitled")}</strong>
        <small>${escHtml(meta)}${active ? "" : " · inactive"}</small>
      </span>
      ${!isDrivers ? `<span class="reference-manager__order">${idx + 1}</span>` : ""}
    </button>
  `;
}

function renderRefEditor(item, isDrivers, kind) {
  const fields = isDrivers ? REF_DRIVER_FIELDS : REF_BUS_FIELDS;
  const idKey = isDrivers ? "driverId" : "busId";
  const fresh = !item;
  const source = item || {
    [idKey]: makeRefId(isDrivers ? "driver" : "bus"),
    active: true,
    priority: refManagerDrivers.length + 1,
    orderNum: refManagerBuses.length + 1,
  };
  return `
    <form class="reference-manager__form" data-ref-form="${kind}">
      <div class="reference-manager__editor-head">
        <div>
          <h3>${fresh ? "New" : "Edit"} ${isDrivers ? "Driver" : "Vehicle"}</h3>
          <p>${isDrivers ? "Profile, compliance, and contact details." : "Schedule order, equipment, registration, and specs."}</p>
        </div>
        <label class="reference-manager__active">
          <input type="checkbox" name="active" ${refBool(source.active) ? "checked" : ""} />
          Active
        </label>
      </div>
      <div class="reference-manager__field-grid">
        ${fields.map((field) => renderRefField(field, source)).join("")}
        ${!isDrivers ? renderBusEquipmentFields(source) : ""}
      </div>
      <div class="reference-manager__actions">
        ${
          !isDrivers
            ? `
          <button type="button" class="rux-btn rux-btn--secondary" data-ref-action="move-up">
            <span class="material-symbols-outlined">arrow_upward</span>
            Up
          </button>
          <button type="button" class="rux-btn rux-btn--secondary" data-ref-action="move-down">
            <span class="material-symbols-outlined">arrow_downward</span>
            Down
          </button>
        `
            : ""
        }
        <button type="button" class="rux-btn rux-btn--secondary" data-ref-action="deactivate">
          <span class="material-symbols-outlined">archive</span>
          Remove
        </button>
        <button type="submit" class="rux-btn rux-btn--primary">
          <span class="material-symbols-outlined">save</span>
          Save
        </button>
      </div>
    </form>
  `;
}

function renderRefField(field, source) {
  const fallback = getRefDriverValue(source, field.key);
  const value =
    source[field.key] != null && source[field.key] !== "" ? source[field.key] : fallback;
  const textarea = field.type === "textarea";
  const options = field.options || null;
  const hasCurrentOption =
    !options || options.some(([optionValue]) => String(optionValue) === String(value));
  return `
    <label class="reference-manager__field ${textarea ? "reference-manager__field--wide" : ""}">
      <span>${escHtml(field.label)}</span>
      ${
        textarea
          ? `<textarea name="${field.key}">${escHtml(value)}</textarea>`
          : options
            ? `<select name="${field.key}" ${field.required ? "required" : ""}>
                ${hasCurrentOption ? "" : `<option value="${escHtml(value)}" selected>${escHtml(value)}</option>`}
                ${options
                  .map(
                    ([optionValue, optionLabel]) =>
                      `<option value="${escHtml(optionValue)}" ${String(optionValue) === String(value) ? "selected" : ""}>${escHtml(optionLabel)}</option>`,
                  )
                  .join("")}
              </select>`
            : `<input name="${field.key}" type="${field.type || "text"}" value="${escHtml(value)}" ${field.required ? "required" : ""} />`
      }
    </label>
  `;
}

function renderBusEquipmentFields(source) {
  return `
    <label class="reference-manager__check">
      <input type="checkbox" name="hasLift" ${refBool(source.hasLift) ? "checked" : ""} />
      ADA lift
    </label>
    <label class="reference-manager__check">
      <input type="checkbox" name="hasSleeper" ${refBool(source.hasSleeper) ? "checked" : ""} />
      Sleeper
    </label>
  `;
}

async function loadReferenceManagerData(force = false) {
  if (refManagerLoaded && !force) return;
  const bodies = [dom.driverManagerBody, dom.fleetManagerBody].filter(Boolean);
  bodies.forEach((body) => {
    if (!body.innerHTML.trim()) {
      body.innerHTML = `<div class="reference-manager__loading">Loading fleet data...</div>`;
    }
  });

  try {
    const [driversResp, busesResp] = await Promise.all([
      api.listDrivers(false),
      api.listBuses(false),
    ]);
    refManagerDrivers = driversResp?.drivers || [];
    refManagerBuses = busesResp?.buses || [];
    if (!refManagerSelectedIds.buses) {
      const firstBus = getRefItems("buses")[0];
      refManagerSelectedIds.buses = firstBus ? String(firstBus.busId || "") : "";
    }
    refManagerLoaded = true;
  } catch (err) {
    console.error(err);
    bodies.forEach((body) => {
      body.innerHTML = `<div class="reference-manager__loading">Could not load fleet data.</div>`;
    });
    toast("Could not load fleet data.", "danger", 2200);
  }
}

async function openReferenceManagerPanel(kind) {
  const body = getRefBody(kind);
  if (!body) return;
  await loadReferenceManagerData();
  if (!refManagerSelectedIds[kind]) {
    const first = getRefItems(kind)[0];
    const idKey = kind === "drivers" ? "driverId" : "busId";
    refManagerSelectedIds[kind] = kind === "drivers" ? "" : first ? String(first[idKey] || "") : "";
  }
  renderReferenceManager(kind);
}

function getRefFormPayload(form, isDrivers) {
  const data = new FormData(form);
  const fields = isDrivers ? REF_DRIVER_FIELDS : REF_BUS_FIELDS;
  const payload = {};
  fields.forEach((field) => {
    const raw = String(data.get(field.key) || "").trim();
    if (field.type === "number") {
      payload[field.key] = raw ? Number(raw) : null;
    } else if (field.type === "date") {
      payload[field.key] = raw || null;
    } else {
      payload[field.key] = raw;
    }
  });
  payload.active = data.get("active") === "on";
  if (isDrivers) {
    payload.driverNameFull = payload.driverNameFull || payload.full_name || "";
    payload.phone = payload.phone || payload.phone_number || "";
    payload.notes = payload.notes || payload.driver_notes || "";
    payload.driverName = payload.driverName || payload.driverNameFull || payload.driverId || "";
    payload.full_name = payload.driverNameFull;
    payload.phone_number = payload.phone;
    payload.driver_notes = payload.notes;
  }
  if (!isDrivers) {
    payload.hasLift = data.get("hasLift") === "on";
    payload.hasSleeper = data.get("hasSleeper") === "on";
  }
  return payload;
}

async function saveReferenceManagerItem(form) {
  const kind = form.dataset.refForm === "drivers" ? "drivers" : "buses";
  const isDrivers = kind === "drivers";
  const payload = getRefFormPayload(form, isDrivers);
  const idKey = isDrivers ? "driverId" : "busId";
  try {
    toast("Saving...", "info", 900);
    const resp = isDrivers ? await api.saveDriver(payload) : await api.saveBus(payload);
    const saved = resp.driver || resp.bus || payload;
    const list = isDrivers ? refManagerDrivers : refManagerBuses;
    const idx = list.findIndex((item) => String(item[idKey]) === String(saved[idKey]));
    if (idx >= 0) list[idx] = { ...list[idx], ...saved };
    else list.push(saved);
    refManagerSelectedIds[kind] = String(saved[idKey] || payload[idKey]);
    if (
      isDrivers &&
      refManagerDraftDriver &&
      String(refManagerDraftDriver.driverId || "") === refManagerSelectedIds.drivers
    ) {
      refManagerDraftDriver = null;
    }
    await loadDriversAndBuses(true);
    refManagerLoaded = false;
    await loadReferenceManagerData(true);
    renderReferenceManager(kind);
    toast("Saved.", "success", 1200);
  } catch (err) {
    console.error(err);
    toast("Could not save. Check reference-management schema columns.", "danger", 4500);
  }
}

async function deactivateReferenceManagerItem(kind, form = null) {
  const selected = getSelectedRefItem(kind);
  if (!selected && !form) return;
  const isDrivers = kind === "drivers";
  const label = isDrivers ? selected?.driverName : selected?.busName || selected?.busId;
  if (
    !confirm(
      `Remove ${label || "this record"} from active use? Existing trips will keep their history.`,
    )
  )
    return;
  const body = getRefBody(kind);
  const targetForm = form || body?.querySelector(".reference-manager__form");
  const activeInput = targetForm?.querySelector('[name="active"]');
  if (targetForm && activeInput) {
    activeInput.checked = false;
    await saveReferenceManagerItem(targetForm);
  }
}

async function deleteReferenceManagerDriver(form = null) {
  const selected = getSelectedRefItem("drivers");
  const payload = form ? getRefFormPayload(form, true) : null;
  const driverId = String(payload?.driverId || selected?.driverId || "").trim();
  const label = payload?.driverName || selected?.driverName || driverId || "this driver";

  if (!driverId) {
    refManagerDraftDriver = null;
    refManagerSelectedIds.drivers = "";
    renderReferenceManager("drivers", { preserveScroll: true });
    return;
  }

  if (
    refManagerDraftDriver &&
    String(refManagerDraftDriver.driverId || "") === driverId &&
    !refManagerDrivers.some((driver) => String(driver.driverId || "") === driverId)
  ) {
    refManagerDraftDriver = null;
    refManagerSelectedIds.drivers = "";
    renderReferenceManager("drivers", { preserveScroll: true });
    return;
  }

  if (
    !confirm(
      `Permanently delete ${label} from the Drivers table? Existing trips keep their typed driver name, but this driver will be removed from future selectors. This cannot be undone.`,
    )
  )
    return;

  try {
    toast("Deleting driver...", "info", 900);
    await api.deleteDriver(driverId);
    refManagerDrivers = refManagerDrivers.filter(
      (driver) => String(driver.driverId || "") !== driverId,
    );
    refManagerSelectedIds.drivers = "";
    if (refManagerDraftDriver && String(refManagerDraftDriver.driverId || "") === driverId) {
      refManagerDraftDriver = null;
    }
    await loadDriversAndBuses(true);
    refManagerLoaded = false;
    await loadReferenceManagerData(true);
    renderReferenceManager("drivers", { preserveScroll: true });
    toast("Driver deleted.", "success", 1400);
  } catch (err) {
    console.error(err);
    toast("Could not delete driver. Check permissions or table constraints.", "danger", 3600);
  }
}

async function moveSelectedBus(delta) {
  const ordered = refSortBuses(refManagerBuses);
  const idx = ordered.findIndex((bus) => String(bus.busId) === refManagerSelectedIds.buses);
  const nextIdx = idx + delta;
  if (idx < 0 || nextIdx < 0 || nextIdx >= ordered.length) return;
  const [bus] = ordered.splice(idx, 1);
  ordered.splice(nextIdx, 0, bus);
  ordered.forEach((item, i) => (item.orderNum = i + 1));
  refManagerBuses = ordered;
  renderReferenceManager("buses");
  try {
    await api.reorderBuses(ordered);
    await loadDriversAndBuses(true);
    toast("Vehicle order updated.", "success", 1000);
  } catch (err) {
    console.error(err);
    toast("Could not reorder vehicles.", "danger", 2200);
  }
}

function wireReferenceManager() {
  dom.driverManagerBtn?.addEventListener("click", () => toggleCard("driverManager"));
  dom.fleetManagerBtn?.addEventListener("click", () => toggleCard("fleetManager"));

  [dom.driverManagerBody, dom.fleetManagerBody].filter(Boolean).forEach((body) => {
    body.addEventListener("click", (e) => {
      const kind = e.currentTarget === dom.driverManagerBody ? "drivers" : "buses";
      const action = e.target.closest("[data-ref-action]")?.dataset.refAction;
      if (action === "new") {
        if (kind === "drivers") {
          refManagerDraftDriver = {
            driverId: makeRefId("driver"),
            driverName: "",
            driverNameFull: "",
            email: "",
            active: true,
            priority: refManagerDrivers.length + 1,
          };
          refManagerSelectedIds.drivers = refManagerDraftDriver.driverId;
        } else {
          refManagerSelectedIds[kind] = "";
        }
        renderReferenceManager(kind);
      } else if (action === "deactivate") {
        deactivateReferenceManagerItem(kind, e.target.closest(".reference-manager__form"));
      } else if (action === "delete-driver") {
        deleteReferenceManagerDriver(e.target.closest(".reference-manager__form"));
      } else if (action === "move-up") {
        moveSelectedBus(-1);
      } else if (action === "move-down") {
        moveSelectedBus(1);
      }

      if (action) return;

      if (kind === "drivers") {
        const tab = e.target.closest("[data-ref-driver-tab]");
        if (tab) {
          activateRefDriverTab(tab);
          return;
        }

        const toggle = e.target.closest(
          "[data-ref-driver-toggle], .reference-manager__driver-card",
        );
        if (!toggle || e.target.closest(".reference-manager__driver-form")) return;
        const item = e.target.closest("[data-ref-id]");
        const id = item?.dataset.refId || "";
        const nextId = refManagerSelectedIds.drivers === id ? "" : id;
        if (refManagerDraftDriver && String(refManagerDraftDriver.driverId || "") !== nextId) {
          refManagerDraftDriver = null;
        }
        refManagerSelectedIds.drivers = nextId;
        renderReferenceManager(kind, { preserveScroll: true, focusRefId: nextId });
        return;
      }

      const item = e.target.closest("[data-ref-id]");
      if (item) {
        refManagerSelectedIds[kind] = item.dataset.refId || "";
        renderReferenceManager(kind);
        return;
      }
    });

    body.addEventListener("submit", (e) => {
      const form = e.target.closest(".reference-manager__form");
      if (!form) return;
      e.preventDefault();
      saveReferenceManagerItem(form);
    });
  });
}

function activateRefDriverTab(tab) {
  const form = tab.closest(".reference-manager__driver-form");
  const key = tab.dataset.refDriverTab || "";
  if (!form || !key) return;

  form.querySelectorAll("[data-ref-driver-tab]").forEach((btn) => {
    btn.classList.toggle("is-active", btn === tab);
  });
  form.querySelectorAll("[data-driver-panel]").forEach((panel) => {
    const active = panel.dataset.driverPanel === key;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
}
