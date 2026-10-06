const GOAL_CATALOG = {
  "💼 Karyera & İnkişaf": [
    "Yeni vəzifəyə yüksəlmək", "Peşəkar sertifikat əldə etmək", "İngilis dilimi inkişaf etdirmək", "Yeni işə keçmək", "Yeni peşəkar bacarıq öyrənmək"
  ],
  "💰 Maliyyə & Arzular": [
    "5 000 AZN yığmaq", "10 000 AZN yığmaq", "Borclarımı bağlamaq", "Gəlirimi 20% artırmaq", "Böyük alış üçün kapital toplamaq"
  ],
  "💪 Sağlamlıq & Aktiv həyat": [
    "Həftədə 3 dəfə aktiv olmaq", "Gündəlik 8 000 addım rejimi yaratmaq", "Stabil yuxu rejimi yaratmaq", "Gündəlik aktivlik rutini qurmaq", "Həftəsonu aktiv istirahət vərdişi yaratmaq"
  ],
  "✈️ Səyahət & Təcrübələr": [
    "Avropa səyahəti etmək", "2 yeni ölkə görmək", "Dəniz tətilinə getmək", "Təbiət/dağ səyahəti etmək", "Ailəvi səyahət planlaşdırmaq"
  ],
  "❤️ Şəxsi həyat & Balans": [
    "Ailəmlə daha çox vaxt keçirmək", "Yeni hobbi yaratmaq", "Həftəlik özümə vaxt ayırmaq", "Rəqəmsal detoks vərdişi yaratmaq", "Sosial həyatımı aktivləşdirmək"
  ]
};

const GENERIC = {
  monthly: ["Bu ay 1 əsas mərhələni tamamla", "Bu ay nəticəni ölç və növbəti mərhələni seç", "Bu ay üçün konkret hədəf göstəricini tamamla"],
  weekly: ["Həftə ərzində 3 əsas addımı tamamla", "Həftəlik nəticəni yoxla", "Növbəti həftənin fokusunu müəyyən et"],
  daily: ["20 dəqiqə üzərində işləyin", "1 kiçik addımı tamamla", "Günün sonunda nəticəni qeyd et"]
};

const SPECIAL = {
  "İngilis dilimi inkişaf etdirmək": {
    monthly: ["1 mövzunu tamamla", "1 mock test et", "1 kitab və ya kurs modulu bitir"],
    weekly: ["3 dərs", "4 listening", "100 söz təkrarı"],
    daily: ["20 dəq listening", "20 söz", "15 dəq speaking"]
  },
  "5 000 AZN yığmaq": {
    monthly: ["Aylıq yığım hədəfini tamamla", "Xərcləri analiz et", "Əlavə gəlir üçün 1 addım at"],
    weekly: ["Həftəlik büdcəni yoxla", "Planlaşdırılmamış xərcləri azalt", "Yığım məbləğini qeyd et"],
    daily: ["Günün xərclərini qeyd et", "Lazımsız alışdan imtina et", "10 dəqiqə maliyyə planlaması et"]
  }
};

function getPlan(title) { return SPECIAL[title] || GENERIC; }
module.exports = { GOAL_CATALOG, getPlan };
