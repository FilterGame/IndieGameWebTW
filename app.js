/**********************
 * 語言切換功能 & 全域變數
 **********************/
// API 與翻譯文字設定
const priceLangs = {
  zh: { cc: "tw", l: "tchinese" },
  en: { cc: "us", l: "english" },
  ja: { cc: "jp", l: "japanese" },
};
const priceText = {
  unreleased: {
    zh: "未發售",
    en: "Unreleased",
    ja: "未発売",
  },
  free: {
    zh: "免費遊玩",
    en: "Free to Play",
    ja: "無料プレイ",
  },
};

let currentLanguage = "en";
const navLang = navigator.language.toLowerCase();
if (navLang.startsWith("zh")) {
  currentLanguage = "zh";
} else if (navLang.startsWith("ja")) {
  currentLanguage = "ja";
}
function clearDanmaku() {
  const container = document.getElementById("danmaku-container");
  if (container) {
    container.innerHTML = "";
  }
}
let currentCSVButton = null;
function updateCardTitles() {
  document.querySelectorAll(".game-title").forEach((h2) => {
    const newText = h2.getAttribute("data-" + currentLanguage);
    if (newText) {
      h2.textContent = newText;
    }
  });
  document.querySelectorAll("[data-navtext]").forEach((el) => {
    const newText = el.getAttribute("data-" + currentLanguage);
    if (newText) {
      if (el.id === "modal-content") {
        el.innerHTML = newText;
      } else {
        el.textContent = newText;
      }
    }
  });
  updatePageTitle();
}
function updatePageTitle() {
  if (currentCSVButton) {
    const titleText = currentCSVButton.getAttribute("data-" + currentLanguage);
    const pageTitleEl = document.getElementById("page-title");
    if (pageTitleEl && titleText) {
      pageTitleEl.textContent = titleText;
    }
  }
}
document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    currentLanguage = this.getAttribute("data-lang");
    updateCardTitles();
    // **修改:** 語言切換時，重新用批次方式獲取當前所有卡片的價格
    const allAppIds = Array.from(
      document.querySelectorAll(".game-card")
    ).map((card) => card.dataset.appid);
    if (allAppIds.length > 0) {
      fetchPricesInBatches(allAppIds, currentLanguage);
    }
  });
});

/**********************
 * CSV 讀取及遊戲卡片建立
 **********************/
function loadCSV(csvFile) {
  const grid = document.getElementById("game-grid");
  grid.innerHTML = "";
  fetch(csvFile + "?v=" + Date.now())
    .then((response) => response.text())
    .then((text) => {
      const lines = text.trim().split("\n");
      let rows = [];
      for (let i = 1; i < lines.length; i++) {
        try {
          const row = lines[i].split(",");
          if (row.length < 4) {
            console.warn(`第 ${i + 1} 行資料不足欄位，將跳過：${lines[i]}`);
            continue;
          }
          rows.push(row);
        } catch (error) {
          console.error(
            `處理第 ${i + 1} 行資料時發生錯誤，將跳過該行：${lines[i]}`,
            error
          );
          continue;
        }
      }
      if (
        currentCSVButton &&
        currentCSVButton.getAttribute("data-random") === "true"
      ) {
        rows.sort(() => Math.random() - 0.5);
      }

      const allAppIds = []; // 儲存此列表所有的 App ID

      rows.forEach((row, index) => {
        const steamLink = row[0].trim();
        const title_en = row[1].trim();
        const title_zh = row[2].trim();
        const title_ja = row[3].trim();
        const regex = /\/app\/(\d+)\//;
        const match = steamLink.match(regex);
        if (!match) {
          console.warn(
            `第 ${index + 2} 行無法解析 Steam 連結，將跳過：${steamLink}`
          );
          return;
        }
        const appId = match[1];
        allAppIds.push(appId); // 收集 App ID

        const imageUrl = `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/library_600x900_2x.jpg`;
        const cardDiv = document.createElement("div");
        cardDiv.className = "game-card";
        cardDiv.dataset.appid = appId;

        const aTag = document.createElement("a");
        aTag.href = steamLink;
        aTag.target = "_blank";
        aTag.rel = "noopener noreferrer";
        aTag.className =
          "block overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300";
        const innerDiv = document.createElement("div");
        innerDiv.className = "relative aspect-[3/4]";
        const imgTag = document.createElement("img");
        imgTag.src = imageUrl;
        imgTag.alt = title_en;
        imgTag.className = "object-cover w-full h-full";
        innerDiv.appendChild(imgTag);
        const overlayDiv = document.createElement("div");
        overlayDiv.className =
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4";
        const h2 = document.createElement("h2");
        h2.className = "game-title text-white text-xl font-medium";
        h2.setAttribute("data-en", title_en);
        h2.setAttribute("data-zh", title_zh);
        h2.setAttribute("data-ja", title_ja);
        h2.textContent = h2.getAttribute("data-" + currentLanguage);
        overlayDiv.appendChild(h2);
        innerDiv.appendChild(overlayDiv);
        aTag.appendChild(innerDiv);
        cardDiv.appendChild(aTag);
        grid.appendChild(cardDiv);
      });

      // **核心修改: 在所有卡片建立後，一次性批次獲取價格**
      if (allAppIds.length > 0) {
        fetchPricesInBatches(allAppIds, currentLanguage);
      }

      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in-view");
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );
      document.querySelectorAll(".game-card").forEach((card) => {
        observer.observe(card);
      });
    })
    .catch((error) => console.error("讀取 CSV 檔案發生錯誤:", error));
}

document.querySelectorAll(".csv-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".csv-btn").forEach((btn) => {
      btn.style.backgroundColor = "#3b82f6";
    });
    this.style.backgroundColor = "red";
    currentCSVButton = this;
    const csvFile = this.getAttribute("data-csv");
    loadCSV(csvFile);
    updatePageTitle();
    clearDanmaku();
  });
});

window.addEventListener("DOMContentLoaded", () => {
  const firstCsvBtn = document.querySelector(".csv-btn");
  if (firstCsvBtn) {
    firstCsvBtn.style.backgroundColor = "red";
    currentCSVButton = firstCsvBtn;
    loadCSV(firstCsvBtn.getAttribute("data-csv"));
    updatePageTitle();
  }
  loadDanmakuCSV();
});

/**********************
 * Steam 價格查詢與標籤建立功能 (批次處理)
 **********************/

function createPriceTag(cardElement, type, text) {
  if (!cardElement) return;
  const container = cardElement.querySelector(".relative");
  if (!container) return;

  const oldTag = container.querySelector(".price-tag");
  if (oldTag) oldTag.remove();

  const priceTag = document.createElement("div");
  priceTag.className = `price-tag ${type}`;
  priceTag.textContent = text;
  container.appendChild(priceTag);

  setTimeout(() => {
    priceTag.classList.add("visible");
  }, 10);
}

/**
 * **新增:** 處理單一遊戲的價格資料並更新其卡片
 * @param {string} appId
 * @param {object} appData
 * @param {string} language
 */
function processPriceDataForCard(appId, appData, language) {
  const cardElement = document.querySelector(`.game-card[data-appid="${appId}"]`);
  if (!cardElement) return;

  if (!appData || !appData.success) {
    createPriceTag(cardElement, "not-released", priceText.unreleased[language]);
    return;
  }

  const details = appData.data;

  if (details.is_free) {
    createPriceTag(cardElement, "released", priceText.free[language]);
  } else if (details.release_date && details.release_date.coming_soon) {
    createPriceTag(cardElement, "not-released", priceText.unreleased[language]);
  } else if (details.price_overview) {
    const priceInfo = details.price_overview;
    if (priceInfo.discount_percent > 0) {
      const saleText = `${priceInfo.final_formatted} (-${priceInfo.discount_percent}%)`;
      createPriceTag(cardElement, "on-sale", saleText);
    } else {
      createPriceTag(cardElement, "released", priceInfo.final_formatted);
    }
  } else {
    createPriceTag(cardElement, "not-released", priceText.unreleased[language]);
  }
}

/**
 * **新增:** 將所有 App ID 分塊，並為每一塊發送一個批次請求
 * @param {string[]} allAppIds - 頁面上所有遊戲的 App ID 陣列
 * @param {string} language - 當前語言
 */
async function fetchPricesInBatches(allAppIds, language) {
  const langConfig = priceLangs[language];
  // 雖然 API 可能接受更多，但設定一個保守的塊大小以避免 URL 過長
  const chunkSize = 150; 

  for (let i = 0; i < allAppIds.length; i += chunkSize) {
    const chunk = allAppIds.slice(i, i + chunkSize);
    const appIdsString = chunk.join(",");
    const apiUrl = `https://store.steampowered.com/api/appdetails?appids=${appIdsString}&cc=${langConfig.cc}&l=${langConfig.l}&filters=price_overview,release_date`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`Batch request failed for chunk starting with ${chunk[0]}. Status: ${response.status}`);
        // 即使請求失敗，也為這批遊戲標記為未發售，避免它們永遠沒有標籤
        chunk.forEach(appId => processPriceDataForCard(appId, null, language));
        continue; // 繼續處理下一批
      }
      const data = await response.json();
      // 遍歷 API 回應中的每一個遊戲資料
      for (const appId in data) {
        processPriceDataForCard(appId, data[appId], language);
      }
    } catch (error) {
      console.error(`Error fetching batch starting with ${chunk[0]}:`, error);
      // 網路錯誤時也標記為未發售
      chunk.forEach(appId => processPriceDataForCard(appId, null, language));
    }

    // 在處理完一批後，可以選擇性地加入一個短暫延遲，雖然通常不再需要
    // await new Promise(resolve => setTimeout(resolve, 200));
  }
}

/**********************
 * Modal (更新履歷&說明) 功能
 **********************/
const modalOverlay = document.getElementById("modal-overlay");
const updateModalBtn = document.getElementById("update-modal-btn");
updateModalBtn.addEventListener("click", function (e) {
  e.preventDefault();
  modalOverlay.classList.add("active");
});
modalOverlay.addEventListener("click", function () {
  modalOverlay.classList.add("closing");
  setTimeout(() => {
    modalOverlay.classList.remove("active");
    modalOverlay.classList.remove("closing");
  }, 500);
});

/**********************
 * 彈幕功能
 **********************/
let danmakuList = [];
let totalDanmakuWeight = 0;
let danmakuIntervalId = null;
let danmakuEnabled = true;

function loadDanmakuCSV() {
  fetch("danmaku.csv?v=" + Date.now())
    .then((response) => response.text())
    .then((text) => {
      const lines = text.trim().split("\n");
      danmakuList = [];
      totalDanmakuWeight = 0;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (parts.length < 2) {
          console.warn(`彈幕 CSV 第 ${i + 1} 行資料不足，跳過：${lines[i]}`);
          continue;
        }
        const message = parts[0].trim();
        const weight = parseFloat(parts[1]);
        if (isNaN(weight) || weight <= 0) continue;
        danmakuList.push({ message, weight });
        totalDanmakuWeight += weight;
      }
      startDanmakuInterval();
    })
    .catch((error) => console.error("讀取彈幕 CSV 發生錯誤:", error));
}

function chooseDanmaku() {
  if (danmakuList.length === 0) return null;
  let r = Math.random() * totalDanmakuWeight;
  for (const item of danmakuList) {
    r -= item.weight;
    if (r <= 0) return item.message;
  }
  return danmakuList[danmakuList.length - 1].message;
}

function createDanmaku(message) {
  const container = document.getElementById("danmaku-container");
  if (!container) return;
  const danmakuEl = document.createElement("div");
  danmakuEl.className = "danmaku-item";
  danmakuEl.textContent = message;
  danmakuEl.style.top = Math.random() * 90 + "%";
  container.appendChild(danmakuEl);
  danmakuEl.addEventListener("animationend", () => {
    danmakuEl.remove();
  });
}

function startDanmakuInterval() {
  stopDanmakuInterval();
  if (danmakuEnabled) {
    danmakuIntervalId = setInterval(() => {
      const msg = chooseDanmaku();
      if (msg) {
        createDanmaku(msg);
      }
    }, 4800);
  }
}

function stopDanmakuInterval() {
  if (danmakuIntervalId !== null) {
    clearInterval(danmakuIntervalId);
    danmakuIntervalId = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopDanmakuInterval();
  } else {
    clearDanmaku();
    startDanmakuInterval();
  }
});

/**********************
 * 彈幕開關按鈕事件處理
 **********************/
const danmakuToggleBtn = document.getElementById("danmaku-toggle");
danmakuToggleBtn.addEventListener("click", () => {
  danmakuEnabled = !danmakuEnabled;
  if (danmakuEnabled) {
    danmakuToggleBtn.textContent = "彈幕 ON";
    startDanmakuInterval();
  } else {
    danmakuToggleBtn.textContent = "彈幕 OFF";
    stopDanmakuInterval();
    clearDanmaku();
  }
});