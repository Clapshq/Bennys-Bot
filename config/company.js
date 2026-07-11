import { rolesConfig } from "../config/roles.js";

export const company = {
  name: "Benny's Original Motor Works",
  shortName: "Benny's",
  location: "Postal 102 · Strawberry værkstedet (Benny's Original Motor Works)",
  postal: 102,

  vision:
    "Vi skaber aktivt og fedt mekaniker-RP med fokus på god kundeservice, konkurrencedygtige priser og events som biltræf.",

  revenue: {
    income: ["Reparationer", "Bugsering", "Tuning", "Styling", "Service"],
    expenses: ["Materialer og reservedele", "Procentudbetalinger til ansatte"],
  },

  profitTarget: 2000,

  payroll:
    "Benny's lønsystem kører via **ingame ordresystem**, **personlige løn-kanaler** og vores **ticket-system**.",

  payrollRules: [
    "Ordre via ingame ordresystem → **automatisk udbetaling** til den ansatte",
    "Arbejde uden ordre → upload **screenshot af faktura** i `#💰-løn-[dit-navn]`",
    "Ledelsen gennemgår fakturaer og holder firmakassen opdateret",
  ],

  /** Vigtigt — vises i medarbejder-kanaler */
  staffGuidelines: [
    "Tjek **altid** hvad delene koster os at bestille **inden** du giver kunden en pris",
    "Sørg for minimum **2.000 kr. i profit** per ordre efter materialer og løn",
    "Dækker prisen ikke omkostningerne → kræv en **ekstra faktura** hos kunden",
    "Følg priserne i **#priser** — afvigelser skal godkendes af ledelse",
    "Ved tvivl: spørg ledelse **før** du accepterer ordren",
  ],

  developerRequirements: "Benny's MLO beholdes præcis som det står.",

  startupCapital: "Vi er klar til at dække opstartsomkostninger og holde økonomien stabil.",

  contact: {
    ingame: "Postal 102 · Strawberry værkstedet (Benny's)",
    discord: "Brug ticket-knapperne i #kontakt eller #bestillinger",
    hours: "Åbent når der er mekanikere på vagt",
  },

  priceSections: [
    {
      title: "🔧 Reparationer & bugsering",
      lines: [
        "**Bugsering** (alle køretøjstyper): **1.950,-**",
        "└ Udenfor byen: **+500,-** · Nord for Route 68: **+1.000,-** · Nord for Sandy: **+2.000,-**",
        "**OBS.** *Af sikkerhedshensyn bugseres der ikke til/fra Cayo Perico*",
        "",
        "**Reparation:** **1.450,-**",
        "└ Udenfor værksted: **+2.000,-** · Udenfor by: **+500,-** · Nord Route 68: **+1.000,-** · Nord Sandy: **+2.000,-**",
        "**OBS.** *Ingen reparation på Cayo Perico*",
        "",
        "**Reparations-kit** (når vi holder lukket): **4.850,-** pr. stk.",
        "└ 10 stk.: **38.500,-**",
      ],
    },
    {
      title: "🏍️ Motorcykler",
      lines: [
        "MC-ordre via selvbetjening modtages **ikke** — kontakt en mekaniker direkte hos Benny's.",
        "Reparation, service og tuning til MC efter aftale, hvor det er muligt.",
      ],
    },
    {
      title: "⚙️ Tuning, motor & performance",
      lines: [
        "Specialordre (ikke i selvbetjening): **indkøbspris + 20%** til løn & drift",
        "*Priserne kan variere — nedenstående er faste listepriser.*",
        "",
        "V12 motor: **600.000,-**",
        "V8 motor: **320.000,-**",
        "V6 motor: **215.000,-**",
        "Firehjulstræk: **135.000,-**",
        "Keramiske bremser: **23.000,-**",
        "Nitrous installation: **120.000,-**",
        "└ Genfyld: **4.000,-**",
      ],
    },
    {
      title: "🎨 Styling, dæk & ekstra",
      lines: [
        "Dæk (Slick / Semi-slick / Offroad): **13.000,-**",
        "CarPlay installation: **3.000,-**",
        "Stance (affjedring): **8.000,-**",
        "Stance-kit (ubegrænset justering): **22.000,-**",
        "Styling / kosmetik: **fra 500,-**",
        "Service / olieskift: **fra 800,-**",
      ],
    },
  ],

  roles: rolesConfig.roles,
};

export const companyPrices = company.priceSections.flatMap((s) =>
  s.lines.filter((l) => l.startsWith("**") || l.includes(":**")).map((l) => ({
    service: l.split(":**")[0]?.replace(/\*\*/g, "") ?? l,
    price: l.includes(":**") ? l.split(":**").slice(1).join(":").trim() : l,
  }))
);
