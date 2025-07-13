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

    // 語言變更時，更新所有卡片的價格
    const allCards = document.querySelectorAll(".game-card");
    allCards.forEach((card, index) => {
      // **修改: 增加延遲到 500ms**
      setTimeout(() => {
        fetchGamePrice(card, currentLanguage);
      }, index * 500);
    });
  });
});

/**********************
 * CSV 讀取及遊戲卡片建立（含防呆與隨機功能）
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
            console.error(`第 ${i + 1} 行資料不足欄位，將跳過：${lines[i]}`);
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

      const cardsToProcess = [];

      rows.forEach((row, index) => {
        const steamLink = row[0].trim();
        const title_en = row[1].trim();
        const title_zh = row[2].trim();
        const title_ja = row[3].trim();
        const regex = /\/app\/(\d+)\//;
        const match = steamLink.match(regex);
        if (!match) {
          console.error(
            `第 ${index + 2} 行無法解析 Steam 連結，將跳過：${steamLink}`
          );
          return;
        }
        const appId = match[1];
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

        cardsToProcess.push(cardDiv);
      });

      // 處理價格查詢佇列
      cardsToProcess.forEach((card, index) => {
        // **修改: 增加延遲到 500ms**
        setTimeout(() => {
          fetchGamePrice(card, currentLanguage);
        }, index * 500);
      });

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
 * Steam 價格查詢與標籤建立功能
 **********************/

function createPriceTag(cardElement, type, text) {
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

async function fetchGamePrice(cardElement, language) {
  const appId = cardElement.dataset.appid;
  if (!appId) return;

  const langConfig = priceLangs[language];
  
  // **修改: 建立目標 URL 和代理 URL**
  const targetUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${langConfig.cc}&l=${langConfig.l}`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
    targetUrl
  )}`;

  try {
    // **修改: fetch 代理 URL**
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      // 這裡的錯誤通常是代理伺服器本身的錯誤
      console.error(`Proxy request failed for ${appId}. Status: ${response.status}`);
      return;
    }

    const proxyData = await response.json();

    // **修改: 從代理的回應中解析出原始的 Steam 資料**
    // 代理會把原始資料放在 'contents' 欄位中，且是字串格式，需要再次解析
    if (!proxyData.contents) {
        console.error(`Proxy response for ${appId} is empty or invalid.`);
        return;
    }
    const data = JSON.parse(proxyData.contents);
    const appData = data[appId];

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
  } catch (error) {
    // 這個 catch 會捕捉到 fetch 失敗、JSON 解析失敗等所有錯誤
    console.error(`獲取價格時發生錯誤 for ${appId}:`, error);
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
          console.error(`彈幕 CSV 第 ${i + 1} 行資料不足，跳過：${lines[i]}`);
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