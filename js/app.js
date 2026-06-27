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
console.log("MD Weather Alerts Version 0.6 WordPress blog feed loaded successfully.");