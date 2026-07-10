/**
 * JG Mechanic — Benny's vareshop (indkøbspriser).
 * defaultPrice = seneste kendte pris fra ingame shop.
 * Opdateres dagligt via ,pris opdater (gemmes i data/jg-prices.json).
 */
export const JG_MARKUP_PERCENT = 20;
export const JG_SHOP_LABEL = "Bennys mekaniker (JG shop)";

export const jgPartsCatalog = [
  { id: "mechanic_tablet", label: "Mekaniker Tablet", aliases: ["tablet", "mekaniker tablet"], defaultPrice: 4800, category: "værktøj" },
  { id: "lighting_controller", label: "Lys Controller", aliases: ["lys", "lys controller", "carplay"], defaultPrice: 185, category: "ekstra" },
  { id: "cleaning_kit", label: "Rengørings Kit", aliases: ["rengøring", "cleaning"], defaultPrice: 173, category: "værktøj" },
  { id: "engine_oil", label: "Motor Olie", aliases: ["olie", "motor olie"], defaultPrice: 120, category: "service" },
  { id: "spark_plug", label: "Tændrør", aliases: ["tændrør", "tændrørss"], defaultPrice: 150, category: "service" },
  { id: "air_filter", label: "Luft Filter", aliases: ["luftfilter", "luft filter"], defaultPrice: 135, category: "service" },
  { id: "repair_kit", label: "Repair Kit", aliases: ["repair", "reparations kit", "reparations-kit"], defaultPrice: 638, category: "værktøj" },
  { id: "tyre_replacement", label: "Hjul Udskiftning", aliases: ["hjul udskiftning", "dæk skift"], defaultPrice: 1485, category: "service" },
  { id: "clutch_replacement", label: "Koblings Udskiftning", aliases: ["kobling", "koblings udskiftning"], defaultPrice: 2331, category: "service" },
  { id: "brakepad_replacement", label: "Bremseklods Udskiftning", aliases: ["bremseklods", "bremseklodser"], defaultPrice: 3087, category: "service" },
  { id: "suspension_parts", label: "Affjedrings Dele", aliases: ["affjedring", "affjedrings dele", "stance"], defaultPrice: 5742, category: "tuning" },
  { id: "slick_tyres", label: "Slick Hjul", aliases: ["slick", "slick hjul", "slick dæk"], defaultPrice: 10710, category: "dæk" },
  { id: "semi_slick_tyres", label: "Semi Slick Hjul", aliases: ["semi slick", "semi-slick"], defaultPrice: 8100, category: "dæk" },
  { id: "offroad_tyres", label: "Offroad Hjul", aliases: ["offroad", "offroad dæk"], defaultPrice: 8370, category: "dæk" },
  { id: "drift_tuning_kit", label: "Drift Tuning Kit", aliases: ["drift", "drift kit"], defaultPrice: 5569, category: "tuning" },
  { id: "ceramic_brakes", label: "Ceramic Brakes", aliases: ["ceramic", "keramiske bremser", "bremser", "ceramic brakes"], defaultPrice: 18150, category: "tuning" },
  { id: "stancing_kit", label: "Stancer Kit", aliases: ["stancer", "stance kit", "stance-kit"], defaultPrice: 11475, category: "tuning" },
  { id: "cosmetic_part", label: "Cosmetic Dele", aliases: ["cosmetic", "kosmetik", "styling"], defaultPrice: 5340, category: "styling" },
  { id: "respray_kit", label: "Respray Kit", aliases: ["respray", "lak", "maling"], defaultPrice: 8925, category: "styling" },
  { id: "vehicle_wheels", label: "Køretøj Hjul Sæt", aliases: ["hjul sæt", "fælge", "wheels"], defaultPrice: 10605, category: "styling" },
  { id: "tyre_smoke_kit", label: "Hjul Smoke Kit", aliases: ["smoke", "dækrøg", "tyre smoke"], defaultPrice: 10530, category: "styling" },
  { id: "bulletproof_tyres", label: "Bulletproof Hjul", aliases: ["bulletproof", "skudsikre hjul"], defaultPrice: 12941250, category: "dæk" },
  { id: "extras_kit", label: "Extras Kit", aliases: ["extras", "ekstra kit"], defaultPrice: 7740, category: "styling" },
  { id: "nitrous_bottle", label: "Nitrous Flaske", aliases: ["nitrous flaske", "n2o flaske", "nos genfyld", "genfyld"], defaultPrice: 2232, category: "nitrous" },
  { id: "empty_nitrous_bottle", label: "Tom Nitrous Flaske", aliases: ["tom nitrous", "tom n2o"], defaultPrice: 1103, category: "nitrous" },
  { id: "nitrous_install_kit", label: "Nitrous Install Kit", aliases: ["nitrous", "n2o", "nos", "nitrous install"], defaultPrice: 112500, category: "nitrous" },
  { id: "duct_tape", label: "Gaffa Tape", aliases: ["gaffa", "duct tape"], defaultPrice: 67, category: "værktøj" },
  { id: "performance_part", label: "Performance Dele", aliases: ["performance", "performance dele"], defaultPrice: 17100, category: "tuning" },
  { id: "towing_rope", label: "Towing Rope", aliases: ["tog reb", "bugser reb", "towing"], defaultPrice: 4425, category: "værktøj" },
  { id: "car_winch", label: "Car Winch", aliases: ["vinsj", "winch"], defaultPrice: 17438, category: "værktøj" },
  { id: "bike_rack", label: "Bike Rack", aliases: ["cykelholder", "bike rack"], defaultPrice: 8176, category: "ekstra" },
  { id: "roofbox_colormatched", label: "Roofbox - Colormatched", aliases: ["roofbox", "tagboks"], defaultPrice: 21825, category: "ekstra" },
  { id: "roofbox_carbon", label: "Roofbox - Carbon", aliases: ["roofbox carbon", "carbon roofbox"], defaultPrice: 21000, category: "ekstra" },
  { id: "ev_battery", label: "Bil Batteri", aliases: ["batteri", "bil batteri", "ev battery"], defaultPrice: 16201, category: "service" },
  { id: "ev_coolant", label: "Batteri Køler", aliases: ["batteri køler", "køler"], defaultPrice: 1365, category: "service" },
  // Motorer — typisk ikke i vareshop; opdateres manuelt når I ser pris i tablet
  { id: "i4_engine", label: "I4 Motor", aliases: ["i4", "4 cylinder"], defaultPrice: null, category: "motor" },
  { id: "v6_engine", label: "V6 Motor", aliases: ["v6", "v6 motor"], defaultPrice: null, category: "motor" },
  { id: "v8_engine", label: "V8 Motor", aliases: ["v8", "v8 motor"], defaultPrice: null, category: "motor" },
  { id: "v12_engine", label: "V12 Motor", aliases: ["v12", "v12 motor"], defaultPrice: null, category: "motor" },
  { id: "awd_drivetrain", label: "Firehjulstræk (AWD)", aliases: ["awd", "4wd", "firehjul", "firehjulstræk"], defaultPrice: null, category: "tuning" },
  { id: "turbocharger", label: "Turbo", aliases: ["turbo", "turbocharger"], defaultPrice: null, category: "tuning" },
];

const catalogById = new Map(jgPartsCatalog.map((p) => [p.id, p]));

export function getPartById(id) {
  return catalogById.get(String(id).toLowerCase().replace(/\s+/g, "_"));
}

export function normalizePartQuery(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/-/g, " ");
}

/** Finder del via id, alias eller delvis match */
export function resolvePart(query) {
  const q = normalizePartQuery(query);
  if (!q) return null;

  const asId = q.replace(/\s+/g, "_");
  const direct = getPartById(asId);
  if (direct) return direct;

  for (const part of jgPartsCatalog) {
    if (part.id === asId) return part;
    if (part.label.toLowerCase() === q) return part;
    if (part.aliases.some((a) => a.toLowerCase() === q)) return part;
  }

  for (const part of jgPartsCatalog) {
    if (part.id.includes(asId) || asId.includes(part.id)) return part;
    if (part.label.toLowerCase().includes(q) || q.includes(part.label.toLowerCase())) return part;
    if (part.aliases.some((a) => a.includes(q) || q.includes(a))) return part;
  }

  return null;
}
