// Procedure hierarchy — 4 levels:
// Level 1: Category   (Obstetrics / Gynaecology / ART)
// Level 2: Type       (Antenatal / Intrapartum / Postnatal)
// Level 3: Procedure  (Vaginal Birth / Caesarean Section / …)
// Level 4: Detail     (SVD / Vacuum / Uncomplicated / …) — null means no L4
//
// Structure: { Cat: { Type: { Procedure: [details] | null } } }

export const PROC = {
  Obstetrics: {
    Antenatal: {
      ECV: null,
      'Cervical Cerclage': null,
    },
    Intrapartum: {
      'Vaginal Birth': ['SVD', 'Vacuum', 'Forceps'],
      'Caesarean Section': [
        'Uncomplicated',
        'Placenta Praevia',
        'Classical',
        'Multiple Pregnancy',
        'Abnormal Presentation',
        'Fully Dilated',
        'BMI > 50',
        'Other',
      ],
    },
    Postnatal: {
      'Perineal Repair': ['Episiotomy / 2nd Degree Tear', '3rd / 4th Degree Tear'],
      'Management of PPH': ['General', 'Bakri Balloon', 'B Lynch Suture', 'Other'],
      MROP: null,
    },
  },
  Gynaecology: {
    Hysteroscopy: {
      Diagnostic: null,
      'Endometrial Polyp': {
        'D&C/Polyp Forceps': null,
        Myosure: null,
        Resectoscope: null,
      },
      Fibroids: {
        'D&C/Polyp Forceps': null,
        Myosure: null,
        Resectoscope: null,
      },
      'Abnormal Uterine Anatomy': {
        Septum: null,
        'Scar Niche': null,
      },
      'Endometrial Ablation': {
        Novasure: null,
        Cavaterm: null,
        Resectoscope: null,
      },
      Other: null,
    },
    Laparoscopy: {
      Diagnostic: null,
      'Tubal Surgery': {
        Salpingectomy: null,
        Salpingostomy: null,
        'Tubal Ligation': null,
      },
      'Ovarian Surgery': {
        Detorsion: null,
        'Cyst Aspiration': null,
        Cystectomy: null,
        Oophorectomy: null,
      },
      Endometriosis: null,
      Myomectomy: null,
      Hysterectomy: {
        Subtotal: null,
        Total: null,
        'Vaginal Assisted': null,
      },
      Other: null,
    },
    Laparotomy: {
      'Tubal Surgery': null,
      'Ovarian Surgery': null,
      Hysterectomy: null,
      Myomectomy: null,
    },
    'Cervical Surgery': {
      LLETZ: null,
      'Cone Biopsy': null,
    },
    Urogynaecology: {
      TVT: null,
      Other: null,
    },
    'Vaginal Surgery': {
      'Anterior Repair': null,
      'Posterior Repair': null,
      'Vaginal Hysterectomy': null,
      SSF: null,
      Other: null,
    },
    'Perineal Surgery': {
      "Bartholinś Cyst": null,
      'Vulval Biopsy or Excision': null,
      'I&D': null,
      Perineoplasty: null,
      Other: null,
    },
    Contraception: {
      'Complex IUD Removal': null,
      'Complex Implanon Removal': null,
      'Insertion of IUD': null,
      'Insertion of Implanon': null,
    },
    'Pregnancy Management': {
      'Suction D&C for Miscarriage': null,
      'Termination of Pregnancy': {
        Medical: null,
        Surgical: null,
      },
    },
    Cystoscopy: null,
    'Surgical Wound Debridement': null,
  },
  ART: {
    'Oocyte Collection': {
      'Transvaginal Oocyte Collection': null,
      'Transabdominal Oocyte Collection': null,
    },
    'Embryo Transfer': null,
    'Male Reproductive Surgery': {
      'Open Testicular Biopsy': null,
      PESA: null,
      TESA: null,
      'Microsurgical Sperm Retrieval': null,
    },
  },
}

export const catBadge = {
  Obstetrics: 'b-obs',
  Gynaecology: 'b-gyn',
  ART: 'b-art',
}

export const catColors = {
  Obstetrics: '#fbbf24',
  Gynaecology: '#a78bfa',
  ART: '#2dd4bf',
}

export function getProcTypes(category) {
  if (!category || !PROC[category]) return []
  return Object.keys(PROC[category])
}

export function getProcProcedures(category, type) {
  if (!category || !type) return []
  const t = PROC[category]?.[type]
  if (!t || t === null) return []
  return Object.keys(t)
}

export function getProcDetails(category, type, procedure) {
  if (!category || !type || !procedure) return []
  const p = PROC[category]?.[type]?.[procedure]
  if (!p) return []
  if (Array.isArray(p)) return p
  if (typeof p === 'object') return Object.keys(p)
  return []
}

export function isTerminalType(category, type) {
  if (!category || !type) return false
  return PROC[category]?.[type] === null
}
