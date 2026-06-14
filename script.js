// ==========================================================================
// Campus Cafeteria Wait Planner & Route Navigator - Core Orchestration Script
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Data Initialization
  const restaurants = window.restaurantData || [];
  const graph = window.campusGraph || { nodes: [], adjacencyList: {} };
  const defaultStartBuilding = "第一教學大樓";

  // Coordinates for GPS simulation fallback (NTUT 第一教學大樓)
  let userCoords = null; 
  let isUsingFallbackGps = false;
  const campusCenterFallback = { lat: 25.043438448943615, lng: 121.53385514843093 };

  // Dynamic weight calculation function using Haversine distance
  function initializeGraphWeights() {
    for (const node in graph.adjacencyList) {
      const neighbors = graph.adjacencyList[node];
      const fromCoords = graph.coordinates[node];
      if (!fromCoords) continue;
      
      neighbors.forEach(edge => {
        const toCoords = graph.coordinates[edge.to];
        if (toCoords) {
          const dist = calculateHaversineDistance(
            fromCoords.lat, fromCoords.lng,
            toCoords.lat, toCoords.lng
          );
          // walking at 80m/min
          edge.weight = Math.max(1, Math.round(dist / 80));
        } else {
          edge.weight = 1;
        }
      });
    }
  }

  // Call weight initialization
  initializeGraphWeights();

  // Tab 1 Dashboard Sort state
  let dashboardSortMode = "default";
  // Tab 2 Sort mode state
  let activeSortMode = "total"; // "total" or "wait"

  // Detailed Restaurant Configuration for Modals and Banners
  const storeDetailsConfig = {
    "天津蔥抓餅": {
      img: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=600&q=80",
      queue: "3 人",
      speed: "2 分/人",
      menu: ["九層塔起司蛋抓餅 ($55)", "招牌蛋抓餅 ($45)", "玉米起司抓餅 ($60)"],
      aiStatus: "🟢 最推薦",
      aiText: "總耗時最低，排隊人潮極少，製作速度快，非常適合趕時間的學生。",
      aiClass: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
    },
    "喜歡你飯捲年糕": {
      img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",
      queue: "5 人",
      speed: "3 分/人",
      menu: ["招牌飯捲 ($75)", "辣炒年糕 ($60)", "韓式乾拌麵 ($80)"],
      aiStatus: "🟢 推薦",
      aiText: "人潮中等，韓式年糕與飯捲深受喜愛，製作速度穩定，是美味與效率兼具的選擇。",
      aiClass: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
    },
    "麗宴精緻自助餐": {
      img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
      queue: "8 人",
      speed: "3 分/人",
      menu: ["招牌雙拼便當 ($85)", "香炸大雞腿便當 ($95)", "精緻素食便當 ($80)"],
      aiStatus: "🟡 普通",
      aiText: "人流較為穩定，菜色極其豐富，但結帳口秤重可能需稍作等候。",
      aiClass: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
    },
    "摩斯漢堡": {
      img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
      queue: "12 人",
      speed: "4 分/人",
      menu: ["藜麥燒肉珍珠堡 ($105)", "摩斯鱈魚堡 ($85)", "黃金薯條 ($45)"],
      aiStatus: "🔴 擁擠",
      aiText: "現點現做加上時段熱門，排隊與取餐時間較長，若時間緊迫建議避開高峰期。",
      aiClass: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
    },
    "泰式風味料理": {
      img: "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=600&q=80",
      queue: "4 人",
      speed: "3 分/人",
      menu: ["泰式椒麻雞飯 ($95)", "椰汁綠咖哩雞飯 ($90)", "打拋豬肉飯 ($85)"],
      aiStatus: "🟢 推薦",
      aiText: "酸辣開胃的泰式特色料理，椒麻雞外酥內嫩，製作時間大約 12 分鐘，是喜愛泰式風味的首選。",
      aiClass: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
    }
  };

  // ==========================================
  // 2. DOM Elements Selection
  // ==========================================
  // Navigation
  const navLogo = document.getElementById("nav-logo");
  const navDashboard = document.getElementById("nav-dashboard");
  const navRecommend = document.getElementById("nav-recommend");
  const navRoute = document.getElementById("nav-route");
  const btnMobileMenu = document.getElementById("btn-mobile-menu");
  const mobileNav = document.getElementById("mobile-nav");
  const mainContent = document.getElementById("main-content");
  const mobNavDashboard = document.getElementById("mob-nav-dashboard");
  const mobNavRecommend = document.getElementById("mob-nav-recommend");
  const mobNavRoute = document.getElementById("mob-nav-route");
  
  // Real-time Clock and Theme toggle
  const clockText = document.getElementById("nav-real-time");
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  const mobBtnThemeToggle = document.getElementById("mob-btn-theme-toggle");
  const themeToggleIcon = document.getElementById("theme-toggle-icon");

  // Tab Containers
  const tabDashboardContainer = document.getElementById("tab-dashboard-container");
  const tabRecommendContainer = document.getElementById("tab-recommend-container");
  const tabRouteContainer = document.getElementById("tab-route-container");

  // Tab 1: 等待時間 Elements
  const dashboardGrid = document.getElementById("dashboard-grid");
  const selectDashboardSort = document.getElementById("select-dashboard-sort");
  const btnDashboardRefresh = document.getElementById("btn-dashboard-refresh");
  const bannerRecommendName = document.getElementById("banner-recommend-name");
  const bannerRecommendTime = document.getElementById("banner-recommend-time");
  const btnBannerGo = document.getElementById("btn-banner-go");
  const btnHeroExplore = document.getElementById("btn-hero-explore");
  const btnHeroRoute = document.getElementById("btn-hero-route");
  const statsAvgWait = document.getElementById("stats-avg-wait");

  // Tab 2: 決策規劃 (智慧推薦) Elements
  const recommendTimeInput = document.getElementById("recommend-current-time");
  const recommendCategorySelect = document.getElementById("recommend-category");
  const recommendMaxWaitInput = document.getElementById("recommend-max-wait");
  const btnSortTotal = document.getElementById("btn-sort-total");
  const btnSortWait = document.getElementById("btn-sort-wait");
  const btnRecommendSubmit = document.getElementById("btn-recommend-submit");

  // Tab 2: Report Card
  const recommendReportCard = document.getElementById("recommend-report-card");
  const repRecommendName = document.getElementById("rep-recommend-name");
  const repWaitTime = document.getElementById("rep-wait-time");
  const repFinishTime = document.getElementById("rep-finish-time");
  const repInfoAlert = document.getElementById("rep-info-alert");

  // Tab 2: Results Panels
  const featuredChoiceContainer = document.getElementById("featured-choice-container");
  const secondaryOptionsPanel = document.getElementById("secondary-options-panel");
  const notRecommendedPanel = document.getElementById("not-recommended-panel");
  const recommendEmptyState = document.getElementById("recommend-empty-state");

  const featuredImg = document.getElementById("featured-img");
  const featuredName = document.getElementById("featured-name");
  const featuredTotalTime = document.getElementById("featured-total-time");
  const featuredWaitTime = document.getElementById("featured-wait-time");
  const featuredType = document.getElementById("featured-type");
  const featuredTimeTag = document.getElementById("featured-time-tag");
  const featuredReasons = document.getElementById("featured-reasons");

  // Tab 3: 行程規劃 (路程規劃) Elements
  const routeStartNode = document.getElementById("route-start-node");
  const routeEndNode = document.getElementById("route-end-node");
  const btnRouteSubmit = document.getElementById("btn-route-submit");
  const btnGpsLocate = document.getElementById("btn-gps-locate");
  const gpsRouteStatus = document.getElementById("gps-route-status");
  
  const kpiWalkTime = document.getElementById("kpi-walk-time");
  const kpiWaitTime = document.getElementById("kpi-wait-time");
  const kpiTotalTime = document.getElementById("kpi-total-time");
  const kpiStatusBadge = document.getElementById("kpi-status-badge");
  const routePathSteps = document.getElementById("route-path-steps");
  const routeMapGraph = document.getElementById("route-map-graph");
  
  const routeBetterChoiceCard = document.getElementById("route-better-choice-card");
  const betterCanteenName = document.getElementById("better-canteen-name");
  const betterWalkTime = document.getElementById("better-walk-time");
  const betterWaitTime = document.getElementById("better-wait-time");
  const betterTotalTime = document.getElementById("better-total-time");
  const betterSavings = document.getElementById("better-savings");
  const btnRouteSwitchTarget = document.getElementById("btn-route-switch-target");

  // Modal Elements
  const storeModal = document.getElementById("store-modal");
  const modalOverlay = document.getElementById("modal-overlay");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnModalCloseFallback = document.getElementById("btn-modal-close-fallback");
  const btnModalActionRecommend = document.getElementById("btn-modal-action-recommend");
  
  const modalImg = document.getElementById("modal-img");
  const modalTitle = document.getElementById("modal-title");
  const modalWait = document.getElementById("modal-wait");
  const modalQueue = document.getElementById("modal-queue");
  const modalSpeed = document.getElementById("modal-speed");
  const modalMenu = document.getElementById("modal-menu");
  const modalAiReport = document.getElementById("modal-ai-report");

  // ==========================================
  // 3. Real-time Clock Sync (Taipei Time) & Time Inputs Setup
  // ==========================================
  function updateRealTimeClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString("zh-TW", { hour12: false });
    clockText.innerHTML = `<b>${timeString}</b>`;
  }
  
  function initTimeInputs() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    
    // Set dynamic current time on Tab 2
    if (recommendTimeInput) {
      recommendTimeInput.value = `${hh}:${mm}`;
    }
  }

  updateRealTimeClock();
  setInterval(updateRealTimeClock, 1000);
  initTimeInputs();

  // ==========================================
  // 4. Dark Theme Toggle Handler
  // ==========================================
  function toggleTheme() {
    const htmlEl = document.documentElement;
    if (htmlEl.classList.contains("dark")) {
      htmlEl.classList.remove("dark");
      htmlEl.classList.add("light");
      themeToggleIcon.textContent = "dark_mode";
    } else {
      htmlEl.classList.remove("light");
      htmlEl.classList.add("dark");
      themeToggleIcon.textContent = "light_mode";
    }
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", toggleTheme);
  }
  if (mobBtnThemeToggle) {
    mobBtnThemeToggle.addEventListener("click", () => {
      toggleTheme();
      mobileNav.classList.add("hidden");
    });
  }

  // ==========================================
  // 5. Tab Navigation Switching
  // ==========================================
  const activeNavClass = "font-label-md text-label-md text-primary dark:text-primary-fixed-dim border-b-2 border-primary dark:border-primary-fixed-dim pb-1 font-bold transition-all";
  const inactiveNavClass = "font-label-md text-label-md text-on-surface-variant dark:text-surface-variant font-medium hover:text-primary transition-colors duration-300 pb-1";

  const activeMobNavClass = "w-full text-left text-xs font-bold text-primary bg-primary-fixed-dim/20 py-1.5 px-2 rounded-lg hover:bg-surface-container transition-all";
  const inactiveMobNavClass = "w-full text-left text-xs font-medium text-on-surface-variant dark:text-surface-variant py-1.5 px-2 rounded-lg hover:bg-surface-container transition-all";

  function toggleMobileMenu() {
    const isExpanded = mobileNav.classList.contains("opacity-100");
    if (isExpanded) {
      mobileNav.classList.remove("max-h-64", "opacity-100", "pointer-events-auto");
      mobileNav.classList.add("max-h-0", "opacity-0", "pointer-events-none");
      mainContent.classList.remove("translate-x-12");
    } else {
      mobileNav.classList.remove("max-h-0", "opacity-0", "pointer-events-none");
      mobileNav.classList.add("max-h-64", "opacity-100", "pointer-events-auto");
      mainContent.classList.add("translate-x-12");
    }
  }

  function switchTab(targetTab) {
    // Hide all
    tabDashboardContainer.classList.add("hidden");
    tabRecommendContainer.classList.add("hidden");
    tabRouteContainer.classList.add("hidden");

    // Reset styles
    navDashboard.className = inactiveNavClass;
    navRecommend.className = inactiveNavClass;
    navRoute.className = inactiveNavClass;

    mobNavDashboard.className = inactiveMobNavClass;
    mobNavRecommend.className = inactiveMobNavClass;
    mobNavRoute.className = inactiveMobNavClass;

    if (targetTab === "dashboard") {
      tabDashboardContainer.classList.remove("hidden");
      navDashboard.className = activeNavClass;
      mobNavDashboard.className = activeMobNavClass;
      renderDashboardGrid();
    } else if (targetTab === "recommend") {
      tabRecommendContainer.classList.remove("hidden");
      navRecommend.className = activeNavClass;
      mobNavRecommend.className = activeMobNavClass;
      calculateSmartRecommendations();
    } else if (targetTab === "route") {
      tabRouteContainer.classList.remove("hidden");
      navRoute.className = activeNavClass;
      mobNavRoute.className = activeMobNavClass;
      calculateRoutePlanner();
    }
    
    // Collapse mobile menu and reset main offset
    mobileNav.classList.remove("max-h-64", "opacity-100", "pointer-events-auto");
    mobileNav.classList.add("max-h-0", "opacity-0", "pointer-events-none");
    mainContent.classList.remove("translate-x-12");
  }

  navLogo.addEventListener("click", () => switchTab("dashboard"));
  navDashboard.addEventListener("click", () => switchTab("dashboard"));
  navRecommend.addEventListener("click", () => switchTab("recommend"));
  navRoute.addEventListener("click", () => switchTab("route"));

  mobNavDashboard.addEventListener("click", () => switchTab("dashboard"));
  mobNavRecommend.addEventListener("click", () => switchTab("recommend"));
  mobNavRoute.addEventListener("click", () => switchTab("route"));

  btnMobileMenu.addEventListener("click", toggleMobileMenu);

  // Hero Section redirects
  btnHeroExplore.addEventListener("click", () => switchTab("recommend"));
  btnHeroRoute.addEventListener("click", () => switchTab("route"));

  // ==========================================
  // 6. Dijkstra's Algorithm
  // ==========================================
  function runDijkstra(graphData, startNode, endNode) {
    let distances = {};
    let visited = new Set();
    let prevNodes = {};

    graphData.nodes.forEach(node => {
      distances[node] = Infinity;
      prevNodes[node] = null;
    });
    distances[startNode] = 0;

    while (visited.size < graphData.nodes.length) {
      let minDistance = Infinity;
      let u = null;

      graphData.nodes.forEach(node => {
        if (!visited.has(node) && distances[node] < minDistance) {
          minDistance = distances[node];
          u = node;
        }
      });

      if (u === null) break;
      if (u === endNode) break;

      visited.add(u);
      
      const neighbors = graphData.adjacencyList[u] || [];
      neighbors.forEach(edge => {
        const v = edge.to;
        const weight = edge.weight;

        if (visited.has(v)) return;

        const altDist = distances[u] + weight;
        if (altDist < distances[v]) {
          distances[v] = altDist;
          prevNodes[v] = u;
        }
      });
    }

    let path = [];
    let current = endNode;
    while (current !== null) {
      path.push(current);
      current = prevNodes[current];
    }
    path.reverse();

    return {
      distance: distances[endNode],
      path: path
    };
  }

  // ==========================================
  // 7. Tab 1: 等待時間 (Dashboard Grid Rendering & Sorting)
  // ==========================================
  function renderDashboardGrid() {
    dashboardGrid.innerHTML = "";

    // Create a copy list to sort
    let renderList = [...restaurants];
    if (dashboardSortMode === "wait-asc") {
      renderList.sort((a, b) => a.waitTime - b.waitTime);
    } else if (dashboardSortMode === "wait-desc") {
      renderList.sort((a, b) => b.waitTime - a.waitTime);
    }

    renderList.forEach(r => {
      // Determine badges and colors
      let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
      let dotColor = "bg-emerald-600";
      let label = "人潮少";
      let waitColor = "text-emerald-600 dark:text-emerald-400";

      if (r.waitTime > 10 && r.waitTime <= 18) {
        badgeColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
        dotColor = "bg-amber-500";
        label = "普通";
        waitColor = "text-amber-600 dark:text-amber-400";
      } else if (r.waitTime > 18) {
        badgeColor = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30";
        dotColor = "bg-red-600";
        label = "擁擠";
        waitColor = "text-red-600 dark:text-red-400";
      }

      // Map restaurant name to icon
      let icon = "restaurant";
      if (r.name.includes("自助餐")) icon = "restaurant_menu";
      else if (r.name.includes("年糕")) icon = "ramen_dining";
      else if (r.name.includes("蔥抓餅")) icon = "breakfast_dining";
      else if (r.name.includes("摩斯") || r.name.includes("漢堡")) icon = "lunch_dining";
      else if (r.name.includes("文華食堂")) icon = "dinner_dining";

      const storeConfig = storeDetailsConfig[r.name] || {};

      const card = document.createElement("div");
      card.className = "bg-surface-container-lowest rounded-24 p-4 sm:p-5 soft-shadow border border-outline-variant/30 group hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between h-[210px] sm:h-[230px] text-center sm:text-left items-center sm:items-stretch";
      card.innerHTML = `
        <div class="w-full flex flex-col items-center sm:items-stretch">
          <div class="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-xs sm:gap-0 mb-3 w-full">
            <div class="w-10 h-10 rounded-xl bg-surface-container-high dark:bg-[#3d3d3d] flex items-center justify-center text-primary shrink-0">
              <span class="material-symbols-outlined text-[22px]">${icon}</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 ${badgeColor} border font-bold">
              <span class="w-1.5 h-1.5 rounded-full ${dotColor} pulse-dot"></span> ${label}
            </span>
          </div>
          <div class="space-y-xs w-full">
            <p class="text-on-surface-variant dark:text-outline text-[10px] uppercase font-bold">${r.type}</p>
            <h4 class="text-sm sm:text-base md:text-lg text-on-surface dark:text-[#fcf9f5] font-bold group-hover:text-primary transition-colors">${r.name}</h4>
          </div>
        </div>
        <div class="pt-3 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center sm:justify-between gap-xs sm:gap-0 w-full">
          <span class="text-on-surface-variant dark:text-outline text-xs sm:text-sm font-bold">等待時間</span>
          <span class="text-lg sm:text-xl font-extrabold ${waitColor}">${r.waitTime} 分鐘</span>
        </div>
      `;
      // Click to open modal
      card.addEventListener("click", () => openStoreModal(r.name));
      dashboardGrid.appendChild(card);
    });

    // Update Average wait time
    if (statsAvgWait) {
      const totalWait = restaurants.reduce((sum, r) => sum + r.waitTime, 0);
      const avg = Math.round(totalWait / restaurants.length);
      statsAvgWait.innerHTML = `${avg} <span class="text-body-md font-normal opacity-60">分鐘</span>`;
    }
  }

  // Dashboard Sort Dropdown Listener
  selectDashboardSort.addEventListener("change", () => {
    dashboardSortMode = selectDashboardSort.value;
    renderDashboardGrid();
  });

  // Calculate Featured Canteen Recommendation Banner
  function updateDashboardRecommendationBanner() {
    let bestCanteen = null;
    let minTotalTime = Infinity;

    restaurants.forEach(canteen => {
      const pathResult = runDijkstra(graph, defaultStartBuilding, "學生餐廳");
      const walkTime = pathResult.distance;
      const totalTime = walkTime + canteen.waitTime;

      if (totalTime < minTotalTime) {
        minTotalTime = totalTime;
        bestCanteen = canteen;
      }
    });

    if (bestCanteen) {
      bannerRecommendName.textContent = bestCanteen.name;
      bannerRecommendTime.textContent = bestCanteen.waitTime + " 分鐘";
      
      btnBannerGo.onclick = () => {
        openStoreModal(bestCanteen.name);
      };
    }
  }

  // Dashboard Refresh Button
  btnDashboardRefresh.addEventListener("click", () => {
    // Randomize wait times slightly
    restaurants.forEach(r => {
      const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
      r.waitTime = Math.max(2, Math.min(30, r.waitTime + delta));
    });

    // Animate refresh rotation
    const refreshIcon = btnDashboardRefresh.querySelector(".material-symbols-outlined");
    if (refreshIcon) {
      refreshIcon.classList.add("animate-spin");
      setTimeout(() => refreshIcon.classList.remove("animate-spin"), 500);
    }

    renderDashboardGrid();
    updateDashboardRecommendationBanner();
  });

  // Render initial Tab 1 dashboard contents
  renderDashboardGrid();
  updateDashboardRecommendationBanner();

  // ==========================================
  // 8. Tab 2: 決策規劃 (智慧推薦) Calculations
  // ==========================================
  
  // Sort modes toggling
  btnSortTotal.addEventListener("click", () => {
    activeSortMode = "total";
    btnSortTotal.className = "px-md py-xs pill-radius font-label-sm text-label-sm border border-primary text-primary bg-primary-fixed-dim/20 font-bold";
    btnSortWait.className = "px-md py-xs pill-radius font-label-sm text-label-sm border border-outline-variant text-on-surface-variant font-bold";
    calculateSmartRecommendations();
  });

  btnSortWait.addEventListener("click", () => {
    activeSortMode = "wait";
    btnSortWait.className = "px-md py-xs pill-radius font-label-sm text-label-sm border border-primary text-primary bg-primary-fixed-dim/20 font-bold";
    btnSortTotal.className = "px-md py-xs pill-radius font-label-sm text-label-sm border border-outline-variant text-on-surface-variant font-bold";
    calculateSmartRecommendations();
  });

  function calculateSmartRecommendations() {
    const endPreference = recommendCategorySelect.value;
    const currentTimeStr = recommendTimeInput.value || "12:30";
    const maxWaitLimitVal = recommendMaxWaitInput.value.trim();
    const maxWaitLimit = maxWaitLimitVal !== "" ? parseInt(maxWaitLimitVal, 10) : Infinity;

    // Filter candidate canteens matching category and wait-time constraints
    const candidates = [];
    const excludedList = [];

    restaurants.forEach(canteen => {
      const pathResult = runDijkstra(graph, defaultStartBuilding, "學生餐廳");
      const walkTime = pathResult.distance;
      const totalTime = walkTime + canteen.waitTime;

      const categoryMatches = (endPreference === "none" || canteen.type === endPreference);
      const waitTimeComplies = (maxWaitLimitVal === "" || isNaN(maxWaitLimit) || canteen.waitTime <= maxWaitLimit);

      const item = {
        name: canteen.name,
        type: canteen.type,
        waitTime: canteen.waitTime,
        walkTime: walkTime,
        totalTime: totalTime,
        pathResult: pathResult,
        description: canteen.description || "",
        popularFood: canteen.popularFood || ""
      };

      if (categoryMatches && waitTimeComplies) {
        candidates.push(item);
      } else {
        excludedList.push(item);
      }
    });

    // Handle Empty state
    if (candidates.length === 0) {
      featuredChoiceContainer.classList.add("hidden");
      secondaryOptionsPanel.classList.add("hidden");
      notRecommendedPanel.classList.add("hidden");
      recommendReportCard.classList.add("hidden");
      recommendEmptyState.classList.remove("hidden");
      return;
    }

    recommendEmptyState.classList.add("hidden");

    // Sort valid candidates based on active sort mode
    if (activeSortMode === "total") {
      candidates.sort((a, b) => a.totalTime - b.totalTime);
    } else {
      candidates.sort((a, b) => a.waitTime - b.waitTime);
    }

    // 1. Featured Choice (Winner #1)
    const featured = candidates[0];
    featuredChoiceContainer.classList.remove("hidden");
    
    // Set banner image
    const featuredConfig = storeDetailsConfig[featured.name] || {};
    featuredImg.src = featuredConfig.img || "data/cafeteria.png";
    featuredName.textContent = featured.name;
    featuredTotalTime.textContent = featured.totalTime;
    featuredWaitTime.textContent = featured.waitTime;
    featuredType.textContent = featured.type;

    // Format walk nodes
    const nodeStr = featured.pathResult.path.join(" ➔ ");
    featuredReasons.innerHTML = `
      <li class="flex items-start gap-sm">
        <span class="material-symbols-outlined text-primary text-[20px] mt-0.5">check_circle</span>
        <span>總耗時最短，包含步行 <b>${featured.walkTime}</b> 分鐘及店內等待 <b>${featured.waitTime}</b> 分鐘。</span>
      </li>
      <li class="flex items-start gap-sm">
        <span class="material-symbols-outlined text-primary text-[20px] mt-0.5">check_circle</span>
        <span>預估導航路徑：${nodeStr}。</span>
      </li>
      <li class="flex items-start gap-sm">
        <span class="material-symbols-outlined text-primary text-[20px] mt-0.5">check_circle</span>
        <span>店內主打招牌為 <b>${featured.popularFood}</b>，非常推薦！</span>
      </li>
    `;

    // 2. Secondary Choices (#2 and #3)
    secondaryOptionsPanel.innerHTML = "";
    const runners = candidates.slice(1, 3);
    if (runners.length > 0) {
      secondaryOptionsPanel.classList.remove("hidden");
      runners.forEach((r, idx) => {
        const choiceCard = document.createElement("div");
        choiceCard.className = "bg-surface-container-lowest p-md card-radius border border-outline-variant custom-shadow hover:bg-surface-container-low transition-colors group cursor-pointer";
        choiceCard.innerHTML = `
          <div class="flex justify-between items-start mb-md">
            <div>
              <span class="font-label-sm text-on-surface-variant opacity-60 mb-xs block">推薦排名 #${idx + 2}</span>
              <h4 class="font-headline-md text-headline-md text-on-surface font-bold">${r.name}</h4>
            </div>
            <div class="bg-primary/5 p-sm rounded-full text-primary shrink-0">
              <span class="material-symbols-outlined">restaurant_menu</span>
            </div>
          </div>
          <div class="flex gap-sm mb-md flex-wrap font-bold">
            <span class="font-body-md text-on-surface-variant flex items-center gap-xs">
              <span class="material-symbols-outlined text-[18px]">schedule</span> 總共 ${r.totalTime} 分鐘
            </span>
            <span class="font-body-md text-on-surface-variant flex items-center gap-xs">
              <span class="material-symbols-outlined text-[18px]">timer_10_alt_1</span> 等待 ${r.waitTime} 分鐘
            </span>
          </div>
          <p class="text-label-sm text-on-surface-variant italic mb-md">${r.description}</p>
          <button class="w-full py-sm border border-primary text-primary pill-radius font-label-md hover:bg-primary hover:text-on-primary transition-all font-bold">
            查看詳情
          </button>
        `;
        choiceCard.addEventListener("click", () => openStoreModal(r.name));
        secondaryOptionsPanel.appendChild(choiceCard);
      });
    } else {
      secondaryOptionsPanel.classList.add("hidden");
    }

    // 3. Not Recommended / Busy Option
    notRecommendedPanel.innerHTML = "";
    const excludedCanteens = [...candidates.slice(3), ...excludedList];
    if (excludedCanteens.length > 0) {
      notRecommendedPanel.classList.remove("hidden");
      
      const subHeader = document.createElement("h4");
      subHeader.className = "font-label-md text-on-surface-variant opacity-70 ml-2 font-bold mb-2";
      subHeader.textContent = "其他選項 (不推薦或較擁擠)";
      notRecommendedPanel.appendChild(subHeader);

      excludedCanteens.forEach(r => {
        const busyCard = document.createElement("div");
        busyCard.className = "bg-surface-container-high/50 p-md card-radius border border-outline-variant/50 border-dashed opacity-75 flex flex-col md:flex-row justify-between items-start md:items-center gap-md cursor-pointer hover:bg-surface-container-high transition-colors";
        busyCard.innerHTML = `
          <div class="flex items-center gap-md">
            <div class="bg-surface-dim p-sm rounded-full text-on-surface-variant shrink-0">
              <span class="material-symbols-outlined">fastfood</span>
            </div>
            <div>
              <h4 class="font-headline-md text-headline-md text-on-surface-variant font-bold">${r.name}</h4>
              <p class="font-body-md text-on-surface-variant flex items-center gap-xs font-semibold">
                <span class="material-symbols-outlined text-[18px]">history</span> 等待 ${r.waitTime} 分鐘 (總共 ${r.totalTime} 分鐘)
              </p>
            </div>
          </div>
          <div class="bg-error/10 border border-error/20 text-error px-md py-sm pill-radius font-bold text-label-md flex items-center gap-xs shrink-0">
            <span class="w-3 h-3 bg-error rounded-full"></span>
            ${r.waitTime > 18 ? "🔴 目前較為擁擠" : "⚠️ 不符偏好/限制"}
          </div>
        `;
        busyCard.addEventListener("click", () => openStoreModal(r.name));
        notRecommendedPanel.appendChild(busyCard);
      });
    } else {
      notRecommendedPanel.classList.add("hidden");
    }

    // 4. Update Analysis Report Card
    recommendReportCard.classList.remove("hidden");
    repRecommendName.textContent = featured.name;
    repWaitTime.textContent = featured.waitTime + " 分鐘";

    // Parse current time input
    let startHour = 12;
    let startMin = 30;
    if (currentTimeStr.includes(":")) {
      const parts = currentTimeStr.split(":");
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        startHour = h;
        startMin = m;
      }
    }
    const currentTotalMinutes = startHour * 60 + startMin;
    const arrivalTotalMinutes = currentTotalMinutes + featured.totalTime;
    const arrivalHour = Math.floor(arrivalTotalMinutes / 60) % 24;
    const arrivalMin = arrivalTotalMinutes % 60;
    const arrivalTimeStr = `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMin).padStart(2, '0')}`;
    repFinishTime.textContent = arrivalTimeStr;

    // Set tips text
    repInfoAlert.textContent = `此餐廳符合您的時間需求，預期將於 ${arrivalTimeStr} 抵達並取得餐點。`;
  }

  // Bind Submit Recommendation Button
  btnRecommendSubmit.addEventListener("click", () => {
    const originalContent = btnRecommendSubmit.innerHTML;
    btnRecommendSubmit.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">autorenew</span> 計算中...';
    btnRecommendSubmit.disabled = true;

    setTimeout(() => {
      btnRecommendSubmit.innerHTML = originalContent;
      btnRecommendSubmit.disabled = false;
      calculateSmartRecommendations();
    }, 400);
  });

  // ==========================================
  // 9. Tab 3: 行程規劃 (路程規劃工具 & Geolocation)
  // ==========================================
  function populateRouteSelectors() {
    routeStartNode.innerHTML = "";
    routeEndNode.innerHTML = "";

    // Add GPS location option at the top
    const gpsOpt = document.createElement("option");
    gpsOpt.value = "gps";
    gpsOpt.textContent = "📍 GPS 目前位置";
    routeStartNode.appendChild(gpsOpt);

    const buildings = [
      "第一教學大樓",
      "第二教學大樓",
      "第三教學大樓",
      "Fourth 教學大樓",
      "第六教學大樓",
      "綜合科館",
      "共同科館",
      "圖書館"
    ];
    const canteens = ["麗宴精緻自助餐", "喜歡你飯捲年糕", "天津蔥抓餅", "摩斯漢堡", "泰式風味料理"];

    buildings.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      routeStartNode.appendChild(opt);
    });

    canteens.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      routeEndNode.appendChild(opt);
    });

    // Default choices (starts as building selection to show clean path initially)
    routeStartNode.value = "第一教學大樓";
    routeEndNode.value = "天津蔥抓餅";
  }

  function calculateRoutePlanner() {
    const start = routeStartNode.value;
    const end = routeEndNode.value;

    const canteen = restaurants.find(r => r.name === end);
    if (!canteen) return;

    let walkTime = 0;
    let waitTime = canteen.waitTime;

    if (start === "gps") {
      // Fetch GPS routing
      let coordsToUse = userCoords;
      if (!coordsToUse) {
        if (isUsingFallbackGps) {
          coordsToUse = campusCenterFallback;
        } else {
          triggerRouteGpsLocation();
          return; // Wait for GPS callback to resolve
        }
      }
      
      const distance = calculateHaversineDistance(
        coordsToUse.lat, coordsToUse.lng,
        canteen.lat, canteen.lng
      );

      walkTime = Math.max(1, Math.round(distance / 80)); // walking at 80m/min
      const totalTime = walkTime + waitTime;

      // Update KPI panels
      kpiWalkTime.textContent = walkTime + " 分鐘";
      kpiWaitTime.textContent = waitTime + " 分鐘";
      kpiTotalTime.textContent = totalTime + " 分鐘";

      updateKpiBadge(totalTime);

      // Render Path Navigation steps
      routePathSteps.innerHTML = "";
      routePathSteps.innerHTML = `
        <span>GPS 定位位置</span>
        <span class="material-symbols-outlined text-outline-variant text-[20px]">arrow_forward</span>
        <span class="text-primary font-bold">${end} (約 ${Math.round(distance)} 公尺)</span>
      `;

      // Render Visual map (GPS mode has 2 main nodes)
      renderVisualGpsMap(end, distance);

      // Save GPS status text
      gpsRouteStatus.classList.remove("hidden");
      if (coordsToUse === campusCenterFallback) {
        gpsRouteStatus.className = "text-xs font-semibold pl-2 mt-1 text-amber-600";
        gpsRouteStatus.textContent = `⚠️ 定位失敗，使用預設校園位置做模擬：距離 ${end} 約 ${Math.round(distance)} 公尺。`;
      } else {
        gpsRouteStatus.className = "text-xs font-semibold pl-2 mt-1 text-green-600";
        gpsRouteStatus.textContent = `📍 定位成功：距離 ${end} 約 ${Math.round(distance)} 公尺。`;
      }

    } else {
      // Clear GPS status classes
      gpsRouteStatus.classList.add("hidden");

      // Run Dijkstra building path (map target to "學生餐廳" node)
      const pathResult = runDijkstra(graph, start, "學生餐廳");
      walkTime = pathResult.distance;
      const totalTime = walkTime + waitTime;

      kpiWalkTime.textContent = walkTime + " 分鐘";
      kpiWaitTime.textContent = waitTime + " 分鐘";
      kpiTotalTime.textContent = totalTime + " 分鐘";

      updateKpiBadge(totalTime);

      // Render steps representation
      routePathSteps.innerHTML = "";
      pathResult.path.forEach((node, idx) => {
        const nodeSpan = document.createElement("span");
        if (node === "學生餐廳" && idx === pathResult.path.length - 1) {
          nodeSpan.textContent = `學生餐廳 (${end})`;
          nodeSpan.className = "text-primary font-bold";
        } else {
          nodeSpan.textContent = node;
        }
        routePathSteps.appendChild(nodeSpan);

        if (idx < pathResult.path.length - 1) {
          const arrow = document.createElement("span");
          arrow.className = "material-symbols-outlined text-outline-variant text-[20px]";
          arrow.textContent = "arrow_forward";
          routePathSteps.appendChild(arrow);
        }
      });

      // Render visual graph
      renderVisualMap(pathResult.path);
    }

    // Better choice logic
    let betterChoice = null;
    let maxSavings = 0;
    const currentTotal = walkTime + waitTime;

    restaurants.forEach(otherCanteen => {
      if (otherCanteen.name === end) return;
      
      let otherWalk = 0;
      if (start === "gps") {
        let coordsToUse = userCoords || (isUsingFallbackGps ? campusCenterFallback : null);
        if (coordsToUse) {
          const d = calculateHaversineDistance(coordsToUse.lat, coordsToUse.lng, otherCanteen.lat, otherCanteen.lng);
          otherWalk = Math.max(1, Math.round(d / 80));
        }
      } else {
        const otherPath = runDijkstra(graph, start, "學生餐廳");
        otherWalk = otherPath.distance;
      }
      
      const otherTotal = otherWalk + otherCanteen.waitTime;
      const savings = currentTotal - otherTotal;

      if (savings > maxSavings) {
        maxSavings = savings;
        betterChoice = {
          name: otherCanteen.name,
          walkTime: otherWalk,
          waitTime: otherCanteen.waitTime,
          totalTime: otherTotal,
          savings: savings
        };
      }
    });

    if (betterChoice && maxSavings >= 2) {
      routeBetterChoiceCard.classList.remove("hidden");
      betterCanteenName.textContent = betterChoice.name;
      betterWalkTime.textContent = betterChoice.walkTime;
      betterWaitTime.textContent = betterChoice.waitTime;
      betterTotalTime.textContent = betterChoice.totalTime;
      betterSavings.textContent = betterChoice.savings;
    } else {
      routeBetterChoiceCard.classList.add("hidden");
    }
  }

  function updateKpiBadge(totalTime) {
    if (totalTime <= 15) {
      kpiStatusBadge.className = "inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
      kpiStatusBadge.textContent = "🟢 人潮少 (0-15 分鐘)";
    } else if (totalTime <= 25) {
      kpiStatusBadge.className = "inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      kpiStatusBadge.textContent = "🟡 普通 (16-25 分鐘)";
    } else {
      kpiStatusBadge.className = "inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30";
      kpiStatusBadge.textContent = "🔴 擁擠 (25+ 分鐘)";
    }
  }

  function renderVisualMap(pathArray) {
    routeMapGraph.innerHTML = "";

    pathArray.forEach((node, idx) => {
      const nodeContainer = document.createElement("div");
      nodeContainer.className = "flex flex-col items-center gap-2";

      const iconDiv = document.createElement("div");
      const isRestaurant = (node === "學生餐廳" || restaurants.some(r => r.name === node));
      let iconName = "domain";

      if (idx === 0) {
        iconName = "home";
        iconDiv.className = "w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-lg ring-4 ring-primary-fixed shrink-0";
      } else if (isRestaurant) {
        iconName = "restaurant";
        iconDiv.className = "w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center text-on-secondary-container shadow-lg ring-4 ring-on-secondary-container/10 shrink-0";
      } else {
        iconDiv.className = "w-10 h-10 bg-surface-container-highest dark:bg-[#3d3d3d] rounded-xl border border-outline-variant flex items-center justify-center text-on-surface-variant shrink-0";
      }

      iconDiv.innerHTML = `<span class="material-symbols-outlined">${iconName}</span>`;
      nodeContainer.appendChild(iconDiv);

      const labelSpan = document.createElement("span");
      labelSpan.className = `text-xs font-bold ${isRestaurant ? "text-secondary dark:text-secondary-fixed" : "text-on-surface-variant dark:text-outline"}`;
      labelSpan.textContent = node;
      nodeContainer.appendChild(labelSpan);

      routeMapGraph.appendChild(nodeContainer);

      if (idx < pathArray.length - 1) {
        const lineDiv = document.createElement("div");
        lineDiv.className = "h-[2px] flex-grow bg-outline-variant relative min-w-[30px]";
        lineDiv.innerHTML = `<div class="absolute top-1/2 left-0 h-1 bg-primary rounded-full w-full -translate-y-1/2"></div>`;
        routeMapGraph.appendChild(lineDiv);
      }
    });
  }

  function renderVisualGpsMap(restaurantName, distance) {
    routeMapGraph.innerHTML = "";

    // Node 1: GPS Position
    const node1 = document.createElement("div");
    node1.className = "flex flex-col items-center gap-2";
    node1.innerHTML = `
      <div class="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-lg ring-4 ring-primary-fixed shrink-0">
        <span class="material-symbols-outlined">my_location</span>
      </div>
      <span class="text-xs font-bold text-on-surface-variant dark:text-outline">GPS 目前定位</span>
    `;
    routeMapGraph.appendChild(node1);

    // Connecting line with distance flag
    const line = document.createElement("div");
    line.className = "h-[2px] flex-grow bg-outline-variant relative min-w-[60px] flex items-center justify-center";
    line.innerHTML = `
      <div class="absolute top-1/2 left-0 h-1 bg-primary rounded-full w-full -translate-y-1/2"></div>
      <span class="absolute -top-4 px-2 py-0.5 bg-[#f0ede9] dark:bg-[#2d2d2d] border border-outline-variant/30 rounded text-[9px] font-bold text-primary dark:text-[#fecb9b] whitespace-nowrap shadow-sm">
        約 ${Math.round(distance)} 公尺
      </span>
    `;
    routeMapGraph.appendChild(line);

    // Node 2: Target Restaurant
    const node2 = document.createElement("div");
    node2.className = "flex flex-col items-center gap-2";
    node2.innerHTML = `
      <div class="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center text-on-secondary-container shadow-lg ring-4 ring-on-secondary-container/10 shrink-0">
        <span class="material-symbols-outlined">restaurant</span>
      </div>
      <span class="text-xs font-bold text-secondary dark:text-[#e4e4c8]">${restaurantName}</span>
    `;
    routeMapGraph.appendChild(node2);
  }

  function triggerRouteGpsLocation() {
    userCoords = null;
    isUsingFallbackGps = false;

    gpsRouteStatus.classList.remove("hidden");
    gpsRouteStatus.textContent = "正在取得 GPS 定位中...";
    gpsRouteStatus.className = "text-xs font-semibold pl-2 mt-1 text-amber-600 animate-pulse";
    
    const options = { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        isUsingFallbackGps = false;
        gpsRouteStatus.textContent = "📍 定位成功！";
        gpsRouteStatus.className = "text-xs font-semibold pl-2 mt-1 text-green-600";
        routeStartNode.value = "gps";
        calculateRoutePlanner();
      },
      (error) => {
        console.warn("GPS High Accuracy Error, retrying with low accuracy:", error);
        // Retry with low accuracy (much faster, resolves immediately)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            userCoords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            };
            isUsingFallbackGps = false;
            gpsRouteStatus.textContent = "📍 定位成功！";
            gpsRouteStatus.className = "text-xs font-semibold pl-2 mt-1 text-green-600";
            routeStartNode.value = "gps";
            calculateRoutePlanner();
          },
          (err) => {
            console.error("GPS Fallback Error:", err);
            let errMsg = "❌ GPS 定位失敗，使用預設校園位置做模擬。";
            if (err.code === err.PERMISSION_DENIED) {
              errMsg = "❌ 定位權限被拒絕，請在瀏覽器設定中開啟定位。";
            }
            gpsRouteStatus.textContent = errMsg;
            gpsRouteStatus.className = "text-xs font-semibold pl-2 mt-1 text-red-600";
            
            userCoords = null;
            isUsingFallbackGps = true;
            
            routeStartNode.value = "gps";
            calculateRoutePlanner();
          },
          { enableHighAccuracy: false, timeout: 8000 }
        );
      },
      options
    );
  }

  // Bind GPS location button
  btnGpsLocate.addEventListener("click", triggerRouteGpsLocation);

  // Switch Route Planning Target button click
  btnRouteSwitchTarget.addEventListener("click", () => {
    routeEndNode.value = betterCanteenName.textContent;
    calculateRoutePlanner();
  });

  // Start building dropdown change resets GPS mode status
  routeStartNode.addEventListener("change", () => {
    if (routeStartNode.value === "gps") {
      triggerRouteGpsLocation();
    } else {
      gpsRouteStatus.classList.add("hidden");
    }
  });

  // Bind Submit Route Planner Button
  btnRouteSubmit.addEventListener("click", () => {
    const originalContent = btnRouteSubmit.innerHTML;
    btnRouteSubmit.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">autorenew</span> 規劃中...';
    btnRouteSubmit.disabled = true;

    setTimeout(() => {
      btnRouteSubmit.innerHTML = originalContent;
      btnRouteSubmit.disabled = false;
      calculateRoutePlanner();
    }, 450);
  });

  // Populate Tab 3 selectors and trigger Dijkstra initially
  populateRouteSelectors();

  // ==========================================
  // 10. Canteen Details Modal Pop-Up Management
  // ==========================================
  function openStoreModal(storeName) {
    const details = storeDetailsConfig[storeName];
    const canteen = restaurants.find(r => r.name === storeName);
    if (!details || !canteen) return;

    modalTitle.textContent = storeName;
    modalImg.src = details.img;
    modalWait.textContent = canteen.waitTime + " 分鐘";
    modalQueue.textContent = details.queue;
    modalSpeed.textContent = details.speed;

    // Populates menu dishes
    modalMenu.innerHTML = details.menu.map(dish => {
      const parts = dish.split(" ($");
      const name = parts[0];
      const price = parts[1] ? "$" + parts[1].replace(")", "") : "";
      return `
        <li class="flex justify-between items-center p-2 bg-surface-container-low dark:bg-[#3d3d3d] rounded-lg font-bold text-sm text-[#1c1c1a] dark:text-[#fcf9f5] border border-outline-variant/10">
          <span>${name}</span>
          <span class="text-primary dark:text-[#fecb9b]">${price}</span>
        </li>
      `;
    }).join("");

    // AI report card classes
    modalAiReport.className = `p-md rounded-xl ${details.aiClass}`;
    modalAiReport.innerHTML = `
      <p class="font-bold mb-1">${details.aiStatus}</p>
      <p class="text-sm font-semibold">${details.aiText}</p>
    `;

    // Action button mappings
    btnModalActionRecommend.onclick = () => {
      // Set Tab 2 filters to match category of this restaurant
      recommendCategorySelect.value = canteen.type;
      recommendMaxWaitInput.value = "";
      
      closeStoreModal();
      switchTab("recommend");
    };

    storeModal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Prevent background scroll
  }

  function closeStoreModal() {
    storeModal.classList.add("hidden");
    document.body.style.overflow = ""; // Enable background scroll
  }

  btnCloseModal.addEventListener("click", closeStoreModal);
  btnModalCloseFallback.addEventListener("click", closeStoreModal);
  modalOverlay.addEventListener("click", closeStoreModal);

  // Initialize Tab 1 (Dashboard) as default active landing tab
  switchTab("dashboard");

  // Dynamic Haversine distance calculator
  function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  }
});

// // 把這段程式碼直接刪除，或者在每行前面加上 // 註解掉
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('./sw.js')
//       .then((reg) => console.log('Service Worker registered successfully with scope:', reg.scope))
//       .catch((err) => console.error('Service Worker registration failed:', err));
//   });
// }

// 自動註銷並清理之前的 Service Worker，避免快取導致手機版面不更新
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister().then(() => {
        console.log('已自動清除舊版快取服務 (Service Worker Unregistered)');
      });
    }
  });
}
