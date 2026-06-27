const screens = document.querySelectorAll(".screen");
const navItems = document.querySelectorAll(".nav-item");
const screenButtons = document.querySelectorAll("[data-screen]");
const locationBtn = document.getElementById("locationBtn");
const locationStatus = document.getElementById("locationStatus");
const submitReportBtn = document.getElementById("submitReport");
const reportMap = document.getElementById("reportMap");
const countySelect = document.querySelector(".county-select");

let savedLocation = null;
let reportCount = 0;

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

function addReportToMap(reportTypes) {
  if (!reportMap) return;

  const emoji = getReportEmoji(reportTypes);

  const pin = document.createElement("div");
  pin.className = "map-pin";
  pin.textContent = emoji;

  const left = Math.floor(Math.random() * 70) + 10;
  const top = Math.floor(Math.random() * 60) + 15;

  pin.style.left = `${left}%`;
  pin.style.top = `${top}%`;

  reportMap.appendChild(pin);
  reportMap.classList.add("has-reports");

  const mapText = reportMap.querySelector("p");

  if (mapText) {
    mapText.textContent = "Live report added to the demo map.";
  }

  setTimeout(() => {
    pin.remove();
  }, 15000);
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

function addReportToFeed(reportTypes, note) {
  createReportFeed();

  const feed = document.getElementById("reportFeed");

  if (!feed) return;

  const emptyFeed = feed.querySelector(".empty-feed");

  if (emptyFeed) {
    emptyFeed.remove();
  }

  reportCount += 1;

  const now = new Date();

  const timeString = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const locationText = savedLocation
    ? `Approximate location • offset ${savedLocation.privacyOffsetMiles} mi`
    : "Location not shared";

  const card = document.createElement("div");
  card.className = "report-card";

  const tags = reportTypes
    .map((type) => `<span class="report-tag">${type}</span>`)
    .join("");

  card.innerHTML = `
    <div class="report-card-top">
      <strong>Report #${reportCount}</strong>
      <small>${timeString}</small>
    </div>

    <small>📍 ${locationText}</small>

    <div class="report-tags">
      ${tags}
    </div>

    ${
      note
        ? `<p class="report-note">${note}</p>`
        : `<p class="report-note">No extra details added.</p>`
    }
  `;

  feed.prepend(card);
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

    addReportToMap(checkedReports);
    addReportToFeed(checkedReports, note);

    showToast("Weather report added to the map.");

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

createReportFeed();
setGreeting();
loadDemoWeather();

console.log("MD Weather Alerts Version 0.2.2 loaded successfully.");