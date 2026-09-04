export interface DocumentFixture {
  ref: string;
  title: string;
  kind: string;
  page: string;
  originalLines: string[];
  sourcePassage: string;
  ocrText?: string;
  uncertainPhrases?: string[];
  failedReason?: string;
}

export const legalDocuments: Record<string, DocumentFixture> = {
  'doc-bilirkisi': {
    ref: 'doc-bilirkisi',
    title: 'Bilirkişi Raporu',
    kind: 'Kurgu mahkeme belgesi',
    page: '1 / 3',
    originalLines: [
      'KURGU BELGE · GERÇEK HUKUKİ BELGE DEĞİLDİR',
      'İstanbul 4. İş Mahkemesi — 2024/118 E.',
      'Rapor tarihi: 02.09.2026',
      'Tarafların rapora karşı beyanlarını iki hafta içinde sunabilecekleri belirtilmiştir.',
      'İnceleme yalnız sentetik bordro ve çalışma kayıtları üzerinden yapılmıştır.',
    ],
    sourcePassage:
      'Tarafların rapora karşı beyanlarını iki hafta içinde sunabilecekleri belirtilmiştir.',
    ocrText:
      'İstanbul 4. İş Mahkemesi 2024/118 E. Rapor tarihi 02.09.2026. Tarafların rapora karşı beyanlarını iki hafta içinde sunabilecekleri belirtilmiştir.',
    uncertainPhrases: ['iki hafta'],
  },
  'doc-uets': {
    ref: 'doc-uets',
    title: 'UETS Tebligatı',
    kind: 'Simüle edilmiş kanal çıktısı',
    page: '1 / 1',
    originalLines: [
      'KURGU UETS TEBLİGATI · ENTEGRASYON YOK',
      'Alınma tarihi: 01.09.2026',
      'Elektronik tebligatın beşinci günün sonunda yapılmış sayılacağına ilişkin ifade.',
      'İşlem tarihi ayrıca yetkili avukatça doğrulanmalıdır.',
    ],
    sourcePassage:
      'Elektronik tebligatın beşinci günün sonunda yapılmış sayılacağına ilişkin ifade.',
    ocrText:
      'Alınma tarihi 01.09.2026. Elektronik tebligat beşinci günün sonunda yapılmış sayılır.',
    uncertainPhrases: ['beşinci gün'],
  },
  'doc-kira': {
    ref: 'doc-kira',
    title: 'Kira Sözleşmesi Fotoğrafı',
    kind: 'Bulanık kurgu tarama',
    page: '1 / 2',
    originalLines: [
      'KURGU KİRA SÖZLEŞMESİ',
      'Kiralananın adresi: [bulanık alan]',
      'Başlangıç tarihi: 01.03.2024',
      'Taraf bilgisi görüntü kalitesi nedeniyle okunamıyor.',
    ],
    sourcePassage: 'Başlangıç tarihi: 01.03.2024',
    failedReason: 'Düşük görüntü kalitesi ve eğik çekim nedeniyle güvenilir metin çıkarılamadı.',
  },
  'doc-ekstre': {
    ref: 'doc-ekstre',
    title: 'Banka Ekstresi',
    kind: 'Kurgu hesap tablosu',
    page: 'Sayfa 1',
    originalLines: [
      '01.08.2026  +25.000,00 TL',
      '09.08.2026   -4.250,00 TL',
      'Açıklama alanı bulunmuyor.',
    ],
    sourcePassage: 'Açıklama alanı bulunmuyor.',
    ocrText: '01.08.2026 +25.000,00 TL / 09.08.2026 -4.250,00 TL',
    uncertainPhrases: ['Açıklama alanı bulunmuyor'],
  },
  'doc-vekalet': {
    ref: 'doc-vekalet',
    title: 'Süreli Vekaletname',
    kind: 'Kurgu belge',
    page: '1 / 1',
    originalLines: [
      'KURGU VEKALETNAME',
      'Geçerlilik bitişi: 15.12.2026',
      'Islak imza aslı: Föy P-04',
    ],
    sourcePassage: 'Geçerlilik bitişi: 15.12.2026',
    ocrText: 'Geçerlilik bitişi 15.12.2026. Islak imza aslı Föy P-04.',
    uncertainPhrases: [],
  },
};
