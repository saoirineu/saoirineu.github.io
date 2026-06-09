import type { SiteLocale } from '../../lib/siteLocale';
import type { MemberSourceFile, MemberTextField } from '../../lib/members';

export type MembersCopy = {
  title: string;
  subtitle: (total: number, flagged: number) => string;
  summaryMembers: string;
  summaryToReview: string;
  summaryConflicts: string;
  summaryDuplicates: string;
  summaryFamilyEmail: string;
  summaryDuplicateInImport: string;
  search: string;
  searchPlaceholder: string;
  status: string;
  statusAll: string;
  review: string;
  reviewAll: string;
  reviewFlagged: string;
  reviewClean: string;
  source: string;
  sourceAll: string;
  sourceComplete: string;
  sourceImporter: string;
  sourceCertificates: string;
  sort: string;
  sortReviewFirst: string;
  sortFieldConflict: string;
  sortDuplicateInImport: string;
  sortFamilyEmail: string;
  sortNonFamilyConflict: string;
  sortNameAsc: string;
  sortNameDesc: string;
  colName: string;
  colFiscalCode: string;
  colEmail: string;
  colCity: string;
  colStatus: string;
  colSources: string;
  colReview: string;
  colActions: string;
  details: string;
  loading: string;
  loadError: string;
  empty: string;
  opError: string;
  firstWork: string;
  ok: string;
  close: string;
  conflicts: string;
  duplicates: string;
  dupEmail: (value: string) => string;
  dupFamilyEmail: (value: string) => string;
  dupNameBirth: string;
  dupOther: string;
  data: string;
  sourcesWord: string;
  markReviewed: string;
  remove: string;
  mergeHere: string;
  keepSeparate: string;
  mergePreviewTitle: string;
  mergePreviewMostRecent: (name: string) => string;
  mergePreviewOverwritten: string;
  mergePreviewSelected: string;
  mergePreviewDuplicate: string;
  mergePreviewChosen: string;
  mergePreviewNoOverwrite: string;
  confirmMerge: (source: string, target: string) => string;
  confirmKeepSeparate: (source: string, target: string) => string;
  confirmDelete: (name: string) => string;
  reason: Record<string, string>;
};

// Short source badges — kept constant across locales (compact brand-ish tags).
export const sourceBadgeLabels: Record<MemberSourceFile, string> = {
  complete: 'Cloud',
  importer: 'Import',
  certificates: 'Cert'
};

export const membersCopyByLocale: Record<SiteLocale, MembersCopy> = {
  pt: {
    title: 'Sócios',
    subtitle: (total, flagged) =>
      `${total} sócios unificados das planilhas · ${flagged} marcados para revisão. Visualização restrita a administradores.`,
    summaryMembers: 'Sócios',
    summaryToReview: 'A revisar',
    summaryConflicts: 'Conflitos',
    summaryDuplicates: 'Duplicados',
    summaryFamilyEmail: 'E-mail de família',
    summaryDuplicateInImport: 'Duplicado no import',
    search: 'Buscar',
    searchPlaceholder: 'Nome, Codice Fiscale, e-mail, cidade',
    status: 'Situação',
    statusAll: 'Todas',
    review: 'Revisão',
    reviewAll: 'Todos',
    reviewFlagged: 'A revisar',
    reviewClean: 'Revisados',
    source: 'Fonte',
    sourceAll: 'Todas',
    sourceComplete: 'Cloud (completo)',
    sourceImporter: 'Import',
    sourceCertificates: 'Certificados',
    sort: 'Ordenar',
    sortReviewFirst: 'A revisar primeiro',
    sortFieldConflict: 'Conflito de campos primeiro',
    sortDuplicateInImport: 'Duplicado no import primeiro',
    sortFamilyEmail: 'E-mail de família primeiro',
    sortNonFamilyConflict: 'Conflitos não familiares primeiro',
    sortNameAsc: 'Nome (A–Z)',
    sortNameDesc: 'Nome (Z–A)',
    colName: 'Nome',
    colFiscalCode: 'Codice Fiscale',
    colEmail: 'E-mail',
    colCity: 'Cidade',
    colStatus: 'Situação',
    colSources: 'Fontes',
    colReview: 'Revisão',
    colActions: 'Ações',
    details: 'Detalhes',
    loading: 'Carregando sócios...',
    loadError: 'Falha ao carregar sócios.',
    empty: 'Nenhum sócio encontrado com os filtros atuais.',
    opError: 'Falha na operação.',
    firstWork: '1º Trab.',
    ok: 'OK',
    close: 'Fechar',
    conflicts: 'Conflitos a resolver',
    duplicates: 'Possíveis duplicados',
    dupEmail: value => `Mesmo e-mail: ${value}`,
    dupFamilyEmail: value => `E-mail de família: ${value}`,
    dupNameBirth: 'Mesmo nome e data de nascimento',
    dupOther: 'Contato em comum',
    data: 'Dados',
    sourcesWord: 'fontes',
    markReviewed: 'Marcar como revisado',
    remove: 'Apagar',
    mergeHere: 'Mesclar aqui',
    keepSeparate: 'Manter separados',
    mergePreviewTitle: 'Revisar mesclagem',
    mergePreviewMostRecent: name => `Entrada mais recente: ${name}`,
    mergePreviewOverwritten: 'Valores que serão substituídos',
    mergePreviewSelected: 'Registro atual',
    mergePreviewDuplicate: 'Registro duplicado',
    mergePreviewChosen: 'Valor mantido',
    mergePreviewNoOverwrite: 'Nenhum valor existente será substituído. Apenas campos vazios serão preenchidos.',
    confirmMerge: (source, target) => `Mesclar "${source}" em "${target}"? O registro mesclado será apagado.`,
    confirmKeepSeparate: (source, target) => `Manter "${source}" e "${target}" como sócios separados? O alerta de e-mail de família será removido.`,
    confirmDelete: name => `Apagar o sócio "${name}"?`,
    reason: {
      'field-conflict': 'Conflito de campos',
      'possible-duplicate': 'Possível duplicado',
      'family-email': 'E-mail de família',
      'duplicate-in-importer': 'Duplicado no import',
      'certificate-only': 'Só certificado'
    }
  },
  en: {
    title: 'Members',
    subtitle: (total, flagged) =>
      `${total} members unified from the spreadsheets · ${flagged} flagged for review. Admin-only view.`,
    summaryMembers: 'Members',
    summaryToReview: 'To review',
    summaryConflicts: 'Conflicts',
    summaryDuplicates: 'Duplicates',
    summaryFamilyEmail: 'Family email',
    summaryDuplicateInImport: 'Duplicate in import',
    search: 'Search',
    searchPlaceholder: 'Name, Codice Fiscale, email, city',
    status: 'Status',
    statusAll: 'All',
    review: 'Review',
    reviewAll: 'All',
    reviewFlagged: 'To review',
    reviewClean: 'Reviewed',
    source: 'Source',
    sourceAll: 'All',
    sourceComplete: 'Cloud (complete)',
    sourceImporter: 'Import',
    sourceCertificates: 'Certificates',
    sort: 'Sort',
    sortReviewFirst: 'To review first',
    sortFieldConflict: 'Field conflict first',
    sortDuplicateInImport: 'Duplicate in import first',
    sortFamilyEmail: 'Family email first',
    sortNonFamilyConflict: 'Non-family conflict first',
    sortNameAsc: 'Name (A–Z)',
    sortNameDesc: 'Name (Z–A)',
    colName: 'Name',
    colFiscalCode: 'Codice Fiscale',
    colEmail: 'Email',
    colCity: 'City',
    colStatus: 'Status',
    colSources: 'Sources',
    colReview: 'Review',
    colActions: 'Actions',
    details: 'Details',
    loading: 'Loading members...',
    loadError: 'Failed to load members.',
    empty: 'No members found with the current filters.',
    opError: 'Operation failed.',
    firstWork: '1st work',
    ok: 'OK',
    close: 'Close',
    conflicts: 'Conflicts to resolve',
    duplicates: 'Possible duplicates',
    dupEmail: value => `Same email: ${value}`,
    dupFamilyEmail: value => `Family email: ${value}`,
    dupNameBirth: 'Same name and birth date',
    dupOther: 'Shared contact',
    data: 'Data',
    sourcesWord: 'sources',
    markReviewed: 'Mark as reviewed',
    remove: 'Delete',
    mergeHere: 'Merge here',
    keepSeparate: 'Keep separate',
    mergePreviewTitle: 'Review merge',
    mergePreviewMostRecent: name => `Most recent entry: ${name}`,
    mergePreviewOverwritten: 'Values that will be replaced',
    mergePreviewSelected: 'Current record',
    mergePreviewDuplicate: 'Duplicate record',
    mergePreviewChosen: 'Chosen value',
    mergePreviewNoOverwrite: 'No existing value will be replaced. Only empty fields will be filled.',
    confirmMerge: (source, target) => `Merge "${source}" into "${target}"? The merged record will be deleted.`,
    confirmKeepSeparate: (source, target) => `Keep "${source}" and "${target}" as separate members? The family-email flag will be cleared.`,
    confirmDelete: name => `Delete member "${name}"?`,
    reason: {
      'field-conflict': 'Field conflict',
      'possible-duplicate': 'Possible duplicate',
      'family-email': 'Family email',
      'duplicate-in-importer': 'Duplicate in import',
      'certificate-only': 'Certificate only'
    }
  },
  es: {
    title: 'Socios',
    subtitle: (total, flagged) =>
      `${total} socios unificados de las planillas · ${flagged} marcados para revisión. Vista solo para administradores.`,
    summaryMembers: 'Socios',
    summaryToReview: 'Por revisar',
    summaryConflicts: 'Conflictos',
    summaryDuplicates: 'Duplicados',
    summaryFamilyEmail: 'Correo familiar',
    summaryDuplicateInImport: 'Duplicado en import',
    search: 'Buscar',
    searchPlaceholder: 'Nombre, Codice Fiscale, correo, ciudad',
    status: 'Situación',
    statusAll: 'Todas',
    review: 'Revisión',
    reviewAll: 'Todos',
    reviewFlagged: 'Por revisar',
    reviewClean: 'Revisados',
    source: 'Fuente',
    sourceAll: 'Todas',
    sourceComplete: 'Cloud (completo)',
    sourceImporter: 'Import',
    sourceCertificates: 'Certificados',
    sort: 'Ordenar',
    sortReviewFirst: 'Por revisar primero',
    sortFieldConflict: 'Conflicto de campos primero',
    sortDuplicateInImport: 'Duplicado en import primero',
    sortFamilyEmail: 'Correo familiar primero',
    sortNonFamilyConflict: 'Conflictos no familiares primero',
    sortNameAsc: 'Nombre (A–Z)',
    sortNameDesc: 'Nombre (Z–A)',
    colName: 'Nombre',
    colFiscalCode: 'Codice Fiscale',
    colEmail: 'Correo',
    colCity: 'Ciudad',
    colStatus: 'Situación',
    colSources: 'Fuentes',
    colReview: 'Revisión',
    colActions: 'Acciones',
    details: 'Detalles',
    loading: 'Cargando socios...',
    loadError: 'Error al cargar socios.',
    empty: 'No se encontraron socios con los filtros actuales.',
    opError: 'La operación falló.',
    firstWork: '1º Trab.',
    ok: 'OK',
    close: 'Cerrar',
    conflicts: 'Conflictos a resolver',
    duplicates: 'Posibles duplicados',
    dupEmail: value => `Mismo correo: ${value}`,
    dupFamilyEmail: value => `Correo familiar: ${value}`,
    dupNameBirth: 'Mismo nombre y fecha de nacimiento',
    dupOther: 'Contacto en común',
    data: 'Datos',
    sourcesWord: 'fuentes',
    markReviewed: 'Marcar como revisado',
    remove: 'Eliminar',
    mergeHere: 'Fusionar aquí',
    keepSeparate: 'Mantener separados',
    mergePreviewTitle: 'Revisar fusión',
    mergePreviewMostRecent: name => `Entrada más reciente: ${name}`,
    mergePreviewOverwritten: 'Valores que se sustituirán',
    mergePreviewSelected: 'Registro actual',
    mergePreviewDuplicate: 'Registro duplicado',
    mergePreviewChosen: 'Valor conservado',
    mergePreviewNoOverwrite: 'No se sustituirá ningún valor existente. Solo se completarán los campos vacíos.',
    confirmMerge: (source, target) => `¿Fusionar "${source}" en "${target}"? El registro fusionado será eliminado.`,
    confirmKeepSeparate: (source, target) => `¿Mantener "${source}" y "${target}" como socios separados? Se quitará la alerta de correo familiar.`,
    confirmDelete: name => `¿Eliminar al socio "${name}"?`,
    reason: {
      'field-conflict': 'Conflicto de campos',
      'possible-duplicate': 'Posible duplicado',
      'family-email': 'Correo familiar',
      'duplicate-in-importer': 'Duplicado en import',
      'certificate-only': 'Solo certificado'
    }
  },
  it: {
    title: 'Soci',
    subtitle: (total, flagged) =>
      `${total} soci unificati dai fogli · ${flagged} da revisionare. Vista riservata agli amministratori.`,
    summaryMembers: 'Soci',
    summaryToReview: 'Da revisionare',
    summaryConflicts: 'Conflitti',
    summaryDuplicates: 'Duplicati',
    summaryFamilyEmail: 'E-mail di famiglia',
    summaryDuplicateInImport: "Duplicato nell'import",
    search: 'Cerca',
    searchPlaceholder: 'Nome, Codice Fiscale, e-mail, città',
    status: 'Stato',
    statusAll: 'Tutti',
    review: 'Revisione',
    reviewAll: 'Tutti',
    reviewFlagged: 'Da revisionare',
    reviewClean: 'Revisionati',
    source: 'Fonte',
    sourceAll: 'Tutte',
    sourceComplete: 'Cloud (completo)',
    sourceImporter: 'Import',
    sourceCertificates: 'Certificati',
    sort: 'Ordina',
    sortReviewFirst: 'Da revisionare prima',
    sortFieldConflict: 'Conflitto di campi prima',
    sortDuplicateInImport: "Duplicato nell'import prima",
    sortFamilyEmail: 'E-mail di famiglia prima',
    sortNonFamilyConflict: 'Conflitti non familiari prima',
    sortNameAsc: 'Nome (A–Z)',
    sortNameDesc: 'Nome (Z–A)',
    colName: 'Nome',
    colFiscalCode: 'Codice Fiscale',
    colEmail: 'E-mail',
    colCity: 'Città',
    colStatus: 'Stato',
    colSources: 'Fonti',
    colReview: 'Revisione',
    colActions: 'Azioni',
    details: 'Dettagli',
    loading: 'Caricamento soci...',
    loadError: 'Impossibile caricare i soci.',
    empty: 'Nessun socio trovato con i filtri attuali.',
    opError: 'Operazione non riuscita.',
    firstWork: '1º Lav.',
    ok: 'OK',
    close: 'Chiudi',
    conflicts: 'Conflitti da risolvere',
    duplicates: 'Possibili duplicati',
    dupEmail: value => `Stessa e-mail: ${value}`,
    dupFamilyEmail: value => `E-mail di famiglia: ${value}`,
    dupNameBirth: 'Stesso nome e data di nascita',
    dupOther: 'Contatto in comune',
    data: 'Dati',
    sourcesWord: 'fonti',
    markReviewed: 'Segna come revisionato',
    remove: 'Elimina',
    mergeHere: 'Unisci qui',
    keepSeparate: 'Tieni separati',
    mergePreviewTitle: 'Rivedi unione',
    mergePreviewMostRecent: name => `Voce più recente: ${name}`,
    mergePreviewOverwritten: 'Valori che saranno sostituiti',
    mergePreviewSelected: 'Record attuale',
    mergePreviewDuplicate: 'Record duplicato',
    mergePreviewChosen: 'Valore mantenuto',
    mergePreviewNoOverwrite: 'Nessun valore esistente sarà sostituito. Verranno riempiti solo i campi vuoti.',
    confirmMerge: (source, target) => `Unire "${source}" in "${target}"? Il record unito verrà eliminato.`,
    confirmKeepSeparate: (source, target) => `Mantenere "${source}" e "${target}" come soci separati? Il flag e-mail di famiglia verrà rimosso.`,
    confirmDelete: name => `Eliminare il socio "${name}"?`,
    reason: {
      'field-conflict': 'Conflitto di campi',
      'possible-duplicate': 'Possibile duplicato',
      'family-email': 'E-mail di famiglia',
      'duplicate-in-importer': "Duplicato nell'import",
      'certificate-only': 'Solo certificato'
    }
  }
};

export const memberFieldLabelsByLocale: Record<SiteLocale, Record<MemberTextField, string>> = {
  pt: {
    surname: 'Sobrenome', firstName: 'Nome', fullName: 'Nome completo', fiscalCode: 'Codice Fiscale', sex: 'Sexo',
    birthDate: 'Nascimento', birthPlace: 'Local de nascimento', birthProvince: 'Província de nascimento',
    birthCountry: 'País de nascimento', email: 'E-mail', email2: 'E-mail 2', phone: 'Telefone', mobile: 'Celular',
    address: 'Endereço', postalCode: 'CEP/CAP', city: 'Cidade', province: 'Província', region: 'Região', country: 'País',
    memberCode: 'Código de sócio', memberStatus: 'Situação', group: 'Grupo', category: 'Categoria',
    cardNumber: 'Carteirinha', cardExpiry: 'Validade da carteirinha', referenceSeat: 'Sede de referência',
    originSociety: 'Sociedade de origem', profession: 'Profissão', nationality: 'Nacionalidade', citizenship: 'Cidadania',
    registrationRequestDate: 'Data do pedido', registrationDate: 'Data de inscrição', renewalDate: 'Data de renovação',
    cancellationDate: 'Data de cancelamento', firstWorkDate: 'Primeiro Trabalho'
  },
  en: {
    surname: 'Surname', firstName: 'First name', fullName: 'Full name', fiscalCode: 'Codice Fiscale', sex: 'Sex',
    birthDate: 'Birth date', birthPlace: 'Birthplace', birthProvince: 'Birth province', birthCountry: 'Birth country',
    email: 'Email', email2: 'Email 2', phone: 'Phone', mobile: 'Mobile', address: 'Address', postalCode: 'Postal code',
    city: 'City', province: 'Province', region: 'Region', country: 'Country', memberCode: 'Member code',
    memberStatus: 'Status', group: 'Group', category: 'Category', cardNumber: 'Card number', cardExpiry: 'Card expiry',
    referenceSeat: 'Reference seat', originSociety: 'Origin society', profession: 'Profession', nationality: 'Nationality',
    citizenship: 'Citizenship', registrationRequestDate: 'Request date', registrationDate: 'Registration date',
    renewalDate: 'Renewal date', cancellationDate: 'Cancellation date', firstWorkDate: 'First Work'
  },
  es: {
    surname: 'Apellido', firstName: 'Nombre', fullName: 'Nombre completo', fiscalCode: 'Codice Fiscale', sex: 'Sexo',
    birthDate: 'Nacimiento', birthPlace: 'Lugar de nacimiento', birthProvince: 'Provincia de nacimiento',
    birthCountry: 'País de nacimiento', email: 'Correo', email2: 'Correo 2', phone: 'Teléfono', mobile: 'Celular',
    address: 'Dirección', postalCode: 'Código postal', city: 'Ciudad', province: 'Provincia', region: 'Región',
    country: 'País', memberCode: 'Código de socio', memberStatus: 'Situación', group: 'Grupo', category: 'Categoría',
    cardNumber: 'Carné', cardExpiry: 'Validez del carné', referenceSeat: 'Sede de referencia',
    originSociety: 'Sociedad de origen', profession: 'Profesión', nationality: 'Nacionalidad', citizenship: 'Ciudadanía',
    registrationRequestDate: 'Fecha de solicitud', registrationDate: 'Fecha de inscripción',
    renewalDate: 'Fecha de renovación', cancellationDate: 'Fecha de cancelación', firstWorkDate: 'Primer Trabajo'
  },
  it: {
    surname: 'Cognome', firstName: 'Nome', fullName: 'Nome completo', fiscalCode: 'Codice Fiscale', sex: 'Sesso',
    birthDate: 'Data di nascita', birthPlace: 'Luogo di nascita', birthProvince: 'Provincia di nascita',
    birthCountry: 'Paese di nascita', email: 'E-mail', email2: 'E-mail 2', phone: 'Telefono', mobile: 'Cellulare',
    address: 'Indirizzo', postalCode: 'CAP', city: 'Città', province: 'Provincia', region: 'Regione', country: 'Paese',
    memberCode: 'Codice socio', memberStatus: 'Stato', group: 'Gruppo', category: 'Categoria', cardNumber: 'Tessera',
    cardExpiry: 'Scadenza tessera', referenceSeat: 'Sede di riferimento', originSociety: 'Società di provenienza',
    profession: 'Professione', nationality: 'Nazionalità', citizenship: 'Cittadinanza',
    registrationRequestDate: 'Data richiesta', registrationDate: 'Data iscrizione', renewalDate: 'Data rinnovo',
    cancellationDate: 'Data cancellazione', firstWorkDate: 'Primo Lavoro'
  }
};

export function memberFieldLabel(locale: SiteLocale, field: string): string {
  return memberFieldLabelsByLocale[locale][field as MemberTextField] ?? field;
}
