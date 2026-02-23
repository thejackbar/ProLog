"""
PROC – Full procedure hierarchy for the ProLog fertility & gynaecology logbook.

Structure:
  Category -> Type -> Procedure -> Detail (or None)

When the value at any level is None it means that level has no sub-levels.
When a list is present at the Detail level it contains the selectable options.
"""

from typing import Any

PROC: dict[str, Any] = {
    "Obstetrics": {
        "Antenatal": {
            "ECV": None,
            "Cervical Cerclage": None,
        },
        "Intrapartum": {
            "Vaginal Birth": {
                "SVD": None,
                "Vacuum": None,
                "Forceps": None,
            },
            "Caesarean Section": {
                "Uncomplicated": None,
                "Placenta Praevia": None,
                "Classical": None,
                "Multiple Pregnancy": None,
                "Abnormal Presentation": None,
                "Fully Dilated": None,
                "BMI > 50": None,
                "Other": None,
            },
        },
        "Postnatal": {
            "Perineal Repair": {
                "Episiotomy / 2nd Degree Tear": None,
                "3rd / 4th Degree Tear": None,
            },
            "Management of PPH": {
                "General": None,
                "Bakri Balloon": None,
                "B Lynch Suture": None,
                "Other": None,
            },
            "MROP": None,
        },
    },

    "Gynaecology": {
        "Hysteroscopy": {
            "Diagnostic": None,
            "Endometrial Polyp": {
                "D&C/Polyp Forceps": None,
                "Myosure": None,
                "Resectoscope": None,
            },
            "Fibroids": {
                "D&C/Polyp Forceps": None,
                "Myosure": None,
                "Resectoscope": None,
            },
            "Abnormal Uterine Anatomy": {
                "Septum": None,
                "Scar Niche": None,
            },
            "Endometrial Ablation": {
                "Novasure": None,
                "Cavaterm": None,
                "Resectoscope": None,
            },
            "Other": None,
        },
        "Laparoscopy": {
            "Diagnostic": None,
            "Tubal Surgery": {
                "Salpingectomy": None,
                "Salpingostomy": None,
                "Tubal Ligation": None,
            },
            "Ovarian Surgery": {
                "Detorsion": None,
                "Cyst Aspiration": None,
                "Cystectomy": None,
                "Oophorectomy": None,
            },
            "Endometriosis": None,
            "Myomectomy": None,
            "Hysterectomy": {
                "Subtotal": None,
                "Total": None,
                "Vaginal Assisted": None,
            },
            "Other": None,
        },
        "Laparotomy": {
            "Tubal Surgery": None,
            "Ovarian Surgery": None,
            "Hysterectomy": None,
            "Myomectomy": None,
        },
        "Cervical Surgery": {
            "LLETZ": None,
            "Cone Biopsy": None,
        },
        "Urogynaecology": {
            "TVT": None,
            "Other": None,
        },
        "Vaginal Surgery": {
            "Anterior Repair": None,
            "Posterior Repair": None,
            "Vaginal Hysterectomy": None,
            "SSF": None,
            "Other": None,
        },
        "Perineal Surgery": {
            "Bartholin\u2019s Cyst": None,
            "Vulval Biopsy or Excision": None,
            "I&D": None,
            "Perineoplasty": None,
            "Other": None,
        },
        "Contraception": {
            "Complex IUD Removal": None,
            "Complex Implanon Removal": None,
            "Insertion of IUD": None,
            "Insertion of Implanon": None,
        },
        "Pregnancy Management": {
            "Suction D&C for Miscarriage": None,
            "Termination of Pregnancy": {
                "Medical": None,
                "Surgical": None,
            },
        },
        "Cystoscopy": None,
        "Surgical Wound Debridement": None,
    },

    "ART": {
        "Oocyte Collection": {
            "Transvaginal Oocyte Collection": None,
            "Transabdominal Oocyte Collection": None,
        },
        "Embryo Transfer": None,
        "Male Reproductive Surgery": {
            "Open Testicular Biopsy": None,
            "PESA": None,
            "TESA": None,
            "Microsurgical Sperm Retrieval": None,
        },
    },
}


def get_categories() -> list[str]:
    return list(PROC.keys())


def get_types(category: str) -> list[str] | None:
    cat = PROC.get(category)
    if cat is None or not isinstance(cat, dict):
        return None
    return list(cat.keys())


def get_procedures(category: str, type_: str) -> list[str] | None:
    cat = PROC.get(category)
    if not isinstance(cat, dict):
        return None
    typ = cat.get(type_)
    if typ is None or not isinstance(typ, dict):
        return None
    return list(typ.keys())


def get_details(category: str, type_: str, procedure: str) -> list[str] | None:
    cat = PROC.get(category)
    if not isinstance(cat, dict):
        return None
    typ = cat.get(type_)
    if not isinstance(typ, dict):
        return None
    proc = typ.get(procedure)
    if proc is None or not isinstance(proc, dict):
        return None
    return list(proc.keys())
