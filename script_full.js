// ==========================================================================
// Campus Cafeteria Wait Time Planner - Core Logic & Humanist Organic Style
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Mock Data global variables
  const restaurants = window.restaurantData || [];
  const graph = window.campusGraph || { nodes: [], adjacencyList: {} };

  // DOM Elements
  const restaurantListContainer = document.getElementById("restaurant-list");
  const btnSort = document.getElementById("btn-sort");
  const btnRefresh = document.getElementById("btn-refresh");
  const selectStart = document.getElementById("start-node");
  const selectEnd = document.getElementById("end-node");
  const inputCurrentTime = document.getElementById("current-input-time");
  const inputScheduleTime = document.getElementById("schedule-time");
  const btnCalculate = document.getElementById("btn-calculate");
  const plannerResult = document.getElementById("planner-result");
  const clockText = document.getElementById("current-time");
  const alarmSelector = document.getElementById("alarm-selector");
  const btnTestNotification = document.getElementById("btn-test-notification");
  
  // Recommend Panel Elements
  const recommendTitle = document.getElementById("recommend-title");
  const recommendDesc = document.getElementById("recommend-desc");
  const recommendTime = document.getElementById("recommend-time");
  const btnQuickGo = document.getElementById("btn-quick-go");

  // Output Displays
  const resPrefRecommend = document.getElementById("res-pref-recommend");
  const resWalkTime = document.getElementById("res-walk-time");
  const resWaitTime = document.getElementById("res-wait-time");
  const resTotalTime = document.getElementById("res-total-time");
  const resWarning = document.getElementById("res-warning");

  // Start Mode Elements
  const modeBuildingBtn = document.getElementById("mode-building");
  const modeGpsBtn = document.getElementById("mode-gps");
  const buildingSelectContainer = document.getElementById("building-select-container");
  const gpsContainer = document.getElementById("gps-container");
  const gpsStatus = document.getElementById("gps-status");

  // Consoles
  const dijkstraConsole = document.getElementById("dijkstra-console");
  const sortConsole = document.getElementById("sort-console");

  // Simulated Time Clock & Alarm States
  let activeAlarmTime = null;
  let alarmFired = false;
  let userModifiedTime = false;

  // Track user input modification on current time
  if (inputCurrentTime) {
    inputCurrentTime.addEventListener("input", () => {
      userModifiedTime = true;
    });
  }

  function updateSimulatedClock() {
    const now = new Date();
    const mockHours = "12";
    const mockMinutes = String(now.getMinutes()).padStart(2, '0');
    const mockSeconds = String(now.getSeconds()).padStart(2, '0');
    clockText.innerHTML = `模擬 <b>${mockHours}:${mockMinutes}:${mockSeconds}</b>`;
    
    // Sync current input time if user hasn't manually modified it
    if (inputCurrentTime && !userModifiedTime) {
      inputCurrentTime.value = `${mockHours}:${mockMinutes}`;
    }
    
    // Check alarm match
    const currentSimulatedTime = `${mockHours}:${mockMinutes}`;
    if (activeAlarmTime && currentSimulatedTime === activeAlarmTime && !alarmFired) {
      fireAlarmNotification(alarmSelector.value);
    }
  }
  updateSimulatedClock();
  setInterval(updateSimulatedClock, 1000);

  // Render Restaurant Cards
  function renderRestaurants(dataList) {
    restaurantListContainer.innerHTML = "";
    dataList.forEach(r => {
      // Determine status colors, labels and styles based on waiting time
      let badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
      let dotColor = "bg-emerald-600";
      let label = "人潮少 (Low)";
      let textColor = "text-emerald-600";
      let iconBgClass = "bg-[#f6f3ef] text-[#79542e]";

      if (r.waitTime > 10 && r.waitTime <= 18) {
        badgeClass = "bg-amber-50 text-amber-700 border border-amber-200";
        dotColor = "bg-amber-500";
        label = "普通 (Medium)";
        textColor = "text-amber-600";
      } else if (r.waitTime > 18) {
        badgeClass = "bg-red-50 text-red-700 border border-red-200";
        dotColor = "bg-red-600";
        label = "擁擠 (High)";
        textColor = "text-red-600";
      }

      // Map restaurant name to material icon
      let icon = "restaurant";
      if (r.name.includes("自助餐")) icon = "restaurant_menu";
      else if (r.name.includes("年糕") || r.name.includes("攪和")) icon = "ramen_dining";
      else if (r.name.includes("蔥抓餅")) icon = "breakfast_dining";
      else if (r.name.includes("摩斯") || r.name.includes("漢堡")) icon = "lunch_dining";
      else if (r.name.includes("文華食堂")) icon = "dinner_dining";

      const card = document.createElement("div");
      card.className = "bg-white rounded-[24px] p-md flex items-center justify-between border border-[#e5e2de] shadow-sm transition-all hover:shadow-md hover:translate-y-[-2px] duration-200";
      card.setAttribute("data-time", r.waitTime);
      
      card.innerHTML = `
        <div class="flex items-center gap-md">
          <div class="w-12 h-12 ${iconBgClass} rounded-full flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[24px]">${icon}</span>
          </div>
          <div>
            <h3 class="text-base font-extrabold text-[#1c1c1a]">${r.name}</h3>
            <p class="text-xs text-[#82756a] mt-[2px] font-semibold">${r.type}</p>
          </div>
        </div>
        <div class="text-right flex items-center gap-md">
          <div class="flex flex-col items-end">
            <span class="text-2xl font-extrabold ${textColor}">${r.waitTime} <small class="text-xs font-bold text-[#82756a]">分鐘等待</small></span>
            <span class="flex items-center gap-xs px-sm py-[2px] mt-[4px] ${badgeClass} rounded-full text-[10px] font-bold uppercase tracking-wider">
              <span class="w-1.5 h-1.5 rounded-full ${dotColor} pulse-dot"></span> ${label}
            </span>
          </div>
          <span class="material-symbols-outlined text-[#82756a] text-[20px]">chevron_right</span>
        </div>
      `;
      restaurantListContainer.appendChild(card);
    });
  }
  // Initial render
  renderRestaurants(restaurants);

  // Populate Dropdown Menus
  function populateSelects() {
    selectStart.innerHTML = "";
    selectEnd.innerHTML = "";

    const canteens = ["麗宴精緻自助餐", "喜歡你飯捲年糕", "天津蔥抓餅", "摩斯漢堡", "文華食堂"];
    
    graph.nodes.forEach(node => {
      const isCanteen = canteens.includes(node);
      
      if (!isCanteen) {
        // Start node: Buildings
        const option = document.createElement("option");
        option.value = node;
        option.textContent = node;
        selectStart.appendChild(option);
      } else {
        // End node: Cafeterias
        const option = document.createElement("option");
        option.value = node;
        option.textContent = node;
        selectEnd.appendChild(option);
      }
    });
  }
  populateSelects();

  // Dynamic minimum wait-time recommendation math
  let currentQuickGoCanteen = "天津蔥抓餅";
  
  function updateRecommendedRestaurant() {
    // We assume default start position is "第一教學大樓" for the recommendation banner
    const defaultStart = "第一教學大樓";
    let bestCanteen = null;
    let minTotalTime = Infinity;

    restaurants.forEach(canteen => {
      const pathResult = runDijkstra(graph, defaultStart, canteen.name, true); // silent log
      const walkTime = pathResult.distance;
      const totalTime = walkTime + canteen.waitTime;

      if (totalTime < minTotalTime) {
        minTotalTime = totalTime;
        bestCanteen = canteen;
      }
    });

    if (bestCanteen) {
      currentQuickGoCanteen = bestCanteen.name;
      recommendTitle.textContent = `今日最速首選：${bestCanteen.name}`;
      recommendTime.textContent = minTotalTime;
      recommendDesc.textContent = `推薦原因：步行+排隊總計所需時間最低 (${minTotalTime} 分鐘)，且目前排隊僅需 ${bestCanteen.waitTime} 分鐘。`;
    }
  }
  updateRecommendedRestaurant();

  // Handle Quick Go Recommend Click
  btnQuickGo.addEventListener("click", () => {
    if (selectEnd) {
      selectEnd.value = currentQuickGoCanteen;
      // Trigger calculation
      btnCalculate.click();
    }
  });

  // Custom Bubble Sort Algorithm with Visual Logs
  function bubbleSortRestaurants(arr) {
    let tempArr = [...arr];
    let n = tempArr.length;
    let logs = [];
    let swapCount = 0;
    let passCount = 0;

    logs.push(`[<b>排序初始化</b>] 共有 ${n} 家學餐餐廳資料：`);
    tempArr.forEach((r, idx) => {
      logs.push(`  [陣列索引 ${idx}] ${r.name} -> 等待時間: ${r.waitTime} 分鐘`);
    });

    for (let i = 0; i < n - 1; i++) {
      passCount++;
      let swapped = false;
      logs.push(`<br><span class="log-info"><b>【第 ${passCount} 輪氣泡掃描】</b></span>`);
      
      for (let j = 0; j < n - i - 1; j++) {
        let r1 = tempArr[j];
        let r2 = tempArr[j + 1];
        logs.push(`  比較相鄰項目: [索引 ${j}] ${r1.name} (${r1.waitTime}m) 與 [索引 ${j+1}] ${r2.name} (${r2.waitTime}m)`);
        
        if (r1.waitTime > r2.waitTime) {
          logs.push(`  <span class="log-highlight">&nbsp;&nbsp;&rarr; ${r1.waitTime}m > ${r2.waitTime}m，進行相鄰交換！</span>`);
          let temp = tempArr[j];
          tempArr[j] = tempArr[j + 1];
          tempArr[j + 1] = temp;
          swapped = true;
          swapCount++;
        } else {
          logs.push(`  &nbsp;&nbsp;&rarr; 符合排序 ( ${r1.waitTime}m &le; ${r2.waitTime}m )，保持原樣。`);
        }
      }
      
      if (!swapped) {
        logs.push(`<br><span class="log-success"><b>[早夭判斷]</b></span> 本輪無任何數值置換，排序已完全。提早結束！`);
        break;
      }
    }

    return {
      sortedArray: tempArr,
      logs: logs
    };
  }

  // Handle Sort Click
  btnSort.addEventListener("click", () => {
    const result = bubbleSortRestaurants(restaurants);
    renderRestaurants(result.sortedArray);
    
    sortConsole.innerHTML = result.logs
      .map(line => `<div class="log-line">${line}</div>`)
      .join("");
    sortConsole.scrollTop = sortConsole.scrollHeight;
    switchTab("tab-sort");
  });

  // Handle Refresh Click (Randomizes waiting time slightly for demo realism)
  btnRefresh.addEventListener("click", () => {
    restaurants.forEach(r => {
      // waitTime between 2 and 30
      const delta = Math.floor(Math.random() * 7) - 3; // -3 to +3
      r.waitTime = Math.max(2, Math.min(30, r.waitTime + delta));
    });

    renderRestaurants(restaurants);
    updateRecommendedRestaurant();

    // Trigger toast alert
    showCustomToast("🔄 數據更新成功", "已從校園感測器獲取最新的學餐排隊動態。");
  });

  // Dijkstra's Pathfinding Algorithm with Visual Logs
  function runDijkstra(graphData, startNode, endNode, silent = false) {
    let distances = {};
    let visited = new Set();
    let prevNodes = {};
    let logs = [];

    graphData.nodes.forEach(node => {
      distances[node] = Infinity;
      prevNodes[node] = null;
    });
    distances[startNode] = 0;

    if (!silent) {
      logs.push(`[<b>Dijkstra 初始化</b>]`);
      logs.push(`  &bull; 起點: <span class="log-success">${startNode}</span>`);
      logs.push(`  &bull; 權重代表大樓間步行時間 (分鐘)`);
    }

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
      path: path,
      logs: logs
    };
  }

  // Handle Calculate Click (智慧排程)
  btnCalculate.addEventListener("click", () => {
    const start = selectStart.value;
    const end = selectEnd.value;
    const currentTimeStr = inputCurrentTime.value || "12:30";
    const scheduleStr = inputScheduleTime.value;

    if (!end) {
      alert("請選擇目標餐廳！");
      return;
    }

    if (!scheduleStr) {
      alert("請設定您的行程時間點！");
      return;
    }

    // 1. Get Walk Time
    let walkTime = 0;
    let path = [];
    let resultLogs = [];

    if (activeStartMode === "gps") {
      if (!userCoords) {
        alert("正在取得 GPS 定位中，請稍候再試；或請確認您已開啟定位權限。");
        return;
      }
      const canteenData = restaurants.find(r => r.name.includes(end));
      if (canteenData) {
        const distance = calculateHaversineDistance(
          userCoords.lat, userCoords.lng,
          canteenData.lat, canteenData.lng
        );
        let displayDistance = distance;
        let isClamped = false;
        if (distance > 1500) {
          displayDistance = 240; // 模擬校內距離 240 公尺
          isClamped = true;
        }
        walkTime = Math.max(1, Math.round(displayDistance / 80));
        path = ["目前 GPS 位置", end];
        resultLogs = [
          `[GPS 定位路徑規劃]${isClamped ? ' (已模擬校內)' : ''}`,
          `  &bull; 起點: GPS 座標 (${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)})`,
          `  &bull; 距離: ${Math.round(distance)} 公尺`,
          `  &bull; 預計步行時間: ${walkTime} 分鐘`
        ];
      } else {
        walkTime = 5;
        path = ["模擬位置", end];
      }
    } else {
      if (!start) {
        alert("請選擇起點大樓！");
        return;
      }
      const pathResult = runDijkstra(graph, start, end);
      walkTime = pathResult.distance;
      path = pathResult.path;
      resultLogs = pathResult.logs;
    }

    // 2. Query Wait Time
    const canteenData = restaurants.find(r => r.name.includes(end));
    const waitTime = canteenData ? canteenData.waitTime : 0;
    const totalTime = walkTime + waitTime;

    // Parse出發時間
    const [currHours, currMinutes] = currentTimeStr.split(":").map(Number);
    const currentTotalMinutes = currHours * 60 + currMinutes;

    // Parse目標行程時間
    const [schedHours, schedMinutes] = scheduleStr.split(":").map(Number);
    const scheduleTotalMinutes = schedHours * 60 + schedMinutes;

    // Calculate arrival time (取得餐點時間)
    const arrivalTotalMinutes = currentTotalMinutes + totalTime;
    const arrivalHour = Math.floor(arrivalTotalMinutes / 60) % 24;
    const arrivalMin = arrivalTotalMinutes % 60;
    const arrivalTimeStr = `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMin).padStart(2, '0')}`;

    // 3. Render Result
    resPrefRecommend.textContent = `根據您的偏好與時間要求，推薦前往：${end}`;
    resWalkTime.textContent = walkTime;
    resWaitTime.textContent = waitTime;
    resTotalTime.textContent = totalTime;

    // Handle lateness alert
    if (arrivalTotalMinutes > scheduleTotalMinutes) {
      resWarning.className = "p-sm rounded-lg flex items-start gap-xs text-xs font-bold bg-red-50 text-red-700 border border-red-200 w-full";
      resWarning.innerHTML = `
        <span class="material-symbols-outlined shrink-0 mt-[2px] text-[16px]">warning</span>
        <span>⚠️ 警告：預計於 <b>${arrivalTimeStr}</b> 取得餐點，已遲於後續行程時間 <b>${scheduleStr}</b>。您將會遲到！</span>
      `;
    } else {
      resWarning.className = "p-sm rounded-lg flex items-start gap-xs text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 w-full";
      resWarning.innerHTML = `
        <span class="material-symbols-outlined shrink-0 mt-[2px] text-[16px]">check_circle</span>
        <span>符合您的要求！預計於 <b>${arrivalTimeStr}</b> 取得餐點，早於行程時間 <b>${scheduleStr}</b>。</span>
      `;
    }

    // Save arrival time for alarm calculation and update alarm target
    latestArrivalTotalMinutes = arrivalTotalMinutes;
    updateAlarmTarget();

    // Show result panel
    plannerResult.classList.remove("hidden");

    // Output Logs to Console
    dijkstraConsole.innerHTML = resultLogs
      .map(line => `<div class="log-line">${line}</div>`)
      .join("");
    dijkstraConsole.scrollTop = dijkstraConsole.scrollHeight;

    switchTab("tab-dijkstra");

    // Smooth scroll down to result box on smaller screens
    plannerResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Tab Control Logic
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  function switchTab(tabId) {
    tabButtons.forEach(btn => btn.classList.remove("active"));
    tabPanes.forEach(pane => pane.classList.remove("active"));

    const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const targetPane = document.getElementById(tabId);

    if (targetBtn && targetPane) {
      targetBtn.classList.add("active");
      targetPane.classList.add("active");
    }
  }

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // Geolocation & Haversine Distance Calculation
  function triggerGpsLocation() {
    gpsStatus.textContent = "正在取得 GPS 定位中...";
    gpsStatus.className = "text-xs text-amber-600 mt-1 pl-sm font-semibold animate-pulse";
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        updateGpsWalkingTime();
      },
      (error) => {
        console.error("GPS Error:", error);
        gpsStatus.textContent = "❌ GPS 定位失敗，將使用預設校園中心點進行模擬。";
        gpsStatus.className = "text-xs text-red-600 mt-1 pl-sm font-semibold";
        // Fallback coordinates (NTHU Center)
        userCoords = { lat: 24.7962, lng: 120.9967 };
        updateGpsWalkingTime();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }

  // Toggle buttons event listeners
  if (modeBuildingBtn && modeGpsBtn) {
    modeBuildingBtn.addEventListener("click", () => {
      activeStartMode = "building";
      // UI classes toggle
      modeBuildingBtn.className = "py-sm px-md rounded-lg text-sm font-bold flex items-center justify-center gap-xs transition-all bg-white text-[#79542e] shadow-sm";
      modeGpsBtn.className = "py-sm px-md rounded-lg text-sm font-bold flex items-center justify-center gap-xs transition-all text-secondary hover:text-on-surface";
      
      buildingSelectContainer.classList.remove("hidden");
      gpsContainer.classList.add("hidden");
      
      // Update primary button text
      btnCalculate.querySelector("span:not(.material-symbols-outlined)").textContent = "開始智慧排程";
    });

    modeGpsBtn.addEventListener("click", () => {
      activeStartMode = "gps";
      // UI classes toggle
      modeGpsBtn.className = "py-sm px-md rounded-lg text-sm font-bold flex items-center justify-center gap-xs transition-all bg-white text-[#79542e] shadow-sm";
      modeBuildingBtn.className = "py-sm px-md rounded-lg text-sm font-bold flex items-center justify-center gap-xs transition-all text-secondary hover:text-on-surface";
      
      gpsContainer.classList.remove("hidden");
      buildingSelectContainer.classList.add("hidden");
      
      // Update primary button text
      btnCalculate.querySelector("span:not(.material-symbols-outlined)").textContent = "開始智慧排程";
      
      // Automatically trigger location
      triggerGpsLocation();
    });
  }

  selectEnd.addEventListener("change", () => {
    if (activeStartMode === "gps") {
      updateGpsWalkingTime();
    }
  });

  function updateGpsWalkingTime() {
    if (!userCoords) return;
    const endNode = selectEnd.value;
    const canteenData = restaurants.find(r => r.name.includes(endNode));
    if (!canteenData) return;

    const distance = calculateHaversineDistance(
      userCoords.lat, userCoords.lng,
      canteenData.lat, canteenData.lng
    );
    
    let displayDistance = distance;
    let isClamped = false;
    if (distance > 1500) {
      displayDistance = 240; // 模擬校內距離 240 公尺
      isClamped = true;
    }
    const walkTime = Math.max(1, Math.round(displayDistance / 80));
    
    if (isClamped) {
      gpsStatus.textContent = `📍 GPS 定位成功(已模擬校內): 距離 ${canteenData.name} 約 ${displayDistance} 公尺，預計步行 ${walkTime} 分鐘。 (偵測到您在校外)`;
      gpsStatus.className = "text-xs text-amber-600 mt-1 pl-sm font-semibold";
    } else {
      gpsStatus.textContent = `📍 GPS 定位成功：距離 ${canteenData.name} 約 ${Math.round(distance)} 公尺，預計步行 ${walkTime} 分鐘。`;
      gpsStatus.className = "text-xs text-green-600 mt-1 pl-sm font-semibold";
    }
  }

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

  // Alarm & Notification Logic
  let latestArrivalTotalMinutes = null;

  function updateAlarmTarget() {
    const alarmOffsetStr = alarmSelector.value;
    
    if (alarmOffsetStr === "none" || latestArrivalTotalMinutes === null) {
      activeAlarmTime = null;
      return;
    }

    const offset = Number(alarmOffsetStr);
    let alarmTotalMinutes = latestArrivalTotalMinutes - offset;
    if (alarmTotalMinutes < 0) {
      alarmTotalMinutes += 24 * 60;
    }
    const alarmHour = Math.floor(alarmTotalMinutes / 60) % 24;
    const alarmMin = alarmTotalMinutes % 60;
    
    activeAlarmTime = `${String(alarmHour).padStart(2, '0')}:${String(alarmMin).padStart(2, '0')}`;
    alarmFired = false;
    console.log(`Alarm scheduled at simulated time: ${activeAlarmTime}`);
  }

  function fireAlarmNotification(offsetMinutes) {
    alarmFired = true;
    
    // 1. Browser Native Notification
    if (Notification.permission === "granted") {
      try {
        new Notification("學餐取餐提醒", {
          body: `⏰ 鬧鐘提醒：再過 ${offsetMinutes} 分鐘，您的餐點預計將準備完成！請準備取餐。`,
          icon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' fill='%2379542e'><circle cx='256' cy='256' r='256'/><text x='50%' y='65%' font-family='sans-serif' font-size='180' font-weight='bold' fill='white' text-anchor='middle'>學餐</text></svg>"
        });
      } catch (err) {
        console.log("Native notification failed:", err);
      }
    }
    
    // 2. Custom Toast fallback
    showCustomToast(
      "⏰ 取餐鬧鐘提醒",
      `再過 ${offsetMinutes} 分鐘，您的餐點預計將準備完成！請準備前往取餐。`
    );
  }

  function showCustomToast(title, body) {
    const toast = document.getElementById("custom-toast");
    const toastTitle = document.getElementById("toast-title");
    const toastBody = document.getElementById("toast-body");
    
    toastTitle.textContent = title;
    toastBody.textContent = body;
    
    toast.style.top = "20px";
    playBeep();
    
    setTimeout(() => {
      toast.style.top = "-100px";
    }, 8000);
  }

  function playBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 150);
    } catch (err) {
      console.log("Audio beep failed:", err);
    }
  }

  // Set up event listeners for alarm config
  alarmSelector.addEventListener("change", () => {
    if (alarmSelector.value !== "none") {
      if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            updateAlarmTarget();
          } else {
            alarmSelector.value = "none";
            updateAlarmTarget();
          }
        });
      } else if (Notification.permission === "denied") {
        alarmSelector.value = "none";
        updateAlarmTarget();
      } else {
        updateAlarmTarget();
      }
    } else {
      updateAlarmTarget();
    }
  });

  btnTestNotification.addEventListener("click", () => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
    
    showCustomToast(
      "🔔 測試通知成功！",
      "這是內置的取餐鬧鐘提醒，即使在本地 file:// 協議下也能正常工作。"
    );
  });
});

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('ServiceWorker registered successfully with scope:', reg.scope))
      .catch(err => console.log('ServiceWorker registration failed:', err));
  });
}
