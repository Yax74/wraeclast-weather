// Register module settings
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
    hint: "Used to adjust seasonal mapping. Default is 12.",
    scope: "world",
    config: true,
    type: Number,
    default: 12,
    range: { min: 1, max: 20, step: 1 }
  });
});

// Main weather generation logic
Hooks.once('ready', () => {
  game.wraeclastWeather = async function generateWeather() {
    const season = game.settings.get("wraeclast-weather", "defaultSeason");
    const terrain = game.settings.get("wraeclast-weather", "defaultTerrain");
    const numMonths = game.settings.get("wraeclast-weather", "numberOfMonths");

    const customMonths = ["Derivi", "Phreci", "Caspiri", "Astrali", "Eterni", "Atziri", "Vivici", "Lurici", "Sagari", "Vitali", "Azmeri", "Verusi", "Divini"].slice(0, numMonths);
    const monthIndex = customMonths.indexOf(season);

    const seasonalProfiles = [
      { name: "Deep Winter", roll: "2d3+1" },
      { name: "Winter", roll: "3d3+1" },
      { name: "Early Spring", roll: "2d5+3" },
      { name: "Spring", roll: "2d5+4" },
      { name: "Early Summer", roll: "2d5+5" },
      { name: "High Summer", roll: "2d5+6" },
      { name: "Late Summer", roll: "2d5+7" },
      { name: "Autumn", roll: "2d5+4" },
      { name: "Late Autumn", roll: "2d5+3" },
      { name: "Early Winter", roll: "3d3+1" }
    ];

    const monthProfiles = [];
    for (let i = 0; i < numMonths; i++) {
      const index = Math.floor(i * seasonalProfiles.length / numMonths);
      monthProfiles.push(seasonalProfiles[index]);
    }

    const seasonalRollFormula = monthProfiles[monthIndex]?.roll || "2d5+4";

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

    const terrainModifiers = {
      "Arctic or Polar Regions": -2, "Mountains (High, above 2500m)": -2, "Deserts (Night)": -1,
      "Mountains (Medium, 1000-2500m)": -1, "Mountains (Low, below 1000m)": -1, "Hills & Foothills": -1,
      "Dense Forests": -1, "Coastal Regions": -1, "Marshes & Swamps": -1, "Plains & Grasslands": 0,
      "Jungle": 1, "Deserts (Day)": 2, "Volcanic Areas": 3
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
      { roll: 2, wind: "Calm" },
      { roll: 5, wind: "Gentle Breeze" },
      { roll: 8, wind: "Moderate Wind" },
      { roll: 11, wind: "Gusty" },
      { roll: 13, wind: "Windy" },
      { roll: 15, wind: "Strong Wind" },
      { roll: 17, wind: "Strong Gusts" },
      { roll: 19, wind: "Severe Wind" },
      { roll: 20, wind: "Dangerous Winds" }
    ];

    const terrainMod = terrainModifiers[terrain] || 0;
    const seasonalRoll = await new Roll(seasonalRollFormula).roll({ async: true });
    const adjustedTemp = seasonalRoll.total + terrainMod;
    const weather = weatherTable.find(w => adjustedTemp <= w.roll) || weatherTable.at(-1);
    const exactTemp = await new Roll(weather.temp).roll({ async: true });

    const cloudRoll = await new Roll(`1d20+${terrainMod}`).roll({ async: true });
    const cloud = cloudPrecipitationTable.find(w => cloudRoll.total <= w.roll) || cloudPrecipitationTable.at(-1);

    let precip = cloud.precipitation;
    if ((precip.includes("Snow") || precip.includes("Rain")) && exactTemp.total <= 0) precip = precip.replace("Rain", "Snow");
    else if (precip.includes("Snow")) precip = precip.replace("Snow", "Rain");

    const windRoll = await new Roll(`1d20+${terrainMod}`).roll({ async: true });
    const wind = windTable.find(w => windRoll.total <= w.roll) || windTable.at(-1);

    ChatMessage.create({
      content: `<strong>Today's Weather:</strong><br>
      <em>${weather.desc}</em> (${exactTemp.total} °C)<br>
      <strong>Cloud Cover:</strong> ${cloud.cloud}<br>
      <strong>Precipitation:</strong> ${precip}<br>
      <strong>Wind:</strong> ${wind.wind}<br>
      <hr>
      <small>Season: ${season} | Terrain: ${terrain} | Months/Year: ${numMonths}</small>`
    });
  };

  // Add cloud icon to scene controls
  Hooks.on("getSceneControlButtons", controls => {
    controls.push({
      name: "weather",
      title: "Generate Weather",
      icon: "fas fa-cloud-sun-rain",
      layer: "controls",
      tools: [
        {
          name: "generate-weather",
          title: "Generate Weather",
          icon: "fas fa-cloud",
          onClick: () => game.wraeclastWeather(),
          button: true
        }
      ]
    });
  });
});
