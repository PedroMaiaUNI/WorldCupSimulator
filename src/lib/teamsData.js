// Default 48 teams for the 2026 FIFA World Cup
// Groups A-L with 4 teams each
// Flags use emoji for universal support; admin can customize

export const DEFAULT_TEAMS = [
  // GROUP A (USA host)
  { id: "MEX", name: "México", flag: "🇲🇽", group: "A" },
  { id: "RSA", name: "África do Sul", flag: "🇿🇦", group: "A" },
  { id: "KOR", name: "Coreia do Sul", flag: "🇰🇷", group: "A" },
  { id: "CZE", name: "República Tcheca", flag: "🇨🇿", group: "A" },

  // GROUP B
  { id: "CAN", name: "Canadá", flag: "🇨🇦", group: "B" },
  { id: "BIH", name: "Bósnia", flag: "🇧🇦", group: "B" },
  { id: "QAT", name: "Catar", flag: "🇶🇦", group: "B" },
  { id: "SUI", name: "Suíça", flag: "🇨🇭", group: "B" },

  // GROUP C
  { id: "BRA", name: "Brasil", flag: "🇧🇷", group: "C" },
  { id: "MAR", name: "Marrocos", flag: "🇲🇦", group: "C" },
  { id: "HTI", name: "Haiti", flag: "🇭🇹", group: "C" },
  { id: "SCO", name: "Escócia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C" },

  // GROUP D
  { id: "USA", name: "Estados Unidos", flag: "🇺🇸", group: "D" },
  { id: "PAR", name: "Paraguai", flag: "🇵🇾", group: "D" },
  { id: "AUS", name: "Austrália", flag: "🇦🇺", group: "D" },
  { id: "TUR", name: "Turquia", flag: "🇹🇷", group: "D" },

  // GROUP E
  { id: "GER", name: "Alemanha", flag: "🇩🇪", group: "E" },
  { id: "CUW", name: "Curaçao", flag: "🇨🇼", group: "E" },
  { id: "CIV", name: "Costa do Marfim", flag: "🇨🇮", group: "E" },
  { id: "ECU", name: "Equador", flag: "🇪🇨", group: "E" },

  // GROUP F
  { id: "NED", name: "Holanda", flag: "🇳🇱", group: "F" },
  { id: "JPN", name: "Japão", flag: "🇯🇵", group: "F" },
  { id: "SWE", name: "Suécia", flag: "🇸🇪", group: "F" },
  { id: "TUN", name: "Tunísia", flag: "🇹🇳", group: "F" },

  // GROUP G
  { id: "BEL", name: "Bélgica", flag: "🇧🇪", group: "G" },
  { id: "EGY", name: "Egito", flag: "🇪🇬", group: "G" },
  { id: "IRN", name: "Irã", flag: "🇮🇷", group: "G" },
  { id: "NZL", name: "Nova Zelândia", flag: "🇳🇿", group: "G" },

  // GROUP H
  { id: "ESP", name: "Espanha", flag: "🇪🇸", group: "H" },
  { id: "CPV", name: "Cabo Verde", flag: "🇨🇻", group: "H" },
  { id: "KSA", name: "Arábia Saudita", flag: "🇸🇦", group: "H" },
  { id: "URU", name: "Uruguai", flag: "🇺🇾", group: "H" },

  // GROUP I
  { id: "FRA", name: "França", flag: "🇫🇷", group: "I" },
  { id: "SEN", name: "Senegal", flag: "🇸🇳", group: "I" },
  { id: "IRQ", name: "Iraque", flag: "🇮🇶", group: "I" },
  { id: "NOR", name: "Noruega", flag: "🇳🇴", group: "I" },

  // GROUP J
  { id: "ARG", name: "Argentina", flag: "🇦🇷", group: "J" },
  { id: "ALG", name: "Argélia", flag: "🇩🇿", group: "J" },
  { id: "AUT", name: "Áustria", flag: "🇦🇹", group: "J" },
  { id: "JOR", name: "Jordânia", flag: "🇯🇴", group: "J" },

  // GROUP K
  { id: "POR", name: "Portugal", flag: "🇵🇹", group: "K" },
  { id: "COD", name: "RD Congo", flag: "🇨🇩", group: "K" },
  { id: "UZB", name: "Uzbequistão", flag: "🇺🇿", group: "K" },
  { id: "COL", name: "Colômbia", flag: "🇨🇴", group: "K" },

  // GROUP L
  { id: "ENG", name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L" },
  { id: "CRO", name: "Croácia", flag: "🇭🇷", group: "L" },
  { id: "GHA", name: "Gana", flag: "🇬🇭", group: "L" },
  { id: "PAN", name: "Panamá", flag: "🇵🇦", group: "L" },
];

export const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

// Seeded slots from the regulations
// Fixed crossings (1st vs 2nd):
export const FIXED_CROSSINGS = [
  { match: "R32_1", home: "2A", away: "2B" },
  { match: "R32_2", home: "1F", away: "2C" },
  { match: "R32_3", home: "1C", away: "2F" },
  { match: "R32_4", home: "2E", away: "2I" },
  { match: "R32_5", home: "2K", away: "2L" },
  { match: "R32_6", home: "1H", away: "2J" },
  { match: "R32_7", home: "1J", away: "2H" },
  { match: "R32_8", home: "2D", away: "2G" },
];

// Variable crossings (1st vs best 3rd):
export const VARIABLE_CROSSING_SLOTS = ["1A","1B","1D","1E","1G","1I","1K","1L"];

// Bracket structure for round of 32 to final
// This defines which R32 winners meet in R16, QF, SF, Final
// The bracket is fixed once R32 matchups are determined
export const BRACKET_PAIRS_R16 = [
  // [match1, match2] -> winner plays each other in QF
  // Left side of bracket
  { r16: "R16_1", r32matches: ["R32_1", "R32_2"] },
  { r16: "R16_2", r32matches: ["R32_3", "R32_4"] },
  { r16: "R16_3", r32matches: ["R32_5", "R32_6"] },
  { r16: "R16_4", r32matches: ["R32_7", "R32_8"] },
  // Right side
  { r16: "R16_5", r32matches: ["R32_9", "R32_10"] },
  { r16: "R16_6", r32matches: ["R32_11", "R32_12"] },
  { r16: "R16_7", r32matches: ["R32_13", "R32_14"] },
  { r16: "R16_8", r32matches: ["R32_15", "R32_16"] },
];
