const screens = document.querySelectorAll(".screen");
const navItems = document.querySelectorAll(".nav-item");
const screenButtons = document.querySelectorAll("[data-screen]");
const locationBtn = document.getElementById("locationBtn");
const locationStatus = document.getElementById("locationStatus");
const submitReportBtn = document.getElementById("submitReport");
const reportMap = document.getElementById("reportMap");
const countySelect = document.querySelector(".county-select");

let savedLocation = null;

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

  const mapText = reportMap.querySelector("p");

  if (mapText) {
    mapText.textContent = "Report added to the demo map.";
  }

  setTimeout(() => {
    pin.remove();

    if (mapText) {
      mapText.textContent = "Submitted reports will appear here.";
    }
  }, 15000);
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
        savedLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        locationStatus.textContent = `Location added: ${savedLocation.latitude.toFixed(
          3
        )}, ${savedLocation.longitude.toFixed(3)}`;
      },
      () => {
        savedLocation = null;
        locationStatus.textContent =
          "Location permission was denied or unavailable. Demo reports still work.";
      }
    );
  });
}

if (submitReportBtn) {
  submitReportBtn.addEventListener("click", () => {
    const checkedReports = Array.from(
      document.querySelectorAll('.checkbox-grid input[type="checkbox"]:checked')
    ).map((input) => input.value);

    const note = document.getElementById("reportNote");

    if (checkedReports.length === 0) {
      alert("Please select at least one weather condition.");
      return;
    }

    addReportToMap(checkedReports);

    alert(
      `Report submitted: ${checkedReports.join(
        ", "
      )}\n\nThis is currently a demo. Soon this will save to the live Maryland reports map.`
    );

    document
      .querySelectorAll('.checkbox-grid input[type="checkbox"]')
      .forEach((input) => {
        input.checked = false;
      });

    if (note) {
      note.value = "";
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
  });
}

document.querySelectorAll(".more-list button").forEach((button) => {
  button.addEventListener("click", () => {
    alert("This section is coming soon to MD Weather Alerts.");
  });
});

setGreeting();
loadDemoWeather();

console.log("MD Weather Alerts app loaded successfully.");