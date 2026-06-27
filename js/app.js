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
/* Version 1.0 - Live NWS Alerts Connection */

(function mdwaLiveNwsAlerts() {
  const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active?area=MD";

  const alertCountySelect = document.getElementById("alertCountySelect");
  const alertList = document.getElementById("alertList");
  const refreshBtn = document.getElementById("alertRefreshBtn");
  const statusTitle = document.getElementById("alertStatusTitle");
  const statusText = document.getElementById("alertStatusText");
  const statusIcon = document.getElementById("alertStatusIcon");

  let liveAlerts = [];
  let liveAlertsLoaded = false;
  let liveAlertsFailed = false;
  let lastLiveAlertUpdate = null;

  function safeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  function formatNwsTime(timeString) {
    if (!timeString) return "Time not listed";

    const date = new Date(timeString);

    if (Number.isNaN(date.getTime())) {
      return "Time not listed";
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getAlertType(eventName) {
    const event = (eventName || "").toLowerCase();

    if (event.includes("warning")) return "warning";
    if (event.includes("watch")) return "watch";
    if (event.includes("advisory")) return "advisory";
    if (event.includes("statement")) return "statement";

    return "statement";
  }

  function getAlertLabel(eventName) {
    const event = eventName || "";

    if (event.toLowerCase().includes("warning")) return "Warning";
    if (event.toLowerCase().includes("watch")) return "Watch";
    if (event.toLowerCase().includes("advisory")) return "Advisory";
    if (event.toLowerCase().includes("statement")) return "Statement";

    return "Alert";
  }

  function countyMatchesAlert(alert, county) {
    if (!county || county === "all") return true;

    const areaDesc = (alert.properties?.areaDesc || "").toLowerCase();
    const countyName = county.toLowerCase();

    if (areaDesc.includes(countyName)) return true;

    // Common county name variations
    if (county === "Prince George’s") {
      return (
        areaDesc.includes("prince george") ||
        areaDesc.includes("prince george's")
      );
    }

    if (county === "St. Mary’s") {
      return (
        areaDesc.includes("st. mary") ||
        areaDesc.includes("saint mary") ||
        areaDesc.includes("st mary")
      );
    }

    if (county === "Queen Anne’s") {
      return (
        areaDesc.includes("queen anne") ||
        areaDesc.includes("queen anne's")
      );
    }

    if (county === "Baltimore City") {
      return areaDesc.includes("baltimore city");
    }

    return false;
  }

  function getSelectedCounty() {
    if (!alertCountySelect) return "all";
    return alertCountySelect.value || "all";
  }

  function getFilteredLiveAlerts() {
    const selectedCounty = getSelectedCounty();

    return liveAlerts.filter((alert) => {
      return countyMatchesAlert(alert, selectedCounty);
    });
  }

  function updateLiveStatus(filteredAlerts) {
    if (!statusTitle || !statusText || !statusIcon) return;

    const selectedCounty = getSelectedCounty();
    const locationLabel =
      selectedCounty === "all" ? "Maryland" : `${selectedCounty} County`;

    if (liveAlertsFailed) {
      statusTitle.textContent = "Live alerts unavailable";
      statusText.textContent =
        "The app could not reach the National Weather Service alert feed. Demo alerts may still appear.";
      statusIcon.textContent = "⚠️";
      return;
    }

    if (!liveAlertsLoaded) {
      statusTitle.textContent = "Checking official alerts";
      statusText.textContent =
        "Loading active National Weather Service alerts for Maryland...";
      statusIcon.textContent = "⏳";
      return;
    }

    if (filteredAlerts.length === 0) {
      statusTitle.textContent = `No active NWS alerts for ${locationLabel}`;
      statusText.textContent =
        "No active official watches, warnings, or advisories are currently showing for this selection.";
      statusIcon.textContent = "✅";
      return;
    }

    statusTitle.textContent = `${filteredAlerts.length} active NWS alert${
      filteredAlerts.length === 1 ? "" : "s"
    } for ${locationLabel}`;

    statusText.textContent = lastLiveAlertUpdate
      ? `Official NWS alert feed updated in-app at ${lastLiveAlertUpdate}.`
      : "Official National Weather Service alerts are loaded.";
    statusIcon.textContent = "⚠️";
  }

  function createLiveAlertCard(alert) {
    const props = alert.properties || {};
    const eventName = props.event || "Weather Alert";
    const alertType = getAlertType(eventName);
    const label = getAlertLabel(eventName);

    const headline = props.headline || eventName;
    const description = props.description || "No detailed description provided.";
    const instruction =
      props.instruction || "Follow official guidance and stay weather aware.";
    const areaDesc = props.areaDesc || "Maryland";
    const sender = props.senderName || "National Weather Service";
    const effective = formatNwsTime(props.effective);
    const expires = formatNwsTime(props.expires || props.ends);

    const card = document.createElement("article");
    card.className = `alert-card ${alertType} live-nws-alert`;

    card.innerHTML = `
      <div class="alert-card-header">
        <span class="alert-type-badge ${alertType}">
          ${safeHTML(label)}
        </span>
        <small>Live NWS</small>
      </div>

      <h3>${safeHTML(eventName)}</h3>
      <p>${safeHTML(headline)}</p>

      <div class="alert-card-meta">
        <span>📍 ${safeHTML(areaDesc)}</span>
        <span>⏱️ Effective: ${safeHTML(effective)}</span>
        <span>⌛ Expires: ${safeHTML(expires)}</span>
        <span>🏢 ${safeHTML(sender)}</span>
      </div>

      <div class="alert-actions">
        <button class="alert-action-btn" type="button" data-live-alert-toggle>
          View Details
        </button>
      </div>

      <div class="alert-live-details">
        <strong>Description</strong>
        <p>${safeHTML(description)}</p>

        <strong>Recommended Action</strong>
        <p>${safeHTML(instruction)}</p>

        <span class="live-alert-source">Source: National Weather Service</span>
      </div>
    `;

    return card;
  }

  function createNoLiveAlertCard() {
    const selectedCounty = getSelectedCounty();
    const locationLabel =
      selectedCounty === "all" ? "Maryland" : `${selectedCounty} County`;

    const card = document.createElement("article");
    card.className = "alert-card none live-nws-alert";

    card.innerHTML = `
      <div class="alert-card-header">
        <span class="alert-type-badge none">No Active NWS Alerts</span>
        <small>Live NWS</small>
      </div>

      <h3>No active NWS alerts for ${safeHTML(locationLabel)}</h3>
      <p>
        No active official watches, warnings, or advisories are currently listed
        for this selection.
      </p>

      <div class="alert-card-meta">
        <span>✅ Calm alert status for this selection</span>
        <span>🏢 Source: National Weather Service</span>
      </div>
    `;

    return card;
  }

  function renderLiveAlerts() {
    if (!alertList) return;

    const filteredAlerts = getFilteredLiveAlerts();

    alertList.innerHTML = "";

    if (filteredAlerts.length === 0) {
      alertList.appendChild(createNoLiveAlertCard());
    } else {
      filteredAlerts.forEach((alert) => {
        alertList.appendChild(createLiveAlertCard(alert));
      });
    }

    updateLiveStatus(filteredAlerts);
  }

  function showLiveAlertsLoading() {
    if (!alertList) return;

    alertList.innerHTML = `
      <article class="alert-card statement alert-loading-card">
        <div class="alert-card-header">
          <span class="alert-type-badge statement">Loading</span>
          <small>Live NWS</small>
        </div>
        <h3>Checking official Maryland alerts...</h3>
        <p>Loading active National Weather Service alerts for Maryland.</p>
      </article>
    `;

    updateLiveStatus([]);
  }

  async function loadLiveNwsAlerts() {
    if (!alertList) return;

    showLiveAlertsLoading();

    try {
      const response = await fetch(NWS_ALERTS_URL, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!response.ok) {
        throw new Error(`NWS alerts request failed: ${response.status}`);
      }

      const data = await response.json();

      liveAlerts = Array.isArray(data.features) ? data.features : [];
      liveAlertsLoaded = true;
      liveAlertsFailed = false;
      lastLiveAlertUpdate = new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });

      renderLiveAlerts();

      if (typeof showToast === "function") {
        showToast("Official NWS alerts loaded.");
      }
    } catch (error) {
      console.error("Live NWS alerts failed:", error);

      liveAlerts = [];
      liveAlertsLoaded = false;
      liveAlertsFailed = true;

      if (statusTitle && statusText && statusIcon) {
        statusTitle.textContent = "Live alerts unavailable";
        statusText.textContent =
          "The app could not reach the official NWS alert feed. Demo alerts may still appear.";
        statusIcon.textContent = "⚠️";
      }

      if (typeof showToast === "function") {
        showToast("Live NWS alerts could not load.");
      }
    }
  }

  if (alertCountySelect) {
    alertCountySelect.addEventListener("change", () => {
      if (liveAlertsLoaded) {
        renderLiveAlerts();
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadLiveNwsAlerts();
    });
  }

  if (alertList) {
    alertList.addEventListener("click", (event) => {
      const detailsButton = event.target.closest("[data-live-alert-toggle]");

      if (!detailsButton) return;

      const card = detailsButton.closest(".alert-card");
      if (!card) return;

      card.classList.toggle("details-open");
      detailsButton.textContent = card.classList.contains("details-open")
        ? "Hide Details"
        : "View Details";
    });
  }

  loadLiveNwsAlerts();
})();
/* Version 1.1 - Home live alert status */

(function mdwaHomeLiveAlertStatus() {
  const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active?area=MD";
  const homeScreen = document.getElementById("home");

  if (!homeScreen) return;

  function createHomeAlertCard() {
    let card = document.getElementById("homeLiveAlertCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card home-live-alert-card";
    card.id = "homeLiveAlertCard";

    card.innerHTML = `
      <div class="home-alert-main">
        <div class="home-alert-copy">
          <p class="eyebrow">Official NWS Alerts</p>
          <h3 id="homeAlertTitle">Checking Maryland alerts...</h3>
          <p id="homeAlertText">Loading active National Weather Service alerts for Maryland.</p>
        </div>

        <div class="home-alert-icon" id="homeAlertIcon">⏳</div>
      </div>

      <div class="home-alert-meta">
        <span class="home-alert-pill" id="homeAlertCount">Checking...</span>
        <span class="home-alert-pill" id="homeAlertLevel">Live NWS</span>
        <span class="home-alert-pill" id="homeAlertChecked">Just opened</span>
      </div>

      <div class="home-alert-actions">
        <button class="home-alert-btn primary" id="homeViewAlertsBtn" type="button">
          View Alerts
        </button>

        <button class="home-alert-btn secondary" id="homeRefreshAlertsBtn" type="button">
          Refresh
        </button>
      </div>
    `;

    const firstSectionCard = homeScreen.querySelector(".section-card");

    if (firstSectionCard) {
      firstSectionCard.insertAdjacentElement("afterend", card);
    } else {
      homeScreen.prepend(card);
    }

    return card;
  }

  function getHighestAlertLevel(alerts) {
    const events = alerts.map((alert) =>
      (alert.properties?.event || "").toLowerCase()
    );

    if (events.some((event) => event.includes("warning"))) {
      return {
        label: "Warning",
        icon: "🚨",
        className: "alert-warning",
      };
    }

    if (events.some((event) => event.includes("watch"))) {
      return {
        label: "Watch",
        icon: "⚠️",
        className: "alert-active",
      };
    }

    if (events.some((event) => event.includes("advisory"))) {
      return {
        label: "Advisory",
        icon: "⚠️",
        className: "alert-active",
      };
    }

    if (alerts.length > 0) {
      return {
        label: "Statement",
        icon: "ℹ️",
        className: "alert-active",
      };
    }

    return {
      label: "Clear",
      icon: "✅",
      className: "alert-clear",
    };
  }

  function setHomeAlertLoading() {
    const card = createHomeAlertCard();

    card.classList.remove("alert-clear", "alert-active", "alert-warning");

    document.getElementById("homeAlertTitle").textContent =
      "Checking Maryland alerts...";
    document.getElementById("homeAlertText").textContent =
      "Loading active National Weather Service alerts for Maryland.";
    document.getElementById("homeAlertIcon").textContent = "⏳";
    document.getElementById("homeAlertCount").textContent = "Checking...";
    document.getElementById("homeAlertLevel").textContent = "Live NWS";
    document.getElementById("homeAlertChecked").textContent = "Updating";
  }

  function setHomeAlertError() {
    const card = createHomeAlertCard();

    card.classList.remove("alert-clear", "alert-active", "alert-warning");
    card.classList.add("alert-active");

    document.getElementById("homeAlertTitle").textContent =
      "Live alerts unavailable";
    document.getElementById("homeAlertText").textContent =
      "The app could not reach the National Weather Service alert feed.";
    document.getElementById("homeAlertIcon").textContent = "⚠️";
    document.getElementById("homeAlertCount").textContent = "Unable to load";
    document.getElementById("homeAlertLevel").textContent = "Check Alerts tab";
    document.getElementById("homeAlertChecked").textContent = "Try refresh";
  }

  function setHomeAlertData(alerts) {
    const card = createHomeAlertCard();
    const level = getHighestAlertLevel(alerts);

    card.classList.remove("alert-clear", "alert-active", "alert-warning");
    card.classList.add(level.className);

    const checkedTime = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    const title =
      alerts.length === 0
        ? "No active NWS alerts for Maryland"
        : `${alerts.length} active NWS alert${alerts.length === 1 ? "" : "s"}`;

    const text =
      alerts.length === 0
        ? "No active official watches, warnings, or advisories are currently listed for Maryland."
        : "Active official National Weather Service alerts are currently listed for Maryland.";

    document.getElementById("homeAlertTitle").textContent = title;
    document.getElementById("homeAlertText").textContent = text;
    document.getElementById("homeAlertIcon").textContent = level.icon;
    document.getElementById("homeAlertCount").textContent =
      alerts.length === 0 ? "0 active alerts" : `${alerts.length} active`;
    document.getElementById("homeAlertLevel").textContent = level.label;
    document.getElementById("homeAlertChecked").textContent =
      `Checked ${checkedTime}`;
  }

  async function loadHomeLiveAlerts() {
    setHomeAlertLoading();

    try {
      const response = await fetch(NWS_ALERTS_URL, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!response.ok) {
        throw new Error(`NWS home alert request failed: ${response.status}`);
      }

      const data = await response.json();
      const alerts = Array.isArray(data.features) ? data.features : [];

      setHomeAlertData(alerts);
    } catch (error) {
      console.error("Home live alerts failed:", error);
      setHomeAlertError();
    }
  }

  function goToAlertsTab() {
    const alertsNavButton =
      document.querySelector('.nav-item[data-screen="alerts"]') ||
      document.querySelector('[data-target="alerts"]');

    if (alertsNavButton) {
      alertsNavButton.click();
      return;
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    const alertsScreen = document.getElementById("alerts");
    if (alertsScreen) {
      alertsScreen.classList.add("active");
    }
  }

  createHomeAlertCard();

  const viewAlertsBtn = document.getElementById("homeViewAlertsBtn");
  const refreshAlertsBtn = document.getElementById("homeRefreshAlertsBtn");

  if (viewAlertsBtn) {
    viewAlertsBtn.addEventListener("click", goToAlertsTab);
  }

  if (refreshAlertsBtn) {
    refreshAlertsBtn.addEventListener("click", () => {
      loadHomeLiveAlerts();

      if (typeof showToast === "function") {
        showToast("Refreshing home alert status.");
      }
    });
  }

  loadHomeLiveAlerts();
})();
/* Version 1.2 - Radar tab upgrade */

(function mdwaRadarTabUpgrade() {
  const openNwsRadarBtn = document.getElementById("openNwsRadarBtn");
  const radarRefreshBtn = document.getElementById("radarRefreshBtn");
  const radarRegionText = document.getElementById("radarRegionText");
  const radarRegionButtons = document.querySelectorAll(".radar-region-btn");
  const radarLayerToggles = document.querySelectorAll(".radar-layer-toggle");
  const radarLayerNote = document.getElementById("radarLayerNote");

  const nwsRadarUrl = "https://radar.weather.gov/";

  function showRadarToast(message) {
    if (typeof showToast === "function") {
      showToast(message);
    }
  }

  function saveRadarLayers() {
    radarLayerToggles.forEach((toggle) => {
      localStorage.setItem(
        `mdwa_radar_layer_${toggle.dataset.layer}`,
        toggle.checked ? "on" : "off"
      );
    });

    if (radarLayerNote) {
      radarLayerNote.textContent = "Radar layer preferences saved ✓";

      setTimeout(() => {
        radarLayerNote.textContent =
          "Radar preferences save automatically on this device.";
      }, 1400);
    }
  }

  function loadRadarLayers() {
    radarLayerToggles.forEach((toggle) => {
      const savedValue = localStorage.getItem(
        `mdwa_radar_layer_${toggle.dataset.layer}`
      );

      if (savedValue !== null) {
        toggle.checked = savedValue === "on";
      }

      toggle.addEventListener("change", saveRadarLayers);
    });
  }

  function setRadarRegion(regionName) {
    radarRegionButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.radarRegion === regionName
      );
    });

    if (radarRegionText) {
      radarRegionText.textContent =
        regionName === "Maryland"
          ? "Viewing statewide Maryland radar focus."
          : `Viewing ${regionName} radar focus.`;
    }

    localStorage.setItem("mdwa_radar_region", regionName);
    showRadarToast(`Radar focus set to ${regionName}.`);
  }

  const savedRegion = localStorage.getItem("mdwa_radar_region") || "Maryland";
  setRadarRegion(savedRegion);
  loadRadarLayers();

  radarRegionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setRadarRegion(button.dataset.radarRegion);
    });
  });

  if (openNwsRadarBtn) {
    openNwsRadarBtn.addEventListener("click", () => {
      window.open(nwsRadarUrl, "_blank", "noopener,noreferrer");
    });
  }

  if (radarRefreshBtn) {
    radarRefreshBtn.addEventListener("click", () => {
      showRadarToast("Radar preview refreshed.");
    });
  }
})();
/* Version 1.3 - Final app polish and launch info */

(function mdwaFinalAppPolish() {
  const APP_VERSION = "2.2";
  const moreScreen = document.getElementById("more");

  if (!moreScreen) return;

  function createAppInfoCard() {
    let card = document.getElementById("mdwaAppInfoCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card app-info-card";
    card.id = "mdwaAppInfoCard";

    card.innerHTML = `
      <div class="section-title-row">
        <div>
          <h3>App Info</h3>
          <p>MD Weather Alerts app details, data notes, and privacy reminders.</p>
        </div>
        <span class="pill live">Info</span>
      </div>

      <span class="app-version-badge">Version ${APP_VERSION}</span>

      <div class="app-info-list">
        <div class="app-info-row">
          <span>🌦️</span>
          <div>
            <strong>Maryland-first weather</strong>
            <small>Forecasts, alerts, radar tools, blog posts, and community reports built for Maryland.</small>
          </div>
        </div>

        <div class="app-info-row">
          <span>🏢</span>
          <div>
            <strong>Official alert source</strong>
            <small>Live alert data is pulled from the National Weather Service when available.</small>
          </div>
        </div>

        <div class="app-info-row">
          <span>📍</span>
          <div>
            <strong>Report privacy</strong>
            <small>Community reports use an approximate privacy-offset location, not your exact public location.</small>
          </div>
        </div>

        <div class="app-info-row">
          <span>📲</span>
          <div>
            <strong>Installable app</strong>
            <small>This app supports home screen installation through supported browsers.</small>
          </div>
        </div>
      </div>

      <p class="app-disclaimer">
        MD Weather Alerts is a community weather app. Always follow official National Weather Service alerts,
        local emergency management, and public safety guidance during hazardous weather.
      </p>
    `;

    return card;
  }

  function getLaunchChecks() {
    const hasManifest = !!document.querySelector('link[rel="manifest"]');
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasLocalStorage = (() => {
      try {
        localStorage.setItem("mdwa_test_storage", "yes");
        localStorage.removeItem("mdwa_test_storage");
        return true;
      } catch (error) {
        return false;
      }
    })();

    const isOnline = navigator.onLine;
    const hasInstallCard = !!document.getElementById("installAppCard");
    const hasAlertsTab = !!document.getElementById("alerts");
    const hasReportsTab = !!document.getElementById("reports");

    return [
      {
        icon: hasManifest ? "✅" : "⚠️",
        status: hasManifest ? "good" : "warn",
        title: "App manifest",
        text: hasManifest
          ? "Manifest is connected for install support."
          : "Manifest link not detected.",
      },
      {
        icon: hasServiceWorker ? "✅" : "⚠️",
        status: hasServiceWorker ? "good" : "warn",
        title: "Service worker support",
        text: hasServiceWorker
          ? "This browser supports service workers."
          : "This browser does not support service workers.",
      },
      {
        icon: hasLocalStorage ? "✅" : "⚠️",
        status: hasLocalStorage ? "good" : "warn",
        title: "Saved settings",
        text: hasLocalStorage
          ? "Theme, radar, and alert preferences can save on this device."
          : "Local saved settings may not work in this browser.",
      },
      {
        icon: isOnline ? "✅" : "⚠️",
        status: isOnline ? "good" : "warn",
        title: "Connection status",
        text: isOnline
          ? "The app is currently online."
          : "The app appears offline. Some live data may not update.",
      },
      {
        icon: hasInstallCard ? "✅" : "⚠️",
        status: hasInstallCard ? "good" : "warn",
        title: "Install app card",
        text: hasInstallCard
          ? "Install card is available in the More tab."
          : "Install card was not detected.",
      },
      {
        icon: hasAlertsTab && hasReportsTab ? "✅" : "⚠️",
        status: hasAlertsTab && hasReportsTab ? "good" : "warn",
        title: "Core app tabs",
        text:
          hasAlertsTab && hasReportsTab
            ? "Alerts and Reports tabs are present."
            : "One or more core tabs may be missing.",
      },
    ];
  }

  function createLaunchChecklistCard() {
    let card = document.getElementById("mdwaLaunchChecklistCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card launch-checklist-card";
    card.id = "mdwaLaunchChecklistCard";

    card.innerHTML = `
      <div class="section-title-row">
        <div>
          <h3>Launch Checklist</h3>
          <p>Quick app health check before sharing with users.</p>
        </div>
        <span class="pill calm">Check</span>
      </div>

      <div class="launch-check-list" id="mdwaLaunchCheckList"></div>

      <button class="launch-refresh-btn" id="mdwaRefreshLaunchChecks" type="button">
        Recheck App Status
      </button>
    `;

    return card;
  }

  function renderLaunchChecks() {
    const list = document.getElementById("mdwaLaunchCheckList");
    if (!list) return;

    const checks = getLaunchChecks();

    list.innerHTML = "";

    checks.forEach((check) => {
      const row = document.createElement("div");
      row.className = `launch-check-row ${check.status}`;

      row.innerHTML = `
        <span>${check.icon}</span>
        <div>
          <strong>${check.title}</strong>
          <small>${check.text}</small>
        </div>
      `;

      list.appendChild(row);
    });
  }

  function placeFinalPolishCards() {
    const appInfoCard = createAppInfoCard();
    const launchChecklistCard = createLaunchChecklistCard();

    const installCard = document.getElementById("installAppCard");
    const forecastBlog = document.getElementById("moreBlogPosts");
    const forecastBlogCard = forecastBlog
      ? forecastBlog.closest(".section-card")
      : null;

    if (installCard && installCard.parentElement === moreScreen) {
      moreScreen.insertBefore(appInfoCard, installCard);
      moreScreen.insertBefore(launchChecklistCard, installCard.nextSibling);
      return;
    }

    if (forecastBlogCard) {
      moreScreen.insertBefore(appInfoCard, forecastBlogCard);
      moreScreen.insertBefore(launchChecklistCard, forecastBlogCard);
      return;
    }

    moreScreen.appendChild(appInfoCard);
    moreScreen.appendChild(launchChecklistCard);
  }

  placeFinalPolishCards();
  renderLaunchChecks();

  const refreshChecksBtn = document.getElementById("mdwaRefreshLaunchChecks");

  if (refreshChecksBtn) {
    refreshChecksBtn.addEventListener("click", () => {
      renderLaunchChecks();

      if (typeof showToast === "function") {
        showToast("App status rechecked.");
      }
    });
  }

  window.addEventListener("online", renderLaunchChecks);
  window.addEventListener("offline", renderLaunchChecks);
})();
/* Version 1.4 - Live NWS forecast data */

(function mdwaLiveForecastData() {
  const forecastScreen = document.getElementById("forecast");

  if (!forecastScreen) return;

  const forecastPoints = [
    { name: "Allegany", place: "Cumberland", lat: 39.6529, lon: -78.7625 },
    { name: "Anne Arundel", place: "Annapolis", lat: 38.9784, lon: -76.4922 },
    { name: "Baltimore City", place: "Baltimore", lat: 39.2904, lon: -76.6122 },
    { name: "Baltimore County", place: "Towson", lat: 39.4015, lon: -76.6019 },
    { name: "Calvert", place: "Prince Frederick", lat: 38.5404, lon: -76.5844 },
    { name: "Caroline", place: "Denton", lat: 38.8846, lon: -75.8272 },
    { name: "Carroll", place: "Westminster", lat: 39.5754, lon: -76.9958 },
    { name: "Cecil", place: "Elkton", lat: 39.6068, lon: -75.8333 },
    { name: "Charles", place: "La Plata", lat: 38.5293, lon: -76.9753 },
    { name: "Dorchester", place: "Cambridge", lat: 38.5632, lon: -76.0788 },
    { name: "Frederick", place: "Frederick", lat: 39.4143, lon: -77.4105 },
    { name: "Garrett", place: "Oakland", lat: 39.4079, lon: -79.4067 },
    { name: "Harford", place: "Bel Air", lat: 39.5359, lon: -76.3483 },
    { name: "Howard", place: "Columbia", lat: 39.2037, lon: -76.8610 },
    { name: "Kent", place: "Chestertown", lat: 39.2189, lon: -76.0690 },
    { name: "Montgomery", place: "Rockville", lat: 39.0840, lon: -77.1528 },
    { name: "Prince George’s", place: "Upper Marlboro", lat: 38.8159, lon: -76.7497 },
    { name: "Queen Anne’s", place: "Centreville", lat: 39.0418, lon: -76.0663 },
    { name: "Somerset", place: "Princess Anne", lat: 38.2029, lon: -75.6924 },
    { name: "St. Mary’s", place: "Leonardtown", lat: 38.2912, lon: -76.6358 },
    { name: "Talbot", place: "Easton", lat: 38.7743, lon: -76.0763 },
    { name: "Washington", place: "Hagerstown", lat: 39.6418, lon: -77.7200 },
    { name: "Wicomico", place: "Salisbury", lat: 38.3607, lon: -75.5994 },
    { name: "Worcester", place: "Ocean City", lat: 38.3365, lon: -75.0849 },
  ];

  function safeForecastText(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  function createLiveForecastCard() {
    let card = document.getElementById("liveNwsForecastCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card live-forecast-card";
    card.id = "liveNwsForecastCard";

    card.innerHTML = `
      <div class="live-forecast-top">
        <div>
          <p class="eyebrow">Official NWS Forecast</p>
          <h3>Live Maryland forecast</h3>
          <p>Choose a county representative point or use your location.</p>
        </div>

        <div class="live-forecast-icon" id="liveForecastIcon">🌤️</div>
      </div>

      <div class="live-forecast-controls">
        <select class="live-forecast-select" id="liveForecastCountySelect"></select>

        <div class="live-forecast-actions">
          <button class="live-forecast-btn primary" id="liveForecastRefreshBtn" type="button">
            Refresh Forecast
          </button>

          <button class="live-forecast-btn secondary" id="liveForecastLocationBtn" type="button">
            Use My Location
          </button>
        </div>

        <p class="live-forecast-status" id="liveForecastStatus">
          Loading official forecast data...
        </p>
      </div>

      <div class="live-forecast-current" id="liveForecastCurrent">
        <h4>Checking forecast...</h4>
        <p>Loading forecast from the National Weather Service.</p>
      </div>

      <div class="live-forecast-periods" id="liveForecastPeriods"></div>

      <p class="live-forecast-disclaimer">
        Forecasts are point-based from the National Weather Service. County selections use a representative
        location and may not capture every local difference across that county.
      </p>
    `;

    const pageTitle = forecastScreen.querySelector(".page-title");

    if (pageTitle) {
      pageTitle.insertAdjacentElement("afterend", card);
    } else {
      forecastScreen.prepend(card);
    }

    return card;
  }

  function populateForecastSelect() {
    const select = document.getElementById("liveForecastCountySelect");

    if (!select) return;

    select.innerHTML = "";

    forecastPoints.forEach((point) => {
      const option = document.createElement("option");
      option.value = point.name;
      option.textContent = `${point.name} County — ${point.place}`;
      select.appendChild(option);
    });

    const savedCounty =
      localStorage.getItem("mdwa_live_forecast_county") || "Harford";

    const savedExists = forecastPoints.some((point) => point.name === savedCounty);

    select.value = savedExists ? savedCounty : "Harford";
  }

  function getSelectedForecastPoint() {
    const select = document.getElementById("liveForecastCountySelect");
    const selectedCounty = select ? select.value : "Harford";

    return (
      forecastPoints.find((point) => point.name === selectedCounty) ||
      forecastPoints.find((point) => point.name === "Harford") ||
      forecastPoints[0]
    );
  }

  function setForecastStatus(message) {
    const status = document.getElementById("liveForecastStatus");

    if (status) {
      status.textContent = message;
    }
  }

  function setForecastLoading(label) {
    const current = document.getElementById("liveForecastCurrent");
    const periods = document.getElementById("liveForecastPeriods");
    const icon = document.getElementById("liveForecastIcon");

    if (icon) icon.textContent = "⏳";

    if (current) {
      current.innerHTML = `
        <h4>Loading ${safeForecastText(label)} forecast...</h4>
        <p>Checking the official National Weather Service forecast feed.</p>
      `;
    }

    if (periods) {
      periods.innerHTML = "";
    }

    setForecastStatus("Loading official NWS forecast data...");
  }

  function setForecastError(label) {
    const current = document.getElementById("liveForecastCurrent");
    const periods = document.getElementById("liveForecastPeriods");
    const icon = document.getElementById("liveForecastIcon");

    if (icon) icon.textContent = "⚠️";

    if (current) {
      current.innerHTML = `
        <h4>Forecast unavailable</h4>
        <p>The app could not reach the official forecast feed for ${safeForecastText(label)}.</p>
      `;
    }

    if (periods) {
      periods.innerHTML = "";
    }

    setForecastStatus("Live forecast could not load. Try refreshing again.");
  }

  function getForecastIcon(shortForecast) {
    const text = (shortForecast || "").toLowerCase();

    if (text.includes("thunder")) return "⛈️";
    if (text.includes("rain") || text.includes("showers")) return "🌧️";
    if (text.includes("snow") || text.includes("ice") || text.includes("sleet")) return "❄️";
    if (text.includes("cloud")) return "☁️";
    if (text.includes("sun") || text.includes("clear")) return "☀️";
    if (text.includes("fog")) return "🌫️";

    return "🌤️";
  }

  function renderForecastData(periods, label, sourceOffice) {
    const current = document.getElementById("liveForecastCurrent");
    const periodList = document.getElementById("liveForecastPeriods");
    const icon = document.getElementById("liveForecastIcon");

    if (!periods || periods.length === 0) {
      setForecastError(label);
      return;
    }

    const first = periods[0];
    const checkedTime = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    if (icon) {
      icon.textContent = getForecastIcon(first.shortForecast);
    }

    if (current) {
      current.innerHTML = `
        <h4>${safeForecastText(first.name)}: ${safeForecastText(first.shortForecast)}</h4>
        <p>${safeForecastText(first.detailedForecast || "Detailed forecast not listed.")}</p>

        <div class="live-forecast-meta">
          <span class="live-forecast-pill">🌡️ ${safeForecastText(String(first.temperature))}°${safeForecastText(first.temperatureUnit || "F")}</span>
          <span class="live-forecast-pill">💨 Wind: ${safeForecastText(first.windSpeed || "Not listed")}</span>
          <span class="live-forecast-pill">🧭 ${safeForecastText(first.windDirection || "N/A")}</span>
        </div>
      `;
    }

    if (periodList) {
      periodList.innerHTML = "";

      periods.slice(1, 6).forEach((period) => {
        const card = document.createElement("div");
        card.className = "live-period-card";

        card.innerHTML = `
          <strong>${safeForecastText(period.name)} — ${safeForecastText(period.shortForecast)}</strong>
          <small>🌡️ ${safeForecastText(String(period.temperature))}°${safeForecastText(period.temperatureUnit || "F")} · 💨 ${safeForecastText(period.windSpeed || "Wind not listed")}</small>
          <small>${safeForecastText(period.detailedForecast || "")}</small>
        `;

        periodList.appendChild(card);
      });
    }

    setForecastStatus(
      `Official NWS point forecast loaded for ${label}. Checked ${checkedTime}. ${sourceOffice ? `Office: ${sourceOffice}.` : ""}`
    );
  }

  async function loadForecastForPoint(point, customLabel) {
    const label = customLabel || `${point.name} County`;

    setForecastLoading(label);

    try {
      const pointsUrl = `https://api.weather.gov/points/${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;

      const pointResponse = await fetch(pointsUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!pointResponse.ok) {
        throw new Error(`NWS point request failed: ${pointResponse.status}`);
      }

      const pointData = await pointResponse.json();
      const forecastUrl = pointData.properties?.forecast;
      const sourceOffice = pointData.properties?.cwa || "";

      if (!forecastUrl) {
        throw new Error("NWS forecast URL missing.");
      }

      const forecastResponse = await fetch(forecastUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!forecastResponse.ok) {
        throw new Error(`NWS forecast request failed: ${forecastResponse.status}`);
      }

      const forecastData = await forecastResponse.json();
      const periods = forecastData.properties?.periods || [];

      renderForecastData(periods, label, sourceOffice);

      if (typeof showToast === "function") {
        showToast(`Forecast loaded for ${label}.`);
      }
    } catch (error) {
      console.error("Live forecast failed:", error);
      setForecastError(label);

      if (typeof showToast === "function") {
        showToast("Live forecast could not load.");
      }
    }
  }

  function loadSelectedCountyForecast() {
    const point = getSelectedForecastPoint();

    localStorage.setItem("mdwa_live_forecast_county", point.name);

    loadForecastForPoint(point, `${point.name} County`);
  }

  function useMyLocationForecast() {
    if (!navigator.geolocation) {
      setForecastStatus("Location is not supported by this browser.");
      return;
    }

    setForecastStatus("Requesting your location for a point forecast...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          name: "Your Location",
          place: "Current Location",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        loadForecastForPoint(point, "your location");
      },
      () => {
        setForecastStatus("Location permission was denied or unavailable.");
        if (typeof showToast === "function") {
          showToast("Location was not available.");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000,
      }
    );
  }

  createLiveForecastCard();
  populateForecastSelect();

  const select = document.getElementById("liveForecastCountySelect");
  const refreshBtn = document.getElementById("liveForecastRefreshBtn");
  const locationBtn = document.getElementById("liveForecastLocationBtn");

  if (select) {
    select.addEventListener("change", loadSelectedCountyForecast);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadSelectedCountyForecast);
  }

  if (locationBtn) {
    locationBtn.addEventListener("click", useMyLocationForecast);
  }

  loadSelectedCountyForecast();
})();
/* Version 1.5 - Home live forecast preview */

(function mdwaHomeLiveForecastPreview() {
  const homeScreen = document.getElementById("home");

  if (!homeScreen) return;

  const forecastPoints = [
    { name: "Allegany", place: "Cumberland", lat: 39.6529, lon: -78.7625 },
    { name: "Anne Arundel", place: "Annapolis", lat: 38.9784, lon: -76.4922 },
    { name: "Baltimore City", place: "Baltimore", lat: 39.2904, lon: -76.6122 },
    { name: "Baltimore County", place: "Towson", lat: 39.4015, lon: -76.6019 },
    { name: "Calvert", place: "Prince Frederick", lat: 38.5404, lon: -76.5844 },
    { name: "Caroline", place: "Denton", lat: 38.8846, lon: -75.8272 },
    { name: "Carroll", place: "Westminster", lat: 39.5754, lon: -76.9958 },
    { name: "Cecil", place: "Elkton", lat: 39.6068, lon: -75.8333 },
    { name: "Charles", place: "La Plata", lat: 38.5293, lon: -76.9753 },
    { name: "Dorchester", place: "Cambridge", lat: 38.5632, lon: -76.0788 },
    { name: "Frederick", place: "Frederick", lat: 39.4143, lon: -77.4105 },
    { name: "Garrett", place: "Oakland", lat: 39.4079, lon: -79.4067 },
    { name: "Harford", place: "Bel Air", lat: 39.5359, lon: -76.3483 },
    { name: "Howard", place: "Columbia", lat: 39.2037, lon: -76.861 },
    { name: "Kent", place: "Chestertown", lat: 39.2189, lon: -76.069 },
    { name: "Montgomery", place: "Rockville", lat: 39.084, lon: -77.1528 },
    { name: "Prince George’s", place: "Upper Marlboro", lat: 38.8159, lon: -76.7497 },
    { name: "Queen Anne’s", place: "Centreville", lat: 39.0418, lon: -76.0663 },
    { name: "Somerset", place: "Princess Anne", lat: 38.2029, lon: -75.6924 },
    { name: "St. Mary’s", place: "Leonardtown", lat: 38.2912, lon: -76.6358 },
    { name: "Talbot", place: "Easton", lat: 38.7743, lon: -76.0763 },
    { name: "Washington", place: "Hagerstown", lat: 39.6418, lon: -77.72 },
    { name: "Wicomico", place: "Salisbury", lat: 38.3607, lon: -75.5994 },
    { name: "Worcester", place: "Ocean City", lat: 38.3365, lon: -75.0849 },
  ];

  function safeHomeForecastText(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  function getForecastIcon(shortForecast) {
    const text = (shortForecast || "").toLowerCase();

    if (text.includes("thunder")) return "⛈️";
    if (text.includes("rain") || text.includes("showers")) return "🌧️";
    if (text.includes("snow") || text.includes("ice") || text.includes("sleet")) return "❄️";
    if (text.includes("fog")) return "🌫️";
    if (text.includes("cloud")) return "☁️";
    if (text.includes("sun") || text.includes("clear")) return "☀️";

    return "🌤️";
  }

  function createHomeForecastCard() {
    let card = document.getElementById("homeLiveForecastCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card home-forecast-card";
    card.id = "homeLiveForecastCard";

    card.innerHTML = `
      <div class="home-forecast-main">
        <div class="home-forecast-copy">
          <p class="eyebrow">Official NWS Forecast</p>
          <h3 id="homeForecastTitle">Checking forecast...</h3>
          <p id="homeForecastText">Loading your Maryland forecast preview.</p>
        </div>

        <div class="home-forecast-icon" id="homeForecastIcon">⏳</div>
      </div>

      <div class="home-forecast-controls">
        <select class="home-forecast-select" id="homeForecastCountySelect"></select>

        <div class="home-forecast-actions">
          <button class="home-forecast-btn primary" id="homeViewForecastBtn" type="button">
            View Forecast
          </button>

          <button class="home-forecast-btn secondary" id="homeRefreshForecastBtn" type="button">
            Refresh
          </button>
        </div>
      </div>

      <div class="home-forecast-meta">
        <span class="home-forecast-pill" id="homeForecastTemp">Loading...</span>
        <span class="home-forecast-pill" id="homeForecastWind">Wind loading</span>
        <span class="home-forecast-pill" id="homeForecastChecked">Just opened</span>
      </div>

      <div class="home-forecast-next" id="homeForecastNext"></div>

      <p class="home-forecast-status" id="homeForecastStatus">
        Forecasts are point-based from the National Weather Service.
      </p>
    `;

    const homeAlertCard = document.getElementById("homeLiveAlertCard");

    if (homeAlertCard && homeAlertCard.parentElement === homeScreen) {
      homeAlertCard.insertAdjacentElement("afterend", card);
      return card;
    }

    const firstSectionCard = homeScreen.querySelector(".section-card");

    if (firstSectionCard) {
      firstSectionCard.insertAdjacentElement("afterend", card);
    } else {
      homeScreen.prepend(card);
    }

    return card;
  }

  function populateHomeForecastSelect() {
    const select = document.getElementById("homeForecastCountySelect");

    if (!select) return;

    select.innerHTML = "";

    forecastPoints.forEach((point) => {
      const option = document.createElement("option");
      option.value = point.name;
      option.textContent = `${point.name} — ${point.place}`;
      select.appendChild(option);
    });

    const savedCounty =
      localStorage.getItem("mdwa_live_forecast_county") || "Harford";

    const savedExists = forecastPoints.some((point) => point.name === savedCounty);

    select.value = savedExists ? savedCounty : "Harford";
  }

  function getSelectedHomeForecastPoint() {
    const select = document.getElementById("homeForecastCountySelect");
    const selectedCounty = select ? select.value : "Harford";

    return (
      forecastPoints.find((point) => point.name === selectedCounty) ||
      forecastPoints.find((point) => point.name === "Harford") ||
      forecastPoints[0]
    );
  }

  function setHomeForecastLoading(point) {
    document.getElementById("homeForecastTitle").textContent =
      `Checking ${point.name} forecast...`;

    document.getElementById("homeForecastText").textContent =
      `Loading the official point forecast near ${point.place}.`;

    document.getElementById("homeForecastIcon").textContent = "⏳";
    document.getElementById("homeForecastTemp").textContent = "Loading...";
    document.getElementById("homeForecastWind").textContent = "Wind loading";
    document.getElementById("homeForecastChecked").textContent = "Updating";
    document.getElementById("homeForecastNext").innerHTML = "";

    document.getElementById("homeForecastStatus").textContent =
      "Loading official NWS forecast data...";
  }

  function setHomeForecastError(point) {
    document.getElementById("homeForecastTitle").textContent =
      "Forecast unavailable";

    document.getElementById("homeForecastText").textContent =
      `The app could not load the official forecast near ${point.place}.`;

    document.getElementById("homeForecastIcon").textContent = "⚠️";
    document.getElementById("homeForecastTemp").textContent = "Unable to load";
    document.getElementById("homeForecastWind").textContent = "Try refresh";
    document.getElementById("homeForecastChecked").textContent = "NWS error";
    document.getElementById("homeForecastNext").innerHTML = "";

    document.getElementById("homeForecastStatus").textContent =
      "Live forecast could not load. Try refreshing again.";
  }

  function renderHomeForecast(periods, point, sourceOffice) {
    if (!periods || periods.length === 0) {
      setHomeForecastError(point);
      return;
    }

    const first = periods[0];
    const nextList = document.getElementById("homeForecastNext");

    const checkedTime = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    document.getElementById("homeForecastTitle").textContent =
      `${point.name}: ${first.shortForecast || "Forecast"}`;

    document.getElementById("homeForecastText").textContent =
      first.detailedForecast || "Detailed forecast not listed.";

    document.getElementById("homeForecastIcon").textContent =
      getForecastIcon(first.shortForecast);

    document.getElementById("homeForecastTemp").textContent =
      `🌡️ ${first.temperature}°${first.temperatureUnit || "F"}`;

    document.getElementById("homeForecastWind").textContent =
      `💨 ${first.windSpeed || "Wind N/A"}`;

    document.getElementById("homeForecastChecked").textContent =
      `Checked ${checkedTime}`;

    if (nextList) {
      nextList.innerHTML = "";

      periods.slice(1, 3).forEach((period) => {
        const mini = document.createElement("div");
        mini.className = "home-forecast-mini";

        mini.innerHTML = `
          <strong>${safeHomeForecastText(period.name)} — ${safeHomeForecastText(period.shortForecast)}</strong>
          <small>🌡️ ${safeHomeForecastText(String(period.temperature))}°${safeHomeForecastText(period.temperatureUnit || "F")} · 💨 ${safeHomeForecastText(period.windSpeed || "Wind not listed")}</small>
        `;

        nextList.appendChild(mini);
      });
    }

    document.getElementById("homeForecastStatus").textContent =
      `Official NWS point forecast near ${point.place}. ${sourceOffice ? `Office: ${sourceOffice}.` : ""}`;
  }

  async function loadHomeForecast() {
    const point = getSelectedHomeForecastPoint();

    localStorage.setItem("mdwa_live_forecast_county", point.name);

    setHomeForecastLoading(point);

    try {
      const pointsUrl = `https://api.weather.gov/points/${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;

      const pointResponse = await fetch(pointsUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!pointResponse.ok) {
        throw new Error(`NWS point request failed: ${pointResponse.status}`);
      }

      const pointData = await pointResponse.json();
      const forecastUrl = pointData.properties?.forecast;
      const sourceOffice = pointData.properties?.cwa || "";

      if (!forecastUrl) {
        throw new Error("NWS forecast URL missing.");
      }

      const forecastResponse = await fetch(forecastUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!forecastResponse.ok) {
        throw new Error(`NWS forecast request failed: ${forecastResponse.status}`);
      }

      const forecastData = await forecastResponse.json();
      const periods = forecastData.properties?.periods || [];

      renderHomeForecast(periods, point, sourceOffice);
    } catch (error) {
      console.error("Home forecast preview failed:", error);
      setHomeForecastError(point);
    }
  }

  function goToForecastTab() {
    const forecastNavButton =
      document.querySelector('.nav-item[data-screen="forecast"]') ||
      document.querySelector('[data-target="forecast"]');

    if (forecastNavButton) {
      forecastNavButton.click();
      return;
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    const forecastScreen = document.getElementById("forecast");

    if (forecastScreen) {
      forecastScreen.classList.add("active");
    }
  }

  createHomeForecastCard();
  populateHomeForecastSelect();

  const select = document.getElementById("homeForecastCountySelect");
  const viewForecastBtn = document.getElementById("homeViewForecastBtn");
  const refreshForecastBtn = document.getElementById("homeRefreshForecastBtn");

  if (select) {
    select.addEventListener("change", () => {
      loadHomeForecast();

      const forecastSelect = document.getElementById("liveForecastCountySelect");

      if (forecastSelect) {
        forecastSelect.value = select.value;
      }

      if (typeof showToast === "function") {
        showToast(`Home forecast set to ${select.value}.`);
      }
    });
  }

  if (viewForecastBtn) {
    viewForecastBtn.addEventListener("click", goToForecastTab);
  }

  if (refreshForecastBtn) {
    refreshForecastBtn.addEventListener("click", () => {
      loadHomeForecast();

      if (typeof showToast === "function") {
        showToast("Refreshing home forecast.");
      }
    });
  }

  loadHomeForecast();
})();
/* Version 1.6 - Reports center polish and saved local feed */

(function mdwaReportsCenterPolish() {
  const reportsScreen = document.getElementById("reports");
  const submittedReports = document.getElementById("submittedReports");

  if (!reportsScreen || !submittedReports) return;

  const SAVED_REPORTS_KEY = "mdwa_saved_reports_feed_html";
  const SAVED_REPORTS_TIME_KEY = "mdwa_saved_reports_feed_time";

  function createReportsStatusCard() {
    let card = document.getElementById("mdwaReportsStatusCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card reports-status-card";
    card.id = "mdwaReportsStatusCard";

    card.innerHTML = `
      <div class="reports-status-main">
        <div class="reports-status-copy">
          <p class="eyebrow">Community Reports</p>
          <h3 id="reportsStatusTitle">No reports submitted yet</h3>
          <p id="reportsStatusText">
            Local reports will appear here when Marylanders submit weather conditions.
          </p>
        </div>

        <div class="reports-status-icon" id="reportsStatusIcon">📍</div>
      </div>

      <div class="reports-status-meta">
        <span class="reports-status-pill" id="reportsActiveCount">0 active</span>
        <span class="reports-status-pill" id="reportsImpactCount">0 impact</span>
        <span class="reports-status-pill" id="reportsSkyCount">0 sky</span>
        <span class="reports-status-pill" id="reportsSavedTime">Not saved yet</span>
      </div>

      <div class="reports-status-actions">
        <button class="reports-status-btn primary" id="reportsJumpToMapBtn" type="button">
          View Report Map
        </button>

        <button class="reports-status-btn secondary" id="reportsCopySummaryBtn" type="button">
          Copy Summary
        </button>

        <button class="reports-status-btn danger" id="reportsClearSavedBtn" type="button">
          Clear Saved Feed
        </button>
      </div>

      <p class="reports-saved-note" id="reportsSavedNote">
        Reports shown here are saved locally on this device for quick refresh recovery.
      </p>
    `;

    return card;
  }

  function createReportTipsCard() {
    let card = document.getElementById("mdwaReportTipsCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card report-tips-card";
    card.id = "mdwaReportTipsCard";

    card.innerHTML = `
      <div class="section-title-row">
        <div>
          <h3>Report Tips</h3>
          <p>Help keep community reports useful, safe, and accurate.</p>
        </div>
        <span class="pill calm">Guide</span>
      </div>

      <div class="report-tips-list">
        <div class="report-tip-row">
          <span>📍</span>
          <div>
            <strong>Location is approximate</strong>
            <small>Your public report location is offset for privacy and should not show your exact spot.</small>
          </div>
        </div>

        <div class="report-tip-row">
          <span>⏱️</span>
          <div>
            <strong>Reports are temporary</strong>
            <small>Reports are meant for current conditions and should expire as weather changes.</small>
          </div>
        </div>

        <div class="report-tip-row">
          <span>⚠️</span>
          <div>
            <strong>Do not report from danger</strong>
            <small>Never go outside or drive into hazardous weather just to submit a report.</small>
          </div>
        </div>

        <div class="report-tip-row">
          <span>✅</span>
          <div>
            <strong>Be clear and specific</strong>
            <small>Short details like “pea-size hail” or “road flooding near town” are more helpful.</small>
          </div>
        </div>
      </div>
    `;

    return card;
  }

  function placeReportsCards() {
    const statusCard = createReportsStatusCard();
    const tipsCard = createReportTipsCard();

    const cleanPanel = document.getElementById("cleanReportPanel");
    const firstSectionCard = reportsScreen.querySelector(".section-card");

    if (cleanPanel) {
      reportsScreen.insertBefore(statusCard, cleanPanel);
      reportsScreen.insertBefore(tipsCard, cleanPanel.nextSibling);
      return;
    }

    if (firstSectionCard) {
      reportsScreen.insertBefore(statusCard, firstSectionCard);
      reportsScreen.insertBefore(tipsCard, firstSectionCard.nextSibling);
      return;
    }

    reportsScreen.appendChild(statusCard);
    reportsScreen.appendChild(tipsCard);
  }

  function getReportItems() {
    return Array.from(submittedReports.children).filter((item) => {
      const text = item.textContent.toLowerCase().trim();

      if (!text) return false;
      if (text.includes("no submitted reports yet")) return false;

      return true;
    });
  }

  function getReportStats() {
    const items = getReportItems();

    const impactWords = ["flood", "hail", "wind damage", "damage"];
    const skyWords = ["beautiful sky", "sky", "sunset", "sunrise"];

    let impactCount = 0;
    let skyCount = 0;

    items.forEach((item) => {
      const text = item.textContent.toLowerCase();

      if (impactWords.some((word) => text.includes(word))) {
        impactCount += 1;
      }

      if (skyWords.some((word) => text.includes(word))) {
        skyCount += 1;
      }
    });

    return {
      total: items.length,
      impact: impactCount,
      sky: skyCount,
    };
  }

  function getSavedTimeLabel() {
    const savedTime = localStorage.getItem(SAVED_REPORTS_TIME_KEY);

    if (!savedTime) return "Not saved yet";

    const date = new Date(savedTime);

    if (Number.isNaN(date.getTime())) return "Saved locally";

    return `Saved ${date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  function updateReportsStatus() {
    const stats = getReportStats();

    const title = document.getElementById("reportsStatusTitle");
    const text = document.getElementById("reportsStatusText");
    const icon = document.getElementById("reportsStatusIcon");
    const activeCount = document.getElementById("reportsActiveCount");
    const impactCount = document.getElementById("reportsImpactCount");
    const skyCount = document.getElementById("reportsSkyCount");
    const savedTime = document.getElementById("reportsSavedTime");

    if (!title || !text || !icon) return;

    if (stats.total === 0) {
      title.textContent = "No reports submitted yet";
      text.textContent =
        "Local reports will appear here when Marylanders submit current weather conditions.";
      icon.textContent = "📍";
    } else {
      title.textContent = `${stats.total} active local report${
        stats.total === 1 ? "" : "s"
      }`;
      text.textContent =
        "Community weather reports are currently showing in the local app feed.";
      icon.textContent = stats.impact > 0 ? "⚠️" : "📍";
    }

    if (activeCount) {
      activeCount.textContent = `${stats.total} active`;
    }

    if (impactCount) {
      impactCount.textContent = `${stats.impact} impact`;
    }

    if (skyCount) {
      skyCount.textContent = `${stats.sky} sky`;
    }

    if (savedTime) {
      savedTime.textContent = getSavedTimeLabel();
    }
  }

  function saveReportsFeedSnapshot() {
    const stats = getReportStats();

    if (stats.total === 0) return;

    localStorage.setItem(SAVED_REPORTS_KEY, submittedReports.innerHTML);
    localStorage.setItem(SAVED_REPORTS_TIME_KEY, new Date().toISOString());

    updateReportsStatus();
  }

  function restoreReportsFeedSnapshot() {
    const currentStats = getReportStats();
    const savedHtml = localStorage.getItem(SAVED_REPORTS_KEY);

    if (currentStats.total > 0) return;
    if (!savedHtml) return;

    submittedReports.innerHTML = savedHtml;

    const note = document.getElementById("reportsSavedNote");

    if (note) {
      note.textContent =
        "Saved local report feed restored on this device. Map pins may refresh separately.";
    }
  }

  function clearSavedReportsFeed() {
    localStorage.removeItem(SAVED_REPORTS_KEY);
    localStorage.removeItem(SAVED_REPORTS_TIME_KEY);

    submittedReports.innerHTML = `
      <p class="empty-feed">No submitted reports yet.</p>
    `;

    const note = document.getElementById("reportsSavedNote");

    if (note) {
      note.textContent =
        "Saved local report feed cleared. Refresh the page if old map pins are still visible.";
    }

    updateReportsStatus();

    if (typeof showToast === "function") {
      showToast("Saved report feed cleared.");
    }
  }

  function copyReportSummary() {
    const stats = getReportStats();

    const summary = [
      "MD Weather Alerts Community Report Summary",
      `Active local reports: ${stats.total}`,
      `Impact reports: ${stats.impact}`,
      `Beautiful sky/sky reports: ${stats.sky}`,
      `Saved status: ${getSavedTimeLabel()}`,
    ].join("\n");

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary).then(() => {
        if (typeof showToast === "function") {
          showToast("Report summary copied.");
        }
      });

      return;
    }

    alert(summary);
  }

  function jumpToReportMap() {
    const mapCard =
      document.querySelector(".clean-map-card") ||
      document.querySelector(".map-card") ||
      document.getElementById("reportMap");

    if (mapCard) {
      mapCard.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    if (typeof showToast === "function") {
      showToast("Jumping to report map.");
    }
  }

  function watchReportsFeed() {
    let saveTimer = null;

    const observer = new MutationObserver(() => {
      updateReportsStatus();

      clearTimeout(saveTimer);

      saveTimer = setTimeout(() => {
        saveReportsFeedSnapshot();
      }, 350);
    });

    observer.observe(submittedReports, {
      childList: true,
      subtree: true,
    });
  }

  placeReportsCards();
  restoreReportsFeedSnapshot();
  updateReportsStatus();
  watchReportsFeed();

  const jumpBtn = document.getElementById("reportsJumpToMapBtn");
  const copyBtn = document.getElementById("reportsCopySummaryBtn");
  const clearBtn = document.getElementById("reportsClearSavedBtn");
  const submitBtn = document.getElementById("cleanSubmitReport");

  if (jumpBtn) {
    jumpBtn.addEventListener("click", jumpToReportMap);
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", copyReportSummary);
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", clearSavedReportsFeed);
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      setTimeout(() => {
        updateReportsStatus();
        saveReportsFeedSnapshot();
      }, 500);
    });
  }
})();
/* Version 1.7 - Share app and feedback center */

(function mdwaShareAppCenter() {
  const moreScreen = document.getElementById("more");

  if (!moreScreen) return;

  const MDWA_WEBSITE_URL = "https://mdweatheralerts.com";

  function getAppShareUrl() {
    return window.location.href.split("#")[0];
  }

  function showShareMessage(message) {
    if (typeof showToast === "function") {
      showToast(message);
      return;
    }

    console.log(message);
  }

  function createShareAppCard() {
    let card = document.getElementById("mdwaShareAppCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card share-app-card";
    card.id = "mdwaShareAppCard";

    card.innerHTML = `
      <div class="share-app-hero">
        <div class="share-app-copy">
          <p class="eyebrow">Share MD Weather Alerts</p>
          <h3>Help grow the app</h3>
          <p>Share the app, copy the link, visit the website, or send feedback.</p>
        </div>

        <div class="share-app-icon">📲</div>
      </div>

      <div class="share-action-grid">
        <button class="share-action-btn primary" id="mdwaNativeShareBtn" type="button">
          Share App
        </button>

        <button class="share-action-btn secondary" id="mdwaCopyAppLinkBtn" type="button">
          Copy Link
        </button>

        <button class="share-action-btn secondary" id="mdwaOpenWebsiteBtn" type="button">
          Open Website
        </button>

        <button class="share-action-btn secondary" id="mdwaCopyFeedbackBtn" type="button">
          Copy Feedback
        </button>
      </div>

      <div class="share-support-list">
        <div class="share-support-row">
          <span>🌦️</span>
          <div>
            <strong>Built for Maryland</strong>
            <small>Forecasts, alerts, radar tools, and reports focused on Maryland communities.</small>
          </div>
        </div>

        <div class="share-support-row">
          <span>🧪</span>
          <div>
            <strong>Feedback helps</strong>
            <small>Early testing helps improve layout, speed, reliability, and app features.</small>
          </div>
        </div>

        <div class="share-support-row">
          <span>🔗</span>
          <div>
            <strong>One link is enough</strong>
            <small>Sharing the app link helps more Marylanders find the project.</small>
          </div>
        </div>
      </div>

      <p class="share-app-note" id="mdwaShareAppNote">
        Share features use your browser’s built-in share or clipboard tools when available.
      </p>
    `;

    return card;
  }

  async function copyTextToClipboard(text, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showShareMessage(successMessage);
        return;
      }

      const tempTextArea = document.createElement("textarea");
      tempTextArea.value = text;
      tempTextArea.style.position = "fixed";
      tempTextArea.style.opacity = "0";
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      document.execCommand("copy");
      tempTextArea.remove();

      showShareMessage(successMessage);
    } catch (error) {
      console.error("Clipboard failed:", error);
      alert(text);
    }
  }

  async function shareApp() {
    const shareData = {
      title: "MD Weather Alerts",
      text: "Check out the MD Weather Alerts app for Maryland forecasts, alerts, radar, and local reports.",
      url: getAppShareUrl(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showShareMessage("Thanks for sharing MD Weather Alerts.");
        return;
      }

      await copyTextToClipboard(
        `${shareData.text}\n${shareData.url}`,
        "App link copied for sharing."
      );
    } catch (error) {
      console.log("Share cancelled or unavailable:", error);
    }
  }

  function copyAppLink() {
    copyTextToClipboard(getAppShareUrl(), "App link copied.");
  }

  function openWebsite() {
    window.open(MDWA_WEBSITE_URL, "_blank", "noopener,noreferrer");
  }

  function copyFeedbackTemplate() {
    const feedbackText = [
      "MD Weather Alerts App Feedback",
      "",
      "Device/browser:",
      "",
      "What worked well:",
      "",
      "What was confusing or broken:",
      "",
      "Feature idea:",
      "",
      `App link: ${getAppShareUrl()}`,
    ].join("\n");

    copyTextToClipboard(feedbackText, "Feedback template copied.");
  }

  function placeShareCard() {
    const shareCard = createShareAppCard();

    const appInfoCard = document.getElementById("mdwaAppInfoCard");
    const launchChecklistCard = document.getElementById("mdwaLaunchChecklistCard");
    const installCard = document.getElementById("installAppCard");
    const forecastBlog = document.getElementById("moreBlogPosts");
    const forecastBlogCard = forecastBlog
      ? forecastBlog.closest(".section-card")
      : null;

    if (launchChecklistCard && launchChecklistCard.parentElement === moreScreen) {
      launchChecklistCard.insertAdjacentElement("afterend", shareCard);
      return;
    }

    if (appInfoCard && appInfoCard.parentElement === moreScreen) {
      appInfoCard.insertAdjacentElement("afterend", shareCard);
      return;
    }

    if (installCard && installCard.parentElement === moreScreen) {
      moreScreen.insertBefore(shareCard, installCard);
      return;
    }

    if (forecastBlogCard) {
      moreScreen.insertBefore(shareCard, forecastBlogCard);
      return;
    }

    moreScreen.appendChild(shareCard);
  }

  placeShareCard();

  const nativeShareBtn = document.getElementById("mdwaNativeShareBtn");
  const copyAppLinkBtn = document.getElementById("mdwaCopyAppLinkBtn");
  const openWebsiteBtn = document.getElementById("mdwaOpenWebsiteBtn");
  const copyFeedbackBtn = document.getElementById("mdwaCopyFeedbackBtn");

  if (nativeShareBtn) {
    nativeShareBtn.addEventListener("click", shareApp);
  }

  if (copyAppLinkBtn) {
    copyAppLinkBtn.addEventListener("click", copyAppLink);
  }

  if (openWebsiteBtn) {
    openWebsiteBtn.addEventListener("click", openWebsite);
  }

  if (copyFeedbackBtn) {
    copyFeedbackBtn.addEventListener("click", copyFeedbackTemplate);
  }
})();
/* Version 1.8 - Live hourly forecast timeline */

(function mdwaLiveHourlyForecastTimeline() {
  const forecastScreen = document.getElementById("forecast");

  if (!forecastScreen) return;

  const forecastPoints = [
    { name: "Allegany", place: "Cumberland", lat: 39.6529, lon: -78.7625 },
    { name: "Anne Arundel", place: "Annapolis", lat: 38.9784, lon: -76.4922 },
    { name: "Baltimore City", place: "Baltimore", lat: 39.2904, lon: -76.6122 },
    { name: "Baltimore County", place: "Towson", lat: 39.4015, lon: -76.6019 },
    { name: "Calvert", place: "Prince Frederick", lat: 38.5404, lon: -76.5844 },
    { name: "Caroline", place: "Denton", lat: 38.8846, lon: -75.8272 },
    { name: "Carroll", place: "Westminster", lat: 39.5754, lon: -76.9958 },
    { name: "Cecil", place: "Elkton", lat: 39.6068, lon: -75.8333 },
    { name: "Charles", place: "La Plata", lat: 38.5293, lon: -76.9753 },
    { name: "Dorchester", place: "Cambridge", lat: 38.5632, lon: -76.0788 },
    { name: "Frederick", place: "Frederick", lat: 39.4143, lon: -77.4105 },
    { name: "Garrett", place: "Oakland", lat: 39.4079, lon: -79.4067 },
    { name: "Harford", place: "Bel Air", lat: 39.5359, lon: -76.3483 },
    { name: "Howard", place: "Columbia", lat: 39.2037, lon: -76.861 },
    { name: "Kent", place: "Chestertown", lat: 39.2189, lon: -76.069 },
    { name: "Montgomery", place: "Rockville", lat: 39.084, lon: -77.1528 },
    { name: "Prince George’s", place: "Upper Marlboro", lat: 38.8159, lon: -76.7497 },
    { name: "Queen Anne’s", place: "Centreville", lat: 39.0418, lon: -76.0663 },
    { name: "Somerset", place: "Princess Anne", lat: 38.2029, lon: -75.6924 },
    { name: "St. Mary’s", place: "Leonardtown", lat: 38.2912, lon: -76.6358 },
    { name: "Talbot", place: "Easton", lat: 38.7743, lon: -76.0763 },
    { name: "Washington", place: "Hagerstown", lat: 39.6418, lon: -77.72 },
    { name: "Wicomico", place: "Salisbury", lat: 38.3607, lon: -75.5994 },
    { name: "Worcester", place: "Ocean City", lat: 38.3365, lon: -75.0849 },
  ];

  function safeHourlyText(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  function getHourlyIcon(shortForecast) {
    const text = (shortForecast || "").toLowerCase();

    if (text.includes("thunder")) return "⛈️";
    if (text.includes("rain") || text.includes("showers")) return "🌧️";
    if (text.includes("snow") || text.includes("ice") || text.includes("sleet")) return "❄️";
    if (text.includes("fog")) return "🌫️";
    if (text.includes("cloud")) return "☁️";
    if (text.includes("sun") || text.includes("clear")) return "☀️";

    return "🌤️";
  }

  function formatHour(timeString) {
    const date = new Date(timeString);

    if (Number.isNaN(date.getTime())) {
      return "Soon";
    }

    return date.toLocaleTimeString([], {
      hour: "numeric",
    });
  }

  function createHourlyForecastCard() {
    let card = document.getElementById("liveHourlyForecastCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card hourly-forecast-card";
    card.id = "liveHourlyForecastCard";

    card.innerHTML = `
      <div class="hourly-forecast-top">
        <div class="hourly-forecast-copy">
          <p class="eyebrow">Hourly Forecast</p>
          <h3 id="hourlyForecastTitle">Today by the hour</h3>
          <p id="hourlyForecastText">Live hourly forecast data from the National Weather Service.</p>
        </div>

        <div class="hourly-forecast-icon" id="hourlyForecastIcon">🕒</div>
      </div>

      <div class="hourly-forecast-controls">
        <select class="hourly-forecast-select" id="hourlyForecastCountySelect"></select>

        <button class="hourly-refresh-btn" id="hourlyForecastRefreshBtn" type="button">
          Refresh Hourly Forecast
        </button>
      </div>

      <div class="hourly-forecast-strip" id="hourlyForecastStrip"></div>

      <p class="hourly-forecast-status" id="hourlyForecastStatus">
        Loading hourly forecast...
      </p>
    `;

    const liveForecastCard = document.getElementById("liveNwsForecastCard");

    if (liveForecastCard && liveForecastCard.parentElement === forecastScreen) {
      liveForecastCard.insertAdjacentElement("afterend", card);
      return card;
    }

    const pageTitle = forecastScreen.querySelector(".page-title");

    if (pageTitle) {
      pageTitle.insertAdjacentElement("afterend", card);
    } else {
      forecastScreen.prepend(card);
    }

    return card;
  }

  function populateHourlySelect() {
    const select = document.getElementById("hourlyForecastCountySelect");

    if (!select) return;

    select.innerHTML = "";

    forecastPoints.forEach((point) => {
      const option = document.createElement("option");
      option.value = point.name;
      option.textContent = `${point.name} — ${point.place}`;
      select.appendChild(option);
    });

    const savedCounty =
      localStorage.getItem("mdwa_live_forecast_county") || "Harford";

    const savedExists = forecastPoints.some((point) => point.name === savedCounty);

    select.value = savedExists ? savedCounty : "Harford";
  }

  function getSelectedHourlyPoint() {
    const select = document.getElementById("hourlyForecastCountySelect");
    const selectedCounty = select ? select.value : "Harford";

    return (
      forecastPoints.find((point) => point.name === selectedCounty) ||
      forecastPoints.find((point) => point.name === "Harford") ||
      forecastPoints[0]
    );
  }

  function setHourlyLoading(point) {
    const title = document.getElementById("hourlyForecastTitle");
    const text = document.getElementById("hourlyForecastText");
    const icon = document.getElementById("hourlyForecastIcon");
    const strip = document.getElementById("hourlyForecastStrip");
    const status = document.getElementById("hourlyForecastStatus");

    if (title) title.textContent = `Loading ${point.name} hourly forecast...`;
    if (text) text.textContent = `Checking hourly forecast near ${point.place}.`;
    if (icon) icon.textContent = "⏳";
    if (strip) strip.innerHTML = "";
    if (status) status.textContent = "Loading official NWS hourly forecast data...";
  }

  function setHourlyError(point) {
    const title = document.getElementById("hourlyForecastTitle");
    const text = document.getElementById("hourlyForecastText");
    const icon = document.getElementById("hourlyForecastIcon");
    const strip = document.getElementById("hourlyForecastStrip");
    const status = document.getElementById("hourlyForecastStatus");

    if (title) title.textContent = "Hourly forecast unavailable";
    if (text) text.textContent = `The app could not load hourly data near ${point.place}.`;
    if (icon) icon.textContent = "⚠️";
    if (strip) {
      strip.innerHTML = `
        <div class="hourly-card">
          <span class="hourly-time">NWS</span>
          <span class="hourly-icon">⚠️</span>
          <strong>Error</strong>
          <small>Try refreshing again.</small>
        </div>
      `;
    }
    if (status) status.textContent = "Live hourly forecast could not load.";
  }

  function renderHourlyForecast(periods, point, sourceOffice) {
    const title = document.getElementById("hourlyForecastTitle");
    const text = document.getElementById("hourlyForecastText");
    const icon = document.getElementById("hourlyForecastIcon");
    const strip = document.getElementById("hourlyForecastStrip");
    const status = document.getElementById("hourlyForecastStatus");

    if (!periods || periods.length === 0) {
      setHourlyError(point);
      return;
    }

    const first = periods[0];

    if (title) {
      title.textContent = `${point.name} hourly outlook`;
    }

    if (text) {
      text.textContent = `${first.shortForecast || "Hourly forecast"} near ${point.place}.`;
    }

    if (icon) {
      icon.textContent = getHourlyIcon(first.shortForecast);
    }

    if (strip) {
      strip.innerHTML = "";

      periods.slice(0, 12).forEach((period) => {
        const card = document.createElement("div");
        card.className = "hourly-card";

        card.innerHTML = `
          <span class="hourly-time">${safeHourlyText(formatHour(period.startTime))}</span>
          <span class="hourly-icon">${safeHourlyText(getHourlyIcon(period.shortForecast))}</span>
          <strong>${safeHourlyText(String(period.temperature))}°${safeHourlyText(period.temperatureUnit || "F")}</strong>
          <small>${safeHourlyText(period.shortForecast || "Forecast")}</small>
          <small>💨 ${safeHourlyText(period.windSpeed || "Wind N/A")}</small>
        `;

        strip.appendChild(card);
      });
    }

    const checkedTime = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    if (status) {
      status.textContent =
        `Official hourly NWS forecast near ${point.place}. Checked ${checkedTime}. ${
          sourceOffice ? `Office: ${sourceOffice}.` : ""
        }`;
    }
  }

  async function loadHourlyForecast() {
    const point = getSelectedHourlyPoint();

    localStorage.setItem("mdwa_live_forecast_county", point.name);

    setHourlyLoading(point);

    try {
      const pointsUrl = `https://api.weather.gov/points/${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;

      const pointResponse = await fetch(pointsUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!pointResponse.ok) {
        throw new Error(`NWS hourly point request failed: ${pointResponse.status}`);
      }

      const pointData = await pointResponse.json();
      const hourlyUrl = pointData.properties?.forecastHourly;
      const sourceOffice = pointData.properties?.cwa || "";

      if (!hourlyUrl) {
        throw new Error("NWS hourly forecast URL missing.");
      }

      const hourlyResponse = await fetch(hourlyUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!hourlyResponse.ok) {
        throw new Error(`NWS hourly forecast request failed: ${hourlyResponse.status}`);
      }

      const hourlyData = await hourlyResponse.json();
      const periods = hourlyData.properties?.periods || [];

      renderHourlyForecast(periods, point, sourceOffice);

      if (typeof showToast === "function") {
        showToast(`Hourly forecast loaded for ${point.name}.`);
      }
    } catch (error) {
      console.error("Hourly forecast failed:", error);
      setHourlyError(point);

      if (typeof showToast === "function") {
        showToast("Hourly forecast could not load.");
      }
    }
  }

  createHourlyForecastCard();
  populateHourlySelect();

  const select = document.getElementById("hourlyForecastCountySelect");
  const refreshBtn = document.getElementById("hourlyForecastRefreshBtn");

  if (select) {
    select.addEventListener("change", () => {
      loadHourlyForecast();

      const liveForecastSelect = document.getElementById("liveForecastCountySelect");
      const homeForecastSelect = document.getElementById("homeForecastCountySelect");

      if (liveForecastSelect) liveForecastSelect.value = select.value;
      if (homeForecastSelect) homeForecastSelect.value = select.value;
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadHourlyForecast);
  }

  const liveForecastSelect = document.getElementById("liveForecastCountySelect");

  if (liveForecastSelect) {
    liveForecastSelect.addEventListener("change", () => {
      if (select) {
        select.value = liveForecastSelect.value;
        loadHourlyForecast();
      }
    });
  }

  loadHourlyForecast();
})();/* Version 1.9 - Live current conditions */

(function mdwaLiveCurrentConditions() {
  const forecastScreen = document.getElementById("forecast");

  if (!forecastScreen) return;

  const conditionPoints = [
    { name: "Allegany", place: "Cumberland", lat: 39.6529, lon: -78.7625 },
    { name: "Anne Arundel", place: "Annapolis", lat: 38.9784, lon: -76.4922 },
    { name: "Baltimore City", place: "Baltimore", lat: 39.2904, lon: -76.6122 },
    { name: "Baltimore County", place: "Towson", lat: 39.4015, lon: -76.6019 },
    { name: "Calvert", place: "Prince Frederick", lat: 38.5404, lon: -76.5844 },
    { name: "Caroline", place: "Denton", lat: 38.8846, lon: -75.8272 },
    { name: "Carroll", place: "Westminster", lat: 39.5754, lon: -76.9958 },
    { name: "Cecil", place: "Elkton", lat: 39.6068, lon: -75.8333 },
    { name: "Charles", place: "La Plata", lat: 38.5293, lon: -76.9753 },
    { name: "Dorchester", place: "Cambridge", lat: 38.5632, lon: -76.0788 },
    { name: "Frederick", place: "Frederick", lat: 39.4143, lon: -77.4105 },
    { name: "Garrett", place: "Oakland", lat: 39.4079, lon: -79.4067 },
    { name: "Harford", place: "Bel Air", lat: 39.5359, lon: -76.3483 },
    { name: "Howard", place: "Columbia", lat: 39.2037, lon: -76.8610 },
    { name: "Kent", place: "Chestertown", lat: 39.2189, lon: -76.0690 },
    { name: "Montgomery", place: "Rockville", lat: 39.0840, lon: -77.1528 },
    { name: "Prince George’s", place: "Upper Marlboro", lat: 38.8159, lon: -76.7497 },
    { name: "Queen Anne’s", place: "Centreville", lat: 39.0418, lon: -76.0663 },
    { name: "Somerset", place: "Princess Anne", lat: 38.2029, lon: -75.6924 },
    { name: "St. Mary’s", place: "Leonardtown", lat: 38.2912, lon: -76.6358 },
    { name: "Talbot", place: "Easton", lat: 38.7743, lon: -76.0763 },
    { name: "Washington", place: "Hagerstown", lat: 39.6418, lon: -77.7200 },
    { name: "Wicomico", place: "Salisbury", lat: 38.3607, lon: -75.5994 },
    { name: "Worcester", place: "Ocean City", lat: 38.3365, lon: -75.0849 },
  ];

  function safeConditionText(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  function celsiusToFahrenheit(value) {
    if (typeof value !== "number") return null;
    return Math.round((value * 9) / 5 + 32);
  }

  function metersPerSecondToMph(value) {
    if (typeof value !== "number") return null;
    return Math.round(value * 2.23694);
  }

  function metersToMiles(value) {
    if (typeof value !== "number") return null;
    return Math.round(value / 1609.344);
  }

  function getConditionIcon(text) {
    const condition = (text || "").toLowerCase();

    if (condition.includes("thunder")) return "⛈️";
    if (condition.includes("rain") || condition.includes("shower")) return "🌧️";
    if (condition.includes("snow") || condition.includes("ice") || condition.includes("sleet")) return "❄️";
    if (condition.includes("fog") || condition.includes("mist") || condition.includes("haze")) return "🌫️";
    if (condition.includes("cloud") || condition.includes("overcast")) return "☁️";
    if (condition.includes("clear") || condition.includes("sun")) return "☀️";

    return "🌡️";
  }

  function createCurrentConditionsCard() {
    let card = document.getElementById("liveCurrentConditionsCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card current-conditions-card";
    card.id = "liveCurrentConditionsCard";

    card.innerHTML = `
      <div class="current-conditions-top">
        <div class="current-conditions-copy">
          <p class="eyebrow">Current Conditions</p>
          <h3 id="currentConditionsTitle">Checking conditions...</h3>
          <p id="currentConditionsText">Loading nearby observation data from the National Weather Service.</p>
        </div>

        <div class="current-conditions-icon" id="currentConditionsIcon">⏳</div>
      </div>

      <div class="current-conditions-controls">
        <select class="current-conditions-select" id="currentConditionsCountySelect"></select>

        <div class="current-conditions-actions">
          <button class="current-conditions-btn primary" id="currentConditionsRefreshBtn" type="button">
            Refresh Conditions
          </button>

          <button class="current-conditions-btn secondary" id="currentConditionsLocationBtn" type="button">
            Use My Location
          </button>
        </div>
      </div>

      <div class="current-conditions-main" id="currentConditionsMain">
        <div class="current-conditions-temp-row">
          <div class="current-conditions-temp" id="currentConditionsTemp">--°</div>

          <div class="current-conditions-label">
            <strong id="currentConditionsLabel">Loading</strong>
            <small id="currentConditionsStation">Station pending</small>
          </div>
        </div>

        <div class="current-conditions-grid">
          <div class="current-condition-mini">
            <span>Wind</span>
            <strong id="currentConditionsWind">Loading</strong>
          </div>

          <div class="current-condition-mini">
            <span>Humidity</span>
            <strong id="currentConditionsHumidity">Loading</strong>
          </div>

          <div class="current-condition-mini">
            <span>Dew Point</span>
            <strong id="currentConditionsDewpoint">Loading</strong>
          </div>

          <div class="current-condition-mini">
            <span>Visibility</span>
            <strong id="currentConditionsVisibility">Loading</strong>
          </div>
        </div>
      </div>

      <p class="current-conditions-status" id="currentConditionsStatus">
        Current conditions are based on nearby NWS observation stations and may vary locally.
      </p>
    `;

    const liveForecastCard = document.getElementById("liveNwsForecastCard");

    if (liveForecastCard && liveForecastCard.parentElement === forecastScreen) {
      forecastScreen.insertBefore(card, liveForecastCard);
      return card;
    }

    const pageTitle = forecastScreen.querySelector(".page-title");

    if (pageTitle) {
      pageTitle.insertAdjacentElement("afterend", card);
    } else {
      forecastScreen.prepend(card);
    }

    return card;
  }

  function populateCurrentConditionsSelect() {
    const select = document.getElementById("currentConditionsCountySelect");

    if (!select) return;

    select.innerHTML = "";

    conditionPoints.forEach((point) => {
      const option = document.createElement("option");
      option.value = point.name;
      option.textContent = `${point.name} — ${point.place}`;
      select.appendChild(option);
    });

    const savedCounty =
      localStorage.getItem("mdwa_live_forecast_county") || "Harford";

    const savedExists = conditionPoints.some((point) => point.name === savedCounty);

    select.value = savedExists ? savedCounty : "Harford";
  }

  function getSelectedConditionPoint() {
    const select = document.getElementById("currentConditionsCountySelect");
    const selectedCounty = select ? select.value : "Harford";

    return (
      conditionPoints.find((point) => point.name === selectedCounty) ||
      conditionPoints.find((point) => point.name === "Harford") ||
      conditionPoints[0]
    );
  }

  function setCurrentConditionsStatus(message) {
    const status = document.getElementById("currentConditionsStatus");
    if (status) status.textContent = message;
  }

  function setCurrentConditionsLoading(pointLabel) {
    document.getElementById("currentConditionsTitle").textContent =
      `Checking ${pointLabel} conditions...`;
    document.getElementById("currentConditionsText").textContent =
      "Loading the nearest official observation station.";
    document.getElementById("currentConditionsIcon").textContent = "⏳";
    document.getElementById("currentConditionsTemp").textContent = "--°";
    document.getElementById("currentConditionsLabel").textContent = "Loading";
    document.getElementById("currentConditionsStation").textContent =
      "Station pending";
    document.getElementById("currentConditionsWind").textContent = "Loading";
    document.getElementById("currentConditionsHumidity").textContent = "Loading";
    document.getElementById("currentConditionsDewpoint").textContent = "Loading";
    document.getElementById("currentConditionsVisibility").textContent = "Loading";

    setCurrentConditionsStatus("Loading official NWS current conditions...");
  }

  function setCurrentConditionsError(pointLabel) {
    document.getElementById("currentConditionsTitle").textContent =
      "Conditions unavailable";
    document.getElementById("currentConditionsText").textContent =
      `The app could not load current conditions for ${pointLabel}.`;
    document.getElementById("currentConditionsIcon").textContent = "⚠️";
    document.getElementById("currentConditionsTemp").textContent = "--°";
    document.getElementById("currentConditionsLabel").textContent = "NWS error";
    document.getElementById("currentConditionsStation").textContent =
      "Try refreshing";
    document.getElementById("currentConditionsWind").textContent = "Unavailable";
    document.getElementById("currentConditionsHumidity").textContent =
      "Unavailable";
    document.getElementById("currentConditionsDewpoint").textContent =
      "Unavailable";
    document.getElementById("currentConditionsVisibility").textContent =
      "Unavailable";

    setCurrentConditionsStatus(
      "Current conditions could not load. Some NWS stations may be temporarily unavailable."
    );
  }

  function renderCurrentConditions(observation, stationName, pointLabel) {
    const props = observation.properties || {};

    const tempF = celsiusToFahrenheit(props.temperature?.value);
    const dewF = celsiusToFahrenheit(props.dewpoint?.value);
    const windMph = metersPerSecondToMph(props.windSpeed?.value);
    const gustMph = metersPerSecondToMph(props.windGust?.value);
    const visibilityMiles = metersToMiles(props.visibility?.value);

    const humidity =
      typeof props.relativeHumidity?.value === "number"
        ? `${Math.round(props.relativeHumidity.value)}%`
        : "Not listed";

    const conditionText = props.textDescription || "Current conditions";

    const windText =
      windMph === null
        ? "Not listed"
        : gustMph
          ? `${windMph} mph, gusts ${gustMph}`
          : `${windMph} mph`;

    const checkedTime = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    document.getElementById("currentConditionsTitle").textContent =
      `${pointLabel} now`;

    document.getElementById("currentConditionsText").textContent =
      conditionText;

    document.getElementById("currentConditionsIcon").textContent =
      getConditionIcon(conditionText);

    document.getElementById("currentConditionsTemp").textContent =
      tempF === null ? "--°" : `${tempF}°`;

    document.getElementById("currentConditionsLabel").textContent =
      conditionText;

    document.getElementById("currentConditionsStation").textContent =
      stationName || "Nearby NWS station";

    document.getElementById("currentConditionsWind").textContent = windText;

    document.getElementById("currentConditionsHumidity").textContent = humidity;

    document.getElementById("currentConditionsDewpoint").textContent =
      dewF === null ? "Not listed" : `${dewF}°`;

    document.getElementById("currentConditionsVisibility").textContent =
      visibilityMiles === null ? "Not listed" : `${visibilityMiles} mi`;

    setCurrentConditionsStatus(
      `Official observation loaded for ${pointLabel}. Checked ${checkedTime}.`
    );
  }

  async function loadCurrentConditionsForPoint(point, customLabel) {
    const pointLabel = customLabel || `${point.name} County`;

    localStorage.setItem("mdwa_live_forecast_county", point.name);

    setCurrentConditionsLoading(pointLabel);

    try {
      const pointsUrl = `https://api.weather.gov/points/${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;

      const pointResponse = await fetch(pointsUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!pointResponse.ok) {
        throw new Error(`NWS point request failed: ${pointResponse.status}`);
      }

      const pointData = await pointResponse.json();
      const stationsUrl = pointData.properties?.observationStations;

      if (!stationsUrl) {
        throw new Error("NWS observation station URL missing.");
      }

      const stationsResponse = await fetch(stationsUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!stationsResponse.ok) {
        throw new Error(`NWS stations request failed: ${stationsResponse.status}`);
      }

      const stationsData = await stationsResponse.json();
      const station = stationsData.features?.[0];

      if (!station) {
        throw new Error("No nearby NWS station found.");
      }

      const stationId = station.properties?.stationIdentifier;
      const stationName = station.properties?.name || stationId || "Nearby NWS station";

      if (!stationId) {
        throw new Error("NWS station identifier missing.");
      }

      const latestObservationUrl =
        `https://api.weather.gov/stations/${stationId}/observations/latest`;

      const observationResponse = await fetch(latestObservationUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!observationResponse.ok) {
        throw new Error(
          `NWS latest observation request failed: ${observationResponse.status}`
        );
      }

      const observationData = await observationResponse.json();

      renderCurrentConditions(observationData, stationName, pointLabel);

      if (typeof showToast === "function") {
        showToast(`Current conditions loaded for ${pointLabel}.`);
      }
    } catch (error) {
      console.error("Current conditions failed:", error);
      setCurrentConditionsError(pointLabel);

      if (typeof showToast === "function") {
        showToast("Current conditions could not load.");
      }
    }
  }

  function loadSelectedCurrentConditions() {
    const point = getSelectedConditionPoint();
    loadCurrentConditionsForPoint(point, `${point.name} County`);
  }

  function useMyLocationCurrentConditions() {
    if (!navigator.geolocation) {
      setCurrentConditionsStatus("Location is not supported by this browser.");
      return;
    }

    setCurrentConditionsStatus("Requesting your location for current conditions...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          name: "Your Location",
          place: "Current Location",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        loadCurrentConditionsForPoint(point, "your location");
      },
      () => {
        setCurrentConditionsStatus("Location permission was denied or unavailable.");

        if (typeof showToast === "function") {
          showToast("Location was not available.");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000,
      }
    );
  }

  createCurrentConditionsCard();
  populateCurrentConditionsSelect();

  const select = document.getElementById("currentConditionsCountySelect");
  const refreshBtn = document.getElementById("currentConditionsRefreshBtn");
  const locationBtn = document.getElementById("currentConditionsLocationBtn");

  if (select) {
    select.addEventListener("change", () => {
      loadSelectedCurrentConditions();

      const liveForecastSelect = document.getElementById("liveForecastCountySelect");
      const hourlySelect = document.getElementById("hourlyForecastCountySelect");
      const homeForecastSelect = document.getElementById("homeForecastCountySelect");

      if (liveForecastSelect) liveForecastSelect.value = select.value;
      if (hourlySelect) hourlySelect.value = select.value;
      if (homeForecastSelect) homeForecastSelect.value = select.value;
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadSelectedCurrentConditions);
  }

  if (locationBtn) {
    locationBtn.addEventListener("click", useMyLocationCurrentConditions);
  }

  const liveForecastSelect = document.getElementById("liveForecastCountySelect");

  if (liveForecastSelect) {
    liveForecastSelect.addEventListener("change", () => {
      if (select) {
        select.value = liveForecastSelect.value;
        loadSelectedCurrentConditions();
      }
    });
  }

  loadSelectedCurrentConditions();
})();
/* Version 2.1.6 - Safe home layout cleanup */

(function mdwaSafeHomeLayoutCleanup() {
  const home = document.getElementById("home");

  if (!home) return;

  function removeEmptyMoreHome() {
    const morePanel = document.getElementById("homeMorePanel");

    if (morePanel) {
      morePanel.remove();
    }

    const moreChip = document.querySelector(
      '#homeDashboardNav [data-home-panel="homeMorePanel"]'
    );

    if (moreChip) {
      moreChip.remove();
    }
  }

  function compactHomeForecastCard() {
    const forecastCard = document.getElementById("homeLiveForecastCard");

    if (!forecastCard) return;

    forecastCard.classList.add("home-forecast-safe-compact");

    let expandBtn = document.getElementById("homeForecastSafeExpandBtn");

    if (expandBtn) return;

    expandBtn = document.createElement("button");
    expandBtn.id = "homeForecastSafeExpandBtn";
    expandBtn.className = "home-safe-expand-btn";
    expandBtn.type = "button";
    expandBtn.textContent = "Show Forecast Details";

    expandBtn.addEventListener("click", () => {
      forecastCard.classList.toggle("expanded");

      expandBtn.textContent = forecastCard.classList.contains("expanded")
        ? "Hide Forecast Details"
        : "Show Forecast Details";
    });

    forecastCard.appendChild(expandBtn);
  }

  function safeHomeCleanup() {
    removeEmptyMoreHome();
    compactHomeForecastCard();
  }

  safeHomeCleanup();

  // Run again after live cards finish loading.
  setTimeout(safeHomeCleanup, 800);
  setTimeout(safeHomeCleanup, 1800);
})();
/* Version 2.1.7 - More tab interactive cards */

(function mdwaMoreTabInteractiveCards() {
  const moreScreen = document.getElementById("more");

  if (!moreScreen) return;

  const MDWA_WEBSITE_URL = "https://mdweatheralerts.com";
  const APP_VERSION = "2.2";

  function showMoreToast(message) {
    if (typeof showToast === "function") {
      showToast(message);
    }
  }

  function normalizeText(text) {
    return (text || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function findMoreCardByText(searchText) {
    const target = normalizeText(searchText);

    const candidates = Array.from(
      moreScreen.querySelectorAll(
        ".section-card, button, a, div, li"
      )
    );

    return (
      candidates.find((element) => {
        const text = normalizeText(element.textContent);

        if (!text.includes(target)) return false;
        if (element.closest(".more-info-panel")) return false;

        const directCard =
          element.classList.contains("section-card") ||
          element.tagName === "BUTTON" ||
          element.tagName === "A" ||
          element.parentElement === moreScreen;

        return directCard;
      }) || null
    );
  }

  function makeCardLookClickable(card, type) {
    if (!card) return;

    card.classList.add("more-interactive-card");
    card.dataset.moreCardType = type;

    if (!card.querySelector(".more-card-chevron") && type !== "website") {
      const chevron = document.createElement("span");
      chevron.className = "more-card-chevron";
      chevron.textContent = "⌄";
      card.appendChild(chevron);
    }

    if (!card.querySelector(".more-card-chevron") && type === "website") {
      const chevron = document.createElement("span");
      chevron.className = "more-card-chevron";
      chevron.textContent = "↗";
      card.appendChild(chevron);
    }
  }

  function createPanel(id, html) {
    let panel = document.getElementById(id);

    if (panel) return panel;

    panel = document.createElement("div");
    panel.className = "more-info-panel";
    panel.id = id;
    panel.innerHTML = html;

    return panel;
  }

  async function copyText(text, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showMoreToast(successMessage);
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();

      showMoreToast(successMessage);
    } catch (error) {
      alert(text);
    }
  }

  function getAppLink() {
    return window.location.href.split("#")[0];
  }

  function openWebsite() {
    window.open(MDWA_WEBSITE_URL, "_blank", "noopener,noreferrer");
  }

  function shareApp() {
    const shareText =
      "Check out the MD Weather Alerts app for Maryland forecasts, alerts, radar, and local reports.";

    if (navigator.share) {
      navigator
        .share({
          title: "MD Weather Alerts",
          text: shareText,
          url: getAppLink(),
        })
        .catch(() => {});
      return;
    }

    copyText(`${shareText}\n${getAppLink()}`, "App link copied.");
  }

  function closeOtherPanels(activePanel) {
    moreScreen.querySelectorAll(".more-info-panel").forEach((panel) => {
      if (panel !== activePanel) {
        panel.classList.remove("open");
      }
    });

    moreScreen.querySelectorAll(".more-interactive-card").forEach((card) => {
      const type = card.dataset.moreCardType;
      const panel = document.getElementById(`more${type}Panel`);

      if (panel !== activePanel) {
        card.classList.remove("is-open");
      }
    });
  }

  function togglePanel(card, panel) {
    if (!card || !panel) return;

    const willOpen = !panel.classList.contains("open");

    closeOtherPanels(panel);

    panel.classList.toggle("open", willOpen);
    card.classList.toggle("is-open", willOpen);
  }

  function setupSupportCard() {
    const card = findMoreCardByText("Support MD Weather Alerts");

    if (!card) return;

    makeCardLookClickable(card, "Support");

    const panel = createPanel(
      "moreSupportPanel",
      `
        <h3>Support MD Weather Alerts</h3>
        <p>
          The easiest way to support the app is to share it, subscribe by email,
          and send feedback while it is still being built.
        </p>

        <div class="more-info-list">
          <div class="more-info-row">
            <span>📲</span>
            <div>
              <strong>Share the app</strong>
              <small>Send the live app link to other Marylanders who follow weather updates.</small>
            </div>
          </div>

          <div class="more-info-row">
            <span>✉️</span>
            <div>
              <strong>Subscribe by email</strong>
              <small>Email subscribers help support the website and future app features.</small>
            </div>
          </div>

          <div class="more-info-row">
            <span>🧪</span>
            <div>
              <strong>Send feedback</strong>
              <small>Testing feedback helps improve the layout, speed, and reliability.</small>
            </div>
          </div>
        </div>

        <div class="more-info-actions">
          <button class="more-info-btn primary" type="button" data-more-action="share">
            Share App
          </button>

          <button class="more-info-btn secondary" type="button" data-more-action="copy-link">
            Copy Link
          </button>

          <button class="more-info-btn secondary full" type="button" data-more-action="open-website">
            Visit Website
          </button>
        </div>
      `
    );

    card.insertAdjacentElement("afterend", panel);

    card.addEventListener("click", () => {
      togglePanel(card, panel);
    });
  }

  function setupWebsiteCard() {
    const card = findMoreCardByText("Visit Website");

    if (!card) return;

    makeCardLookClickable(card, "website");

    card.addEventListener("click", (event) => {
      event.preventDefault();
      openWebsite();
    });
  }

  function setupSubscribeCard() {
    const card = findMoreCardByText("Subscribe by Email");

    if (!card) return;

    makeCardLookClickable(card, "Subscribe");

    const panel = createPanel(
      "moreSubscribePanel",
      `
        <h3>Subscribe by Email</h3>
        <p>
          Email updates are one of the best ways to support MD Weather Alerts.
          The app will send users to the website to subscribe.
        </p>

        <div class="more-info-list">
          <div class="more-info-row">
            <span>📬</span>
            <div>
              <strong>One email list</strong>
              <small>Used for MD Weather Alerts updates, posts, and future app announcements.</small>
            </div>
          </div>

          <div class="more-info-row">
            <span>🔒</span>
            <div>
              <strong>Simple support</strong>
              <small>No complicated account setup inside the app right now.</small>
            </div>
          </div>
        </div>

        <div class="more-info-actions">
          <button class="more-info-btn primary full" type="button" data-more-action="open-website">
            Open Website to Subscribe
          </button>
        </div>
      `
    );

    card.insertAdjacentElement("afterend", panel);

    card.addEventListener("click", () => {
      togglePanel(card, panel);
    });
  }

  function setupAboutCard() {
    const card = findMoreCardByText("About This App");

    if (!card) return;

    makeCardLookClickable(card, "About");

    const panel = createPanel(
      "moreAboutPanel",
      `
        <h3>About This App</h3>
        <p>
          MD Weather Alerts is a Maryland-first weather app focused on clear alerts,
          forecasts, radar tools, blog posts, and community reports.
        </p>

        <div class="more-info-list">
          <div class="more-info-row">
            <span>🌦️</span>
            <div>
              <strong>Maryland-focused</strong>
              <small>Built around Maryland counties, regions, and local weather impacts.</small>
            </div>
          </div>

          <div class="more-info-row">
            <span>🏢</span>
            <div>
              <strong>Official data</strong>
              <small>Live alerts and forecasts use National Weather Service data when available.</small>
            </div>
          </div>

          <div class="more-info-row">
            <span>📍</span>
            <div>
              <strong>Community reports</strong>
              <small>Local reports are designed for current conditions and approximate location privacy.</small>
            </div>
          </div>

          <div class="more-info-row">
            <span>📲</span>
            <div>
              <strong>App version</strong>
              <small>Current test build: Version ${APP_VERSION}</small>
            </div>
          </div>
        </div>

        <div class="more-info-actions">
          <button class="more-info-btn secondary full" type="button" data-more-action="copy-feedback">
            Copy Feedback Template
          </button>
        </div>
      `
    );

    card.insertAdjacentElement("afterend", panel);

    card.addEventListener("click", () => {
      togglePanel(card, panel);
    });
  }

  moreScreen.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-more-action]");

    if (!actionButton) return;

    event.stopPropagation();

    const action = actionButton.dataset.moreAction;

    if (action === "share") {
      shareApp();
    }

    if (action === "copy-link") {
      copyText(getAppLink(), "App link copied.");
    }

    if (action === "open-website") {
      openWebsite();
    }

    if (action === "copy-feedback") {
      const feedbackText = [
        "MD Weather Alerts App Feedback",
        "",
        "Device/browser:",
        "",
        "What worked well:",
        "",
        "What was confusing or broken:",
        "",
        "Feature idea:",
        "",
        `App version: ${APP_VERSION}`,
        `App link: ${getAppLink()}`,
      ].join("\n");

      copyText(feedbackText, "Feedback template copied.");
    }
  });

  setupSupportCard();
  setupWebsiteCard();
  setupSubscribeCard();
  setupAboutCard();
})();/* Version 2.1.8 - Contact and feedback button */

(function mdwaContactFeedbackButton() {
  const moreScreen = document.getElementById("more");

  if (!moreScreen) return;

  // Replace this with the email address you want app feedback sent to.
  const MDWA_FEEDBACK_EMAIL = "mdweatheralerts@gmail.com";
  const APP_VERSION = "2.2";

  function showFeedbackToast(message) {
    if (typeof showToast === "function") {
      showToast(message);
    }
  }

  function getAppLink() {
    return window.location.href.split("#")[0];
  }

  function getFeedbackTemplate() {
    return [
      "MD Weather Alerts App Feedback",
      "",
      `App version: ${APP_VERSION}`,
      `App link: ${getAppLink()}`,
      "",
      "Device/browser:",
      "",
      "What worked well:",
      "",
      "What was confusing or broken:",
      "",
      "Feature idea:",
      "",
      "Other notes:",
    ].join("\n");
  }

  async function copyText(text, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showFeedbackToast(successMessage);
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();

      showFeedbackToast(successMessage);
    } catch (error) {
      alert(text);
    }
  }

  function openFeedbackEmail() {
    const feedbackTemplate = getFeedbackTemplate();

    if (
      !MDWA_FEEDBACK_EMAIL ||
      MDWA_FEEDBACK_EMAIL === "REPLACE_WITH_YOUR_EMAIL"
    ) {
      copyText(
        feedbackTemplate,
        "Feedback template copied. Add your feedback email in the code later."
      );
      return;
    }

    const subject = encodeURIComponent("MD Weather Alerts App Feedback");
    const body = encodeURIComponent(feedbackTemplate);

    window.location.href = `mailto:${MDWA_FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
  }

  function createFeedbackContactCard() {
    let card = document.getElementById("mdwaFeedbackContactCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card feedback-contact-card";
    card.id = "mdwaFeedbackContactCard";

    card.innerHTML = `
      <div class="feedback-contact-hero">
        <div class="feedback-contact-copy">
          <p class="eyebrow">App Feedback</p>
          <h3>Contact MD Weather Alerts</h3>
          <p>Send feedback, report a bug, or suggest a feature for the app.</p>
        </div>

        <div class="feedback-contact-icon">💬</div>
      </div>

      <div class="feedback-contact-actions">
        <button class="feedback-contact-btn primary" id="mdwaEmailFeedbackBtn" type="button">
          Email Feedback
        </button>

        <button class="feedback-contact-btn secondary" id="mdwaCopyFeedbackTemplateBtn" type="button">
          Copy Template
        </button>

        <button class="feedback-contact-btn secondary full" id="mdwaCopyFeedbackLinkBtn" type="button">
          Copy App Link
        </button>
      </div>

      <p class="feedback-contact-note">
        Feedback helps improve the app while it is still in testing. The email button opens your device’s email app with a pre-filled message.
      </p>
    `;

    return card;
  }

  function placeFeedbackContactCard() {
    const card = createFeedbackContactCard();

    const shareCard = document.getElementById("mdwaShareAppCard");
    const aboutPanel = document.getElementById("moreAboutPanel");
    const appInfoCard = document.getElementById("mdwaAppInfoCard");
    const forecastBlog = document.getElementById("moreBlogPosts");
    const forecastBlogCard = forecastBlog
      ? forecastBlog.closest(".section-card")
      : null;

    if (shareCard && shareCard.parentElement === moreScreen) {
      shareCard.insertAdjacentElement("afterend", card);
      return;
    }

    if (aboutPanel && aboutPanel.parentElement === moreScreen) {
      aboutPanel.insertAdjacentElement("afterend", card);
      return;
    }

    if (appInfoCard && appInfoCard.parentElement === moreScreen) {
      appInfoCard.insertAdjacentElement("afterend", card);
      return;
    }

    if (forecastBlogCard) {
      moreScreen.insertBefore(card, forecastBlogCard);
      return;
    }

    moreScreen.appendChild(card);
  }

  placeFeedbackContactCard();

  const emailBtn = document.getElementById("mdwaEmailFeedbackBtn");
  const copyTemplateBtn = document.getElementById("mdwaCopyFeedbackTemplateBtn");
  const copyLinkBtn = document.getElementById("mdwaCopyFeedbackLinkBtn");

  if (emailBtn) {
    emailBtn.addEventListener("click", openFeedbackEmail);
  }

  if (copyTemplateBtn) {
    copyTemplateBtn.addEventListener("click", () => {
      copyText(getFeedbackTemplate(), "Feedback template copied.");
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      copyText(getAppLink(), "App link copied.");
    });
  }
})();
/* Version 2.2 - Live app launch polish */

(function mdwaLiveAppLaunchPolish() {
  const moreScreen = document.getElementById("more");

  if (!moreScreen) return;

  const APP_VERSION = "2.2";

  function showLaunchToast(message) {
    if (typeof showToast === "function") {
      showToast(message);
    }
  }

  function getAppLink() {
    return window.location.href.split("#")[0].split("?")[0];
  }

  function hasSavedAppData() {
    return Object.keys(localStorage).some((key) => key.startsWith("mdwa_"));
  }

  function getSavedDataLabel() {
    return hasSavedAppData() ? "Saved locally" : "No saved data";
  }

  async function copyText(text, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showLaunchToast(successMessage);
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();

      showLaunchToast(successMessage);
    } catch (error) {
      alert(text);
    }
  }

  function createBetaLaunchCard() {
    let card = document.getElementById("mdwaBetaLaunchCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card beta-launch-card";
    card.id = "mdwaBetaLaunchCard";

    card.innerHTML = `
      <div class="beta-launch-hero">
        <div class="beta-launch-copy">
          <p class="eyebrow">Beta Test Build</p>
          <h3>Live App Launch Center</h3>
          <p>Use these tools before sharing the app with testers.</p>
        </div>

        <div class="beta-launch-icon">🚀</div>
      </div>

      <div class="beta-status-grid">
        <div class="beta-status-pill">
          <span>App Version</span>
          <strong id="betaAppVersion">Version ${APP_VERSION}</strong>
        </div>

        <div class="beta-status-pill">
          <span>Connection</span>
          <strong id="betaOnlineStatus">Checking</strong>
        </div>

        <div class="beta-status-pill">
          <span>Saved Data</span>
          <strong id="betaSavedDataStatus">Checking</strong>
        </div>

        <div class="beta-status-pill">
          <span>Install Support</span>
          <strong id="betaInstallStatus">Checking</strong>
        </div>
      </div>

      <div class="beta-launch-actions">
        <button class="beta-launch-btn primary" id="betaRefreshAppBtn" type="button">
          Refresh App Data
        </button>

        <button class="beta-launch-btn secondary" id="betaCopyChecklistBtn" type="button">
          Copy Test Checklist
        </button>

        <button class="beta-launch-btn secondary" id="betaCopyLiveLinkBtn" type="button">
          Copy Live Link
        </button>

        <button class="beta-launch-btn secondary" id="betaRecheckStatusBtn" type="button">
          Recheck Status
        </button>

        <button class="beta-launch-btn danger" id="betaClearSavedDataBtn" type="button">
          Clear Saved App Data
        </button>
      </div>

      <p class="beta-launch-note">
        This is a beta/test build. Live weather data comes from official National Weather Service feeds when available.
        Community reports and app settings may save locally on this device.
      </p>
    `;

    return card;
  }

  function updateVisibleVersionText() {
    const versionTargets = [
      ".app-version-badge",
      "#betaAppVersion",
    ];

    versionTargets.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.textContent = `Version ${APP_VERSION}`;
      });
    });

    moreScreen.querySelectorAll("small, p, span, strong").forEach((element) => {
      const text = element.textContent;

      if (!text) return;

      if (
        text.includes("Version 1.3") ||
        text.includes("Version 2.1.7") ||
        text.includes("Version 2.1.8")
      ) {
        element.textContent = text
          .replace("Version 1.3", `Version ${APP_VERSION}`)
          .replace("Version 2.1.7", `Version ${APP_VERSION}`)
          .replace("Version 2.1.8", `Version ${APP_VERSION}`);
      }
    });
  }

  function updateBetaStatus() {
    const onlineStatus = document.getElementById("betaOnlineStatus");
    const savedDataStatus = document.getElementById("betaSavedDataStatus");
    const installStatus = document.getElementById("betaInstallStatus");

    if (onlineStatus) {
      onlineStatus.textContent = navigator.onLine ? "Online" : "Offline";
    }

    if (savedDataStatus) {
      savedDataStatus.textContent = getSavedDataLabel();
    }

    if (installStatus) {
      installStatus.textContent =
        "serviceWorker" in navigator ? "Supported" : "Limited";
    }

    updateVisibleVersionText();
  }

  function placeBetaLaunchCard() {
    const card = createBetaLaunchCard();

    const feedbackCard = document.getElementById("mdwaFeedbackContactCard");
    const shareCard = document.getElementById("mdwaShareAppCard");
    const appInfoCard = document.getElementById("mdwaAppInfoCard");
    const forecastBlog = document.getElementById("moreBlogPosts");
    const forecastBlogCard = forecastBlog
      ? forecastBlog.closest(".section-card")
      : null;

    if (feedbackCard && feedbackCard.parentElement === moreScreen) {
      feedbackCard.insertAdjacentElement("afterend", card);
      return;
    }

    if (shareCard && shareCard.parentElement === moreScreen) {
      shareCard.insertAdjacentElement("afterend", card);
      return;
    }

    if (appInfoCard && appInfoCard.parentElement === moreScreen) {
      appInfoCard.insertAdjacentElement("afterend", card);
      return;
    }

    if (forecastBlogCard) {
      moreScreen.insertBefore(card, forecastBlogCard);
      return;
    }

    moreScreen.appendChild(card);
  }

  async function refreshAppData() {
    showLaunchToast("Refreshing app data...");

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();

        await Promise.all(
          registrations.map((registration) => registration.update())
        );
      }
    } catch (error) {
      console.warn("Service worker refresh skipped:", error);
    }

    const cleanUrl = getAppLink();
    window.location.href = `${cleanUrl}?refresh=${Date.now()}`;
  }

  function clearSavedAppData() {
    const confirmClear = confirm(
      "Clear saved app data on this device? This can reset settings, saved reports, radar choices, and alert preferences."
    );

    if (!confirmClear) return;

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("mdwa_")) {
        localStorage.removeItem(key);
      }
    });

    updateBetaStatus();
    showLaunchToast("Saved app data cleared.");

    setTimeout(() => {
      window.location.reload();
    }, 800);
  }

  function copyTestChecklist() {
    const checklist = [
      "MD Weather Alerts App Test Checklist",
      "",
      `App version: ${APP_VERSION}`,
      `App link: ${getAppLink()}`,
      "",
      "Tested on device/browser:",
      "",
      "Check these tabs:",
      "✅ Home",
      "✅ Forecast",
      "✅ Reports",
      "✅ Radar",
      "✅ Alerts",
      "✅ More",
      "",
      "Check these features:",
      "✅ Live NWS alerts",
      "✅ Live forecast",
      "✅ Hourly forecast",
      "✅ Current conditions",
      "✅ Community reports",
      "✅ Report map",
      "✅ Blog preview",
      "✅ Install app card",
      "✅ Share/contact/feedback buttons",
      "✅ Dark mode",
      "",
      "Issues found:",
      "",
      "Feature ideas:",
    ].join("\n");

    copyText(checklist, "Test checklist copied.");
  }

  function setupBetaLaunchButtons() {
    const refreshBtn = document.getElementById("betaRefreshAppBtn");
    const copyChecklistBtn = document.getElementById("betaCopyChecklistBtn");
    const copyLiveLinkBtn = document.getElementById("betaCopyLiveLinkBtn");
    const recheckStatusBtn = document.getElementById("betaRecheckStatusBtn");
    const clearSavedDataBtn = document.getElementById("betaClearSavedDataBtn");

    if (refreshBtn) {
      refreshBtn.addEventListener("click", refreshAppData);
    }

    if (copyChecklistBtn) {
      copyChecklistBtn.addEventListener("click", copyTestChecklist);
    }

    if (copyLiveLinkBtn) {
      copyLiveLinkBtn.addEventListener("click", () => {
        copyText(getAppLink(), "Live app link copied.");
      });
    }

    if (recheckStatusBtn) {
      recheckStatusBtn.addEventListener("click", () => {
        updateBetaStatus();
        showLaunchToast("Launch status rechecked.");
      });
    }

    if (clearSavedDataBtn) {
      clearSavedDataBtn.addEventListener("click", clearSavedAppData);
    }
  }

  placeBetaLaunchCard();
  setupBetaLaunchButtons();
  updateBetaStatus();

  window.addEventListener("online", updateBetaStatus);
  window.addEventListener("offline", updateBetaStatus);

  setTimeout(updateVisibleVersionText, 1000);
})();
/* Version 2.3 - Home current conditions snapshot */

(function mdwaHomeCurrentConditionsSnapshot() {
  const home = document.getElementById("home");

  if (!home) return;

  const conditionPoints = [
    { name: "Allegany", place: "Cumberland", lat: 39.6529, lon: -78.7625 },
    { name: "Anne Arundel", place: "Annapolis", lat: 38.9784, lon: -76.4922 },
    { name: "Baltimore City", place: "Baltimore", lat: 39.2904, lon: -76.6122 },
    { name: "Baltimore County", place: "Towson", lat: 39.4015, lon: -76.6019 },
    { name: "Calvert", place: "Prince Frederick", lat: 38.5404, lon: -76.5844 },
    { name: "Caroline", place: "Denton", lat: 38.8846, lon: -75.8272 },
    { name: "Carroll", place: "Westminster", lat: 39.5754, lon: -76.9958 },
    { name: "Cecil", place: "Elkton", lat: 39.6068, lon: -75.8333 },
    { name: "Charles", place: "La Plata", lat: 38.5293, lon: -76.9753 },
    { name: "Dorchester", place: "Cambridge", lat: 38.5632, lon: -76.0788 },
    { name: "Frederick", place: "Frederick", lat: 39.4143, lon: -77.4105 },
    { name: "Garrett", place: "Oakland", lat: 39.4079, lon: -79.4067 },
    { name: "Harford", place: "Bel Air", lat: 39.5359, lon: -76.3483 },
    { name: "Howard", place: "Columbia", lat: 39.2037, lon: -76.8610 },
    { name: "Kent", place: "Chestertown", lat: 39.2189, lon: -76.0690 },
    { name: "Montgomery", place: "Rockville", lat: 39.0840, lon: -77.1528 },
    { name: "Prince George’s", place: "Upper Marlboro", lat: 38.8159, lon: -76.7497 },
    { name: "Queen Anne’s", place: "Centreville", lat: 39.0418, lon: -76.0663 },
    { name: "Somerset", place: "Princess Anne", lat: 38.2029, lon: -75.6924 },
    { name: "St. Mary’s", place: "Leonardtown", lat: 38.2912, lon: -76.6358 },
    { name: "Talbot", place: "Easton", lat: 38.7743, lon: -76.0763 },
    { name: "Washington", place: "Hagerstown", lat: 39.6418, lon: -77.7200 },
    { name: "Wicomico", place: "Salisbury", lat: 38.3607, lon: -75.5994 },
    { name: "Worcester", place: "Ocean City", lat: 38.3365, lon: -75.0849 },
  ];

  function celsiusToFahrenheit(value) {
    if (typeof value !== "number") return null;
    return Math.round((value * 9) / 5 + 32);
  }

  function metersPerSecondToMph(value) {
    if (typeof value !== "number") return null;
    return Math.round(value * 2.23694);
  }

  function getConditionIcon(text) {
    const condition = (text || "").toLowerCase();

    if (condition.includes("thunder")) return "⛈️";
    if (condition.includes("rain") || condition.includes("shower")) return "🌧️";
    if (condition.includes("snow") || condition.includes("ice") || condition.includes("sleet")) return "❄️";
    if (condition.includes("fog") || condition.includes("mist") || condition.includes("haze")) return "🌫️";
    if (condition.includes("cloud") || condition.includes("overcast")) return "☁️";
    if (condition.includes("clear") || condition.includes("sun")) return "☀️";

    return "🌡️";
  }

  function getSelectedHomePoint() {
    const savedCounty =
      localStorage.getItem("mdwa_live_forecast_county") || "Harford";

    return (
      conditionPoints.find((point) => point.name === savedCounty) ||
      conditionPoints.find((point) => point.name === "Harford") ||
      conditionPoints[0]
    );
  }

  function createHomeCurrentCard() {
    let card = document.getElementById("homeCurrentConditionsCard");

    if (card) return card;

    card = document.createElement("section");
    card.className = "section-card home-current-card";
    card.id = "homeCurrentConditionsCard";

    card.innerHTML = `
      <div class="home-current-main">
        <div class="home-current-copy">
          <p class="eyebrow">Current Conditions</p>
          <h3 id="homeCurrentTitle">Checking conditions...</h3>
          <p id="homeCurrentText">Loading nearby NWS observation data.</p>
        </div>

        <div class="home-current-icon" id="homeCurrentIcon">⏳</div>
      </div>

      <div class="home-current-temp-row">
        <div class="home-current-temp" id="homeCurrentTemp">--°</div>

        <div class="home-current-details">
          <strong id="homeCurrentCondition">Loading</strong>
          <small id="homeCurrentStation">Station pending</small>
        </div>
      </div>

      <div class="home-current-meta">
        <span class="home-current-pill" id="homeCurrentWind">Wind loading</span>
        <span class="home-current-pill" id="homeCurrentHumidity">Humidity loading</span>
        <span class="home-current-pill" id="homeCurrentChecked">Updating</span>
      </div>

      <div class="home-current-actions">
        <button class="home-current-btn primary" id="homeCurrentRefreshBtn" type="button">
          Refresh
        </button>

        <button class="home-current-btn secondary" id="homeCurrentForecastBtn" type="button">
          View Forecast
        </button>
      </div>

      <p class="home-current-status" id="homeCurrentStatus">
        Current conditions are based on nearby official NWS observation stations.
      </p>
    `;

    return card;
  }

  function placeHomeCurrentCard() {
    const card = createHomeCurrentCard();

    const weatherBody = document.getElementById("homeWeatherPanelBody");
    const alertCard = document.getElementById("homeLiveAlertCard");
    const forecastCard = document.getElementById("homeLiveForecastCard");
    const weatherPanel = document.getElementById("homeWeatherPanel");

    if (weatherBody) {
      if (alertCard && alertCard.parentElement === weatherBody) {
        alertCard.insertAdjacentElement("afterend", card);
        return;
      }

      weatherBody.prepend(card);
      return;
    }

    if (weatherPanel && weatherPanel.parentElement === home) {
      weatherPanel.insertAdjacentElement("afterbegin", card);
      return;
    }

    if (forecastCard && forecastCard.parentElement === home) {
      forecastCard.insertAdjacentElement("beforebegin", card);
      return;
    }

    const pageTitle = home.querySelector(".page-title");

    if (pageTitle) {
      pageTitle.insertAdjacentElement("afterend", card);
    } else {
      home.prepend(card);
    }
  }

  function setHomeCurrentLoading(point) {
    document.getElementById("homeCurrentTitle").textContent =
      `Checking ${point.name} conditions...`;
    document.getElementById("homeCurrentText").textContent =
      `Loading the nearest observation station near ${point.place}.`;
    document.getElementById("homeCurrentIcon").textContent = "⏳";
    document.getElementById("homeCurrentTemp").textContent = "--°";
    document.getElementById("homeCurrentCondition").textContent = "Loading";
    document.getElementById("homeCurrentStation").textContent = "Station pending";
    document.getElementById("homeCurrentWind").textContent = "Wind loading";
    document.getElementById("homeCurrentHumidity").textContent = "Humidity loading";
    document.getElementById("homeCurrentChecked").textContent = "Updating";
    document.getElementById("homeCurrentStatus").textContent =
      "Loading official NWS current conditions...";
  }

  function setHomeCurrentError(point) {
    document.getElementById("homeCurrentTitle").textContent =
      "Conditions unavailable";
    document.getElementById("homeCurrentText").textContent =
      `Could not load current conditions near ${point.place}.`;
    document.getElementById("homeCurrentIcon").textContent = "⚠️";
    document.getElementById("homeCurrentTemp").textContent = "--°";
    document.getElementById("homeCurrentCondition").textContent = "NWS error";
    document.getElementById("homeCurrentStation").textContent = "Try refresh";
    document.getElementById("homeCurrentWind").textContent = "Wind unavailable";
    document.getElementById("homeCurrentHumidity").textContent = "Humidity unavailable";
    document.getElementById("homeCurrentChecked").textContent = "Error";
    document.getElementById("homeCurrentStatus").textContent =
      "Some NWS stations may be temporarily unavailable.";
  }

  function renderHomeCurrentConditions(observation, stationName, point) {
    const props = observation.properties || {};

    const tempF = celsiusToFahrenheit(props.temperature?.value);
    const windMph = metersPerSecondToMph(props.windSpeed?.value);
    const gustMph = metersPerSecondToMph(props.windGust?.value);

    const conditionText = props.textDescription || "Current conditions";

    const humidity =
      typeof props.relativeHumidity?.value === "number"
        ? `${Math.round(props.relativeHumidity.value)}%`
        : "Humidity N/A";

    const windText =
      windMph === null
        ? "Wind N/A"
        : gustMph
          ? `Wind ${windMph} mph, gusts ${gustMph}`
          : `Wind ${windMph} mph`;

    const checkedTime = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    document.getElementById("homeCurrentTitle").textContent =
      `${point.name} conditions`;

    document.getElementById("homeCurrentText").textContent = conditionText;

    document.getElementById("homeCurrentIcon").textContent =
      getConditionIcon(conditionText);

    document.getElementById("homeCurrentTemp").textContent =
      tempF === null ? "--°" : `${tempF}°`;

    document.getElementById("homeCurrentCondition").textContent = conditionText;

    document.getElementById("homeCurrentStation").textContent =
      stationName || "Nearby NWS station";

    document.getElementById("homeCurrentWind").textContent = windText;

    document.getElementById("homeCurrentHumidity").textContent = humidity;

    document.getElementById("homeCurrentChecked").textContent =
      `Checked ${checkedTime}`;

    document.getElementById("homeCurrentStatus").textContent =
      `Official observation near ${point.place}.`;
  }

  async function loadHomeCurrentConditions() {
    const point = getSelectedHomePoint();

    setHomeCurrentLoading(point);

    try {
      const pointsUrl = `https://api.weather.gov/points/${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;

      const pointResponse = await fetch(pointsUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!pointResponse.ok) {
        throw new Error(`NWS point request failed: ${pointResponse.status}`);
      }

      const pointData = await pointResponse.json();
      const stationsUrl = pointData.properties?.observationStations;

      if (!stationsUrl) {
        throw new Error("NWS observation station URL missing.");
      }

      const stationsResponse = await fetch(stationsUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!stationsResponse.ok) {
        throw new Error(`NWS stations request failed: ${stationsResponse.status}`);
      }

      const stationsData = await stationsResponse.json();
      const station = stationsData.features?.[0];

      if (!station) {
        throw new Error("No nearby NWS station found.");
      }

      const stationId = station.properties?.stationIdentifier;
      const stationName = station.properties?.name || stationId || "Nearby NWS station";

      if (!stationId) {
        throw new Error("NWS station identifier missing.");
      }

      const observationUrl =
        `https://api.weather.gov/stations/${stationId}/observations/latest`;

      const observationResponse = await fetch(observationUrl, {
        headers: {
          Accept: "application/geo+json",
        },
      });

      if (!observationResponse.ok) {
        throw new Error(`NWS observation request failed: ${observationResponse.status}`);
      }

      const observationData = await observationResponse.json();

      renderHomeCurrentConditions(observationData, stationName, point);
    } catch (error) {
      console.error("Home current conditions failed:", error);
      setHomeCurrentError(point);
    }
  }

  function goToForecastTab() {
    const forecastNav = document.querySelector('.nav-item[data-screen="forecast"]');

    if (forecastNav) {
      forecastNav.click();
      return;
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    const forecastScreen = document.getElementById("forecast");

    if (forecastScreen) {
      forecastScreen.classList.add("active");
    }
  }

  placeHomeCurrentCard();

  const refreshBtn = document.getElementById("homeCurrentRefreshBtn");
  const forecastBtn = document.getElementById("homeCurrentForecastBtn");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadHomeCurrentConditions);
  }

  if (forecastBtn) {
    forecastBtn.addEventListener("click", goToForecastTab);
  }

  loadHomeCurrentConditions();
})();
/* Version 2.3.1 - Remove duplicate hero forecast */

(function mdwaRemoveDuplicateHeroForecast() {
  function removeHeroForecastStrip() {
    const heroForecastStrip = document.getElementById("heroLiveForecastStrip");

    if (heroForecastStrip) {
      heroForecastStrip.remove();
    }

    document.querySelectorAll(".hero-live-forecast-strip").forEach((strip) => {
      strip.remove();
    });
  }

  removeHeroForecastStrip();

  setTimeout(removeHeroForecastStrip, 800);
  setTimeout(removeHeroForecastStrip, 1800);
  setTimeout(removeHeroForecastStrip, 3500);
})();
/* Version 2.3.2 - Home duplicate alert cleanup */

(function mdwaHomeDuplicateAlertCleanup() {
  const home = document.getElementById("home");

  if (!home) return;

  function hideOldHomeAlertPlaceholder() {
    const cards = Array.from(home.querySelectorAll(".section-card"));

    cards.forEach((card) => {
      const text = card.textContent.toLowerCase();

      const isOldAlertPlaceholder =
        text.includes("active alerts") &&
        text.includes("live maryland alert data will appear here") &&
        text.includes("official weather sources");

      const isLiveNwsHomeAlert =
        card.id === "homeLiveAlertCard" ||
        text.includes("official nws alerts") ||
        text.includes("active nws alert") ||
        text.includes("no active nws alerts");

      if (isOldAlertPlaceholder && !isLiveNwsHomeAlert) {
        card.classList.add("home-old-alert-placeholder");
      }
    });
  }

  function cleanHeroDemoBadge() {
    const cards = Array.from(home.querySelectorAll(".section-card"));

    const heroCard = cards.find((card) => {
      const text = card.textContent.toLowerCase();

      if (card.id === "homeLiveAlertCard") return false;
      if (card.id === "homeLiveForecastCard") return false;
      if (card.id === "homeCurrentConditionsCard") return false;
      if (card.id === "homeWeatherPanel") return false;

      return (
        text.includes("good morning") ||
        text.includes("good afternoon") ||
        text.includes("good evening") ||
        text.includes("forecasts, alerts, radar")
      );
    });

    if (!heroCard) return;

    const possibleDemoElements = Array.from(heroCard.querySelectorAll("*")).filter(
      (element) => {
        const text = element.textContent.trim().toLowerCase();

        return (
          text === "demo" ||
          text.includes("79°") ||
          text.includes("demo")
        );
      }
    );

    possibleDemoElements.forEach((element) => {
      if (element.textContent.includes("79")) {
        element.textContent = "Live";
        element.classList.add("hero-demo-cleaned");
        return;
      }

      if (element.textContent.trim().toLowerCase() === "demo") {
        element.textContent = "MD";
        element.classList.add("hero-demo-cleaned");
      }
    });
  }

  function runHomeCleanup() {
    hideOldHomeAlertPlaceholder();
    cleanHeroDemoBadge();
  }

  runHomeCleanup();

  setTimeout(runHomeCleanup, 800);
  setTimeout(runHomeCleanup, 1800);
  setTimeout(runHomeCleanup, 3500);
})();/* Version 2.3.3 - Clean hero demo weather and current conditions fallback */

(function mdwaCleanHeroDemoWeatherAndCurrentFallback() {
  const home = document.getElementById("home");

  if (!home) return;

  function findHeroCard() {
    const cards = Array.from(home.querySelectorAll(".section-card"));

    return (
      cards.find((card) => {
        const text = card.textContent.toLowerCase();

        if (card.id === "homeLiveAlertCard") return false;
        if (card.id === "homeLiveForecastCard") return false;
        if (card.id === "homeCurrentConditionsCard") return false;
        if (card.id === "homeWeatherPanel") return false;
        if (card.id === "homeMultiDayForecastPanel") return false;

        return (
          text.includes("good morning") ||
          text.includes("good afternoon") ||
          text.includes("good evening") ||
          text.includes("forecasts, alerts, radar")
        );
      }) || null
    );
  }

  function cleanHeroDemoWeather() {
    const heroCard = findHeroCard();

    if (!heroCard) return;

    const elements = Array.from(heroCard.querySelectorAll("*"));

    elements.forEach((element) => {
      const text = element.textContent.trim().toLowerCase();

      const isFakeTemp =
        text === "79°" ||
        text === "demo" ||
        text.includes("feels like 82") ||
        text.includes("wind 6 mph");

      if (isFakeTemp) {
        element.classList.add("hero-demo-weather-hidden");
      }
    });

    if (!heroCard.querySelector(".hero-live-badge-clean")) {
      const fakeWeatherArea = elements.find((element) => {
        const text = element.textContent.trim().toLowerCase();
        return text.includes("79°") || text.includes("demo");
      });

      const liveBadge = document.createElement("div");
      liveBadge.className = "hero-live-badge-clean";
      liveBadge.innerHTML = `
        <strong>Live</strong>
        <small>MD</small>
      `;

      if (fakeWeatherArea && fakeWeatherArea.parentElement) {
        fakeWeatherArea.parentElement.appendChild(liveBadge);
      } else {
        heroCard.appendChild(liveBadge);
      }
    }

    if (!heroCard.querySelector(".hero-clean-note")) {
      const note = document.createElement("span");
      note.className = "hero-clean-note";
      note.textContent = "Live weather data below";
      heroCard.appendChild(note);
    }
  }

  function cleanCurrentConditionsFallback() {
    const card = document.getElementById("homeCurrentConditionsCard");

    if (!card) return;

    const temp = document.getElementById("homeCurrentTemp");
    const wind = document.getElementById("homeCurrentWind");
    const humidity = document.getElementById("homeCurrentHumidity");
    const status = document.getElementById("homeCurrentStatus");

    const tempText = temp ? temp.textContent.trim() : "";
    const windText = wind ? wind.textContent.trim().toLowerCase() : "";
    const humidityText = humidity ? humidity.textContent.trim().toLowerCase() : "";

    const hasPartialData =
      tempText === "--°" ||
      tempText === "-°" ||
      windText.includes("n/a") ||
      humidityText.includes("n/a");

    card.classList.toggle("current-partial-data", hasPartialData);

    if (hasPartialData && temp && (tempText === "--°" || tempText === "-°")) {
      temp.textContent = "N/A";
    }

    if (hasPartialData && status) {
      status.textContent =
        "The nearby NWS station reported conditions, but some observation values were unavailable. Forecast data is still available below.";
    }
  }

  function runCleanup() {
    cleanHeroDemoWeather();
    cleanCurrentConditionsFallback();
  }

  runCleanup();

  setTimeout(runCleanup, 800);
  setTimeout(runCleanup, 1800);
  setTimeout(runCleanup, 3500);
  setTimeout(runCleanup, 6000);
})();
/* Version 2.3.4 - Force clean Home hero demo badge */

(function mdwaForceCleanHomeHeroDemoBadge() {
  const home = document.getElementById("home");

  if (!home) return;

  function findHomeHeroCard() {
    const cards = Array.from(home.querySelectorAll(".section-card"));

    return (
      cards.find((card) => {
        const text = card.textContent.toLowerCase();

        if (card.id === "homeLiveAlertCard") return false;
        if (card.id === "homeLiveForecastCard") return false;
        if (card.id === "homeCurrentConditionsCard") return false;
        if (card.id === "homeWeatherPanel") return false;
        if (card.id === "homeMultiDayForecastPanel") return false;

        return (
          text.includes("good morning") ||
          text.includes("good afternoon") ||
          text.includes("good evening") ||
          text.includes("forecasts, alerts, radar")
        );
      }) || null
    );
  }

  function forceCleanHeroDemo() {
    const heroCard = findHomeHeroCard();

    if (!heroCard) return;

    const elements = Array.from(heroCard.querySelectorAll("*"));

    // Hide the fake Feels Like / Wind demo pills.
    elements.forEach((element) => {
      const text = element.textContent.trim().toLowerCase();

      if (
        text.includes("feels like 82") ||
        text.includes("wind 6 mph")
      ) {
        element.classList.add("force-hide-hero-demo");
      }
    });

    // Find the smallest element that contains both 79 and Demo.
    const demoBadgeCandidates = elements
      .filter((element) => {
        const text = element.textContent.trim().toLowerCase();

        return (
          text.includes("79") &&
          text.includes("demo") &&
          text.length <= 40
        );
      })
      .sort((a, b) => a.textContent.length - b.textContent.length);

    const demoBadge = demoBadgeCandidates[0];

    if (demoBadge) {
      demoBadge.innerHTML = `
        <div class="force-clean-hero-badge">
          <strong>Live</strong>
          <small>MD</small>
        </div>
      `;
      return;
    }

    // Backup: hide any small fake demo pieces and add a clean badge.
    elements.forEach((element) => {
      const text = element.textContent.trim().toLowerCase();

      if (
        (text.includes("79") || text.includes("demo")) &&
        text.length <= 20
      ) {
        element.classList.add("force-hide-hero-demo");
      }
    });

    if (!heroCard.querySelector(".force-clean-hero-badge")) {
      const badge = document.createElement("div");
      badge.className = "force-clean-hero-badge";
      badge.innerHTML = `
        <strong>Live</strong>
        <small>MD</small>
      `;

      heroCard.appendChild(badge);
    }
  }

  function cleanCurrentConditionsNoTemp() {
    const card = document.getElementById("homeCurrentConditionsCard");
    const temp = document.getElementById("homeCurrentTemp");
    const status = document.getElementById("homeCurrentStatus");

    if (!card || !temp) return;

    const tempText = temp.textContent.trim().toLowerCase();

    if (tempText === "n/a" || tempText === "--°" || tempText === "-°") {
      card.classList.add("current-no-temp");
      temp.textContent = "Temp unavailable";

      if (status) {
        status.textContent =
          "The nearby NWS station reported conditions, but temperature data is currently unavailable.";
      }
    }
  }

  function runHeroCleanup() {
    forceCleanHeroDemo();
    cleanCurrentConditionsNoTemp();
  }

  runHeroCleanup();

  setTimeout(runHeroCleanup, 800);
  setTimeout(runHeroCleanup, 1800);
  setTimeout(runHeroCleanup, 3500);
  setTimeout(runHeroCleanup, 6000);
})();/* Version 2.3.5 - Force remove fake Home demo weather */

(function mdwaForceRemoveFakeHomeDemoWeather() {
  const home = document.getElementById("home");

  if (!home) return;

  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function findBestDemoBadgeTarget() {
    const elements = Array.from(home.querySelectorAll("*"));

    const candidates = elements
      .filter((element) => {
        const text = cleanText(element.textContent);

        if (!text.includes("79")) return false;
        if (!text.includes("demo")) return false;

        // Avoid grabbing the entire Home screen.
        if (text.length > 90) return false;

        return true;
      })
      .sort((a, b) => cleanText(a.textContent).length - cleanText(b.textContent).length);

    return candidates[0] || null;
  }

  function hideFakeHeroPills() {
    const elements = Array.from(home.querySelectorAll("*"));

    elements.forEach((element) => {
      const text = cleanText(element.textContent);

      const isFakePill =
        text.includes("feels like 82") ||
        text.includes("wind 6 mph");

      if (!isFakePill) return;

      const pill =
        element.closest(".pill") ||
        element.closest("[class*='pill']") ||
        element.closest("[class*='meta']") ||
        element;

      pill.classList.add("force-demo-hide-v235");
    });
  }

  function replaceFakeDemoBadge() {
    const existingBadge = home.querySelector(".hero-replacement-badge-v235");

    if (existingBadge) return;

    const target = findBestDemoBadgeTarget();

    if (!target) return;

    target.innerHTML = `
      <div class="hero-replacement-badge-v235">
        <strong>Live</strong>
        <small>MD</small>
      </div>
    `;
  }

  function forceCleanDemoWeather() {
    hideFakeHeroPills();
    replaceFakeDemoBadge();
  }

  forceCleanDemoWeather();

  setTimeout(forceCleanDemoWeather, 500);
  setTimeout(forceCleanDemoWeather, 1200);
  setTimeout(forceCleanDemoWeather, 2500);
  setTimeout(forceCleanDemoWeather, 5000);

  console.log("MDWA 2.3.5 fake demo weather cleanup ran");
})();
console.log("MD Weather Alerts Version 2.3.5 force remove fake home demo weather loaded successfully.");