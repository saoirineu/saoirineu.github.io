export type ProfileLocale = 'pt' | 'en' | 'es' | 'it';

export type LocationOption = {
  code: string;
  name: string;
};

export type PlaceOption = LocationOption & {
  provinceCode: string;
};

const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
] as const;

const localeTags: Record<ProfileLocale, string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  it: 'it-IT'
};

const countryAliases: Record<string, string> = {
  brasil: 'BR',
  brazil: 'BR',
  brasile: 'BR',
  bresil: 'BR',
  italia: 'IT',
  italy: 'IT',
  italien: 'IT',
  italie: 'IT'
};

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function countryName(code: string, locale: ProfileLocale) {
  const normalizedCode = code.toUpperCase();
  try {
    const label = new Intl.DisplayNames([localeTags[locale]], { type: 'region' }).of(normalizedCode);
    return label ?? normalizedCode;
  } catch {
    return normalizedCode;
  }
}

export function countryOptions(locale: ProfileLocale): LocationOption[] {
  return COUNTRY_CODES
    .map(code => ({ code, name: countryName(code, locale) }))
    .sort((left, right) => left.name.localeCompare(right.name, localeTags[locale]));
}

export function findCountryCode(value: string, locale: ProfileLocale): string {
  const direct = value.trim().toUpperCase();
  if (COUNTRY_CODES.includes(direct as typeof COUNTRY_CODES[number])) return direct;

  const normalized = normalizeSearch(value);
  if (countryAliases[normalized]) return countryAliases[normalized];

  for (const code of COUNTRY_CODES) {
    const labels = [
      countryName(code, locale),
      countryName(code, 'pt'),
      countryName(code, 'en'),
      countryName(code, 'es'),
      countryName(code, 'it')
    ];
    if (labels.some(label => normalizeSearch(label) === normalized)) return code;
  }

  return '';
}

export const BRAZIL_STATES: LocationOption[] = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' }
];

export const ITALY_PROVINCES: LocationOption[] = [
  { code: 'AG', name: 'Agrigento' },
  { code: 'AL', name: 'Alessandria' },
  { code: 'AN', name: 'Ancona' },
  { code: 'AO', name: 'Aosta' },
  { code: 'AR', name: 'Arezzo' },
  { code: 'AP', name: 'Ascoli Piceno' },
  { code: 'AT', name: 'Asti' },
  { code: 'AV', name: 'Avellino' },
  { code: 'BA', name: 'Bari' },
  { code: 'BT', name: 'Barletta-Andria-Trani' },
  { code: 'BL', name: 'Belluno' },
  { code: 'BN', name: 'Benevento' },
  { code: 'BG', name: 'Bergamo' },
  { code: 'BI', name: 'Biella' },
  { code: 'BO', name: 'Bologna' },
  { code: 'BZ', name: 'Bolzano' },
  { code: 'BS', name: 'Brescia' },
  { code: 'BR', name: 'Brindisi' },
  { code: 'CA', name: 'Cagliari' },
  { code: 'CL', name: 'Caltanissetta' },
  { code: 'CB', name: 'Campobasso' },
  { code: 'CE', name: 'Caserta' },
  { code: 'CT', name: 'Catania' },
  { code: 'CZ', name: 'Catanzaro' },
  { code: 'CH', name: 'Chieti' },
  { code: 'CO', name: 'Como' },
  { code: 'CS', name: 'Cosenza' },
  { code: 'CR', name: 'Cremona' },
  { code: 'KR', name: 'Crotone' },
  { code: 'CN', name: 'Cuneo' },
  { code: 'EN', name: 'Enna' },
  { code: 'FM', name: 'Fermo' },
  { code: 'FE', name: 'Ferrara' },
  { code: 'FI', name: 'Firenze' },
  { code: 'FG', name: 'Foggia' },
  { code: 'FC', name: 'Forlì-Cesena' },
  { code: 'FR', name: 'Frosinone' },
  { code: 'GE', name: 'Genova' },
  { code: 'GO', name: 'Gorizia' },
  { code: 'GR', name: 'Grosseto' },
  { code: 'IM', name: 'Imperia' },
  { code: 'IS', name: 'Isernia' },
  { code: 'SP', name: 'La Spezia' },
  { code: 'AQ', name: "L'Aquila" },
  { code: 'LT', name: 'Latina' },
  { code: 'LE', name: 'Lecce' },
  { code: 'LC', name: 'Lecco' },
  { code: 'LI', name: 'Livorno' },
  { code: 'LO', name: 'Lodi' },
  { code: 'LU', name: 'Lucca' },
  { code: 'MC', name: 'Macerata' },
  { code: 'MN', name: 'Mantova' },
  { code: 'MS', name: 'Massa-Carrara' },
  { code: 'MT', name: 'Matera' },
  { code: 'ME', name: 'Messina' },
  { code: 'MI', name: 'Milano' },
  { code: 'MO', name: 'Modena' },
  { code: 'MB', name: 'Monza e Brianza' },
  { code: 'NA', name: 'Napoli' },
  { code: 'NO', name: 'Novara' },
  { code: 'NU', name: 'Nuoro' },
  { code: 'OR', name: 'Oristano' },
  { code: 'PD', name: 'Padova' },
  { code: 'PA', name: 'Palermo' },
  { code: 'PR', name: 'Parma' },
  { code: 'PV', name: 'Pavia' },
  { code: 'PG', name: 'Perugia' },
  { code: 'PU', name: 'Pesaro e Urbino' },
  { code: 'PE', name: 'Pescara' },
  { code: 'PC', name: 'Piacenza' },
  { code: 'PI', name: 'Pisa' },
  { code: 'PT', name: 'Pistoia' },
  { code: 'PN', name: 'Pordenone' },
  { code: 'PZ', name: 'Potenza' },
  { code: 'PO', name: 'Prato' },
  { code: 'RG', name: 'Ragusa' },
  { code: 'RA', name: 'Ravenna' },
  { code: 'RC', name: 'Reggio Calabria' },
  { code: 'RE', name: 'Reggio Emilia' },
  { code: 'RI', name: 'Rieti' },
  { code: 'RN', name: 'Rimini' },
  { code: 'RM', name: 'Roma' },
  { code: 'RO', name: 'Rovigo' },
  { code: 'SA', name: 'Salerno' },
  { code: 'SS', name: 'Sassari' },
  { code: 'SV', name: 'Savona' },
  { code: 'SI', name: 'Siena' },
  { code: 'SR', name: 'Siracusa' },
  { code: 'SO', name: 'Sondrio' },
  { code: 'SU', name: 'Sud Sardegna' },
  { code: 'TA', name: 'Taranto' },
  { code: 'TE', name: 'Teramo' },
  { code: 'TR', name: 'Terni' },
  { code: 'TO', name: 'Torino' },
  { code: 'TP', name: 'Trapani' },
  { code: 'TN', name: 'Trento' },
  { code: 'TV', name: 'Treviso' },
  { code: 'TS', name: 'Trieste' },
  { code: 'UD', name: 'Udine' },
  { code: 'VA', name: 'Varese' },
  { code: 'VE', name: 'Venezia' },
  { code: 'VB', name: 'Verbano-Cusio-Ossola' },
  { code: 'VC', name: 'Vercelli' },
  { code: 'VR', name: 'Verona' },
  { code: 'VV', name: 'Vibo Valentia' },
  { code: 'VI', name: 'Vicenza' },
  { code: 'VT', name: 'Viterbo' }
];

export const BRAZIL_PLACE_OPTIONS: PlaceOption[] = [
  { provinceCode: 'AC', code: 'rio-branco', name: 'Rio Branco' },
  { provinceCode: 'AL', code: 'maceio', name: 'Maceió' },
  { provinceCode: 'AP', code: 'macapa', name: 'Macapá' },
  { provinceCode: 'AM', code: 'manaus', name: 'Manaus' },
  { provinceCode: 'BA', code: 'salvador', name: 'Salvador' },
  { provinceCode: 'CE', code: 'fortaleza', name: 'Fortaleza' },
  { provinceCode: 'DF', code: 'brasilia', name: 'Brasília' },
  { provinceCode: 'ES', code: 'vitoria', name: 'Vitória' },
  { provinceCode: 'GO', code: 'goiania', name: 'Goiânia' },
  { provinceCode: 'MA', code: 'sao-luis', name: 'São Luís' },
  { provinceCode: 'MT', code: 'cuiaba', name: 'Cuiabá' },
  { provinceCode: 'MS', code: 'campo-grande', name: 'Campo Grande' },
  { provinceCode: 'MG', code: 'belo-horizonte', name: 'Belo Horizonte' },
  { provinceCode: 'PA', code: 'belem', name: 'Belém' },
  { provinceCode: 'PB', code: 'joao-pessoa', name: 'João Pessoa' },
  { provinceCode: 'PR', code: 'curitiba', name: 'Curitiba' },
  { provinceCode: 'PE', code: 'recife', name: 'Recife' },
  { provinceCode: 'PI', code: 'teresina', name: 'Teresina' },
  { provinceCode: 'RJ', code: 'rio-de-janeiro', name: 'Rio de Janeiro' },
  { provinceCode: 'RN', code: 'natal', name: 'Natal' },
  { provinceCode: 'RS', code: 'porto-alegre', name: 'Porto Alegre' },
  { provinceCode: 'RO', code: 'porto-velho', name: 'Porto Velho' },
  { provinceCode: 'RR', code: 'boa-vista', name: 'Boa Vista' },
  { provinceCode: 'SC', code: 'florianopolis', name: 'Florianópolis' },
  { provinceCode: 'SP', code: 'sao-paulo', name: 'São Paulo' },
  { provinceCode: 'SE', code: 'aracaju', name: 'Aracaju' },
  { provinceCode: 'TO', code: 'palmas', name: 'Palmas' }
];

export const ITALY_PLACE_OPTIONS: PlaceOption[] = ITALY_PROVINCES.map(province => ({
  provinceCode: province.code,
  code: normalizeSearch(province.name).replace(/\s+/g, '-'),
  name: province.name
}));

export function provinceOptions(countryCode: string) {
  if (countryCode === 'BR') return BRAZIL_STATES;
  if (countryCode === 'IT') return ITALY_PROVINCES;
  return [];
}

export function birthPlaceOptions(countryCode: string, provinceCode: string) {
  const options = countryCode === 'BR' ? BRAZIL_PLACE_OPTIONS : countryCode === 'IT' ? ITALY_PLACE_OPTIONS : [];
  return provinceCode ? options.filter(option => option.provinceCode === provinceCode) : options;
}

export function findLocationCode(value: string, options: LocationOption[]) {
  const normalized = normalizeSearch(value);
  return options.find(option => option.code === value || normalizeSearch(option.name) === normalized)?.code ?? '';
}

export function optionName(code: string, options: LocationOption[]) {
  return options.find(option => option.code === code)?.name ?? '';
}

export const DOCTRINE_ROLE_OPTIONS = [
  'fiscal',
  'leader',
  'musician',
  'official musician',
  'treasurer',
  'secretary',
  'kitchen',
  'setup',
  'cleaning',
  'reception',
  'children care',
  'organization',
  'other'
] as const;

export const MAX_DOCTRINE_ROLES = 20;

export const ITALIAN_REFERENCE_CHURCHES = [
  'Casa Regina della Pace',
  'Stella Azzurra',
  'Casa Maria delle Rose',
  'Luce di Misericordia',
  "Estrela d'Oriente",
  'Leone Bianco',
  'Céu do Panda'
].map(name => ({
  id: `it-${normalizeSearch(name).replace(/\s+/g, '-')}`,
  name,
  country: 'Italy',
  lineage: 'ICEFLU'
}));
