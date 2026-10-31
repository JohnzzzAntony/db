// From the Koshys College of Nursing clinical requirement sheet supplied by the college.
export const REQUIREMENTS: { area: string; items: { id: string; title: string; quantity: number; unit?: string }[] }[] = [
  {
    area: "Medical-Surgical Nursing",
    items: [
      { id: "msn-medical-cp", title: "Medical care plans", quantity: 2 },
      { id: "msn-surgical-cp", title: "Surgical care plans", quantity: 2 },
      { id: "msn-case-study", title: "Case study (medical or surgical)", quantity: 1 },
      { id: "msn-case-pres", title: "Case presentation", quantity: 1 },
      { id: "msn-health-ed", title: "Health education with flash card", quantity: 1 },
      { id: "msn-drug-pres", title: "Drug presentation (5 drugs, any category)", quantity: 1 },
      { id: "msn-major-surg", title: "Assisting in major surgeries", quantity: 3, unit: "surgeries" },
      { id: "msn-minor-surg", title: "Assisting in minor surgeries", quantity: 3, unit: "surgeries" },
    ],
  },
  {
    area: "Child Health Nursing",
    items: [
      { id: "chn-newborn-cp", title: "Normal newborn care plan", quantity: 1 },
      { id: "chn-hr-newborn-cp", title: "High-risk newborn care plan", quantity: 1 },
      { id: "chn-med-cp", title: "Pediatric medicine care plan", quantity: 1 },
      { id: "chn-surg-cp", title: "Pediatric surgery care plan", quantity: 1 },
      { id: "chn-case-study", title: "Pediatric case study", quantity: 1 },
      { id: "chn-case-pres", title: "Pediatric case presentation", quantity: 1 },
      { id: "chn-health-ed", title: "Health education with flash card", quantity: 1 },
      { id: "chn-growth", title: "Growth and development assessment", quantity: 1 },
      { id: "chn-play", title: "Assignment: Play therapy", quantity: 1 },
      { id: "chn-vaccines", title: "Assignment: Vaccines in children", quantity: 1 },
      { id: "chn-incubator", title: "Assignment: Care of child in incubator and phototherapy", quantity: 1 },
    ],
  },
  {
    area: "Maternal & Midwifery Nursing",
    items: [
      { id: "mat-antenatal-cs", title: "Antenatal case study", quantity: 1 },
      { id: "mat-postnatal-cs", title: "Postnatal case study", quantity: 1 },
      { id: "mat-neonatal-cs", title: "Neonatal case study", quantity: 1 },
      { id: "mat-he-antenatal", title: "Health education: antenatal", quantity: 1 },
      { id: "mat-he-postnatal", title: "Health education: postnatal", quantity: 1 },
      { id: "mat-family-planning", title: "Assignment: Family planning methods", quantity: 1 },
    ],
  },
];
