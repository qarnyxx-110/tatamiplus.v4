/* Tatami Plus Admin Navigation
 * Uses only links rendered by Django's permission-aware available_apps context.
 * No endpoints, permissions, counters, or backend behavior are invented here.
 */
(() => {
  "use strict";

  const NAV_ID = "nav-sidebar";
  const KEYS = {
    collapsed: "tatami.admin.nav.collapsed.v1",
    favorites: "tatami.admin.nav.favorites.v1",
    recent: "tatami.admin.nav.recent.v1",
    compact: "tatami.admin.nav.compact.v1"
  };

  const readStore = (key, fallback) => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const writeStore = (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  const safeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

  const init = () => {
    const nav = document.getElementById(NAV_ID);
    if (!nav) return;

    const filter = nav.querySelector("#nav-filter");
    const groups = Array.from(nav.children).filter((element) =>
      element.classList && element.classList.contains("module")
    );
    if (!groups.length) return;

    const collapsedState = readStore(KEYS.collapsed, {});
    let favorites = readStore(KEYS.favorites, []);
    let recent = readStore(KEYS.recent, []);
    const allowed = new Map();
    const commandItems = [];
    const groupRecords = [];

    const appIcons = {
      accounts: "♙",
      auth: "⌑",
      club: "◈",
      coaches: "🥋",
      gems: "◇",
      orders: "▣",
      store: "▱",
      blog: "▤"
    };

    const getAppLabel = (group) => {
      const appClass = Array.from(group.classList).find((name) => name.startsWith("app-"));
      return appClass ? appClass.slice(4) : "general";
    };

    const addCommandItem = (anchor, label, groupName, kind) => {
      if (!anchor || !anchor.href || anchor.getAttribute("aria-disabled") === "true") return;
      const item = {
        href: anchor.href,
        label: safeText(label),
        group: safeText(groupName),
        kind: safeText(kind)
      };
      if (!item.label) return;
      const key = item.href + "|" + item.label;
      if (allowed.has(key)) return;
      allowed.set(key, item);
      commandItems.push(item);
    };

    const createActionLink = (item, className) => {
      const link = document.createElement("a");
      link.className = className;
      link.href = item.href;
      link.textContent = item.label;
      link.title = item.group ? item.group + " / " + item.label : item.label;
      return link;
    };

    // Keep only current, permission-rendered menu destinations. A stale favorite
    // from another role/session is never rendered unless it still exists here.
    groups.forEach((group) => {
      const appLabel = getAppLabel(group);
      const caption = group.querySelector("caption");
      const appLink = caption && caption.querySelector("a.section");
      const appName = safeText(appLink && appLink.textContent);
      const table = group.querySelector("table");
      if (!caption || !table) return;

      group.classList.add("tpa-nav-group");
      const tbody = table.tBodies && table.tBodies[0];
      const rows = Array.from(table.querySelectorAll("tr")).filter((row) =>
        Array.from(row.classList).some((className) => className.startsWith("model-"))
      );

      if (appLink) {
        addCommandItem(appLink, appName, appName, "بخش");
        const icon = document.createElement("span");
        icon.className = "tpa-app-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = appIcons[appLabel] || "◈";
        appLink.prepend(icon);

        const count = document.createElement("span");
        count.className = "tpa-app-count";
        count.textContent = String(rows.length);
        count.setAttribute("aria-label", rows.length + " زیرمجموعه");
        caption.append(count);
      }

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "tpa-group-toggle";
      toggle.textContent = "⌄";
      toggle.setAttribute("aria-label", "جمع کردن بخش " + appName);
      toggle.setAttribute("aria-expanded", "true");
      toggle.title = "جمع یا باز کردن زیرمجموعه‌ها";
      caption.append(toggle);

      const isCurrent = group.classList.contains("current-app") ||
        group.querySelector("tr.current-model, a[aria-current='page']");
      const storedCollapsed = Boolean(collapsedState[appLabel]);
      const record = {
        element: group,
        appLabel,
        appName,
        tbody,
        rows,
        toggle,
        collapsed: storedCollapsed && !isCurrent
      };

      const setCollapsed = (collapsed, persist = true) => {
        record.collapsed = Boolean(collapsed);
        group.classList.toggle("tpa-group-collapsed", record.collapsed);
        toggle.setAttribute("aria-expanded", record.collapsed ? "false" : "true");
        toggle.setAttribute(
          "aria-label",
          (record.collapsed ? "باز کردن بخش " : "جمع کردن بخش ") + appName
        );
        toggle.textContent = record.collapsed ? "‹" : "⌄";
        if (persist) {
          collapsedState[appLabel] = record.collapsed;
          writeStore(KEYS.collapsed, collapsedState);
        }
      };

      setCollapsed(record.collapsed, false);
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCollapsed(!record.collapsed);
      });

      rows.forEach((row) => {
        const heading = row.querySelector("th");
        const modelLink = heading && heading.querySelector("a[href]");
        const addLink = row.querySelector("a.addlink");
        const modelName = safeText(modelLink && modelLink.textContent) ||
          safeText(heading && heading.textContent);

        if (modelLink) {
          addCommandItem(modelLink, modelName, appName, "مدیریت");
          const star = document.createElement("button");
          star.type = "button";
          star.className = "tpa-favorite-toggle";
          star.dataset.favoriteHref = modelLink.href;
          star.setAttribute("aria-label", "افزودن " + modelName + " به دسترسی‌های منتخب");
          star.title = "افزودن به دسترسی‌های منتخب";
          star.textContent = "☆";
          heading.append(star);
        }

        if (addLink) {
          addCommandItem(addLink, "افزودن " + modelName, appName, "افزودن");
        }

        const viewLink = row.querySelector("a.viewlink, a.changelink");
        if (viewLink) {
          addCommandItem(
            viewLink,
            safeText(viewLink.textContent) + " " + modelName,
            appName,
            "مشاهده"
          );
        }
      });

      groupRecords.push(record);
    });

    const availableUrls = new Set(commandItems.map((item) => item.href));
    favorites = Array.isArray(favorites)
      ? favorites.filter((item) => item && availableUrls.has(item.href)).slice(0, 30)
      : [];
    recent = Array.isArray(recent)
      ? recent.filter((item) => item && availableUrls.has(item.href)).slice(0, 8)
      : [];
    writeStore(KEYS.favorites, favorites);
    writeStore(KEYS.recent, recent);

    // Keep Django's native filter; only improve its Persian label and hint.
    if (filter) {
      filter.placeholder = "جست‌وجو در بخش‌ها و زیرمجموعه‌ها…";
      filter.setAttribute("aria-label", "جست‌وجو در منوی مدیریت");
      filter.title = "نام بخش یا زیرمجموعه را بنویسید";
    }

    const toolbar = document.createElement("div");
    toolbar.className = "tpa-nav-toolbar";
    toolbar.innerHTML = '<button type="button" class="tpa-command-trigger"><span aria-hidden="true">⌕</span><span>جست‌وجوی سریع</span><kbd>Ctrl K</kbd></button><div class="tpa-nav-toolbar-row"><button type="button" class="tpa-collapse-all">جمع‌کردن همه</button><button type="button" class="tpa-density-toggle">نمایش فشرده</button></div>';
    if (filter) filter.insertAdjacentElement("afterend", toolbar);
    else nav.prepend(toolbar);

    const quickPanel = document.createElement("div");
    quickPanel.className = "tpa-quick-panel";
    quickPanel.innerHTML = '<details class="tpa-quick-section" data-quick="favorites"><summary><span>دسترسی‌های منتخب</span><span class="tpa-quick-count">0</span></summary><ul class="tpa-quick-list"></ul></details><details class="tpa-quick-section" data-quick="recent"><summary><span>بازدیدهای اخیر</span><span class="tpa-quick-count">0</span></summary><ul class="tpa-quick-list"></ul></details>';
    toolbar.insertAdjacentElement("afterend", quickPanel);

    const favoritePanel = quickPanel.querySelector('[data-quick="favorites"]');
    const recentPanel = quickPanel.querySelector('[data-quick="recent"]');

    const drawQuickPanel = (panel, items, emptyText) => {
      const list = panel.querySelector(".tpa-quick-list");
      const count = panel.querySelector(".tpa-quick-count");
      list.replaceChildren();
      count.textContent = String(items.length);
      if (!items.length) {
        const empty = document.createElement("li");
        empty.className = "tpa-quick-empty";
        empty.textContent = emptyText;
        list.append(empty);
        return;
      }
      items.forEach((item) => {
        const li = document.createElement("li");
        li.append(createActionLink(item, "tpa-quick-link"));
        list.append(li);
      });
    };

    const drawQuickPanels = () => {
      drawQuickPanel(favoritePanel, favorites, "هنوز صفحه‌ای انتخاب نشده است.");
      drawQuickPanel(recentPanel, recent, "هنوز صفحه‌ای بازدید نشده است.");
      groups.forEach((group) => {
        group.querySelectorAll(".tpa-favorite-toggle").forEach((button) => {
          const active = favorites.some((item) => item.href === button.dataset.favoriteHref);
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
          button.textContent = active ? "★" : "☆";
          button.setAttribute(
            "aria-label",
            (active ? "حذف از" : "افزودن به") + " دسترسی‌های منتخب: " +
            safeText(button.parentElement.querySelector("a")?.textContent)
          );
          button.title = active ? "حذف از دسترسی‌های منتخب" : "افزودن به دسترسی‌های منتخب";
        });
      });
    };

    nav.addEventListener("click", (event) => {
      const star = event.target.closest(".tpa-favorite-toggle");
      if (star) {
        event.preventDefault();
        event.stopPropagation();
        const href = star.dataset.favoriteHref;
        const source = star.parentElement && star.parentElement.querySelector("a[href]");
        if (!href || !source) return;
        const existing = favorites.findIndex((item) => item.href === href);
        if (existing >= 0) favorites.splice(existing, 1);
        else favorites.unshift({
          href,
          label: safeText(source.textContent),
          group: safeText(source.closest(".module")?.querySelector("caption a.section")?.textContent)
        });
        favorites = favorites.slice(0, 30);
        writeStore(KEYS.favorites, favorites);
        drawQuickPanels();
        return;
      }

      const link = event.target.closest("a[href]");
      if (!link || !nav.contains(link)) return;
      const row = link.closest("tr");
      const group = link.closest(".module");
      const appName = safeText(group?.querySelector("caption a.section")?.textContent);
      const modelName = safeText(row?.querySelector("th")?.textContent);
      const action = link.classList.contains("addlink") ? "افزودن " :
        link.classList.contains("viewlink") ? "مشاهده " : "";
      const label = link.classList.contains("section")
        ? safeText(link.textContent)
        : action + (modelName || safeText(link.textContent));
      recent = [{
        href: link.href,
        label: safeText(label),
        group: appName
      }, ...recent.filter((item) => item.href !== link.href)].slice(0, 8);
      writeStore(KEYS.recent, recent);
      drawQuickPanels();
    });

    drawQuickPanels();

    // Persist a comfortable/compact navigation density per browser.
    const densityButton = toolbar.querySelector(".tpa-density-toggle");
    const compact = Boolean(readStore(KEYS.compact, false));
    nav.classList.toggle("tpa-nav-compact", compact);
    densityButton.textContent = compact ? "نمایش راحت" : "نمایش فشرده";
    densityButton.setAttribute("aria-pressed", compact ? "true" : "false");
    densityButton.addEventListener("click", () => {
      const next = !nav.classList.contains("tpa-nav-compact");
      nav.classList.toggle("tpa-nav-compact", next);
      writeStore(KEYS.compact, next);
      densityButton.textContent = next ? "نمایش راحت" : "نمایش فشرده";
      densityButton.setAttribute("aria-pressed", next ? "true" : "false");
    });

    const collapseButton = toolbar.querySelector(".tpa-collapse-all");
    const setAllGroups = (collapsed) => {
      groupRecords.forEach((record) => {
        const current = record.element.classList.contains("current-app") ||
          record.element.querySelector("tr.current-model, a[aria-current='page']");
        const next = current ? false : collapsed;
        record.collapsed = next;
        record.element.classList.toggle("tpa-group-collapsed", next);
        record.toggle.setAttribute("aria-expanded", next ? "false" : "true");
        record.toggle.textContent = next ? "‹" : "⌄";
        record.toggle.setAttribute(
          "aria-label",
          (next ? "باز کردن بخش " : "جمع کردن بخش ") + record.appName
        );
        collapsedState[record.appLabel] = next;
      });
      writeStore(KEYS.collapsed, collapsedState);
      collapseButton.textContent = collapsed ? "بازکردن همه" : "جمع‌کردن همه";
    };
    const collapsibleGroups = groupRecords.filter((record) =>
      !record.element.classList.contains("current-app") &&
      !record.element.querySelector("tr.current-model, a[aria-current='page']")
    );
    const areAllCollapsibleGroupsClosed = () =>
      collapsibleGroups.length > 0 && collapsibleGroups.every((record) => record.collapsed);
    collapseButton.addEventListener("click", () => {
      setAllGroups(!areAllCollapsibleGroupsClosed());
    });
    collapseButton.textContent = areAllCollapsibleGroupsClosed()
      ? "بازکردن همه"
      : "جمع‌کردن همه";
    groupRecords.forEach((record) => {
      record.toggle.addEventListener("click", () => {
        collapseButton.textContent = areAllCollapsibleGroupsClosed()
          ? "بازکردن همه"
          : "جمع‌کردن همه";
      });
    });

    // Command palette entries are sourced from actual permission-rendered anchors.
    const overlay = document.createElement("div");
    overlay.className = "tpa-command-overlay";
    overlay.hidden = true;
    overlay.innerHTML = '<section class="tpa-command-dialog" role="dialog" aria-modal="true" aria-labelledby="tpa-command-title"><header class="tpa-command-header"><div><h2 id="tpa-command-title">رفتن به بخش موردنظر</h2><p>نام بخش، صفحه یا عملیات را جست‌وجو کنید.</p></div><button type="button" class="tpa-command-close" aria-label="بستن">×</button></header><input class="tpa-command-input" type="search" autocomplete="off" placeholder="مثلاً محصولات، سفارش‌ها یا افزودن مربی…" aria-label="جست‌وجوی صفحات مدیریت"><div class="tpa-command-hint"><span>↑ ↓ انتخاب</span><span>Enter ورود</span><span>Esc بستن</span></div><ul class="tpa-command-results" role="listbox" aria-label="نتایج جست‌وجو"></ul><p class="tpa-command-empty" hidden>نتیجه‌ای پیدا نشد.</p></section>';
    document.body.append(overlay);

    const commandInput = overlay.querySelector(".tpa-command-input");
    const commandResults = overlay.querySelector(".tpa-command-results");
    const emptyMessage = overlay.querySelector(".tpa-command-empty");
    const closeButton = overlay.querySelector(".tpa-command-close");
    const commandTrigger = toolbar.querySelector(".tpa-command-trigger");
    let visibleItems = [];
    let activeIndex = 0;
    let priorFocus = null;

    const renderCommandResults = () => {
      const query = safeText(commandInput.value).toLocaleLowerCase();
      visibleItems = commandItems.filter((item) => {
        const haystack = (item.label + " " + item.group + " " + item.kind).toLocaleLowerCase();
        return !query || haystack.includes(query);
      }).slice(0, 12);
      activeIndex = 0;
      commandResults.replaceChildren();
      emptyMessage.hidden = visibleItems.length > 0;
      visibleItems.forEach((item, index) => {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        const link = document.createElement("a");
        link.href = item.href;
        link.className = "tpa-command-result";
        link.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
        const copy = document.createElement("span");
        copy.className = "tpa-command-result-copy";
        const title = document.createElement("strong");
        title.textContent = item.label;
        const subtitle = document.createElement("small");
        subtitle.textContent = item.group + (item.kind ? " · " + item.kind : "");
        copy.append(title, subtitle);
        const arrow = document.createElement("span");
        arrow.className = "tpa-command-result-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "↵";
        link.append(copy, arrow);
        li.append(link);
        commandResults.append(li);
      });
    };

    const openCommand = () => {
      priorFocus = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add("tpa-command-open");
      commandInput.value = "";
      renderCommandResults();
      window.requestAnimationFrame(() => commandInput.focus());
    };

    const closeCommand = () => {
      overlay.hidden = true;
      document.body.classList.remove("tpa-command-open");
      if (priorFocus && typeof priorFocus.focus === "function") priorFocus.focus();
    };

    commandTrigger.addEventListener("click", openCommand);
    closeButton.addEventListener("click", closeCommand);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeCommand();
    });
    commandInput.addEventListener("input", renderCommandResults);
    commandResults.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (link) {
        const item = visibleItems.find((candidate) => candidate.href === link.href);
        if (item) {
          recent = [item, ...recent.filter((candidate) => candidate.href !== item.href)].slice(0, 8);
          writeStore(KEYS.recent, recent);
        }
        closeCommand();
      }
    });

    overlay.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        overlay.querySelectorAll("button:not([disabled]), input:not([disabled]), a[href]")
      ).filter((element) => !element.hidden);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    commandInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!visibleItems.length) return;
        activeIndex = (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + visibleItems.length) % visibleItems.length;
        commandResults.querySelectorAll(".tpa-command-result").forEach((link, index) => {
          link.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
          if (index === activeIndex) link.scrollIntoView({ block: "nearest" });
        });
      } else if (event.key === "Enter" && visibleItems[activeIndex]) {
        const selected = visibleItems[activeIndex];
        recent = [selected, ...recent.filter((item) => item.href !== selected.href)].slice(0, 8);
        writeStore(KEYS.recent, recent);
        window.location.href = selected.href;
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeCommand();
      }
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const editing = target && (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      );
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommand();
      } else if (event.key === "Escape" && !overlay.hidden) {
        closeCommand();
      } else if (!editing && event.key === "/" && overlay.hidden) {
        event.preventDefault();
        openCommand();
      }
    });

    // The native Django filter remains responsible for filtering menu entries.
    if (filter) {
      filter.addEventListener("input", () => {
        const searching = Boolean(safeText(filter.value));
        quickPanel.hidden = searching;
        toolbar.hidden = searching;
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();