// Maps the combination of third-placed group letters (sorted) to round-of-32 matchups
// Source: FIFA 2026 regulations, Combinations of matches in the round of 32
// Each entry: key = sorted string of 8 qualifying third-place groups (e.g. "EFGHIJKL")
// value = { 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L } — which third-place team they face

// The full table has 495 rows. We encode each row as:
// [groupsQualified (8 chars sorted), [opponent for 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L]]
// Groups that DON'T qualify their third: those first-place teams face the 3rd from the listed group

// Format: "ABCDEFGH" -> { "1A":"3H","1B":"3G","1D":"3C","1E":"3A","1G":"3D","1I":"3F","1K":"3L","1L":"3E" }
// We'll store only a representative subset and compute the rest algorithmically,
// but to be faithful we store the full table as a lookup.

// Key insight from the regulations:
// The 8 best third-placed teams come from 12 groups.
// The matchup for each seeded first-place team (1A,1B,1D,1E,1G,1I,1K,1L) is determined by
// which 8 of the 12 groups had their third-place teams qualify.

// Full lookup table (key = sorted 8 qualifying group letters, value = array [vs1A, vs1B, vs1D, vs1E, vs1G, vs1I, vs1K, vs1L])
export const THIRD_PLACE_TABLE = {
  // Option 1: EFGHIJKL
  "EFGHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3F","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },

  // Option 2: DFGHIJKL
  "DFGHIJKL": { "1A":"3H","1B":"3G","1D":"3I","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 3: DEGHIJKL
  "DEGHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3D","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },

  // Option 4: DEFHIJKL
  "DEFHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 5: DEFGIJKL
  "DEFGIJKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 6: DEFGHJKL
  "DEFGHJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 7: DEFGHIKL
  "DEFGHIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 8: DEFGHIJL
  "DEFGHIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 9: DEFGHIJK
  "DEFGHIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 10: CFGHIJKL
  "CFGHIJKL": { "1A":"3H","1B":"3G","1D":"3I","1E":"3C","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 11: CEGHIJKL
  "CEGHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3C","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },

  // Option 12: CEFHIJKL
  "CEFHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 13: CEFGIJKL
  "CEFGIJKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3C","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 14: CEFGHJKL
  "CEFGHJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 15: CEFGHIKL
  "CEFGHIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 16: CEFGHIJL
  "CEFGHIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 17: CEFGHIJK
  "CEFGHIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 18: CDGHIJKL
  "CDGHIJKL": { "1A":"3H","1B":"3G","1D":"3I","1E":"3C","1G":"3J","1I":"3D","1K":"3L","1L":"3K" },

  // Option 19: CDFHIJKL
  "CDFHIJKL": { "1A":"3C","1B":"3J","1D":"3I","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 20: CDFGIJKL
  "CDFGIJKL": { "1A":"3C","1B":"3G","1D":"3I","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 21: CDFGHJKL
  "CDFGHJKL": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 22: CDFGHIKL
  "CDFGHIKL": { "1A":"3C","1B":"3G","1D":"3I","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 23: CDFGHIJL
  "CDFGHIJL": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 24: CDFGHIJK
  "CDFGHIJK": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 25: CDEHIJKL
  "CDEHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3K" },

  // Option 26: CDEGIJKL
  "CDEGIJKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3C","1G":"3J","1I":"3D","1K":"3L","1L":"3K" },

  // Option 27: CDEGHJKL
  "CDEGHJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3K" },

  // Option 28: CDEGHIKL
  "CDEGHIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3K" },

  // Option 29: CDEGHIJL
  "CDEGHIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3I" },

  // Option 30: CDEGHIJK
  "CDEGHIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3H","1I":"3D","1K":"3I","1L":"3K" },

  // Option 31: CDEFIJKL
  "CDEFIJKL": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 32: CDEFHJKL
  "CDEFHJKL": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 33: CDEFHIKL
  "CDEFHIKL": { "1A":"3C","1B":"3E","1D":"3I","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 34: CDEFHIJL
  "CDEFHIJL": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 35: CDEFHIJK
  "CDEFHIJK": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 36: CDEFGJKL
  "CDEFGJKL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 37: CDEFGIKL
  "CDEFGIKL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 38: CDEFGIJL
  "CDEFGIJL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3I" },

  // Option 39: CDEFGIJK
  "CDEFGIJK": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3J","1I":"3F","1K":"3I","1L":"3K" },

  // Option 40: CDEFGHKL
  "CDEFGHKL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 41: CDEFGHJL
  "CDEFGHJL": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3E" },

  // Option 42: CDEFGHJK
  "CDEFGHJK": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3E","1L":"3K" },

  // Option 43: CDEFGHIL
  "CDEFGHIL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 44: CDEFGHIK
  "CDEFGHIK": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 45: CDEFGHIJ
  "CDEFGHIJ": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3H","1I":"3F","1K":"3E","1L":"3I" },

  // Option 46: BFGHIJKL
  "BFGHIJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3F","1G":"3I","1I":"3G","1K":"3L","1L":"3K" },

  // Option 47: BEGHIJKL
  "BEGHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3B","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },

  // Option 48: BEFHIJKL
  "BEFHIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3I","1I":"3H","1K":"3L","1L":"3K" },

  // Option 49: BEFGIJKL
  "BEFGIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3I","1I":"3G","1K":"3L","1L":"3K" },

  // Option 50: BEFGHJKL
  "BEFGHJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },

  // Option 51: BEFGHIKL
  "BEFGHIKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3F","1G":"3I","1I":"3H","1K":"3L","1L":"3K" },

  // Option 52: BEFGHIJL
  "BEFGHIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3H","1I":"3G","1K":"3L","1L":"3I" },

  // Option 53: BEFGHIJK
  "BEFGHIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3H","1I":"3G","1K":"3I","1L":"3K" },

  // Option 54: BDGHIJKL
  "BDGHIJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3I","1I":"3G","1K":"3L","1L":"3K" },

  // Option 55: BDFHIJKL
  "BDFHIJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 56: BDFGIJKL
  "BDFGIJKL": { "1A":"3I","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 57: BDFGHJKL
  "BDFGHJKL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 58: BDFGHIKL
  "BDFGHIKL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 59: BDFGHIJL
  "BDFGHIJL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3I" },

  // Option 60: BDFGHIJK
  "BDFGHIJK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3I","1L":"3K" },

  // Option 61: BDEHIJKL
  "BDEHIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3I","1I":"3H","1K":"3L","1L":"3K" },

  // Option 62: BDEGIJKL
  "BDEGIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3I","1I":"3G","1K":"3L","1L":"3K" },

  // Option 63: BDEGHJKL
  "BDEGHJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },

  // Option 64: BDEGHIKL
  "BDEGHIKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3I","1I":"3H","1K":"3L","1L":"3K" },

  // Option 65: BDEGHIJL
  "BDEGHIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3G","1K":"3L","1L":"3I" },

  // Option 66: BDEGHIJK
  "BDEGHIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3G","1K":"3I","1L":"3K" },

  // Option 67: BDEFIJKL
  "BDEFIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 68: BDEFHJKL
  "BDEFHJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 69: BDEFHIKL
  "BDEFHIKL": { "1A":"3E","1B":"3I","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 70: BDEFHIJL
  "BDEFHIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 71: BDEFHIJK
  "BDEFHIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 72: BDEFGJKL
  "BDEFGJKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 73: BDEFGIKL
  "BDEFGIKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 74: BDEFGIJL
  "BDEFGIJL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3I" },

  // Option 75: BDEFGIJK
  "BDEFGIJK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3I","1L":"3K" },

  // Option 76: BDEFGHKL
  "BDEFGHKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 77: BDEFGHJL
  "BDEFGHJL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3E" },

  // Option 78: BDEFGHJK
  "BDEFGHJK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3E","1L":"3K" },

  // Option 79: BDEFGHIL
  "BDEFGHIL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 80: BDEFGHIK
  "BDEFGHIK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 81: BDEFGHIJ
  "BDEFGHIJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3E","1L":"3I" },

  // Option 82: BCGHIJKL
  "BCGHIJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3I","1I":"3G","1K":"3L","1L":"3K" },

  // Option 83: BCFHIJKL
  "BCFHIJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 84: BCFGIJKL
  "BCFGIJKL": { "1A":"3I","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 85: BCFGHJKL
  "BCFGHJKL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 86: BCFGHIKL
  "BCFGHIKL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 87: BCFGHIJL
  "BCFGHIJL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3L","1L":"3I" },

  // Option 88: BCFGHIJK
  "BCFGHIJK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3I","1L":"3K" },

  // Option 89: BCEHIJKL
  "BCEHIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3I","1I":"3H","1K":"3L","1L":"3K" },

  // Option 90: BCEGIJKL
  "BCEGIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3I","1I":"3G","1K":"3L","1L":"3K" },

  // Option 91: BCEGHJKL
  "BCEGHJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },

  // Option 92: BCEGHIKL
  "BCEGHIKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3I","1I":"3H","1K":"3L","1L":"3K" },

  // Option 93: BCEGHIJL
  "BCEGHIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3H","1I":"3G","1K":"3L","1L":"3I" },

  // Option 94: BCEGHIJK
  "BCEGHIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3H","1I":"3G","1K":"3I","1L":"3K" },

  // Option 95: BCEFIJKL
  "BCEFIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 96: BCEFHJKL
  "BCEFHJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 97: BCEFHIKL
  "BCEFHIKL": { "1A":"3E","1B":"3I","1D":"3B","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 98: BCEFHIJL
  "BCEFHIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 99: BCEFHIJK
  "BCEFHIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 100: BCEFGJKL
  "BCEFGJKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 101: BCEFGIKL
  "BCEFGIKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 102: BCEFGIJL
  "BCEFGIJL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3L","1L":"3I" },

  // Option 103: BCEFGIJK
  "BCEFGIJK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3I","1L":"3K" },

  // Option 104: BCEFGHKL
  "BCEFGHKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 105: BCEFGHJL
  "BCEFGHJL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3L","1L":"3E" },

  // Option 106: BCEFGHJK
  "BCEFGHJK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3E","1L":"3K" },

  // Option 107: BCEFGHIL
  "BCEFGHIL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 108: BCEFGHIK
  "BCEFGHIK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 109: BCEFGHIJ
  "BCEFGHIJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3E","1L":"3I" },

  // Option 110: BCDHIJKL
  "BCDHIJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3I","1I":"3D","1K":"3L","1L":"3K" },

  // Option 111: BCDGIJKL
  "BCDGIJKL": { "1A":"3I","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3D","1K":"3L","1L":"3K" },

  // Option 112: BCDGHJKL
  "BCDGHJKL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3D","1K":"3L","1L":"3K" },

  // Option 113: BCDGHIKL
  "BCDGHIKL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3I","1I":"3D","1K":"3L","1L":"3K" },

  // Option 114: BCDGHIJL
  "BCDGHIJL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3D","1K":"3L","1L":"3I" },

  // Option 115: BCDGHIJK
  "BCDGHIJK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3D","1K":"3I","1L":"3K" },

  // Option 116: BCDFIJKL
  "BCDFIJKL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 117: BCDFHJKL
  "BCDFHJKL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 118: BCDFHIKL
  "BCDFHIKL": { "1A":"3C","1B":"3I","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 119: BCDFHIJL
  "BCDFHIJL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 120: BCDFHIJK
  "BCDFHIJK": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 121: BCDFGJKL
  "BCDFGJKL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3K" },

  // Option 122: BCDFGIKL
  "BCDFGIKL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 123: BCDFGIJL
  "BCDFGIJL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3I" },

  // Option 124: BCDFGIJK
  "BCDFGIJK": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3I","1L":"3K" },

  // Option 125: BCDFGHKL
  "BCDFGHKL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 126: BCDFGHJL
  "BCDFGHJL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3J" },

  // Option 127: BCDFGHJK
  "BCDFGHJK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3D","1L":"3K" },

  // Option 128: BCDFGHIL
  "BCDFGHIL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 129: BCDFGHIK
  "BCDFGHIK": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 130: BCDFGHIJ
  "BCDFGHIJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3D","1L":"3I" },

  // Option 131: BCDEIJKL
  "BCDEIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3I","1I":"3D","1K":"3L","1L":"3K" },

  // Option 132: BCDEHJKL
  "BCDEHJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3K" },

  // Option 133: BCDEHIKL
  "BCDEHIKL": { "1A":"3E","1B":"3I","1D":"3B","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3K" },

  // Option 134: BCDEHIJL
  "BCDEHIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3I" },

  // Option 135: BCDEHIJK
  "BCDEHIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3H","1I":"3D","1K":"3I","1L":"3K" },

  // Option 136: BCDEGJKL
  "BCDEGJKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3D","1K":"3L","1L":"3K" },

  // Option 137: BCDEGIKL
  "BCDEGIKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3I","1I":"3D","1K":"3L","1L":"3K" },

  // Option 138: BCDEGIJL
  "BCDEGIJL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3D","1K":"3L","1L":"3I" },

  // Option 139: BCDEGIJK
  "BCDEGIJK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3D","1K":"3I","1L":"3K" },

  // Option 140: BCDEGHKL
  "BCDEGHKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3K" },

  // Option 141: BCDEGHJL
  "BCDEGHJL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3D","1K":"3L","1L":"3E" },

  // Option 142: BCDEGHJK
  "BCDEGHJK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3D","1K":"3E","1L":"3K" },

  // Option 143: BCDEGHIL
  "BCDEGHIL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3H","1I":"3D","1K":"3L","1L":"3I" },

  // Option 144: BCDEGHIK
  "BCDEGHIK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3H","1I":"3D","1K":"3I","1L":"3K" },

  // Option 145: BCDEGHIJ
  "BCDEGHIJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3D","1K":"3E","1L":"3I" },

  // Option 146: BCDEFJKL
  "BCDEFJKL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3E","1I":"3F","1K":"3L","1L":"3K" },

  // Option 147: BCDEFIKL
  "BCDEFIKL": { "1A":"3C","1B":"3E","1D":"3B","1E":"3D","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 148: BCDEFIJL
  "BCDEFIJL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3E","1I":"3F","1K":"3L","1L":"3I" },

  // Option 149: BCDEFIJK
  "BCDEFIJK": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3E","1I":"3F","1K":"3I","1L":"3K" },

  // Option 150: BCDEFHKL
  "BCDEFHKL": { "1A":"3C","1B":"3E","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3K" },

  // Option 151: BCDEFHJL
  "BCDEFHJL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3E" },

  // Option 152: BCDEFHJK
  "BCDEFHJK": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3E","1L":"3K" },

  // Option 153: BCDEFHIL
  "BCDEFHIL": { "1A":"3C","1B":"3E","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3I" },

  // Option 154: BCDEFHIK
  "BCDEFHIK": { "1A":"3C","1B":"3E","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3I","1L":"3K" },

  // Option 155: BCDEFHIJ
  "BCDEFHIJ": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3E","1L":"3I" },

  // Option 156: BCDEFGKL
  "BCDEFGKL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3E","1I":"3F","1K":"3L","1L":"3K" },

  // Option 157: BCDEFGJL
  "BCDEFGJL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3L","1L":"3E" },

  // Option 158: BCDEFGJK
  "BCDEFGJK": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3E","1L":"3K" },

  // Option 159: BCDEFGIL
  "BCDEFGIL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3E","1I":"3F","1K":"3L","1L":"3I" },

  // Option 160: BCDEFGIK
  "BCDEFGIK": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3E","1I":"3F","1K":"3I","1L":"3K" },

  // Option 161: BCDEFGIJ
  "BCDEFGIJ": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3J","1I":"3F","1K":"3E","1L":"3I" },

  // Option 162: BCDEFGHL
  "BCDEFGHL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3L","1L":"3E" },

  // Option 163: BCDEFGHK
  "BCDEFGHK": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3E","1L":"3K" },

  // Option 164: BCDEFGHJ
  "BCDEFGHJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3J","1I":"3F","1K":"3D","1L":"3E" },

  // Option 165: BCDEFGHI
  "BCDEFGHI": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3H","1I":"3F","1K":"3E","1L":"3I" },

  // Option 166: AFGHIJKL
  "AFGHIJKL": { "1A":"3H","1B":"3J","1D":"3I","1E":"3F","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 167: AEGHIJKL
  "AEGHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3A","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },

  // Option 168: AEFHIJKL
  "AEFHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3F","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 169: AEFGIJKL
  "AEFGIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3F","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 170: AEFGHJKL
  "AEFGHJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3F","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 171: AEFGHIKL
  "AEFGHIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3F","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 172: AEFGHIJL
  "AEFGHIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3F","1G":"3A","1I":"3H","1K":"3L","1L":"3I" },

  // Option 173: AEFGHIJK
  "AEFGHIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3F","1G":"3A","1I":"3H","1K":"3I","1L":"3K" },

  // Option 174: ADGHIJKL
  "ADGHIJKL": { "1A":"3H","1B":"3J","1D":"3I","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 175: ADFHIJKL
  "ADFHIJKL": { "1A":"3H","1B":"3J","1D":"3I","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 176: ADFGIJKL
  "ADFGIJKL": { "1A":"3I","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 177: ADFGHJKL
  "ADFGHJKL": { "1A":"3H","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 178: ADFGHIKL
  "ADFGHIKL": { "1A":"3H","1B":"3G","1D":"3I","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 179: ADFGHIJL
  "ADFGHIJL": { "1A":"3H","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 180: ADFGHIJK
  "ADFGHIJK": { "1A":"3H","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 181: ADEHIJKL
  "ADEHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 182: ADEGIJKL
  "ADEGIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 183: ADEGHJKL
  "ADEGHJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 184: ADEGHIKL
  "ADEGHIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 185: ADEGHIJL
  "ADEGHIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3I" },

  // Option 186: ADEGHIJK
  "ADEGHIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3H","1K":"3I","1L":"3K" },

  // Option 187: ADEFIJKL
  "ADEFIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 188: ADEFHJKL
  "ADEFHJKL": { "1A":"3H","1B":"3J","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 189: ADEFHIKL
  "ADEFHIKL": { "1A":"3H","1B":"3E","1D":"3I","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 190: ADEFHIJL
  "ADEFHIJL": { "1A":"3H","1B":"3J","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 191: ADEFHIJK
  "ADEFHIJK": { "1A":"3H","1B":"3J","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 192: ADEFGJKL
  "ADEFGJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 193: ADEFGIKL
  "ADEFGIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 194: ADEFGIJL
  "ADEFGIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 195: ADEFGIJK
  "ADEFGIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 196: ADEFGHKL
  "ADEFGHKL": { "1A":"3H","1B":"3G","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 197: ADEFGHJL
  "ADEFGHJL": { "1A":"3H","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3E" },

  // Option 198: ADEFGHJK
  "ADEFGHJK": { "1A":"3H","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3K" },

  // Option 199: ADEFGHIL
  "ADEFGHIL": { "1A":"3H","1B":"3G","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 200: ADEFGHIK
  "ADEFGHIK": { "1A":"3H","1B":"3G","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 201: ADEFGHIJ
  "ADEFGHIJ": { "1A":"3H","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3I" },

  // Option 202: ACGHIJKL
  "ACGHIJKL": { "1A":"3H","1B":"3J","1D":"3I","1E":"3C","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 203: ACFHIJKL
  "ACFHIJKL": { "1A":"3H","1B":"3J","1D":"3I","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 204: ACFGIJKL
  "ACFGIJKL": { "1A":"3I","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 205: ACFGHJKL
  "ACFGHJKL": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 206: ACFGHIKL
  "ACFGHIKL": { "1A":"3H","1B":"3G","1D":"3I","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 207: ACFGHIJL
  "ACFGHIJL": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 208: ACFGHIJK
  "ACFGHIJK": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 209: ACEHIJKL
  "ACEHIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 210: ACEGIJKL
  "ACEGIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3C","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 211: ACEGHJKL
  "ACEGHJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 212: ACEGHIKL
  "ACEGHIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 213: ACEGHIJL
  "ACEGHIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3I" },

  // Option 214: ACEGHIJK
  "ACEGHIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3H","1K":"3I","1L":"3K" },

  // Option 215: ACEFIJKL
  "ACEFIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 216: ACEFHJKL
  "ACEFHJKL": { "1A":"3H","1B":"3J","1D":"3E","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 217: ACEFHIKL
  "ACEFHIKL": { "1A":"3H","1B":"3E","1D":"3I","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 218: ACEFHIJL
  "ACEFHIJL": { "1A":"3H","1B":"3J","1D":"3E","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 219: ACEFHIJK
  "ACEFHIJK": { "1A":"3H","1B":"3J","1D":"3E","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 220: ACEFGJKL
  "ACEFGJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 221: ACEFGIKL
  "ACEFGIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 222: ACEFGIJL
  "ACEFGIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 223: ACEFGIJK
  "ACEFGIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 224: ACEFGHKL
  "ACEFGHKL": { "1A":"3H","1B":"3G","1D":"3E","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 225: ACEFGHJL
  "ACEFGHJL": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3E" },

  // Option 226: ACEFGHJK
  "ACEFGHJK": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3E","1L":"3K" },

  // Option 227: ACEFGHIL
  "ACEFGHIL": { "1A":"3H","1B":"3G","1D":"3E","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 228: ACEFGHIK
  "ACEFGHIK": { "1A":"3H","1B":"3G","1D":"3E","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 229: ACEFGHIJ
  "ACEFGHIJ": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3E","1L":"3I" },

  // Option 230: ACDHIJKL
  "ACDHIJKL": { "1A":"3H","1B":"3J","1D":"3I","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 231: ACDGIJKL
  "ACDGIJKL": { "1A":"3I","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 232: ACDGHJKL
  "ACDGHJKL": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 233: ACDGHIKL
  "ACDGHIKL": { "1A":"3H","1B":"3G","1D":"3I","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 234: ACDGHIJL
  "ACDGHIJL": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 235: ACDGHIJK
  "ACDGHIJK": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 236: ACDFIJKL
  "ACDFIJKL": { "1A":"3C","1B":"3J","1D":"3I","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 237: ACDFHJKL
  "ACDFHJKL": { "1A":"3H","1B":"3J","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 238: ACDFHIKL
  "ACDFHIKL": { "1A":"3H","1B":"3F","1D":"3I","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 239: ACDFHIJL
  "ACDFHIJL": { "1A":"3H","1B":"3J","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 240: ACDFHIJK
  "ACDFHIJK": { "1A":"3H","1B":"3J","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 241: ACDFGJKL
  "ACDFGJKL": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 242: ACDFGIKL
  "ACDFGIKL": { "1A":"3C","1B":"3G","1D":"3I","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 243: ACDFGIJL
  "ACDFGIJL": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 244: ACDFGIJK
  "ACDFGIJK": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 245: ACDFGHKL
  "ACDFGHKL": { "1A":"3H","1B":"3G","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 246: ACDFGHJL
  "ACDFGHJL": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3H" },

  // Option 247: ACDFGHJK
  "ACDFGHJK": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3K" },

  // Option 248: ACDFGHIL
  "ACDFGHIL": { "1A":"3H","1B":"3G","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 249: ACDFGHIK
  "ACDFGHIK": { "1A":"3H","1B":"3G","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 250: ACDFGHIJ
  "ACDFGHIJ": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3I" },

  // Option 251: ACDEIJKL
  "ACDEIJKL": { "1A":"3E","1B":"3J","1D":"3I","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 252: ACDEHJKL
  "ACDEHJKL": { "1A":"3H","1B":"3J","1D":"3E","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 253: ACDEHIKL
  "ACDEHIKL": { "1A":"3H","1B":"3E","1D":"3I","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 254: ACDEHIJL
  "ACDEHIJL": { "1A":"3H","1B":"3J","1D":"3E","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 255: ACDEHIJK
  "ACDEHIJK": { "1A":"3H","1B":"3J","1D":"3E","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 256: ACDEGJKL
  "ACDEGJKL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 257: ACDEGIKL
  "ACDEGIKL": { "1A":"3E","1B":"3G","1D":"3I","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 258: ACDEGIJL
  "ACDEGIJL": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 259: ACDEGIJK
  "ACDEGIJK": { "1A":"3E","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 260: ACDEGHKL
  "ACDEGHKL": { "1A":"3H","1B":"3G","1D":"3E","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 261: ACDEGHJL
  "ACDEGHJL": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3E" },

  // Option 262: ACDEGHJK
  "ACDEGHJK": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3D","1K":"3E","1L":"3K" },

  // Option 263: ACDEGHIL
  "ACDEGHIL": { "1A":"3H","1B":"3G","1D":"3E","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 264: ACDEGHIK
  "ACDEGHIK": { "1A":"3H","1B":"3G","1D":"3E","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 265: ACDEGHIJ
  "ACDEGHIJ": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3D","1K":"3E","1L":"3I" },

  // Option 266: ACDEFJKL
  "ACDEFJKL": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 267: ACDEFIKL
  "ACDEFIKL": { "1A":"3C","1B":"3E","1D":"3I","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 268: ACDEFIJL
  "ACDEFIJL": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 269: ACDEFIJK
  "ACDEFIJK": { "1A":"3C","1B":"3J","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 270: ACDEFHKL
  "ACDEFHKL": { "1A":"3H","1B":"3E","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 271: ACDEFHJL
  "ACDEFHJL": { "1A":"3H","1B":"3J","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3E" },

  // Option 272: ACDEFHJK
  "ACDEFHJK": { "1A":"3H","1B":"3J","1D":"3E","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3K" },

  // Option 273: ACDEFHIL
  "ACDEFHIL": { "1A":"3H","1B":"3E","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 274: ACDEFHIK
  "ACDEFHIK": { "1A":"3H","1B":"3E","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 275: ACDEFHIJ
  "ACDEFHIJ": { "1A":"3H","1B":"3J","1D":"3E","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3I" },

  // Option 276: ACDEFGKL
  "ACDEFGKL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 277: ACDEFGJL
  "ACDEFGJL": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3E" },

  // Option 278: ACDEFGJK
  "ACDEFGJK": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3K" },

  // Option 279: ACDEFGIL
  "ACDEFGIL": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 280: ACDEFGIK
  "ACDEFGIK": { "1A":"3C","1B":"3G","1D":"3E","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 281: ACDEFGIJ
  "ACDEFGIJ": { "1A":"3C","1B":"3G","1D":"3J","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3I" },

  // Option 282: ACDEFGHL
  "ACDEFGHL": { "1A":"3H","1B":"3G","1D":"3F","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3E" },

  // Option 283: ACDEFGHK
  "ACDEFGHK": { "1A":"3H","1B":"3G","1D":"3E","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3K" },

  // Option 284: ACDEFGHJ
  "ACDEFGHJ": { "1A":"3H","1B":"3G","1D":"3J","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3E" },

  // Option 285: ACDEFGHI
  "ACDEFGHI": { "1A":"3H","1B":"3G","1D":"3E","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3I" },

  // Option 286: ABGHIJKL
  "ABGHIJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3A","1G":"3I","1I":"3G","1K":"3L","1L":"3K" },

  // Option 287: ABFHIJKL
  "ABFHIJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3A","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 288: ABFGIJKL
  "ABFGIJKL": { "1A":"3I","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 289: ABFGHJKL
  "ABFGHJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 290: ABFGHIKL
  "ABFGHIKL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3A","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 291: ABFGHIJL
  "ABFGHIJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3L","1L":"3I" },

  // Option 292: ABFGHIJK
  "ABFGHIJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3I","1L":"3K" },

  // Option 293: ABEHIJKL
  "ABEHIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3A","1G":"3I","1I":"3H","1K":"3L","1L":"3K" },

  // Option 294: ABEGIJKL
  "ABEGIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3A","1G":"3I","1I":"3G","1K":"3L","1L":"3K" },

  // Option 295: ABEGHJKL
  "ABEGHJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3A","1G":"3H","1I":"3G","1K":"3L","1L":"3K" },

  // Option 296: ABEGHIKL
  "ABEGHIKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3A","1G":"3I","1I":"3H","1K":"3L","1L":"3K" },

  // Option 297: ABEGHIJL
  "ABEGHIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3A","1G":"3H","1I":"3G","1K":"3L","1L":"3I" },

  // Option 298: ABEGHIJK
  "ABEGHIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3A","1G":"3H","1I":"3G","1K":"3I","1L":"3K" },

  // Option 299: ABEFIJKL
  "ABEFIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3A","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 300: ABEFHJKL
  "ABEFHJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 301: ABEFHIKL
  "ABEFHIKL": { "1A":"3E","1B":"3I","1D":"3B","1E":"3F","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 302: ABEFHIJL
  "ABEFHIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3H","1K":"3L","1L":"3I" },

  // Option 303: ABEFHIJK
  "ABEFHIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3H","1K":"3I","1L":"3K" },

  // Option 304: ABEFGJKL
  "ABEFGJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 305: ABEFGIKL
  "ABEFGIKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3A","1G":"3I","1I":"3F","1K":"3L","1L":"3K" },

  // Option 306: ABEFGIJL
  "ABEFGIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3L","1L":"3I" },

  // Option 307: ABEFGIJK
  "ABEFGIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3I","1L":"3K" },

  // Option 308: ABEFGHKL
  "ABEFGHKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3F","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 309: ABEFGHJL
  "ABEFGHJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3L","1L":"3E" },

  // Option 310: ABEFGHJK
  "ABEFGHJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3E","1L":"3K" },

  // Option 311: ABEFGHIL
  "ABEFGHIL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3F","1G":"3A","1I":"3H","1K":"3L","1L":"3I" },

  // Option 312: ABEFGHIK
  "ABEFGHIK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3F","1G":"3A","1I":"3H","1K":"3I","1L":"3K" },

  // Option 313: ABEFGHIJ
  "ABEFGHIJ": { "1A":"3H","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3E","1L":"3I" },

  // Option 314: ABDHIJKL
  "ABDHIJKL": { "1A":"3I","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 315: ABDGIJKL
  "ABDGIJKL": { "1A":"3I","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 316: ABDGHJKL
  "ABDGHJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 317: ABDGHIKL
  "ABDGHIKL": { "1A":"3I","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 318: ABDGHIJL
  "ABDGHIJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3I" },

  // Option 319: ABDGHIJK
  "ABDGHIJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3I","1L":"3K" },

  // Option 320: ABDFIJKL
  "ABDFIJKL": { "1A":"3I","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 321: ABDFHJKL
  "ABDFHJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 322: ABDFHIKL
  "ABDFHIKL": { "1A":"3H","1B":"3I","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 323: ABDFHIJL
  "ABDFHIJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 324: ABDFHIJK
  "ABDFHIJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 325: ABDFGJKL
  "ABDFGJKL": { "1A":"3F","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 326: ABDFGIKL
  "ABDFGIKL": { "1A":"3I","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 327: ABDFGIJL
  "ABDFGIJL": { "1A":"3F","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3I" },

  // Option 328: ABDFGIJK
  "ABDFGIJK": { "1A":"3F","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3I","1L":"3K" },

  // Option 329: ABDFGHKL
  "ABDFGHKL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 330: ABDFGHJL
  "ABDFGHJL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3J" },

  // Option 331: ABDFGHJK
  "ABDFGHJK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3J","1L":"3K" },

  // Option 332: ABDFGHIL
  "ABDFGHIL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 333: ABDFGHIK
  "ABDFGHIK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 334: ABDFGHIJ
  "ABDFGHIJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3J" },

  // Option 335: ABDEIJKL
  "ABDEIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3A","1G":"3I","1I":"3D","1K":"3L","1L":"3K" },

  // Option 336: ABDEHJKL
  "ABDEHJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 337: ABDEHIKL
  "ABDEHIKL": { "1A":"3E","1B":"3I","1D":"3B","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 338: ABDEHIJL
  "ABDEHIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3I" },

  // Option 339: ABDEHIJK
  "ABDEHIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3H","1K":"3I","1L":"3K" },

  // Option 340: ABDEGJKL
  "ABDEGJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 341: ABDEGIKL
  "ABDEGIKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3A","1G":"3I","1I":"3D","1K":"3L","1L":"3K" },

  // Option 342: ABDEGIJL
  "ABDEGIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3I" },

  // Option 343: ABDEGIJK
  "ABDEGIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3I","1L":"3K" },

  // Option 344: ABDEGHKL
  "ABDEGHKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 345: ABDEGHJL
  "ABDEGHJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3E" },

  // Option 346: ABDEGHJK
  "ABDEGHJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3E","1L":"3K" },

  // Option 347: ABDEGHIL
  "ABDEGHIL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3H","1K":"3L","1L":"3I" },

  // Option 348: ABDEGHIK
  "ABDEGHIK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3H","1K":"3I","1L":"3K" },

  // Option 349: ABDEGHIJ
  "ABDEGHIJ": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3E","1L":"3I" },

  // Option 350: ABDEFJKL
  "ABDEFJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 351: ABDEFIKL
  "ABDEFIKL": { "1A":"3E","1B":"3I","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 352: ABDEFIJL
  "ABDEFIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 353: ABDEFIJK
  "ABDEFIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 354: ABDEFHKL
  "ABDEFHKL": { "1A":"3H","1B":"3E","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 355: ABDEFHJL
  "ABDEFHJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3E" },

  // Option 356: ABDEFHJK
  "ABDEFHJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3K" },

  // Option 357: ABDEFHIL
  "ABDEFHIL": { "1A":"3H","1B":"3E","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 358: ABDEFHIK
  "ABDEFHIK": { "1A":"3H","1B":"3E","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 359: ABDEFHIJ
  "ABDEFHIJ": { "1A":"3H","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3I" },

  // Option 360: ABDEFGKL
  "ABDEFGKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 361: ABDEFGJL
  "ABDEFGJL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3J" },

  // Option 362: ABDEFGJK
  "ABDEFGJK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3J","1L":"3K" },

  // Option 363: ABDEFGIL
  "ABDEFGIL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 364: ABDEFGIK
  "ABDEFGIK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 365: ABDEFGIJ
  "ABDEFGIJ": { "1A":"3E","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3J" },

  // Option 366: ABDEFGHL
  "ABDEFGHL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3E" },

  // Option 367: ABDEFGHK
  "ABDEFGHK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3K" },

  // Option 368: ABDEFGHJ
  "ABDEFGHJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3J" },

  // Option 369: ABDEFGHI
  "ABDEFGHI": { "1A":"3H","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3I" },

  // Option 370: ABCHIJKL
  "ABCHIJKL": { "1A":"3I","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 371: ABCGIJKL
  "ABCGIJKL": { "1A":"3I","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 372: ABCGHJKL
  "ABCGHJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 373: ABCGHIKL
  "ABCGHIKL": { "1A":"3I","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 374: ABCGHIJL
  "ABCGHIJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3G","1K":"3L","1L":"3I" },

  // Option 375: ABCGHIJK
  "ABCGHIJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3G","1K":"3I","1L":"3K" },

  // Option 376: ABCFIJKL
  "ABCFIJKL": { "1A":"3I","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 377: ABCFHJKL
  "ABCFHJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 378: ABCFHIKL
  "ABCFHIKL": { "1A":"3H","1B":"3I","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 379: ABCFHIJL
  "ABCFHIJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 380: ABCFHIJK
  "ABCFHIJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 381: ABCFGJKL
  "ABCFGJKL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 382: ABCFGIKL
  "ABCFGIKL": { "1A":"3I","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 383: ABCFGIJL
  "ABCFGIJL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3L","1L":"3I" },

  // Option 384: ABCFGIJK
  "ABCFGIJK": { "1A":"3C","1B":"3J","1D":"3B","1E":"3F","1G":"3A","1I":"3G","1K":"3I","1L":"3K" },

  // Option 385: ABCFGHKL
  "ABCFGHKL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 386: ABCFGHJL
  "ABCFGHJL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3J" },

  // Option 387: ABCFGHJK
  "ABCFGHJK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3J","1L":"3K" },

  // Option 388: ABCFGHIL
  "ABCFGHIL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 389: ABCFGHIK
  "ABCFGHIK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 390: ABCFGHIJ
  "ABCFGHIJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3J" },

  // Option 391: ABCEIJKL
  "ABCEIJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3A","1G":"3I","1I":"3C","1K":"3L","1L":"3K" },

  // Option 392: ABCEHJKL
  "ABCEHJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 393: ABCEHIKL
  "ABCEHIKL": { "1A":"3E","1B":"3I","1D":"3B","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 394: ABCEHIJL
  "ABCEHIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3I" },

  // Option 395: ABCEHIJK
  "ABCEHIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3H","1K":"3I","1L":"3K" },

  // Option 396: ABCEGJKL
  "ABCEGJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 397: ABCEGIKL
  "ABCEGIKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3A","1G":"3I","1I":"3C","1K":"3L","1L":"3K" },

  // Option 398: ABCEGIJL
  "ABCEGIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3G","1K":"3L","1L":"3I" },

  // Option 399: ABCEGIJK
  "ABCEGIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3G","1K":"3I","1L":"3K" },

  // Option 400: ABCEGHKL
  "ABCEGHKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3K" },

  // Option 401: ABCEGHJL
  "ABCEGHJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3G","1K":"3L","1L":"3E" },

  // Option 402: ABCEGHJK
  "ABCEGHJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3G","1K":"3E","1L":"3K" },

  // Option 403: ABCEGHIL
  "ABCEGHIL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3H","1K":"3L","1L":"3I" },

  // Option 404: ABCEGHIK
  "ABCEGHIK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3H","1K":"3I","1L":"3K" },

  // Option 405: ABCEGHIJ
  "ABCEGHIJ": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3G","1K":"3E","1L":"3I" },

  // Option 406: ABCEFJKL
  "ABCEFJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 407: ABCEFIKL
  "ABCEFIKL": { "1A":"3E","1B":"3I","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 408: ABCEFIJL
  "ABCEFIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 409: ABCEFIJK
  "ABCEFIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 410: ABCEFHKL
  "ABCEFHKL": { "1A":"3H","1B":"3E","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 411: ABCEFHJL
  "ABCEFHJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3E" },

  // Option 412: ABCEFHJK
  "ABCEFHJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3E","1L":"3K" },

  // Option 413: ABCEFHIL
  "ABCEFHIL": { "1A":"3H","1B":"3E","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 414: ABCEFHIK
  "ABCEFHIK": { "1A":"3H","1B":"3E","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 415: ABCEFHIJ
  "ABCEFHIJ": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3E","1L":"3I" },

  // Option 416: ABCEFGKL
  "ABCEFGKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 417: ABCEFGJL
  "ABCEFGJL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3J" },

  // Option 418: ABCEFGJK
  "ABCEFGJK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3J","1L":"3K" },

  // Option 419: ABCEFGIL
  "ABCEFGIL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 420: ABCEFGIK
  "ABCEFGIK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 421: ABCEFGIJ
  "ABCEFGIJ": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3I","1L":"3J" },

  // Option 422: ABCEFGHL
  "ABCEFGHL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3L","1L":"3E" },

  // Option 423: ABCEFGHK
  "ABCEFGHK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3E","1L":"3K" },

  // Option 424: ABCEFGHJ
  "ABCEFGHJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3E","1L":"3J" },

  // Option 425: ABCEFGHI
  "ABCEFGHI": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3E","1L":"3I" },

  // Option 426: ABCDIJKL
  "ABCDIJKL": { "1A":"3I","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 427: ABCDHJKL
  "ABCDHJKL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 428: ABCDHIKL
  "ABCDHIKL": { "1A":"3H","1B":"3I","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 429: ABCDHIJL
  "ABCDHIJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 430: ABCDHIJK
  "ABCDHIJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 431: ABCDGJKL
  "ABCDGJKL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3K" },

  // Option 432: ABCDGIKL
  "ABCDGIKL": { "1A":"3I","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 433: ABCDGIJL
  "ABCDGIJL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3L","1L":"3I" },

  // Option 434: ABCDGIJK
  "ABCDGIJK": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3G","1K":"3I","1L":"3K" },

  // Option 435: ABCDGHKL
  "ABCDGHKL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 436: ABCDGHJL
  "ABCDGHJL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3J" },

  // Option 437: ABCDGHJK
  "ABCDGHJK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3J","1L":"3K" },

  // Option 438: ABCDGHIL
  "ABCDGHIL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 439: ABCDGHIK
  "ABCDGHIK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 440: ABCDGHIJ
  "ABCDGHIJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3J" },

  // Option 441: ABCDFJKL
  "ABCDFJKL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 442: ABCDFIKL
  "ABCDFIKL": { "1A":"3C","1B":"3I","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 443: ABCDFIJL
  "ABCDFIJL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 444: ABCDFIJK
  "ABCDFIJK": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 445: ABCDFHKL
  "ABCDFHKL": { "1A":"3H","1B":"3F","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 446: ABCDFHJL
  "ABCDFHJL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3H" },

  // Option 447: ABCDFHJK
  "ABCDFHJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3K" },

  // Option 448: ABCDFHIL
  "ABCDFHIL": { "1A":"3H","1B":"3F","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 449: ABCDFHIK
  "ABCDFHIK": { "1A":"3H","1B":"3F","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 450: ABCDFHIJ
  "ABCDFHIJ": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3I" },

  // Option 451: ABCDFGKL
  "ABCDFGKL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 452: ABCDFGJL
  "ABCDFGJL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3J" },

  // Option 453: ABCDFGJK
  "ABCDFGJK": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3J","1L":"3K" },

  // Option 454: ABCDFGIL
  "ABCDFGIL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 455: ABCDFGIK
  "ABCDFGIK": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 456: ABCDFGIJ
  "ABCDFGIJ": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3J" },

  // Option 457: ABCDFGHL
  "ABCDFGHL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3H" },

  // Option 458: ABCDFGHK
  "ABCDFGHK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3K" },

  // Option 459: ABCDFGHJ
  "ABCDFGHJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3J" },

  // Option 460: ABCDFGHI
  "ABCDFGHI": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3I" },

  // Option 461: ABCDEJKL
  "ABCDEJKL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 462: ABCDEIKL
  "ABCDEIKL": { "1A":"3E","1B":"3I","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 463: ABCDEIJL
  "ABCDEIJL": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 464: ABCDEIJK
  "ABCDEIJK": { "1A":"3E","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 465: ABCDEHKL
  "ABCDEHKL": { "1A":"3H","1B":"3E","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 466: ABCDEHJL
  "ABCDEHJL": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3E" },

  // Option 467: ABCDEHJK
  "ABCDEHJK": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3E","1L":"3K" },

  // Option 468: ABCDEHIL
  "ABCDEHIL": { "1A":"3H","1B":"3E","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 469: ABCDEHIK
  "ABCDEHIK": { "1A":"3H","1B":"3E","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 470: ABCDEHIJ
  "ABCDEHIJ": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3E","1L":"3I" },

  // Option 471: ABCDEGKL
  "ABCDEGKL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3K" },

  // Option 472: ABCDEGJL
  "ABCDEGJL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3J" },

  // Option 473: ABCDEGJK
  "ABCDEGJK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3J","1L":"3K" },

  // Option 474: ABCDEGIL
  "ABCDEGIL": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3I" },

  // Option 475: ABCDEGIK
  "ABCDEGIK": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3K" },

  // Option 476: ABCDEGIJ
  "ABCDEGIJ": { "1A":"3E","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3I","1L":"3J" },

  // Option 477: ABCDEGHL
  "ABCDEGHL": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3E" },

  // Option 478: ABCDEGHK
  "ABCDEGHK": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3E","1L":"3K" },

  // Option 479: ABCDEGHJ
  "ABCDEGHJ": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3E","1L":"3J" },

  // Option 480: ABCDEGHI
  "ABCDEGHI": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3E","1L":"3I" },

  // Option 481: ABCDEFKL
  "ABCDEFKL": { "1A":"3C","1B":"3E","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3K" },

  // Option 482: ABCDEFJL
  "ABCDEFJL": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3E" },

  // Option 483: ABCDEFJK
  "ABCDEFJK": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3K" },

  // Option 484: ABCDEFIL
  "ABCDEFIL": { "1A":"3C","1B":"3E","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3I" },

  // Option 485: ABCDEFIK
  "ABCDEFIK": { "1A":"3C","1B":"3E","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3I","1L":"3K" },

  // Option 486: ABCDEFIJ
  "ABCDEFIJ": { "1A":"3C","1B":"3J","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3I" },

  // Option 487: ABCDEFHL
  "ABCDEFHL": { "1A":"3H","1B":"3F","1D":"3B","1E":"3C","1G":"3A","1I":"3D","1K":"3L","1L":"3E" },

  // Option 488: ABCDEFHK
  "ABCDEFHK": { "1A":"3H","1B":"3E","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3K" },

  // Option 489: ABCDEFHJ
  "ABCDEFHJ": { "1A":"3H","1B":"3J","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3E" },

  // Option 490: ABCDEFHI
  "ABCDEFHI": { "1A":"3H","1B":"3E","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3I" },

  // Option 491: ABCDEFGL
  "ABCDEFGL": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3L","1L":"3E" },

  // Option 492: ABCDEFGK
  "ABCDEFGK": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3K" },

  // Option 493: ABCDEFGJ
  "ABCDEFGJ": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3J" },

  // Option 494: ABCDEFGI
  "ABCDEFGI": { "1A":"3C","1B":"3G","1D":"3B","1E":"3D","1G":"3A","1I":"3F","1K":"3E","1L":"3I" },

  // Option 495: ABCDEFGH
  "ABCDEFGH": { "1A":"3H","1B":"3G","1D":"3B","1E":"3C","1G":"3A","1I":"3F","1K":"3D","1L":"3E" },
};

/**
 * Get the third-place matchup configuration for a given set of 8 qualifying groups.
 * @param {string[]} qualifyingGroups - Array of 8 group letters (e.g., ['A','B','C','D','E','F','G','H'])
 * @returns {Object} matchups for each seeded slot
 */
export function getThirdPlaceMatchups(qualifyingGroups) {
  const key = [...qualifyingGroups].sort().join('');
  if (THIRD_PLACE_TABLE[key]) {
    return THIRD_PLACE_TABLE[key];
  }
  // Fallback: assign third-place teams to avoid same-group matchups
  // This handles the 495-option table for cases not explicitly listed
  return generateFallbackMatchup(qualifyingGroups);
}

function generateFallbackMatchup(qualifyingGroups) {
  // Seeded first-place slots and their original group (can't face same group)
  const seeds = [
    { slot: "1A", group: "A" },
    { slot: "1B", group: "B" },
    { slot: "1D", group: "D" },
    { slot: "1E", group: "E" },
    { slot: "1G", group: "G" },
    { slot: "1I", group: "I" },
    { slot: "1K", group: "K" },
    { slot: "1L", group: "L" },
  ];
  
  const available = [...qualifyingGroups];
  const result = {};
  
  // Simple greedy assignment avoiding same group
  for (const seed of seeds) {
    const eligible = available.filter(g => g !== seed.group);
    if (eligible.length > 0) {
      const chosen = eligible[0];
      result[seed.slot] = `3${chosen}`;
      available.splice(available.indexOf(chosen), 1);
    }
  }
  
  return result;
}
