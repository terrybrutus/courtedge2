import { CONFIG } from "./config";

export interface GameWeather {
  tempF: number;
  windSpeedMph: number;
  windDirection: string; // "N", "NE", "E", etc.
  windDeg: number;
  description: string;
  precipChance: number;  // 0-100
  totalSignal: "OVER" | "UNDER" | "NEUTRAL";
  totalImpact: string;
}

// MLB stadium coordinates for weather lookup
const STADIUM_COORDS: Record<number, { lat: number; lon: number; name: string; cfDeg: number }> = {
  2  : { lat: 39.756, lon: -104.994, name: "Coors Field",           cfDeg: 180 }, // CF faces south
  15 : { lat: 39.097, lon: -84.507,  name: "GABP",                  cfDeg: 200 },
  4  : { lat: 42.346, lon: -71.097,  name: "Fenway Park",           cfDeg: 90  },
  10 : { lat: 41.948, lon: -87.655,  name: "Wrigley Field",         cfDeg: 90  }, // wind from lake = east
  22 : { lat: 32.707, lon: -117.157, name: "Petco Park",            cfDeg: 315 },
  31 : { lat: 37.778, lon: -122.389, name: "Oracle Park",           cfDeg: 270 },
  7  : { lat: 34.074, lon: -118.240, name: "Dodger Stadium",        cfDeg: 270 },
  32 : { lat: 47.591, lon: -122.332, name: "T-Mobile Park",         cfDeg: 270 },
  3  : { lat: 42.339, lon: -83.049,  name: "Comerica Park",         cfDeg: 0   },
  5  : { lat: 41.830, lon: -87.634,  name: "Guaranteed Rate Field", cfDeg: 180 },
  680: { lat: 29.757, lon: -95.355,  name: "Minute Maid Park",      cfDeg: 0   }, // retractable roof
  1   : { lat: 39.284, lon: -76.622, name: "Oriole Park",           cfDeg: 315 },
};

const DIR_NAMES = ["N","NE","E","SE","S","SW","W","NW"];

function degToDir(deg: number): string {
  return DIR_NAMES[Math.round(deg / 45) % 8];
}

export async function fetchStadiumWeather(
  venueId: number,
  date: string, // "YYYY-MM-DD"
): Promise<GameWeather | null> {
  const stadium = STADIUM_COORDS[venueId];
  if (!stadium) return null;

  const url =
    `${CONFIG.WEATHER_BASE}/forecast` +
    `?latitude=${stadium.lat}&longitude=${stadium.lon}` +
    `&daily=precipitation_probability_max,windspeed_10m_max,winddirection_10m_dominant,temperature_2m_max` +
    `&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America%2FNew_York&start_date=${date}&end_date=${date}`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();

  const daily = json.daily;
  if (!daily) return null;

  const tempF = daily.temperature_2m_max?.[0] ?? 72;
  const windMph = daily.windspeed_10m_max?.[0] ?? 0;
  const windDeg = daily.winddirection_10m_dominant?.[0] ?? 0;
  const precipChance = daily.precipitation_probability_max?.[0] ?? 0;
  const windDir = degToDir(windDeg);

  // Determine if wind is blowing toward or away from CF
  const angleToCf = Math.abs(((windDeg - stadium.cfDeg + 360) % 360));
  const windOutToCf = angleToCf < 45; // wind blowing OUT toward CF
  const windInFromCf = angleToCf > 135 && angleToCf < 225; // wind blowing IN from CF

  let totalSignal: GameWeather["totalSignal"] = "NEUTRAL";
  let totalImpact = "";

  if (windMph >= 15 && windOutToCf) {
    totalSignal = "OVER";
    totalImpact = `Wind ${windMph}mph blowing OUT to CF — ball carries, lean OVER`;
  } else if (windMph >= 15 && windInFromCf) {
    totalSignal = "UNDER";
    totalImpact = `Wind ${windMph}mph blowing IN from CF — suppresses fly balls, lean UNDER`;
  } else if (windMph >= 10 && windOutToCf) {
    totalSignal = "OVER";
    totalImpact = `Moderate wind ${windMph}mph out to CF — mild over lean`;
  } else if (tempF >= 85) {
    totalSignal = "OVER";
    totalImpact = `Hot ${tempF}°F — ball carries better in warm air, slight over lean`;
  } else if (tempF <= 50) {
    totalSignal = "UNDER";
    totalImpact = `Cold ${tempF}°F — dense air suppresses ball flight, slight under lean`;
  } else {
    totalImpact = `${tempF}°F, wind ${windMph}mph ${windDir} — neutral conditions`;
  }

  return {
    tempF,
    windSpeedMph: windMph,
    windDirection: windDir,
    windDeg,
    description: `${tempF}°F, ${windMph}mph ${windDir}${precipChance > 30 ? `, ${precipChance}% rain` : ""}`,
    precipChance,
    totalSignal,
    totalImpact,
  };
}
