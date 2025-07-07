// Foundry VTT Wraeclast Weather System (Improved)

// Module Settings
Hooks.once('init', () => {
  game.settings.register("wraeclast-weather", "defaultSeason", {
    name: "Default Season",
    scope: "world",
    config: true,
    type: String,
    default: "Azmeri"
  });

  game.settings.register("wraeclast-weather", "defaultTerrain", {
    name: "Default Terrain",
    scope: "world",
    config: true,
    type: String,
    default: "Plains & Grasslands"
  });

  game.settings.register("wraeclast-weather", "numberOfMonths", {
    name: "Number of Months in Year",
    scope: "world",
    config: true,
    type: Number,
    default: 12
  });

  game.settings.register("wraeclast-weather", "useSimpleCalendar", {
    name: "Use Simple Calendar Integration",
    hint: "Enable this to pull the current month from Simple Calendar",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
});

Hooks.once('ready', () => {
  game.wraeclastWeather = async function () {
    const weatherTable = [
      { roll: 2, desc: "Bitterly Cold", temp: "-24 + 1d6" },
      { roll: 3, desc: "Extremely Cold", temp: "-19 + 1d6" },
      { roll: 4, desc: "Very Cold", temp: "-14 + 1d6" },
      { roll: 5, desc: "Cold", temp: "-9 + 1d6" },
      { roll: 6, desc: "Chilly", temp: "-2 + 1d6" },
      { roll: 7, desc: "Cool", temp: "5 + 1d6" },
      { roll: 8, desc: "Pleasant", temp: "12 + 1d6" },
      { roll: 13, desc: "Mild", temp: "17 + 1d6" },
      { roll: 14, desc: "Warm", temp: "22 + 1d6" },
      { roll: 15, desc: "Very Warm", temp: "26 + 1d6" },
      { roll: 16, desc: "Hot", temp: "30 + 1d6" },
      { roll: 17, desc: "Very Hot", temp: "34 + 1d6" },
      { roll: 18, desc: "Sweltering", temp: "38 + 1d6" },
      { roll: 19, desc: "Oppressively Hot", temp: "42 + 1d8" },
      { roll: 20, desc: "Dangerously Hot", temp: "48 + 1d8" }
    ];

    const seasonalRolls = {
      "Derivi": "2d5+6", "Phreci": "2d5+5", "Caspiri": "2d5+4",
      "Astrali": "3d3+1", "Eterni": "2d3+1", "Atziri": "3d3+1",
      "Vivici": "2d5+3", "Lurici": "2d6+2", "Sagari": "2d5+4",
      "Vitali": "2d5+5", "Azmeri": "2d5+6", "Verusi": "2d6+6", "Divini": "2d5+7"
    };

    const terrainModifiers = {
      "Arctic or Polar Regions": -2, "Mountains (High, above 2500m)": -2,
      "Deserts (Night)": -1, "Mountains (Medium, 1000-2500m)": -1,
      "Mountains (Low, below 1000m)": -1, "Hills & Foothills": -1,
      "Dense Forests": -1, "Coastal Regions": -1, "Marshes & Swamps": -1,
      "Plains & Grasslands": 0, "Jungle": 1, "Deserts (Day)": 2,
      "Volcanic Areas": 3
    };

    const cloudPrecipitationTable = [
      { roll: 2, cloud: "Clear", precipitation: "None" },
      { roll: 5, cloud: "Light Clouds", precipitation: "None" },
      { roll: 8, cloud: "Partly Cloudy", precipitation: "None" },
      { roll: 11, cloud: "Mostly Cloudy", precipitation: "Light (drizzle or mist)" },
      { roll: 13, cloud: "Overcast", precipitation: "Mist or Drizzle" },
      { roll: 15, cloud: "Dark Overcast", precipitation: "Light Rain or Snow" },
      { roll: 17, cloud: "Thick Clouds", precipitation: "Moderate Rain or Snow" },
      { roll: 18, cloud: "Stormy", precipitation: "Heavy Rain/Snow or Thunderstorm" },
      { roll: 19, cloud: "Heavy Storm", precipitation: "Torrential Rain, Snowstorm or Thunderstorm" },
      { roll: 20, cloud: "Severe Storm", precipitation: "Extreme Weather Event" }
    ];

    const windTable = [
      { roll: 2, wind: "Calm" }, { roll: 5, wind: "Gentle Breeze" },
      { roll: 8, wind: "Moderate Wind" }, { roll: 11, wind: "Gusty" },
      { roll: 13, wind: "Windy" }, { roll: 15, wind: "Strong Wind" },
      { roll: 17, wind: "Strong Gusts" }, { roll: 19, wind: "Severe Wind" },
      { roll: 20, wind: "Dangerous Winds" }
    ];

    let useSC = game.settings.get("wraeclast-weather", "useSimpleCalendar");
    let months = Object.keys(seasonalRolls);
    let currentMonth = game.settings.get("wraeclast-weather", "defaultSeason");

    if (useSC && game.modules.get("foundryvtt-simple-calendar")?.active) {
      const api = game.modules.get("foundryvtt-simple-calendar")?.api?.simpleCalendar;
      const monthData = api?.activeCalendar?.currentMonth;
      if (monthData?.name) currentMonth = monthData.name;
    } else {
      currentMonth = await new Promise(resolve => {
        new Dialog({
          title: "Select Month",
          content: `<select id="month-select">${months.map(m => `<option>${m}</option>`).join("")}</select>`,
          buttons: {
            ok: {
              label: "OK",
              callback: html => resolve(html.find("#month-select").val())
            }
          },
          close: () => resolve(currentMonth) // fallback to default
        }).render(true);
      });
    }

    const terrains = Object.keys(terrainModifiers);
    const currentTerrain = await new Promise(resolve => {
      new Dialog({
        title: "Select Terrain",
        content: `<select id="terrain-select">${terrains.map(t => `<option>${t}</option>`).join("")}</select>`,
        buttons: {
          ok: {
            label: "OK",
            callback: html => resolve(html.find("#terrain-select").val())
          }
        },
        close: () => resolve(game.settings.get("wraeclast-weather", "defaultTerrain"))
      }).render(true);
    });

    const terrainMod = terrainModifiers[currentTerrain] || 0;
    const seasonalDiceRoll = await new Roll(seasonalRolls[currentMonth]).roll({ async: true });
    const adjustedTempRoll = seasonalDiceRoll.total + terrainMod;
    const weather = weatherTable.find(w => adjustedTempRoll <= w.roll) || weatherTable[weatherTable.length - 1];

    let exactTemp = "???";
    try {
      const tempRoll = await new Roll(weather.temp).roll({ async: true });
      exactTemp = tempRoll.total;
    } catch (e) {
      ui.notifications.error(`Invalid temperature roll: ${weather.temp}`);
    }

    let cloudRoll = await new Roll(`1d20+${terrainMod}`).roll({ async: true });
    const cloudWeather = cloudPrecipitationTable.find(w => cloudRoll.total <= w.roll) || cloudPrecipitationTable[cloudPrecipitationTable.length - 1];
    let precipitation = cloudWeather.precipitation;
    if ((precipitation.includes("Snow") || precipitation.includes("Rain")) && exactTemp <= 0) {
      precipitation = cloudWeather.precipitation.replace("Rain", "Snow");
    } else if (precipitation.includes("Snow")) {
      precipitation = precipitation.replace("Snow", "Rain");
    }

    let windRoll = await new Roll(`1d20+${terrainMod}`).roll({ async: true });
    const windResult = windTable.find(w => windRoll.total <= w.roll) || windTable[windTable.length - 1];

    ChatMessage.create({
      content: `<strong>Today's Weather:</strong><br>
      <em>${weather.desc}</em> (${exactTemp} °C)<br>
      <strong>Cloud Cover:</strong> ${cloudWeather.cloud}<br>
      <strong>Precipitation:</strong> ${precipitation}<br>
      <strong>Wind:</strong> ${windResult.wind}<br>
      <hr><small>Month: ${currentMonth} | Terrain: ${currentTerrain}</small>`
    });
  };
});

// Add Weather Button to Journal Sidebar
Hooks.on("renderJournalDirectory", async (app, html, data) => {
  const button = document.createElement("button");
  button.classList.add("wraeclast-weather-button");
  button.innerHTML = `<i class="fas fa-cloud-sun"></i>`;
  button.title = "Generate Weather";
  button.addEventListener("click", () => {
    if (game.wraeclastWeather) game.wraeclastWeather();
    else ui.notifications.warn("Wraeclast Weather module not ready.");
  });

  const actions = html[0].querySelector(".header-actions");
  if (actions) actions.prepend(button);
});
