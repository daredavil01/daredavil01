const D = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};
export const toAr = (s) => String(s).replace(/[०-९]/g, (c) => D[c] || c);

const num = (s) => {
  const m = toAr(String(s || ""))
    .replace(/,/g, "")
    .match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
};

const bool = (s) => {
  s = (s || "").trim();
  if (s === "होय" || s === "आहे") return true;
  if (s.includes("नाही")) return false;
  return s.includes("होय") || s.includes("आहे");
};

function csvParse(text) {
  const out = [],
    rec = [];
  let f = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") {
        rec.push(f);
        f = "";
      } else if (c === "\n") {
        rec.push(f);
        f = "";
        out.push([...rec]);
        rec.length = 0;
      } else if (c !== "\r") f += c;
    }
  }
  rec.push(f);
  if (rec.some((x) => x.trim())) out.push(rec);
  return out;
}

// Canonical spellings for known variants (after bracket-stripping)
const VILLAGE_CANON = {
  खापरमळ: "खापरमाळ", // missing ा
  नवाड्यापाडा: "नवाड्या पाडा", // missing space
  "नावाड्या पाडा": "नवाड्या पाडा", // alternate vowel
  निवसापाडा: "निवसा पाडा", // missing space
  "निवास पाडा": "निवसा पाडा", // निवास → निवसा
  "नेवसा पाडा": "निवसा पाडा", // नेवसा → निवसा
  "पारिल पाडा": "पाटील पाडा", // misspelling
};

function normalizeVillage(raw) {
  if (!raw) return "";
  // Collapse whitespace, strip sub-hamlet info in parentheses, re-trim
  let s = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .trim();
  return VILLAGE_CANON[s] || s;
}

export function parseCSV(text) {
  const rows = csvParse(text).slice(1);
  const out = [];
  for (const r of rows) {
    if (r.length < 8) continue;
    const n = num(r[0]);
    if (!n) continue;

    const ages = (r[47] || "")
      .split("\n")
      .map((s) => num(s.trim()))
      .filter((x) => x > 0);
    const edu = (r[48] || "")
      .split("\n")
      .map((s) => toAr(s.trim()))
      .filter(Boolean);

    out.push({
      sr_no: n,
      village: normalizeVillage(toAr(r[1] || "")),
      // r[2]: head name — omitted (PII)
      age: num(r[3]),
      caste: (r[4] || "").trim(),
      education: toAr((r[5] || "").trim()),
      occupation: (r[6] || "").trim(),
      // r[7]: mobile number — omitted (PII)
      land_acres: num(r[8]),
      well_borewell: (r[9] || "").trim(),
      mahua_trees: num(r[10]),
      tendu_collect: bool(r[11]),
      forest_land: bool(r[12]),
      satbara: bool(r[13]),
      ration_card: bool(r[14]),
      gas_cylinder: bool(r[15]),
      aadhaar: bool(r[16]),
      voter_id: bool(r[17]),
      health_card: bool(r[18]),
      driving_license: bool(r[19]),
      job_card: bool(r[20]),
      mnrega_work: bool(r[21]),
      caste_cert: bool(r[22]),
      has_cattle: num(r[23]) > 0,
      goats: num(r[24]),
      chickens: num(r[25]),
      donkeys: num(r[26]),
      water_source: (r[27] || "").trim(),
      labor_place: (r[28] || "").trim(),
      labor_work: (r[29] || "").trim(),
      children_school: bool(r[30]),
      school_name: (r[31] || "").replace(/\n/g, " ").trim(),
      bank_account: bool(r[32]),
      bank_name: (r[33] || "").trim(),
      toilet_use: bool(r[34]),
      vegetables: bool(r[35]),
      women_shg: bool(r[36]),
      govt_scheme: bool(r[37]),
      motorcycle: bool(r[38]),
      loan_amount: num(r[39]),
      own_house: bool(r[40]),
      house_type: (r[41] || "").trim(),
      has_mobile: bool(r[42]),
      mobile_type: (r[43] || "").trim(),
      annual_income: num(r[44]),
      illness: (r[45] || "").trim(),
      // r[46]: member names — omitted (PII)
      member_ages: ages,
      member_education: edu,
      member_occupation: (r[49] || "").trim(),
      birth_cert: bool(r[50]),
      family_size: ages.length + 1,
    });
  }
  return out;
}
