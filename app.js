/**********************
 * 語言切換功能
 **********************/
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
  // 啟動彈幕功能
  loadDanmakuCSV();
});

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
let danmakuEnabled = true; // 新增變數來追蹤彈幕狀態

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
