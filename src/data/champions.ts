// Champion pools for each lane
export const championPools = {
  top: ['Ambessa', 'Camille', 'Cho\'Gath', 'Darius', 'Dr. Mundo', 'Fiora', 'Gangplank', 'Garen', 'Gnar', 'Gragas', 'Gwen', 'Heimerdinger', 'Illaoi', 'Irelia', 'Jax', 'Jayce', 'Kayle', 'Kennen', 'Kled', 'K\'Sante', 'Malphite', 'Mordekaiser', 'Nasus', 'Olaf', 'Ornn', 'Poppy', 'Quinn', 'Renekton', 'Riven', 'Rumble', 'Sett', 'Shen', 'Singed', 'Sion', 'Tahm Kench', 'Teemo', 'Tryndamere', 'Urgot', 'Vayne', 'Vladimir', 'Warwick', 'Yone', 'Yorick'],
  jungle: ['Amumu', 'Bel\'Veth', 'Briar', 'Elise', 'Evelynn', 'Fiddlesticks', 'Graves', 'Hecarim', 'Ivern', 'Jarvan IV', 'Karthus', 'Kayn', 'Kha\'Zix', 'Kindred', 'Lee Sin', 'Lillia', 'Maokai', 'Master Yi', 'Nidalee', 'Nocturne', 'Nunu & Willump', 'Pantheon', 'Qiyana', 'Rammus', 'Rek\'Sai', 'Rengar', 'Sejuani', 'Shaco', 'Shyvana', 'Skarner', 'Trundle', 'Udyr', 'Vi', 'Viego', 'Volibear', 'Wukong', 'Xin Zhao', 'Zac'],
  mid: ['Ahri', 'Akali', 'Akshan', 'Anivia', 'Annie', 'Aurelion Sol', 'Aurora', 'Azir', 'Brand', 'Cassiopeia', 'Diana', 'Ekko', 'Fizz', 'Galio', 'Hwei', 'Kassadin', 'Katarina', 'LeBlanc', 'Lissandra', 'Lux', 'Malzahar', 'Morgana', 'Naafiri', 'Orianna', 'Ryze', 'Swain', 'Sylas', 'Syndra', 'Taliyah', 'Talon', 'Twisted Fate', 'Veigar', 'Vex', 'Viktor', 'Xerath', 'Yasuo', 'Zed', 'Ziggs', 'Zoe'],
  adc: ['Aphelios', 'Ashe', 'Caitlyn', 'Corki', 'Draven', 'Ezreal', 'Jhin', 'Jinx', 'Kai\'Sa', 'Kalista', 'Kog\'Maw', 'Lucian', 'Miss Fortune', 'Nilah', 'Samira', 'Seraphine', 'Sivir', 'Smolder', 'Tristana', 'Twitch', 'Varus', 'Xayah', 'Zeri', 'Yunara'],
  support: ['Alistar', 'Bard', 'Blitzcrank', 'Braum', 'Janna', 'Karma', 'Leona', 'Lulu', 'Milio', 'Nami', 'Nautilus', 'Neeko', 'Pyke', 'Rakan', 'Rell', 'Renata Glasc', 'Senna', 'Sona', 'Soraka', 'Taric', 'Thresh', 'Vel\'Koz', 'Yuumi', 'Zilean', 'Zyra', 'Mel']
} as const;

// Lane colors and display info
export const laneInfo = {
  top: { color: "#dc2626", icon: "⚔️", display: "TOP" },
  jungle: { color: "#16a34a", icon: "🌲", display: "JUNGLE" },
  mid: { color: "#2563eb", icon: "✨", display: "MID" },
  adc: { color: "#ca8a04", icon: "🏹", display: "ADC" },
  support: { color: "#9333ea", icon: "🛡️", display: "SUPPORT" }
} as const;

export type Lane = keyof typeof championPools;

// Convert champion display name to Data Dragon API format
export function getChampionUrlName(championName: string): string {
  const specialCases: Record<string, string> = {
    "Bel'Veth": "Belveth",
    "Cho'Gath": "Chogath",
    "Dr. Mundo": "DrMundo",
    "Jarvan IV": "JarvanIV",
    "K'Sante": "KSante",
    "Kai'Sa": "Kaisa",
    "Kha'Zix": "Khazix",
    "Kog'Maw": "KogMaw",
    "LeBlanc": "Leblanc",
    "Lee Sin": "LeeSin",
    "Master Yi": "MasterYi",
    "Miss Fortune": "MissFortune",
    "Nunu & Willump": "Nunu",
    "Rek'Sai": "RekSai",
    "Renata Glasc": "Renata",
    "Tahm Kench": "TahmKench",
    "Twisted Fate": "TwistedFate",
    "Vel'Koz": "Velkoz",
    "Xin Zhao": "XinZhao",
    "Aurelion Sol": "AurelionSol"
  };

  if (championName in specialCases) {
    return specialCases[championName];
  }

  return championName.replace(/'/g, "").replace(/ /g, "").replace(/\./g, "");
}

export const BASE_IMAGE_URL = "https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/";

