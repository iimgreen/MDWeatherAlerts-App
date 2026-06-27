const screens = document.querySelectorAll(".screen");
const navItems = document.querySelectorAll(".nav-item");
const screenButtons = document.querySelectorAll("[data-screen]");
const locationBtn = document.getElementById("locationBtn");
const locationStatus = document.getElementById("locationStatus");
const submitReportBtn = document.getElementById("submitReport");
const reportMapElement = document.getElementById("reportMap");
const countySelect = document.querySelector(".county-select");

let savedLocation = null;
let reportCount = 0;
let reportMap = null;
let reportLayer = null;
let userReports = [];
let activeReportFilter = "all";

const marylandCenter = [39.0458, -76.6413];

const reportExpirationHours = {
  "Beautiful Sky": 2,
  Rain: 3,
  "Heavy Rain": 3,
  Lightning: 3,
  "Snow/Ice": 3,
  Fog: 3,
  Flooding: 6,
  Hail: 6,
  "Wind Damage": 6,
};

const impactReportTypes = ["Flooding", "Hail", "Wind Damage"];

function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  const targetScreen = document.getElementById(screenId);

  if (targetScreen) {
    targetScreen.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navItems.forEach((item) => {
    item.classList.remove("active");

    if (item.dataset.screen === screenId) {
      item.classList.add("active");
    }
  });

  if (screenId === "reports") {
    setTimeout(() => {
      if (reportMap) {
        reportMap.invalidateSize();
      }
    }, 250);
  }
}

screenButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const screenId = button.dataset.screen;
    showScreen(screenId);
  });
});

function setGreeting() {
  const hour = new Date().getHours();
  const greeting = document.querySelector(".hero-card h2");

  if (!greeting) return;

  if (hour < 12) {
    greeting.textContent = "Good morning, Maryland";
  } else if (hour < 18) {
    greeting.textContent = "Good afternoon, Maryland";
  } else {
    greeting.textContent = "Good evening, Maryland";
  }
}

function loadDemoWeather() {
  const tempBadge = document.querySelector(".temp-badge span");
  const tempLabel = document.querySelector(".temp-badge small");
  const miniStats = document.querySelectorAll(".weather-mini-row span");

  if (tempBadge) tempBadge.textContent = "79°";
  if (tempLabel) tempLabel.textContent = "Demo";

  if (miniStats[0]) miniStats[0].textContent = "Feels like 82°";
  if (miniStats[1]) miniStats[1].textContent = "Wind 6 mph";
}

function getPrivacyOffsetLocation(latitude, longitude, miles = 0.1) {
  const earthRadiusMiles = 3958.8;
  const randomBearing = Math.random() * 2 * Math.PI;
  const distance = miles / earthRadiusMiles;

  const lat1 = latitude * (Math.PI / 180);
  const lon1 = longitude * (Math.PI / 180);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance) +
      Math.cos(lat1) * Math.sin(distance) * Math.cos(randomBearing)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(randomBearing) * Math.sin(distance) * Math.cos(lat1),
      Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: lat2 * (180 / Math.PI),
    longitude: lon2 * (180 / Math.PI),
    privacyOffsetMiles: miles,
  };
}

function createToast() {
  let toast = document.querySelector(".toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  return toast;
}

function showToast(message) {
  const toast = createToast();

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function getReportEmoji(reportTypes) {
  if (reportTypes.includes("Lightning")) return "⚡";
  if (reportTypes.includes("Hail")) return "🧊";
  if (reportTypes.includes("Flooding")) return "🌊";
  if (reportTypes.includes("Wind Damage")) return "💨";
  if (reportTypes.includes("Snow/Ice")) return "❄️";
  if (reportTypes.includes("Fog")) return "🌫️";
  if (reportTypes.includes("Beautiful Sky")) return "🌅";
  if (reportTypes.includes("Heavy Rain")) return "🌧️";
  if (reportTypes.includes("Rain")) return "🌧️";

  return "📍";
}

function getReportExpirationHours(reportTypes) {
  let expiration = 3;

  reportTypes.forEach((type) => {
    const typeExpiration = reportExpirationHours[type] || 3;

    if (typeExpiration > expiration) {
      expiration = typeExpiration;
    }
  });

  return expiration;
}

function getReportAgeMinutes(report) {
  return Math.floor((Date.now() - report.createdAt) / 60000);
}

function isImpactReport(report) {
  return report.types.some((type) => impactReportTypes.includes(type));
}

function reportMatchesFilter(report) {
  const ageMinutes = getReportAgeMinutes(report);

  if (Date.now() > report.expiresAt) return false;

  if (activeReportFilter === "all") return true;
  if (activeReportFilter === "15min") return ageMinutes <= 15;
  if (activeReportFilter === "1hr") return ageMinutes <= 60;
  if (activeReportFilter === "3hr") return ageMinutes <= 180;
  if (activeReportFilter === "impact") return isImpactReport(report);

  return true;
}

function createReportIcon(emoji, isUser = false) {
  return L.divIcon({
    className: "",
    html: `<div class="weather-report-marker ${
      isUser ? "user-marker" : ""
    }">${emoji}</div>`,
    iconSize: isUser ? [50, 50] : [42, 42],
    iconAnchor: isUser ? [25, 25] : [21, 21],
    popupAnchor: [0, -18],
  });
}

function initReportMap() {
  if (!reportMapElement) return;

  if (typeof L === "undefined") {
    reportMapElement.innerHTML =
      "<p style='padding:16px;font-weight:800;'>Map library could not load.</p>";
    return;
  }

  reportMap = L.map("reportMap", {
    center: marylandCenter,
    zoom: 7,
    zoomControl: true,
    scrollWheelZoom: false,
  });

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution:
        "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    }
  ).addTo(reportMap);

  reportLayer = L.layerGroup().addTo(reportMap);

  addDemoMapReports();

  setTimeout(() => {
    reportMap.invalidateSize();
  }, 300);
}

function addDemoMapReports() {
  if (!reportLayer) return;

  const demoReports = [
    {
      id: "demo-1",
      coords: [39.29, -76.61],
      types: ["Rain"],
      note: "Rain near Baltimore area",
      createdAt: Date.now() - 12 * 60000,
      expiresAt: Date.now() + 3 * 60 * 60 * 1000,
      isDemo: true,
    },
    {
      id: "demo-2",
      coords: [38.98, -76.49],
      types: ["Lightning"],
      note: "Lightning near central Maryland",
      createdAt: Date.now() - 35 * 60000,
      expiresAt: Date.now() + 3 * 60 * 60 * 1000,
      isDemo: true,
    },
    {
      id: "demo-3",
      coords: [39.64, -77.72],
      types: ["Wind Damage"],
      note: "Wind report near Western Maryland",
      createdAt: Date.now() - 80 * 60000,
      expiresAt: Date.now() + 6 * 60 * 60 * 1000,
      isDemo: true,
    },
  ];

  userReports.push(...demoReports);
  renderReports();
}

function getFallbackMarylandLocation() {
  const lat = 39.0458 + (Math.random() - 0.5) * 1.2;
  const lng = -76.6413 + (Math.random() - 0.5) * 1.7;

  return {
    latitude: lat,
    longitude: lng,
    privacyOffsetMiles: 0.1,
  };
}

function createReportFeed() {
  let feedSection = document.getElementById("reportFeedSection");

  if (feedSection) return feedSection;

  const reportsScreen = document.getElementById("reports");

  if (!reportsScreen) return null;

  feedSection = document.createElement("section");
  feedSection.className = "section-card";
  feedSection.id = "reportFeedSection";

  feedSection.innerHTML = `
    <div class="section-title-row">
      <h3>Submitted Reports</h3>
      <span class="pill live">Local</span>
    </div>

    <div class="report-feed" id="reportFeed">
      <p class="empty-feed">No reports submitted yet. Your reports will show here during this session.</p>
    </div>
  `;

  reportsScreen.appendChild(feedSection);

  return feedSection;
}
function escapeHTML(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getReportPopupHtml(report) {
  const submittedTime = new Date(report.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const ageMinutes = getReportAgeMinutes(report);

  const ageText =
    ageMinutes < 1
      ? "Just now"
      : ageMinutes === 1
      ? "1 minute ago"
      : ageMinutes < 60
      ? `${ageMinutes} minutes ago`
      : `${Math.floor(ageMinutes / 60)} hr ${ageMinutes % 60} min ago`;

  const expiresInMinutes = Math.max(
    0,
    Math.round((report.expiresAt - Date.now()) / 60000)
  );

  const expiresText =
    expiresInMinutes >= 60
      ? `${Math.round(expiresInMinutes / 60)} hr left`
      : `${expiresInMinutes} min left`;

  const title = report.isDemo ? "Demo report" : "Weather report";
  const types = escapeHTML(report.types.join(", "));
  const note = escapeHTML(report.note || "Approximate location shown");

  return `
    <strong>${title}</strong><br>
    <span>${types}</span><br>
    <small>Submitted: ${submittedTime} • ${ageText}</small><br>
    <small>Expires: ${expiresText}</small><br>
    <small>${note}</small>
  `;
}
function renderReports() {
  if (!reportLayer) return;

  reportLayer.clearLayers();

  const feed = document.getElementById("reportFeed");

  if (feed) {
    feed.innerHTML = "";
  }

  const visibleReports = userReports.filter(reportMatchesFilter);

  visibleReports.forEach((report) => {
    const emoji = getReportEmoji(report.types);

    const marker = L.marker(report.coords, {
      icon: createReportIcon(emoji, !report.isDemo),
    })
      .bindPopup(getReportPopupHtml(report))
      .addTo(reportLayer);

    report.marker = marker;
  });

  if (feed) {
    const submittedReports = visibleReports.filter((report) => !report.isDemo);

    if (submittedReports.length === 0) {
      feed.innerHTML =
        '<p class="empty-feed">No submitted reports match this filter yet.</p>';
    }

    submittedReports
      .slice()
      .reverse()
      .forEach((report) => {
        const card = document.createElement("div");
        card.className = "report-card";

        const timeString = new Date(report.createdAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });

        const tags = report.types
          .map((type) => `<span class="report-tag">${type}</span>`)
          .join("");

        const expiresInMinutes = Math.max(
          0,
          Math.round((report.expiresAt - Date.now()) / 60000)
        );

        const expiresText =
          expiresInMinutes >= 60
            ? `${Math.round(expiresInMinutes / 60)} hr left`
            : `${expiresInMinutes} min left`;

        card.innerHTML = `
          <div class="report-card-top">
            <strong>Report #${report.number}</strong>
            <small>${timeString}</small>
          </div>

          <small>📍 ${report.locationText}</small>

          <div class="report-tags">
            ${tags}
          </div>

          ${
            report.note
              ? `<p class="report-note">${report.note}</p>`
              : `<p class="report-note">No extra details added.</p>`
          }

          <span class="report-expire-text">Expires automatically • ${expiresText}</span>
        `;

        feed.prepend(card);
      });
  }
}

function addUserReport(reportTypes, note) {
  const reportLocation = savedLocation || getFallbackMarylandLocation();
  const expirationHours = getReportExpirationHours(reportTypes);

  reportCount += 1;

  const report = {
    id: `user-${Date.now()}`,
    number: reportCount,
    coords: [reportLocation.latitude, reportLocation.longitude],
    types: reportTypes,
    note,
    createdAt: Date.now(),
    expiresAt: Date.now() + expirationHours * 60 * 60 * 1000,
    expirationHours,
    isDemo: false,
    locationText: savedLocation
      ? `Approximate location • offset ${savedLocation.privacyOffsetMiles} mi`
      : "Location not shared",
  };

  userReports.push(report);
  renderReports();

  if (reportMap) {
    reportMap.setView(report.coords, 11, {
      animate: true,
    });
  }
}

function removeExpiredReports() {
  const beforeCount = userReports.length;

  userReports = userReports.filter((report) => Date.now() <= report.expiresAt);

  if (userReports.length !== beforeCount) {
    renderReports();
  }
}

function setupReportFilters() {
  const filterButtons = document.querySelectorAll(".report-filter");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeReportFilter = button.dataset.filter;

      filterButtons.forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      renderReports();

      showToast(`Showing ${button.textContent.trim()} reports.`);
    });
  });
}

if (locationBtn) {
  locationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      locationStatus.textContent = "Location is not supported on this device.";
      return;
    }

    locationStatus.textContent = "Getting your location...";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        savedLocation = getPrivacyOffsetLocation(
          position.coords.latitude,
          position.coords.longitude,
          0.1
        );

        locationStatus.textContent =
          "Location added privately. Reports are shown about 0.1 miles from your exact location.";

        if (reportMap) {
          reportMap.setView([savedLocation.latitude, savedLocation.longitude], 11, {
            animate: true,
          });
        }

        showToast("Private report location added.");
      },
      () => {
        savedLocation = null;
        locationStatus.textContent =
          "Location permission was denied or unavailable. Reports still work in demo mode.";

        showToast("Location was not added.");
      }
    );
  });
}

if (submitReportBtn) {
  submitReportBtn.addEventListener("click", () => {
    const checkedReports = Array.from(
      document.querySelectorAll('.checkbox-grid input[type="checkbox"]:checked')
    ).map((input) => input.value);

    const noteBox = document.getElementById("reportNote");
    const note = noteBox ? noteBox.value.trim() : "";

    if (checkedReports.length === 0) {
      showToast("Please select at least one condition.");
      return;
    }

    addUserReport(checkedReports, note);

    const expirationHours = getReportExpirationHours(checkedReports);

    showToast(`Weather report added. It will expire in ${expirationHours} hours.`);

    document
      .querySelectorAll('.checkbox-grid input[type="checkbox"]')
      .forEach((input) => {
        input.checked = false;
      });

    if (noteBox) {
      noteBox.value = "";
    }
  });
}

if (countySelect) {
  countySelect.addEventListener("change", () => {
    const selectedCounty = countySelect.value;
    const forecastRows = document.querySelectorAll(".forecast-row small");

    forecastRows.forEach((row) => {
      row.textContent = `${selectedCounty} forecast data coming soon.`;
    });

    showToast(`${selectedCounty} selected.`);
  });
}

document.querySelectorAll(".more-list button").forEach((button) => {
  button.addEventListener("click", () => {
    showToast("This section is coming soon.");
  });
});

const mapExpandBtn = document.getElementById("mapExpandBtn");
const mapCard = document.querySelector(".map-card");

if (mapExpandBtn && mapCard) {
  mapExpandBtn.addEventListener("click", () => {
    const isExpanded = mapCard.classList.toggle("map-expanded");

    document.body.classList.toggle("map-is-expanded", isExpanded);

    mapExpandBtn.textContent = isExpanded ? "✕ Close Map" : "⛶ Expand Map";

    setTimeout(() => {
      if (reportMap) {
        reportMap.invalidateSize();
      }
    }, 250);
  });
}

createReportFeed();
setGreeting();
loadDemoWeather();
initReportMap();
setupReportFilters();

setInterval(removeExpiredReports, 60 * 1000);
setInterval(renderReports, 60 * 1000);
const countyForecastData = {
  "Garrett County": {
    region: "Western MD",
    high: "78°",
    low: "62°",
    rain: "40%",
    summary:
      "Demo forecast: Cooler mountain weather with a better chance for showers or storms, especially during the afternoon.",
    morning: "Cool and comfortable with patchy clouds across the higher terrain.",
    afternoon: "Scattered showers or storms possible, especially over the mountains.",
    evening: "Showers fade with cooler air returning after sunset.",
  },
  "Allegany County": {
    region: "Western MD",
    high: "82°",
    low: "64°",
    rain: "35%",
    summary:
      "Demo forecast: Warm with partly sunny skies and a chance for scattered showers or storms.",
    morning: "Mild start with some clouds around the ridges.",
    afternoon: "Warm with a few showers or storms possible.",
    evening: "Partly cloudy with any showers fading.",
  },
  "Washington County": {
    region: "Western MD",
    high: "84°",
    low: "66°",
    rain: "30%",
    summary:
      "Demo forecast: Warm with isolated showers or storms possible later in the day.",
    morning: "Comfortable with a mix of sun and clouds.",
    afternoon: "Warm with isolated storm chances near the mountains.",
    evening: "Mainly dry with mild conditions.",
  },
  default: {
    region: "Maryland",
    high: "86°",
    low: "69°",
    rain: "30%",
    summary:
      "Demo forecast: Warm summer conditions with a chance for isolated showers or storms. Live data coming soon.",
    morning: "Mild start with partly sunny skies and light winds.",
    afternoon: "Warm and humid with isolated pop-up showers possible.",
    evening: "Comfortable evening with any isolated showers fading.",
  },
};

const countyRegions = {
  "Harford County": "North-Central MD",
  "Baltimore County": "Baltimore Metro",
  "Baltimore City": "Baltimore Metro",
  "Anne Arundel County": "Central MD",
  "Howard County": "Central MD",
  "Carroll County": "North-Central MD",
  "Cecil County": "Upper Eastern Shore",
  "Kent County": "Upper Eastern Shore",
  "Queen Anne’s County": "Upper Eastern Shore",
  "Talbot County": "Mid-Shore",
  "Caroline County": "Mid-Shore",
  "Dorchester County": "Lower Eastern Shore",
  "Wicomico County": "Lower Eastern Shore",
  "Worcester County": "Beaches / Coastal MD",
  "Somerset County": "Lower Eastern Shore",
  "Montgomery County": "DC Suburbs",
  "Prince George’s County": "DC Suburbs",
  "Frederick County": "North-Central MD",
  "Calvert County": "Southern MD",
  "Charles County": "Southern MD",
  "St. Mary’s County": "Southern MD",
};

function updateCountyForecast(countyName) {
  const forecast = countyForecastData[countyName] || countyForecastData.default;

  const selectedCountyTitle = document.getElementById("selectedCountyTitle");
  const selectedCountyRegion = document.getElementById("selectedCountyRegion");
  const selectedCountySummary = document.getElementById("selectedCountySummary");
  const forecastHigh = document.getElementById("forecastHigh");
  const forecastLow = document.getElementById("forecastLow");
  const forecastRain = document.getElementById("forecastRain");
  const morningForecast = document.getElementById("morningForecast");
  const afternoonForecast = document.getElementById("afternoonForecast");
  const eveningForecast = document.getElementById("eveningForecast");

  if (selectedCountyTitle) selectedCountyTitle.textContent = countyName;

  if (selectedCountyRegion) {
    selectedCountyRegion.textContent = countyRegions[countyName] || forecast.region;
  }

  if (selectedCountySummary) selectedCountySummary.textContent = forecast.summary;
  if (forecastHigh) forecastHigh.textContent = forecast.high;
  if (forecastLow) forecastLow.textContent = forecast.low;
  if (forecastRain) forecastRain.textContent = forecast.rain;
  if (morningForecast) morningForecast.textContent = forecast.morning;
  if (afternoonForecast) afternoonForecast.textContent = forecast.afternoon;
  if (eveningForecast) eveningForecast.textContent = forecast.evening;
}

const forecastCountySelect = document.getElementById("countySelect");

if (forecastCountySelect) {
  forecastCountySelect.addEventListener("change", () => {
    updateCountyForecast(forecastCountySelect.value);
    showToast(`${forecastCountySelect.value} forecast loaded.`);
  });

  updateCountyForecast(forecastCountySelect.value);
}

document.querySelectorAll(".region-card").forEach((button) => {
  button.addEventListener("click", () => {
    const regionName = button.querySelector("strong").textContent;
    showToast(`${regionName} regional forecast coming soon.`);
  });
});
/* Version 0.6 - WordPress blog feed */

const WORDPRESS_POSTS_URL =
  "https://mdweatheralerts.com/wp-json/wp/v2/posts?_embed&per_page=5";

function stripHTML(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html || "";
  return tempDiv.textContent || tempDiv.innerText || "";
}

function formatPostDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function createBlogPostCard(post, compact = false) {
  const card = document.createElement("a");
  card.className = "blog-post-card";
  card.href = post.link;
  card.target = "_blank";
  card.rel = "noopener noreferrer";

  const title = stripHTML(post.title?.rendered || "Untitled Post");
  const excerpt = stripHTML(post.excerpt?.rendered || "").trim();
  const date = formatPostDate(post.date);

  card.innerHTML = `
    <strong>${title}</strong>

    ${
      compact
        ? ""
        : `<p>${excerpt.substring(0, 95)}${excerpt.length > 95 ? "..." : ""}</p>`
    }

    <div class="blog-post-footer">
      <small>${date}</small>
      <span class="read-post-pill">Read</span>
    </div>
  `;

  return card;
}

function renderBlogPosts(posts) {
  const homeBlogPosts = document.getElementById("homeBlogPosts");
  const moreBlogPosts = document.getElementById("moreBlogPosts");

  if (homeBlogPosts) {
    homeBlogPosts.innerHTML = "";

    posts.slice(0, 1).forEach((post) => {
      homeBlogPosts.appendChild(createBlogPostCard(post, true));
    });
  }

  if (moreBlogPosts) {
    moreBlogPosts.innerHTML = "";

    posts.slice(0, 5).forEach((post) => {
      moreBlogPosts.appendChild(createBlogPostCard(post, false));
    });
  }
}

function renderBlogError() {
  const homeBlogPosts = document.getElementById("homeBlogPosts");
  const moreBlogPosts = document.getElementById("moreBlogPosts");

  const message =
    '<p class="empty-feed">Latest posts could not load right now. Visit MDWeatherAlerts.com for the newest forecast updates.</p>';

  if (homeBlogPosts) homeBlogPosts.innerHTML = message;
  if (moreBlogPosts) moreBlogPosts.innerHTML = message;
}

async function loadWordPressPosts() {
  try {
    const response = await fetch(WORDPRESS_POSTS_URL);

    if (!response.ok) {
      throw new Error("WordPress posts failed to load.");
    }

    const posts = await response.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      renderBlogError();
      return;
    }

    renderBlogPosts(posts);
  } catch (error) {
    console.error("Blog feed error:", error);
    renderBlogError();
  }
}

loadWordPressPosts();
/* Version 0.7.3 - User Appearance Settings */

const uiStyleSelect = document.getElementById("uiStyleSelect");
const appMotionToggle = document.getElementById("appMotionToggle");
const appearanceSettingsNote = document.getElementById("appearanceSettingsNote");

function applyUserAppearanceSettings() {
  const savedStyle = localStorage.getItem("mdwa_ui_style") || "liquid";
  const savedMotion = localStorage.getItem("mdwa_smooth_motion");

  document.body.classList.remove(
    "ui-liquid-glass",
    "ui-soft-glass",
    "ui-classic",
    "ui-high-contrast",
    "reduce-app-motion"
  );

  if (savedStyle === "soft") {
    document.body.classList.add("ui-soft-glass");
  } else if (savedStyle === "classic") {
    document.body.classList.add("ui-classic");
  } else if (savedStyle === "contrast") {
    document.body.classList.add("ui-high-contrast");
  } else {
    document.body.classList.add("ui-liquid-glass");
  }

  if (savedMotion === "off") {
    document.body.classList.add("reduce-app-motion");
  }

  if (uiStyleSelect) {
    uiStyleSelect.value = savedStyle;
  }

  if (appMotionToggle) {
    appMotionToggle.checked = savedMotion !== "off";
  }
}

function showAppearanceSavedMessage() {
  if (!appearanceSettingsNote) return;

  appearanceSettingsNote.textContent = "Saved ✓";
  setTimeout(() => {
    appearanceSettingsNote.textContent =
      "Settings save automatically on this device.";
  }, 1400);
}

if (uiStyleSelect) {
  uiStyleSelect.addEventListener("change", () => {
    localStorage.setItem("mdwa_ui_style", uiStyleSelect.value);
    applyUserAppearanceSettings();
    showAppearanceSavedMessage();
  });
}

if (appMotionToggle) {
  appMotionToggle.addEventListener("change", () => {
    localStorage.setItem(
      "mdwa_smooth_motion",
      appMotionToggle.checked ? "on" : "off"
    );

    applyUserAppearanceSettings();
    showAppearanceSavedMessage();
  });
}

applyUserAppearanceSettings();
/* Version 0.7.4 - Settings Modal */

const mdwaSettingsOpenBtn = document.getElementById("settingsOpenBtn");
const mdwaSettingsCloseBtn = document.getElementById("settingsCloseBtn");
const mdwaSettingsModal = document.getElementById("settingsModal");

function openSettingsModal() {
  if (!mdwaSettingsModal) return;

  mdwaSettingsModal.classList.add("open");
  mdwaSettingsModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("settings-modal-open");
}

function closeSettingsModal() {
  if (!mdwaSettingsModal) return;

  mdwaSettingsModal.classList.remove("open");
  mdwaSettingsModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("settings-modal-open");
}

if (mdwaSettingsOpenBtn) {
  mdwaSettingsOpenBtn.addEventListener("click", openSettingsModal);
}

if (mdwaSettingsCloseBtn) {
  mdwaSettingsCloseBtn.addEventListener("click", closeSettingsModal);
}

if (mdwaSettingsModal) {
  mdwaSettingsModal.addEventListener("click", (event) => {
    if (event.target === mdwaSettingsModal) {
      closeSettingsModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSettingsModal();
  }
});
/* Version 0.7.5 - Advanced App Settings */

const mdwaDarkModeSelect = document.getElementById("darkModeSelect");
const mdwaTextSizeSelect = document.getElementById("textSizeSelect");
const mdwaCompactCardsToggle = document.getElementById("compactCardsToggle");

function getSystemDarkModePreference() {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function applyAdvancedAppSettings() {
  const savedDarkMode = localStorage.getItem("mdwa_dark_mode") || "system";
  const savedTextSize = localStorage.getItem("mdwa_text_size") || "default";
  const savedCompactCards = localStorage.getItem("mdwa_compact_cards") || "off";

  document.body.classList.remove(
    "app-dark-mode",
    "app-light-mode",
    "text-large",
    "compact-cards"
  );

  const shouldUseDarkMode =
    savedDarkMode === "dark" ||
    (savedDarkMode === "system" && getSystemDarkModePreference());

  if (shouldUseDarkMode) {
    document.body.classList.add("app-dark-mode");
  } else {
    document.body.classList.add("app-light-mode");
  }

  if (savedTextSize === "large") {
    document.body.classList.add("text-large");
  }

  if (savedCompactCards === "on") {
    document.body.classList.add("compact-cards");
  }

  if (mdwaDarkModeSelect) {
    mdwaDarkModeSelect.value = savedDarkMode;
  }

  if (mdwaTextSizeSelect) {
    mdwaTextSizeSelect.value = savedTextSize;
  }

  if (mdwaCompactCardsToggle) {
    mdwaCompactCardsToggle.checked = savedCompactCards === "on";
  }
}

function showAdvancedSettingsSavedMessage() {
  const note = document.getElementById("appearanceSettingsNote");
  if (!note) return;

  note.textContent = "Saved ✓";

  setTimeout(() => {
    note.textContent = "Settings save automatically on this device.";
  }, 1400);
}

if (mdwaDarkModeSelect) {
  mdwaDarkModeSelect.addEventListener("change", () => {
    localStorage.setItem("mdwa_dark_mode", mdwaDarkModeSelect.value);
    applyAdvancedAppSettings();
    showAdvancedSettingsSavedMessage();
  });
}

if (mdwaTextSizeSelect) {
  mdwaTextSizeSelect.addEventListener("change", () => {
    localStorage.setItem("mdwa_text_size", mdwaTextSizeSelect.value);
    applyAdvancedAppSettings();
    showAdvancedSettingsSavedMessage();
  });
}

if (mdwaCompactCardsToggle) {
  mdwaCompactCardsToggle.addEventListener("change", () => {
    localStorage.setItem(
      "mdwa_compact_cards",
      mdwaCompactCardsToggle.checked ? "on" : "off"
    );

    applyAdvancedAppSettings();
    showAdvancedSettingsSavedMessage();
  });
}

if (window.matchMedia) {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const savedDarkMode = localStorage.getItem("mdwa_dark_mode") || "system";

      if (savedDarkMode === "system") {
        applyAdvancedAppSettings();
      }
    });
}

applyAdvancedAppSettings();

/* Version 0.7.6.9 - Clean report panel open helper */

(function fixCleanReportPanelOpen() {
  const cleanReportPanel = document.getElementById("cleanReportPanel");

  if (!cleanReportPanel) return;

  cleanReportPanel.addEventListener("toggle", () => {
    if (cleanReportPanel.open) {
      setTimeout(() => {
        cleanReportPanel.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    }
  });
})();
/* Version 0.7.6.10 - Clean Reports button action fix */

(function fixCleanReportButtons() {
  let cleanReportLocation = null;

  function mdwaSafeText(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  function mdwaShowMessage(message) {
    if (typeof showToast === "function") {
      showToast(message);
    } else {
      alert(message);
    }
  }

  function mdwaSetKnownLocationVariables(coords) {
    cleanReportLocation = coords;
    window.mdwaCleanReportLocation = coords;

    try {
      userLocation = coords;
    } catch (error) {}

    try {
      currentUserLocation = coords;
    } catch (error) {}

    try {
      reportLocation = coords;
    } catch (error) {}

    try {
      selectedLocation = coords;
    } catch (error) {}
  }

  function handleCleanLocationClick(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const status = document.getElementById("locationStatus");
    const locationButton = document.getElementById("useLocationBtn");

    if (!navigator.geolocation) {
      if (status) status.textContent = "Location is not supported on this device.";
      mdwaShowMessage("Location is not supported on this device.");
      return;
    }

    if (status) status.textContent = "Getting your location...";
    if (locationButton) locationButton.textContent = "📍 Getting Location...";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        mdwaSetKnownLocationVariables(coords);

        if (status) {
          status.textContent =
            "Location added. Public reports will be privacy-offset.";
        }

        if (locationButton) {
          locationButton.textContent = "✅ Location Added";
        }

        mdwaShowMessage("Location added.");
      },
      () => {
        if (status) {
          status.textContent =
            "Location permission was denied or unavailable.";
        }

        if (locationButton) {
          locationButton.textContent = "📍 Use My Current Location";
        }

        mdwaShowMessage("Location permission was not granted.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  function handleCleanChooseAllClick(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const checkboxes = Array.from(
      document.querySelectorAll(".clean-report-type")
    );

    const shouldCheckAll = checkboxes.some((checkbox) => !checkbox.checked);

    checkboxes.forEach((checkbox) => {
      checkbox.checked = shouldCheckAll;
    });

    const chooseAllButton = document.getElementById("cleanChooseAllReports");

    if (chooseAllButton) {
      chooseAllButton.textContent = shouldCheckAll ? "Clear all" : "Choose all";
    }
  }

  function addFallbackFeedCard(reportTypes, details) {
    const feed = document.getElementById("submittedReports");
    if (!feed) return;

    const now = new Date();
    const timeText = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    feed.innerHTML = "";

    const card = document.createElement("div");
    card.className = "submitted-report-card";
    card.setAttribute("data-clean-fallback-report", "true");

    card.innerHTML = `
      <strong>${mdwaSafeText(reportTypes.join(", "))}</strong>
      <small>Submitted ${timeText} • Demo report</small>
      <p>${
        details
          ? mdwaSafeText(details)
          : "No extra details added."
      }</p>
      <p class="report-expire-text">Expires automatically after a few hours.</p>
    `;

    feed.prepend(card);
  }

  function handleCleanSubmitClick(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const selectedTypes = Array.from(
      document.querySelectorAll(".clean-report-type:checked")
    ).map((checkbox) => checkbox.value);

    const detailsInput = document.getElementById("reportDetails");
    const details = detailsInput ? detailsInput.value.trim() : "";

    if (selectedTypes.length === 0) {
      mdwaShowMessage("Choose at least one report type.");
      return;
    }

    try {
      if (typeof addUserReport === "function") {
        addUserReport(selectedTypes, details);
      }
    } catch (error) {
      console.error("Clean report submit fallback used:", error);
    }

    setTimeout(() => {
      const feed = document.getElementById("submittedReports");

      if (
        feed &&
        (feed.textContent.includes("No submitted reports") ||
          feed.textContent.includes("No submitted reports yet") ||
          feed.children.length === 0)
      ) {
        addFallbackFeedCard(selectedTypes, details);
      }
    }, 200);

    document.querySelectorAll(".clean-report-type").forEach((checkbox) => {
      checkbox.checked = false;
    });

    if (detailsInput) {
      detailsInput.value = "";
    }

    const chooseAllButton = document.getElementById("cleanChooseAllReports");
    if (chooseAllButton) {
      chooseAllButton.textContent = "Choose all";
    }

    const reportPanel = document.getElementById("cleanReportPanel");
    if (reportPanel) {
      reportPanel.open = false;
    }

    if (typeof renderReports === "function") {
      try {
        renderReports();
      } catch (error) {
        console.error("renderReports failed:", error);
      }
    }

    mdwaShowMessage("Weather report submitted.");
  }

  document.addEventListener(
    "click",
    (event) => {
      const locationButton = event.target.closest("#useLocationBtn");
      const chooseAllButton = event.target.closest("#cleanChooseAllReports");
      const submitButton = event.target.closest("#cleanSubmitReport");

      if (locationButton) {
        handleCleanLocationClick(event);
        return;
      }

      if (chooseAllButton) {
        handleCleanChooseAllClick(event);
        return;
      }

      if (submitButton) {
        handleCleanSubmitClick(event);
      }
    },
    true
  );
})();
/* Version 0.8 - PWA install support */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => {
        console.log("MD Weather Alerts service worker registered.");
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
/* Version 0.8.1 - Install App button */

let mdwaDeferredInstallPrompt = null;

const installAppBtn = document.getElementById("installAppBtn");
const installAppStatus = document.getElementById("installAppStatus");

function mdwaIsStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function updateInstallAppCard() {
  if (!installAppBtn || !installAppStatus) return;

  if (mdwaIsStandaloneApp()) {
    installAppBtn.textContent = "Installed";
    installAppBtn.disabled = true;
    installAppStatus.textContent =
      "MD Weather Alerts is already running like an installed app on this device.";
    return;
  }

  if (mdwaDeferredInstallPrompt) {
    installAppBtn.textContent = "Install App";
    installAppBtn.disabled = false;
    installAppStatus.textContent =
      "Tap Install App to add MD Weather Alerts to your home screen.";
    return;
  }

  installAppBtn.textContent = "How to Install";
  installAppBtn.disabled = false;
  installAppStatus.textContent =
    "iPhone: tap Share, then Add to Home Screen. Android/Chrome may show an install prompt when available.";
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  mdwaDeferredInstallPrompt = event;
  updateInstallAppCard();
});

window.addEventListener("appinstalled", () => {
  mdwaDeferredInstallPrompt = null;
  updateInstallAppCard();

  if (typeof showToast === "function") {
    showToast("MD Weather Alerts installed.");
  }
});

if (installAppBtn) {
  installAppBtn.addEventListener("click", async () => {
    if (mdwaDeferredInstallPrompt) {
      mdwaDeferredInstallPrompt.prompt();

      const result = await mdwaDeferredInstallPrompt.userChoice;

      if (result.outcome === "accepted") {
        installAppStatus.textContent = "Installing MD Weather Alerts...";
      } else {
        installAppStatus.textContent =
          "Install canceled. You can try again anytime.";
      }

      mdwaDeferredInstallPrompt = null;
      updateInstallAppCard();
      return;
    }

    installAppStatus.textContent =
      "iPhone: tap the Share button in Safari, then choose Add to Home Screen. Android: open browser menu and choose Install app or Add to Home screen.";
  });
}

updateInstallAppCard();
/* Version 0.8.1.1 - Force Install App card into More tab */

(function fixInstallCardPlacement() {
  const moreScreen = document.getElementById("more");

  if (!moreScreen) return;

  let installCards = Array.from(document.querySelectorAll("#installAppCard"));

  // If somehow the card is missing, create it
  if (installCards.length === 0) {
    const newInstallCard = document.createElement("section");
    newInstallCard.className = "section-card install-app-card";
    newInstallCard.id = "installAppCard";

    newInstallCard.innerHTML = `
      <div class="section-title-row">
        <div>
          <h3>Install MD Weather Alerts</h3>
          <p>Add the app to your home screen for faster access.</p>
        </div>
        <span class="pill live">App</span>
      </div>

      <div class="install-app-preview">
        <div class="install-icon">🌦️</div>
        <div>
          <strong>MD Weather Alerts</strong>
          <small>Forecasts, alerts, radar, and reports in one tap.</small>
        </div>
      </div>

      <button class="install-app-btn" id="installAppBtn" type="button">
        Install App
      </button>

      <p class="install-app-status" id="installAppStatus">
        Android/Chrome can show an install prompt. iPhone users can use Share → Add to Home Screen.
      </p>
    `;

    installCards = [newInstallCard];
  }

  // Keep only one install card
  const installCard = installCards[0];

  installCards.slice(1).forEach((card) => {
    card.remove();
  });

  // Find the Forecast Blog card inside the More tab
  const moreBlogList = document.getElementById("moreBlogPosts");
  const forecastBlogCard = moreBlogList
    ? moreBlogList.closest(".section-card")
    : null;

  // Move install card into More, directly above Forecast Blog
  if (forecastBlogCard) {
    moreScreen.insertBefore(installCard, forecastBlogCard);
  } else {
    moreScreen.appendChild(installCard);
  }

  // Make sure the card is not hidden
  installCard.style.display = "";
  installCard.style.visibility = "";
  installCard.style.pointerEvents = "";

  // Reconnect install button text/status if the function exists
  if (typeof updateInstallAppCard === "function") {
    updateInstallAppCard();
  }
})();
/* Version 0.9 - Alerts tab upgrade */

(function mdwaAlertsTabUpgrade() {
  const countySelect = document.getElementById("alertCountySelect");
  const alertList = document.getElementById("alertList");
  const refreshBtn = document.getElementById("alertRefreshBtn");
  const statusTitle = document.getElementById("alertStatusTitle");
  const statusText = document.getElementById("alertStatusText");
  const statusIcon = document.getElementById("alertStatusIcon");
  const prefNote = document.getElementById("alertPrefNote");

  const marylandCounties = [
    "Allegany",
    "Anne Arundel",
    "Baltimore City",
    "Baltimore County",
    "Calvert",
    "Caroline",
    "Carroll",
    "Cecil",
    "Charles",
    "Dorchester",
    "Frederick",
    "Garrett",
    "Harford",
    "Howard",
    "Kent",
    "Montgomery",
    "Prince George’s",
    "Queen Anne’s",
    "Somerset",
    "St. Mary’s",
    "Talbot",
    "Washington",
    "Wicomico",
    "Worcester",
  ];

  const demoAlerts = [
    {
      type: "watch",
      label: "Watch",
      title: "Severe Thunderstorm Watch",
      summary:
        "Conditions are favorable for strong to severe storms. Damaging wind, hail, and frequent lightning would be the main concerns.",
      counties: [
        "Baltimore City",
        "Baltimore County",
        "Harford",
        "Cecil",
        "Howard",
        "Anne Arundel",
        "Carroll",
      ],
      timing: "Demo timing: afternoon through evening",
      office: "NWS demo card",
      action: "Stay weather aware and have multiple ways to receive warnings.",
    },
    {
      type: "advisory",
      label: "Advisory",
      title: "Coastal Flood Advisory",
      summary:
        "Minor coastal flooding may affect vulnerable shoreline areas near high tide.",
      counties: [
        "Anne Arundel",
        "Calvert",
        "St. Mary’s",
        "Dorchester",
        "Talbot",
        "Queen Anne’s",
        "Kent",
      ],
      timing: "Demo timing: near high tide",
      office: "NWS demo card",
      action: "Use caution near tidal shorelines and low-lying roads.",
    },
    {
      type: "statement",
      label: "Statement",
      title: "Special Weather Statement",
      summary:
        "Localized downpours and gusty winds may create brief travel impacts in parts of Maryland.",
      counties: [
        "Montgomery",
        "Prince George’s",
        "Charles",
        "Frederick",
        "Washington",
      ],
      timing: "Demo timing: scattered coverage",
      office: "NWS demo card",
      action: "Slow down if roads become wet or visibility drops.",
    },
  ];

  function alertEscape(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  function populateAlertCountySelect() {
    if (!countySelect) return;

    const existingOptions = Array.from(countySelect.options).map(
      (option) => option.value
    );

    marylandCounties.forEach((county) => {
      if (existingOptions.includes(county)) return;

      const option = document.createElement("option");
      option.value = county;
      option.textContent = county;
      countySelect.appendChild(option);
    });
  }

  function getSelectedAlertCounty() {
    if (!countySelect) return "all";
    return countySelect.value || "all";
  }

  function getFilteredDemoAlerts() {
    const selectedCounty = getSelectedAlertCounty();

    if (selectedCounty === "all") {
      return demoAlerts;
    }

    return demoAlerts.filter((alert) =>
      alert.counties.includes(selectedCounty)
    );
  }

  function updateAlertStatus(filteredAlerts) {
    if (!statusTitle || !statusText || !statusIcon) return;

    const selectedCounty = getSelectedAlertCounty();
    const locationLabel =
      selectedCounty === "all" ? "Maryland" : `${selectedCounty} County`;

    if (filteredAlerts.length === 0) {
      statusTitle.textContent = `No demo alerts for ${locationLabel}`;
      statusText.textContent =
        "No demo watches, warnings, or advisories are showing for this selection.";
      statusIcon.textContent = "✅";
      return;
    }

    statusTitle.textContent = `${filteredAlerts.length} demo alert${
      filteredAlerts.length === 1 ? "" : "s"
    } for ${locationLabel}`;

    statusText.textContent =
      "These are app layout examples. Live official NWS alerts will be connected later.";
    statusIcon.textContent = "⚠️";
  }

  function createAlertCard(alert) {
    const card = document.createElement("article");
    card.className = `alert-card ${alert.type}`;

    card.innerHTML = `
      <div class="alert-card-header">
        <span class="alert-type-badge ${alert.type}">
          ${alertEscape(alert.label)}
        </span>
        <small>Demo</small>
      </div>

      <h3>${alertEscape(alert.title)}</h3>
      <p>${alertEscape(alert.summary)}</p>

      <div class="alert-card-meta">
        <span>📍 ${alertEscape(alert.counties.join(", "))}</span>
        <span>⏱️ ${alertEscape(alert.timing)}</span>
        <span>🏢 ${alertEscape(alert.office)}</span>
      </div>

      <div class="alert-actions">
        <button class="alert-action-btn" type="button" data-alert-action="details">
          View Details
        </button>
        <button class="alert-action-btn" type="button" data-alert-action="safety">
          Safety Tips
        </button>
      </div>
    `;

    return card;
  }

  function createNoAlertCard() {
    const selectedCounty = getSelectedAlertCounty();
    const locationLabel =
      selectedCounty === "all" ? "Maryland" : `${selectedCounty} County`;

    const card = document.createElement("article");
    card.className = "alert-card none";

    card.innerHTML = `
      <div class="alert-card-header">
        <span class="alert-type-badge none">No Demo Alerts</span>
        <small>Demo</small>
      </div>

      <h3>No demo alerts for ${alertEscape(locationLabel)}</h3>
      <p>
        This is what the alert center will look like when no watches, warnings,
        or advisories are active for your selected area.
      </p>

      <div class="alert-card-meta">
        <span>✅ Calm alert status for this selection</span>
        <span>🏢 Official NWS connection coming soon</span>
      </div>
    `;

    return card;
  }

  function renderAlertCards() {
    if (!alertList) return;

    const filteredAlerts = getFilteredDemoAlerts();

    alertList.innerHTML = "";

    if (filteredAlerts.length === 0) {
      alertList.appendChild(createNoAlertCard());
    } else {
      filteredAlerts.forEach((alert) => {
        alertList.appendChild(createAlertCard(alert));
      });
    }

    updateAlertStatus(filteredAlerts);
  }

  function showAlertPreferenceSaved() {
    if (!prefNote) return;

    prefNote.textContent = "Alert preferences saved ✓";

    setTimeout(() => {
      prefNote.textContent =
        "Preferences save automatically on this device. Push notifications will be added later.";
    }, 1400);
  }

  function loadAlertPreferences() {
    document.querySelectorAll(".alert-pref-toggle").forEach((toggle) => {
      const prefName = toggle.dataset.pref;
      const savedValue = localStorage.getItem(`mdwa_alert_pref_${prefName}`);

      if (savedValue !== null) {
        toggle.checked = savedValue === "on";
      }

      toggle.addEventListener("change", () => {
        localStorage.setItem(
          `mdwa_alert_pref_${prefName}`,
          toggle.checked ? "on" : "off"
        );

        showAlertPreferenceSaved();
      });
    });
  }

  populateAlertCountySelect();
  renderAlertCards();
  loadAlertPreferences();

  if (countySelect) {
    countySelect.addEventListener("change", () => {
      renderAlertCards();

      if (typeof showToast === "function") {
        const selectedCounty = getSelectedAlertCounty();
        showToast(
          selectedCounty === "all"
            ? "Showing statewide demo alerts."
            : `Showing demo alerts for ${selectedCounty}.`
        );
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      renderAlertCards();

      if (typeof showToast === "function") {
        showToast("Alert view refreshed.");
      }
    });
  }

  if (alertList) {
    alertList.addEventListener("click", (event) => {
      const button = event.target.closest(".alert-action-btn");
      if (!button) return;

      if (button.dataset.alertAction === "details") {
        if (typeof showToast === "function") {
          showToast("Live NWS alert details will open here later.");
        } else {
          alert("Live NWS alert details will open here later.");
        }
      }

      if (button.dataset.alertAction === "safety") {
        if (typeof showToast === "function") {
          showToast("Safety tips will be added with live alert support.");
        } else {
          alert("Safety tips will be added with live alert support.");
        }
      }
    });
  }
})();
/* Version 0.9.1 - Alerts default county and safety polish */

(function mdwaAlertsPolish() {
  const alertCountySelect = document.getElementById("alertCountySelect");
  const defaultCountySelect = document.getElementById("defaultAlertCountySelect");
  const defaultCountyNote = document.getElementById("defaultCountyNote");

  if (!defaultCountySelect || !alertCountySelect) return;

  function showDefaultCountySaved() {
    if (!defaultCountyNote) return;

    defaultCountyNote.textContent = "Default alert area saved ✓";

    setTimeout(() => {
      defaultCountyNote.textContent =
        "Your default alert area saves automatically on this device.";
    }, 1400);
  }

  function copyCountyOptionsToDefaultSelect() {
    defaultCountySelect.innerHTML = "";

    Array.from(alertCountySelect.options).forEach((option) => {
      const newOption = document.createElement("option");
      newOption.value = option.value;
      newOption.textContent = option.textContent;
      defaultCountySelect.appendChild(newOption);
    });
  }

  function applySavedDefaultCounty() {
    const savedDefaultCounty =
      localStorage.getItem("mdwa_default_alert_county") || "all";

    const optionExists = Array.from(defaultCountySelect.options).some(
      (option) => option.value === savedDefaultCounty
    );

    if (!optionExists) return;

    defaultCountySelect.value = savedDefaultCounty;
    alertCountySelect.value = savedDefaultCounty;

    alertCountySelect.dispatchEvent(new Event("change"));
  }

  copyCountyOptionsToDefaultSelect();
  applySavedDefaultCounty();

  defaultCountySelect.addEventListener("change", () => {
    const selectedCounty = defaultCountySelect.value;

    localStorage.setItem("mdwa_default_alert_county", selectedCounty);

    alertCountySelect.value = selectedCounty;
    alertCountySelect.dispatchEvent(new Event("change"));

    showDefaultCountySaved();

    if (typeof showToast === "function") {
      showToast(
        selectedCounty === "all"
          ? "Default alert area set to all Maryland."
          : `Default alert area set to ${selectedCounty}.`
      );
    }
  });
})();
console.log("MD Weather Alerts Version 0.6 WordPress blog feed loaded successfully.");