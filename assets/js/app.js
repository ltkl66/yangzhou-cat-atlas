(() => {
  "use strict";

  const MAP_CENTER = [32.3952, 119.43];
  const MAP_ZOOM = 13;
  const FEED_LINK = "";
  const MAX_PHOTO_EDGE = 1280;
  const PHOTO_QUALITY = 0.72;
  const SUPABASE_URL = "https://ghkfdmdnuyjksbeavwrz.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_rODde_wQbvqZYwAuCdEQ0w_mB0NKIOC";
  const PHOTO_BUCKET = "cat-photos";
  const FALLBACK_PHOTO = "assets/img/cat-orange.svg";
  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  const ICONS = {
    arrow:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>',
    close:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>',
    paw:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 11.1c1.1 0 1.8-1.2 1.8-2.8S9.3 5.3 8.2 5.3 6.4 6.7 6.4 8.3s.7 2.8 1.8 2.8Zm7.6 0c1.1 0 1.8-1.2 1.8-2.8s-.7-3-1.8-3-1.8 1.4-1.8 3 .7 2.8 1.8 2.8ZM4.5 16.3c.8-.2 1.2-1.3 1-2.5-.2-1.2-.9-1.9-1.7-1.8-.8.2-1.2 1.3-1 2.5.2 1.2.9 1.9 1.7 1.8Zm15-.1c.8 0 1.4-.8 1.5-2 .1-1.2-.4-2.2-1.2-2.3-.8-.1-1.5.8-1.6 2-.1 1.2.4 2.2 1.3 2.3ZM12 11.6c-3.2 0-6.1 3-6.1 5.7 0 1.9 1.4 3 3.3 2.5 1.9-.5 3.7-.5 5.6 0 2 .5 3.3-.6 3.3-2.5 0-2.7-2.9-5.7-6.1-5.7Z" /></svg>',
    walk:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 5 4 4-3 3-3-3 2-4Zm-1 7 3 3-3 7M8 9l4 3M6 20l3-5" /></svg>',
    food:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h16l-1.5 7.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5L4 11Zm2.5-3.5c1-2 2.3-3 4-3M12 7.5c1-2 2.3-3 4-3M19.5 7.5c.8-1.6 1.9-2.4 3.2-2.4" /></svg>'
  };

  const elements = {
    mapLoading: document.getElementById("mapLoading"),
    mapHint: document.getElementById("mapHint"),
    catList: document.getElementById("catList"),
    emptyState: document.getElementById("emptyState"),
    resultCount: document.getElementById("resultCount"),
    statPoints: document.getElementById("statPoints"),
    statCats: document.getElementById("statCats"),
    statNeeds: document.getElementById("statNeeds"),
    adminButton: document.getElementById("adminButton"),
    adminButtonLabel: document.getElementById("adminButtonLabel"),
    pendingBadge: document.getElementById("pendingBadge"),
    filterRow: document.querySelector(".filter-row"),
    selectedCard: document.getElementById("selectedCard"),
    locateButton: document.getElementById("locateButton"),
    reportButton: document.getElementById("reportButton"),
    reportDialog: document.getElementById("reportDialog"),
    reportForm: document.getElementById("reportForm"),
    catPhoto: document.getElementById("catPhoto"),
    photoPreview: document.getElementById("photoPreview"),
    photoPlaceholder: document.getElementById("photoPlaceholder"),
    photoReplace: document.getElementById("photoReplace"),
    catName: document.getElementById("catName"),
    locationName: document.getElementById("locationName"),
    catNote: document.getElementById("catNote"),
    catPersonality: document.getElementById("catPersonality"),
    catNeed: document.getElementById("catNeed"),
    locationStatus: document.getElementById("locationStatus"),
    retryLocationButton: document.getElementById("retryLocationButton"),
    pickLocationButton: document.getElementById("pickLocationButton"),
    formError: document.getElementById("formError"),
    submitReportButton: document.getElementById("submitReportButton"),
    reportModeNote: document.getElementById("reportModeNote"),
    feedDialog: document.getElementById("feedDialog"),
    feedCatName: document.getElementById("feedCatName"),
    feedCount: document.getElementById("feedCount"),
    logFeedButton: document.getElementById("logFeedButton"),
    authDialog: document.getElementById("authDialog"),
    authForm: document.getElementById("authForm"),
    adminEmail: document.getElementById("adminEmail"),
    adminPassword: document.getElementById("adminPassword"),
    authError: document.getElementById("authError"),
    adminLoginButton: document.getElementById("adminLoginButton"),
    adminDialog: document.getElementById("adminDialog"),
    adminStatus: document.getElementById("adminStatus"),
    adminRefreshButton: document.getElementById("adminRefreshButton"),
    adminLogoutButton: document.getElementById("adminLogoutButton"),
    pendingList: document.getElementById("pendingList"),
    pendingEmpty: document.getElementById("pendingEmpty"),
    toast: document.getElementById("toast")
  };

  const state = {
    cats: [],
    pendingCats: [],
    loading: true,
    loadError: null,
    filter: "all",
    selectedId: null,
    photoDataUrl: null,
    photoLoading: false,
    pendingLocation: null,
    pickingLocation: false,
    pickHandler: null,
    candidateMarker: null,
    userLocationMarker: null,
    markerLayer: null,
    markers: new Map(),
    feedCatId: null,
    toastTimer: null,
    suppressReportReset: false,
    mapTilesFailed: false,
    session: null,
    user: null,
    profile: null,
    isAdmin: false,
    interactionBusy: false,
    reviewBusyId: null
  };

  const map = L.map("map", {
    zoomControl: false,
    minZoom: 10,
    maxZoom: 18,
    preferCanvas: true
  }).setView(MAP_CENTER, MAP_ZOOM);

  const tileLayer = L.tileLayer(
    "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    {
      subdomains: "1234",
      maxZoom: 18,
      minZoom: 10,
      attribution: '&copy; <a href="https://www.amap.com/" target="_blank" rel="noreferrer">高德地图</a>'
    }
  ).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  tileLayer.once("load", hideMapLoading);
  tileLayer.on("tileerror", () => {
    if (state.mapTilesFailed) return;
    state.mapTilesFailed = true;
    showToast("高德底图加载较慢，请检查网络后刷新页面。");
  });
  window.setTimeout(hideMapLoading, 4200);

  init();

  async function init() {
    bindEvents();
    renderAll(true);
    await initializeAuth();
    await loadCats({ fit: true, initial: true });
  }

  function bindEvents() {
    elements.filterRow.addEventListener("click", handleFilterClick);
    elements.catList.addEventListener("click", handleCatListClick);
    elements.selectedCard.addEventListener("click", handleSelectedCardClick);
    elements.reportButton.addEventListener("click", () => {
      openReportDialog({ reset: true, requestLocation: true });
    });
    elements.adminButton.addEventListener("click", handleAdminEntry);
    elements.locateButton.addEventListener("click", locateUser);
    elements.retryLocationButton.addEventListener("click", startFormLocation);
    elements.pickLocationButton.addEventListener("click", startMapPicking);
    elements.catPhoto.addEventListener("change", handlePhotoChange);
    elements.reportForm.addEventListener("submit", handleReportSubmit);
    elements.logFeedButton.addEventListener("click", handleFeedLog);
    elements.pendingList.addEventListener("click", handlePendingListClick);
    elements.authForm.addEventListener("submit", handleAdminLogin);
    elements.adminRefreshButton.addEventListener("click", loadPendingCats);
    elements.adminLogoutButton.addEventListener("click", handleAdminLogout);
    elements.authForm.addEventListener("input", () => {
      elements.authError.hidden = true;
    });

    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => {
        const dialog = document.getElementById(button.dataset.closeDialog);
        if (dialog?.open) dialog.close();
      });
    });

    [
      elements.reportDialog,
      elements.feedDialog,
      elements.authDialog,
      elements.adminDialog
    ].forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const inside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;
        if (!inside) dialog.close();
      });
    });

    elements.reportDialog.addEventListener("close", () => {
      if (state.suppressReportReset) {
        state.suppressReportReset = false;
        return;
      }
      resetReportForm();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.pickingLocation) {
        cancelMapPicking(true);
      }
    });
  }

  async function initializeAuth() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.warn("读取登录状态失败：", error);
    }
    await applySession(data?.session ?? null);

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      window.setTimeout(() => applySession(session), 0);
    });
  }

  async function applySession(session) {
    state.session = session ?? null;
    state.user = session?.user ?? null;
    state.profile = null;
    state.isAdmin = false;

    if (state.user) {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", state.user.id)
        .maybeSingle();

      if (error) {
        console.warn("读取管理员资料失败：", error);
      } else if (data?.role === "admin") {
        state.profile = data;
        state.isAdmin = true;
      } else {
        await supabaseClient.auth.signOut();
        showToast("这个账号还没有管理员权限。");
      }
    }

    updateAdminUi();
    if (state.isAdmin) {
      await loadPendingCats();
    } else {
      state.pendingCats = [];
      renderPendingReviews();
    }
  }

  function handleAdminEntry() {
    if (state.isAdmin) {
      elements.adminDialog.showModal();
      loadPendingCats();
      return;
    }
    elements.authError.hidden = true;
    elements.authDialog.showModal();
    window.setTimeout(() => elements.adminEmail.focus(), 100);
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    elements.authError.hidden = true;
    elements.adminLoginButton.disabled = true;
    elements.adminLoginButton.textContent = "正在登录…";

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: elements.adminEmail.value.trim(),
        password: elements.adminPassword.value
      });
      if (error) throw error;

      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (profile?.role !== "admin") {
        await supabaseClient.auth.signOut();
        throw new Error("这个账号还没有被设置为管理员。");
      }

      elements.authForm.reset();
      elements.authDialog.close();
      await applySession(data.session);
      showToast("已进入管理员模式，可以直接发布猫猫。");
    } catch (error) {
      console.warn("管理员登录失败：", error);
      elements.authError.textContent = authErrorMessage(error);
      elements.authError.hidden = false;
    } finally {
      elements.adminLoginButton.disabled = false;
      elements.adminLoginButton.textContent = "登录";
    }
  }

  async function handleAdminLogout() {
    elements.adminLogoutButton.disabled = true;
    await supabaseClient.auth.signOut();
    elements.adminLogoutButton.disabled = false;
    elements.adminDialog.close();
    updateAdminUi();
    showToast("已退出管理员模式。");
  }

  function authErrorMessage(error) {
    const message = String(error?.message || "");
    if (/invalid login credentials/i.test(message)) return "邮箱或密码不正确。";
    if (/email not confirmed/i.test(message)) return "这个邮箱还没有完成验证。";
    if (/fetch|network/i.test(message)) return "无法连接 Supabase，请检查网络后重试。";
    return message || "登录失败，请稍后重试。";
  }

  function updateAdminUi() {
    elements.adminButtonLabel.textContent = state.isAdmin ? "审核台" : "管理员";
    elements.adminButton.setAttribute(
      "aria-label",
      state.isAdmin ? `打开审核台，${state.pendingCats.length} 个待审核` : "管理员登录"
    );
    elements.adminButton.classList.toggle("is-admin", state.isAdmin);
    updateReportMode();
  }

  function updateReportMode() {
    if (state.isAdmin) {
      elements.reportModeNote.textContent = "管理员模式：提交后会立即发布到地图。";
      elements.submitReportButton.textContent = "发布到猫猫图鉴";
    } else {
      elements.reportModeNote.textContent = "访客提交会先进入审核，通过后显示在地图上。";
      elements.submitReportButton.textContent = "提交审核";
    }
  }

  async function loadCats({ fit = false, initial = false } = {}) {
    if (initial) {
      state.loading = true;
      state.loadError = null;
      renderAll(false);
    }

    const { data, error } = await supabaseClient
      .from("cat_directory")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    state.loading = false;

    if (error) {
      console.error(
        `读取猫猫数据失败：${JSON.stringify({
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          name: error?.name,
          value: String(error || "")
        })}`
      );
      state.loadError = {
        message:
          error?.message ||
          String(error || "") ||
          "无法连接 Supabase，请检查网络后刷新页面。"
      };
      state.cats = [];
      renderAll(false);
      showToast("猫猫数据加载失败，请稍后刷新重试。");
      return;
    }

    state.loadError = null;
    state.cats = (data ?? []).map(mapCatRow);
    if (state.selectedId && !state.cats.some((cat) => cat.id === state.selectedId)) {
      state.selectedId = null;
    }
    renderAll(fit);
  }

  function mapCatRow(row) {
    return {
      id: row.id,
      name: row.name,
      area: row.area,
      coords: [Number(row.latitude), Number(row.longitude)],
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      photo: row.photo_url || FALLBACK_PHOTO,
      photoPath: row.photo_path || "",
      note: row.note || "",
      personality: row.personality || "unknown",
      need: row.need || "none",
      sterilized: Boolean(row.sterilized),
      catsCount: Number(row.cats_count) || 1,
      lastSeen: formatLastSeen(row.last_seen),
      lastSeenRaw: row.last_seen,
      feedCount: Number(row.feed_count) || 0,
      visitCount: Number(row.visit_count) || 0,
      createdAt: row.created_at,
      status: row.status,
      source: row.source || "community",
      approximate: Boolean(row.approximate)
    };
  }

  function formatLastSeen(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "最近";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round((today - target) / 86400000);
    const time = date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    if (dayDiff === 0) return `今天 ${time}`;
    if (dayDiff === 1) return `昨天 ${time}`;
    if (dayDiff < 7) return `${dayDiff} 天前`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  async function loadPendingCats() {
    if (!state.isAdmin) return;
    elements.adminStatus.textContent = "正在读取待审核点位…";

    const { data, error } = await supabaseClient
      .from("cat_directory")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("读取待审核点位失败：", error);
      elements.adminStatus.textContent = "读取失败，请稍后刷新。";
      showToast("待审核点位读取失败。");
      return;
    }

    state.pendingCats = (data ?? []).map(mapCatRow);
    renderPendingReviews();
  }

  function renderPendingReviews() {
    const count = state.pendingCats.length;
    elements.pendingBadge.hidden = !state.isAdmin || count === 0;
    elements.pendingBadge.textContent = String(count);
    elements.adminButton.setAttribute(
      "aria-label",
      state.isAdmin ? `打开审核台，${count} 个待审核` : "管理员登录"
    );
    elements.pendingList.innerHTML = state.pendingCats.map(pendingCardTemplate).join("");
    elements.pendingEmpty.hidden = count > 0;
    elements.adminStatus.textContent = state.isAdmin
      ? count > 0
        ? `${count} 个点位等待审核`
        : "审核台已同步"
      : "请先登录管理员账号";
  }

  function pendingCardTemplate(cat) {
    const busy = state.reviewBusyId === cat.id;
    return `
      <article class="review-card">
        <img class="review-card__photo" src="${escapeHtml(cat.photo)}" alt="${escapeHtml(cat.name)} 的待审核照片" />
        <div class="review-card__body">
          <div class="review-card__head">
            <div>
              <strong>${escapeHtml(cat.name)}</strong>
              <span>${escapeHtml(cat.area)}</span>
            </div>
            <span class="review-pill">待审核</span>
          </div>
          <p>${escapeHtml(cat.note || "提交者没有填写补充说明。")}</p>
          <div class="review-card__meta">
            <span>${cat.catsCount} 只</span>
            <span>${escapeHtml(cat.lastSeen)}</span>
            <span>${cat.latitude.toFixed(5)}, ${cat.longitude.toFixed(5)}</span>
          </div>
          <div class="review-card__actions">
            <button class="button button-ghost" type="button" data-review-id="${escapeHtml(cat.id)}" data-review-status="rejected" ${busy ? "disabled" : ""}>不通过</button>
            <button class="button button-primary" type="button" data-review-id="${escapeHtml(cat.id)}" data-review-status="approved" ${busy ? "disabled" : ""}>${busy ? "处理中…" : "通过并发布"}</button>
          </div>
        </div>
      </article>
    `;
  }

  function handlePendingListClick(event) {
    const button = event.target.closest("[data-review-id]");
    if (!button) return;
    reviewCat(button.dataset.reviewId, button.dataset.reviewStatus);
  }

  async function reviewCat(id, status) {
    if (!state.isAdmin || state.reviewBusyId) return;
    state.reviewBusyId = id;
    renderPendingReviews();

    const { error } = await supabaseClient
      .from("cats")
      .update({
        status,
        reviewed_by: state.user?.id ?? null,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", id);

    state.reviewBusyId = null;

    if (error) {
      console.error("审核点位失败：", error);
      showToast("审核失败，请稍后重试。");
      renderPendingReviews();
      return;
    }

    await Promise.all([loadCats(), loadPendingCats()]);
    showToast(status === "approved" ? "已通过审核并发布到地图。" : "已标记为不通过。");
  }

  function hideMapLoading() {
    elements.mapLoading.classList.add("is-hidden");
  }

  function renderAll(shouldFit = false) {
    const visibleCats = getVisibleCats();
    renderStats();
    renderList(visibleCats);
    renderMarkers(visibleCats);
    renderSelectedCard();

    if (state.selectedId && !visibleCats.some((cat) => cat.id === state.selectedId)) {
      state.selectedId = null;
      renderSelectedCard();
    }

    if (shouldFit) fitMap(visibleCats);
  }

  function renderStats() {
    if (state.loading || state.loadError) {
      elements.statPoints.textContent = "--";
      elements.statCats.textContent = "--";
      elements.statNeeds.textContent = "--";
      return;
    }
    const totalCats = state.cats.reduce(
      (total, cat) => total + (Number(cat.catsCount) || 1),
      0
    );
    const foodSpots = state.cats.filter((cat) => cat.need === "food").length;
    elements.statPoints.textContent = String(state.cats.length);
    elements.statCats.textContent = String(totalCats);
    elements.statNeeds.textContent = String(foodSpots);
  }

  function getVisibleCats() {
    return state.cats.filter((cat) => {
      if (state.filter === "all") return true;
      if (state.filter === "food") return cat.need === "food";
      if (state.filter === "friendly") return cat.personality === "friendly";
      if (state.filter === "tnr") return Boolean(cat.sterilized);
      return true;
    });
  }

  function renderList(visibleCats) {
    if (state.loading) {
      elements.resultCount.textContent = "正在同步";
      elements.catList.innerHTML = `
        <div class="catalog-loading">
          <span aria-hidden="true">ฅ</span>
          <strong>正在连接扬州猫猫图鉴…</strong>
        </div>
      `;
      elements.emptyState.hidden = true;
      return;
    }

    if (state.loadError) {
      elements.resultCount.textContent = "加载失败";
      elements.catList.innerHTML = `
        <div class="catalog-loading is-error">
          <span aria-hidden="true">!</span>
          <strong>暂时没能读取猫猫数据</strong>
          <p>${escapeHtml(state.loadError.message || "请检查网络后刷新页面。")}</p>
        </div>
      `;
      elements.emptyState.hidden = true;
      return;
    }

    elements.resultCount.textContent = `${visibleCats.length} 个点位`;
    elements.catList.innerHTML = visibleCats.map(catCardTemplate).join("");
    elements.emptyState.hidden = visibleCats.length > 0;
  }

  function catCardTemplate(cat) {
    const selected = state.selectedId === cat.id;
    return `
      <button
        class="cat-card${selected ? " is-selected" : ""}"
        type="button"
        data-cat-id="${escapeHtml(cat.id)}"
        aria-pressed="${selected}"
        aria-label="查看 ${escapeHtml(cat.name)}，${escapeHtml(cat.area)}"
      >
        <span class="cat-thumb">
          <img src="${escapeHtml(cat.photo)}" alt="" loading="lazy" />
          ${cat.source === "demo" ? '<span class="demo-mark">示例</span>' : ""}
        </span>
        <span class="cat-info">
          <span class="cat-name">
            ${escapeHtml(cat.name)}
            ${cat.source === "community" ? '<span class="new-badge">新收录</span>' : ""}
          </span>
          <span class="cat-area">${escapeHtml(cat.area)}</span>
          <span class="cat-tags">${renderTags(cat)}</span>
          <span class="cat-meta">
            <span>${escapeHtml(cat.lastSeen)}</span>
            <span class="dot"></span>
            <span>${Number(cat.catsCount) || 1} 只常驻</span>
          </span>
        </span>
        <span class="card-arrow">${ICONS.arrow}</span>
      </button>
    `;
  }

  function renderTags(cat) {
    const tags = [];
    if (cat.need === "food") tags.push('<span class="tag tag-food">待投喂</span>');
    if (cat.need === "medical") tags.push('<span class="tag tag-food">需要医疗</span>');
    if (cat.need === "tnr") tags.push('<span class="tag tag-food">待绝育</span>');
    if (cat.personality === "friendly") {
      tags.push('<span class="tag tag-friendly">亲人可摸</span>');
    } else if (cat.personality === "cautious") {
      tags.push('<span class="tag">有点谨慎</span>');
    }
    if (cat.sterilized) tags.push('<span class="tag">已绝育</span>');
    return tags.join("");
  }

  function renderMarkers(visibleCats) {
    if (state.markerLayer) map.removeLayer(state.markerLayer);
    state.markers.clear();
    state.markerLayer = L.layerGroup().addTo(map);

    visibleCats.forEach((cat) => {
      const isFood = cat.need === "food";
      const icon = L.divIcon({
        className: "cat-marker-shell",
        html: `
          <div class="cat-marker${isFood ? " cat-marker--food" : ""}${
            state.selectedId === cat.id ? " is-selected" : ""
          }" aria-hidden="true">
            <span class="cat-marker__body">${ICONS.paw}</span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 39]
      });

      const marker = L.marker(cat.coords, {
        icon,
        riseOnHover: true,
        keyboard: true,
        title: cat.name
      });

      marker.bindTooltip(`${escapeHtml(cat.name)} · ${escapeHtml(cat.area)}`, {
        direction: "top",
        offset: [0, -33],
        className: "cat-tooltip"
      });

      marker.on("click", () => selectCat(cat.id, true));
      marker.addTo(state.markerLayer);
      state.markers.set(cat.id, marker);
    });

    requestAnimationFrame(updateMarkerSelection);
  }

  function updateMarkerSelection() {
    state.markers.forEach((marker, id) => {
      const markerElement = marker.getElement();
      const inner = markerElement?.querySelector(".cat-marker");
      const isSelected = id === state.selectedId;
      inner?.classList.toggle("is-selected", isSelected);
      marker.setZIndexOffset(isSelected ? 1000 : 0);
      markerElement?.setAttribute(
        "aria-label",
        `${isSelected ? "当前选中：" : ""}查看猫猫点位`
      );
    });
  }

  function renderSelectedCard() {
    const cat = state.cats.find((item) => item.id === state.selectedId);
    if (!cat) {
      elements.selectedCard.hidden = true;
      elements.selectedCard.innerHTML = "";
      return;
    }

    const personAction =
      cat.personality === "friendly" ? "我去摸过啦" : "我去远远看过";
    const approximateText = cat.approximate ? " · 近似点位" : "";

    elements.selectedCard.hidden = false;
    elements.selectedCard.innerHTML = `
      <button class="icon-button selected-card__close" type="button" data-action="close" aria-label="关闭详情">
        ${ICONS.close}
      </button>
      <div class="selected-card__top">
        <div class="selected-card__photo">
          <img src="${escapeHtml(cat.photo)}" alt="${escapeHtml(cat.name)} 的照片" />
          ${cat.source === "demo" ? '<span class="demo-mark">演示点位</span>' : ""}
        </div>
        <div class="selected-card__content">
          <p class="selected-card__kicker">${Number(cat.catsCount) || 1} 只猫猫生活在这里</p>
          <h2 class="selected-card__title">
            ${escapeHtml(cat.name)}
            <span># 扬州街猫</span>
          </h2>
          <p class="selected-card__area">${escapeHtml(cat.area)}${approximateText}</p>
          <div class="cat-tags">${renderTags(cat)}</div>
          <p class="selected-card__note">${escapeHtml(cat.note || "等待更多目击情报。")}</p>
        </div>
      </div>
      <div class="selected-card__metrics">
        <span><strong>${Number(cat.feedCount) || 0}</strong> 次投喂记录</span>
        <span><strong>${Number(cat.visitCount) || 0}</strong> 次探望</span>
        <span>最近 ${escapeHtml(cat.lastSeen)}</span>
      </div>
      <div class="selected-card__actions">
        <button class="button button-ghost" type="button" data-action="visit">
          ${ICONS.walk}
          ${personAction}
        </button>
        <button class="button button-primary" type="button" data-action="feed">
          ${ICONS.food}
          ${cat.need === "medical" ? "提供帮助" : "投喂支持"}
        </button>
      </div>
    `;
  }

  function selectCat(id, flyToCat = false) {
    const cat = state.cats.find((item) => item.id === id);
    if (!cat) return;
    state.selectedId = id;
    elements.mapHint.classList.add("is-hidden");
    renderList(getVisibleCats());
    renderSelectedCard();
    updateMarkerSelection();

    if (flyToCat) {
      if (window.matchMedia("(max-width: 860px)").matches) {
        document
          .querySelector(".map-stage")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      const targetZoom = Math.max(map.getZoom(), 15);
      map.flyTo(cat.coords, targetZoom, { duration: 0.7 });
    }
  }

  function clearSelection() {
    state.selectedId = null;
    renderSelectedCard();
    renderList(getVisibleCats());
    updateMarkerSelection();
  }

  function handleFilterClick(event) {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    elements.filterRow.querySelectorAll("[data-filter]").forEach((chip) => {
      const isActive = chip === button;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    });
    renderAll(true);
  }

  function handleCatListClick(event) {
    const card = event.target.closest("[data-cat-id]");
    if (!card) return;
    selectCat(card.dataset.catId, true);
  }

  function handleSelectedCardClick(event) {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "close") {
      clearSelection();
      return;
    }
    if (action === "visit") {
      recordVisit();
      return;
    }
    if (action === "feed") {
      openFeedDialog();
    }
  }

  async function recordVisit() {
    await logInteraction("visit");
  }

  function openFeedDialog() {
    const cat = state.cats.find((item) => item.id === state.selectedId);
    if (!cat) return;
    state.feedCatId = cat.id;
    elements.feedCatName.textContent = cat.name;
    elements.feedCount.textContent = String(Number(cat.feedCount) || 0);
    elements.logFeedButton.textContent = FEED_LINK ? "前往投喂支持" : "我刚刚喂过啦";
    elements.logFeedButton.dataset.mode = FEED_LINK ? "link" : "local";
    elements.logFeedButton.disabled = false;
    elements.feedDialog.showModal();
  }

  async function handleFeedLog() {
    if (FEED_LINK && elements.logFeedButton.dataset.mode === "link") {
      window.open(FEED_LINK, "_blank", "noopener,noreferrer");
      return;
    }

    const cat = state.cats.find((item) => item.id === state.feedCatId);
    if (!cat) return;
    elements.logFeedButton.disabled = true;
    elements.logFeedButton.textContent = "正在记录…";

    const success = await logInteraction("feed", cat.id, true);
    elements.logFeedButton.disabled = false;
    elements.logFeedButton.textContent = "我刚刚喂过啦";
    if (success) elements.feedDialog.close();
  }

  async function logInteraction(type, catId = state.selectedId, announce = false) {
    if (state.interactionBusy) return false;
    const cat = state.cats.find((item) => item.id === catId);
    if (!cat) return false;

    if (!state.isAdmin) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user && !state.isAdmin) {
          await supabaseClient.auth.signOut();
        }
      } catch (error) {
        console.warn("检查登录状态失败：", error);
      }
    }

    state.interactionBusy = true;
    const { error } = await supabaseClient.from("cat_interactions").insert({
      cat_id: cat.id,
      type,
      actor_name: state.profile?.display_name ?? null,
      user_id: state.isAdmin ? state.user?.id ?? null : null
    });
    state.interactionBusy = false;

    if (error) {
      console.error("记录互动失败：", error);
      showToast("这次记录没有保存成功，请稍后重试。");
      return false;
    }

    await loadCats();
    if (type === "feed") {
      elements.feedCount.textContent = String(
        state.cats.find((item) => item.id === cat.id)?.feedCount ?? cat.feedCount + 1
      );
      if (announce) showToast(`谢谢你这顿饭。${cat.name} 的投喂记录已同步。`);
    } else {
      showToast("已记下这次探望，其他人也能看到了。");
    }
    return true;
  }

  function fitMap(cats) {
    if (!cats.length) return;
    if (cats.length === 1) {
      map.flyTo(cats[0].coords, Math.max(map.getZoom(), 15), { duration: 0.6 });
      return;
    }
    const bounds = L.latLngBounds(cats.map((cat) => cat.coords));
    map.fitBounds(bounds, {
      padding: [70, 70],
      maxZoom: 14,
      animate: false
    });
  }

  function openReportDialog({ reset = true, requestLocation = false } = {}) {
    if (reset) resetReportForm();
    if (!elements.reportDialog.open) elements.reportDialog.showModal();
    if (requestLocation) {
      startFormLocation();
    } else {
      updateLocationStatus();
    }
  }

  function resetReportForm() {
    elements.reportForm.reset();
    state.photoDataUrl = null;
    state.photoLoading = false;
    state.pendingLocation = null;
    removeCandidateMarker();
    elements.photoPreview.hidden = true;
    elements.photoPreview.removeAttribute("src");
    elements.photoPlaceholder.hidden = false;
    elements.photoReplace.hidden = true;
    elements.catPhoto.value = "";
    elements.locationStatus.textContent = "准备获取当前位置…";
    elements.formError.hidden = true;
    elements.formError.textContent = "";
    elements.submitReportButton.disabled = false;
    updateReportMode();
  }

  function startFormLocation() {
    stopMapPicking();
    elements.formError.hidden = true;
    elements.locationStatus.textContent = "正在获取当前位置…";

    if (!navigator.geolocation) {
      useMapCenterAsFallback("这个浏览器不支持定位，请在地图上选点。");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const [lng, lat] = wgs84ToGcj02(
          position.coords.longitude,
          position.coords.latitude
        );
        state.pendingLocation = {
          coords: [lat, lng],
          source: "gps",
          accuracy: Math.round(position.coords.accuracy || 0)
        };
        updateCandidateMarker();
        updateLocationStatus();
        map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.65 });
        showUserMarker([lat, lng]);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "没有获得定位权限，请在地图上选点。"
            : "定位失败，请在地图上手动选点。";
        useMapCenterAsFallback(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function useMapCenterAsFallback(message) {
    const center = map.getCenter();
    state.pendingLocation = {
      coords: [center.lat, center.lng],
      source: "center",
      accuracy: 0
    };
    updateCandidateMarker();
    elements.locationStatus.textContent = message;
    elements.formError.hidden = false;
    elements.formError.textContent = `${message} 当前暂用地图中心，建议点击“地图选点”。`;
  }

  function updateLocationStatus() {
    if (!state.pendingLocation) {
      elements.locationStatus.textContent = "等待获取位置…";
      return;
    }
    if (state.pendingLocation.source === "gps") {
      const accuracy = state.pendingLocation.accuracy
        ? `，误差约 ${state.pendingLocation.accuracy} 米`
        : "";
      elements.locationStatus.textContent = `已获取当前位置${accuracy}`;
    } else if (state.pendingLocation.source === "map") {
      elements.locationStatus.textContent = "已在地图上标记位置";
    } else {
      elements.locationStatus.textContent = "暂用地图中心，建议手动选点";
    }
  }

  function startMapPicking() {
    state.suppressReportReset = true;
    elements.reportDialog.close();
    state.pickingLocation = true;
    elements.mapHint.classList.remove("is-hidden");
    elements.mapHint.classList.add("is-picking");
    elements.mapHint.innerHTML = "<span aria-hidden=\"true\">＋</span> 请在地图上点击猫猫的位置";
    map.getContainer().style.cursor = "crosshair";

    state.pickHandler = (event) => {
      stopMapPicking();
      state.pendingLocation = {
        coords: [event.latlng.lat, event.latlng.lng],
        source: "map",
        accuracy: 0
      };
      updateCandidateMarker();
      openReportDialog({ reset: false, requestLocation: false });
      updateLocationStatus();
    };

    map.once("click", state.pickHandler);
    showToast("请在地图上点选猫猫的位置。");
  }

  function stopMapPicking() {
    state.pickingLocation = false;
    if (state.pickHandler) {
      map.off("click", state.pickHandler);
      state.pickHandler = null;
    }
    map.getContainer().style.cursor = "";
    elements.mapHint.classList.remove("is-picking");
    if (!state.selectedId) {
      elements.mapHint.classList.remove("is-hidden");
    }
    elements.mapHint.innerHTML = '<span aria-hidden="true">↖</span> 点一点猫爪，认识一位新朋友';
  }

  function cancelMapPicking(reopenReport = false) {
    stopMapPicking();
    if (reopenReport) {
      openReportDialog({ reset: false, requestLocation: false });
    }
  }

  function updateCandidateMarker() {
    removeCandidateMarker();
    if (!state.pendingLocation) return;
    const icon = L.divIcon({
      className: "candidate-marker-shell",
      html: '<div class="candidate-marker__body"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    state.candidateMarker = L.marker(state.pendingLocation.coords, {
      icon,
      interactive: false,
      zIndexOffset: 900
    }).addTo(map);
  }

  function removeCandidateMarker() {
    if (state.candidateMarker) {
      map.removeLayer(state.candidateMarker);
      state.candidateMarker = null;
    }
  }

  function showUserMarker(coords) {
    if (state.userLocationMarker) {
      map.removeLayer(state.userLocationMarker);
    }
    const icon = L.divIcon({
      className: "location-marker-shell",
      html: '<div class="location-marker__body"></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
    state.userLocationMarker = L.marker(coords, {
      icon,
      interactive: false,
      zIndexOffset: 800
    })
      .addTo(map)
      .bindTooltip("你在这里", {
        permanent: true,
        direction: "top",
        offset: [0, -13],
        className: "user-tooltip"
      });
  }

  function locateUser() {
    if (!navigator.geolocation) {
      showToast("这个浏览器不支持定位，请使用地图选点。");
      return;
    }
    elements.locateButton.disabled = true;
    elements.locateButton.classList.add("is-loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const [lng, lat] = wgs84ToGcj02(
          position.coords.longitude,
          position.coords.latitude
        );
        showUserMarker([lat, lng]);
        map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
        showToast("已定位到你的位置。");
        elements.locateButton.disabled = false;
        elements.locateButton.classList.remove("is-loading");
      },
      () => {
        showToast("没有取得定位权限，可以在“拍照打卡”里手动选点。");
        elements.locateButton.disabled = false;
        elements.locateButton.classList.remove("is-loading");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    elements.formError.hidden = true;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showFormError("请选择一张照片文件。");
      return;
    }

    state.photoLoading = true;
    elements.submitReportButton.disabled = true;
    elements.submitReportButton.textContent = "正在处理照片…";
    elements.photoPlaceholder.hidden = false;
    elements.photoPlaceholder.querySelector("strong").textContent = "正在压缩照片…";
    elements.photoPlaceholder.querySelector("small").textContent = "上传前会自动压缩";

    try {
      const dataUrl = await compressImage(file);
      state.photoDataUrl = dataUrl;
      elements.photoPreview.src = dataUrl;
      elements.photoPreview.hidden = false;
      elements.photoPlaceholder.hidden = true;
      elements.photoReplace.hidden = false;
    } catch (error) {
      console.warn("照片处理失败：", error);
      showFormError("这张照片无法读取，请重新拍一张。");
      state.photoDataUrl = null;
      elements.photoPreview.hidden = true;
      elements.photoPlaceholder.hidden = false;
      elements.photoReplace.hidden = true;
    } finally {
      state.photoLoading = false;
      elements.submitReportButton.disabled = false;
      updateReportMode();
      elements.photoPlaceholder.querySelector("strong").textContent = "拍一张猫猫";
      elements.photoPlaceholder.querySelector("small").textContent = "支持直接调用手机相机";
      elements.catPhoto.value = "";
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("无法读取照片"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("无法解析照片"));
        image.onload = () => {
          const scale = Math.min(
            1,
            MAX_PHOTO_EDGE / Math.max(image.naturalWidth, image.naturalHeight)
          );
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          context.fillStyle = "#f4efe5";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [header, payload] = String(dataUrl).split(",");
    const mime = /data:([^;]+)/.exec(header)?.[1] || "image/jpeg";
    const binary = window.atob(payload || "");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mime });
  }

  function createPhotoId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const random = Math.floor(Math.random() * 16);
      const value = character === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  async function handleReportSubmit(event) {
    event.preventDefault();
    elements.formError.hidden = true;

    if (!state.photoDataUrl) {
      showFormError("先给猫猫拍一张照片吧。");
      return;
    }
    if (!state.pendingLocation) {
      showFormError("还需要一个位置，请重新定位或在地图上选点。");
      return;
    }

    const locationName = elements.locationName.value.trim();
    if (!locationName) {
      showFormError("请填写一个点位名称，方便其他人找到它。");
      elements.locationName.focus();
      return;
    }

    if (state.photoLoading) {
      showFormError("照片还在处理中，请稍等一秒。");
      return;
    }

    const isAdmin = state.isAdmin;
    const catId = createPhotoId();
    const catName = elements.catName.value.trim() || "新朋友";
    const photoPath = `${isAdmin ? "approved" : "submissions"}/${catId}.jpg`;
    const blob = dataUrlToBlob(state.photoDataUrl);

    elements.submitReportButton.disabled = true;
    elements.submitReportButton.textContent = "正在上传照片…";
    elements.formError.hidden = true;

    const { error: uploadError } = await supabaseClient.storage
      .from(PHOTO_BUCKET)
      .upload(photoPath, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false
      });

    if (uploadError) {
      console.error("照片上传失败：", uploadError);
      showFormError(reportErrorMessage(uploadError, "照片上传失败，请检查网络后重试。"));
      elements.submitReportButton.disabled = false;
      updateReportMode();
      return;
    }

    const { data: publicPhoto } = supabaseClient.storage
      .from(PHOTO_BUCKET)
      .getPublicUrl(photoPath);

    const now = new Date().toISOString();
    const payload = {
      id: catId,
      name: catName,
      area: locationName,
      latitude: state.pendingLocation.coords[0],
      longitude: state.pendingLocation.coords[1],
      photo_url: publicPhoto.publicUrl,
      photo_path: photoPath,
      note:
        elements.catNote.value.trim() ||
        "刚刚被收录进图鉴，等待更多目击情报。",
      personality: elements.catPersonality.value,
      need: elements.catNeed.value,
      sterilized: false,
      cats_count: 1,
      approximate: state.pendingLocation.source === "center",
      status: isAdmin ? "approved" : "pending",
      source: isAdmin ? "admin" : "community",
      submitted_by: state.user?.id ?? null,
      reviewed_by: isAdmin ? state.user?.id ?? null : null,
      reviewed_at: isAdmin ? now : null,
      last_seen: now
    };

    const { error: insertError } = await supabaseClient.from("cats").insert(payload);

    if (insertError) {
      console.error("保存猫猫点位失败：", insertError);
      if (isAdmin) {
        await supabaseClient.storage.from(PHOTO_BUCKET).remove([photoPath]);
      }
      showFormError(reportErrorMessage(insertError, "点位保存失败，请稍后重试。"));
      elements.submitReportButton.disabled = false;
      updateReportMode();
      return;
    }

    elements.reportDialog.close();
    elements.submitReportButton.disabled = false;
    updateReportMode();

    if (!isAdmin) {
      showToast(`已收到 ${catName} 的投稿，审核通过后会出现在地图上。`);
      return;
    }

    state.filter = "all";
    elements.filterRow.querySelectorAll("[data-filter]").forEach((chip) => {
      const isActive = chip.dataset.filter === "all";
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    });
    state.selectedId = catId;
    await loadCats();
    const newCat = state.cats.find((cat) => cat.id === catId);
    if (newCat) {
      selectCat(newCat.id, true);
      map.flyTo(newCat.coords, 16, { duration: 0.8 });
    }
    showToast(`已把 ${catName} 发布到扬州猫猫图鉴。`);
  }

  function reportErrorMessage(error, fallback) {
    const message = String(error?.message || "");
    if (/row-level security|violates row-level/i.test(message)) {
      return "当前账号没有发布权限，请确认管理员身份。";
    }
    if (/bucket|storage/i.test(message)) return "照片存储尚未配置好，请稍后重试。";
    if (/fetch|network/i.test(message)) return "网络连接失败，请稍后重试。";
    return fallback;
  }

  function showFormError(message) {
    elements.formError.textContent = message;
    elements.formError.hidden = false;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 3600);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function outOfChina(lng, lat) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  function transformLat(x, y) {
    let result =
      -100 +
      2 * x +
      3 * y +
      0.2 * y * y +
      0.1 * x * y +
      0.2 * Math.sqrt(Math.abs(x));
    result +=
      ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) /
      3;
    result +=
      ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) /
      3;
    result +=
      ((160 * Math.sin((y / 12) * Math.PI) +
        320 * Math.sin((y * Math.PI) / 30)) *
        2) /
      3;
    return result;
  }

  function transformLng(x, y) {
    let result =
      300 +
      x +
      2 * y +
      0.1 * x * x +
      0.1 * x * y +
      0.1 * Math.sqrt(Math.abs(x));
    result +=
      ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) /
      3;
    result +=
      ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) /
      3;
    result +=
      ((150 * Math.sin((x / 12) * Math.PI) +
        300 * Math.sin((x / 30) * Math.PI)) *
        2) /
      3;
    return result;
  }

  function wgs84ToGcj02(lng, lat) {
    if (outOfChina(lng, lat)) return [lng, lat];
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    let dLat = transformLat(lng - 105, lat - 35);
    let dLng = transformLng(lng - 105, lat - 35);
    const radLat = (lat / 180) * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat =
      (dLat * 180) /
      (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
    dLng = (dLng * 180) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
    return [lng + dLng, lat + dLat];
  }
})();
