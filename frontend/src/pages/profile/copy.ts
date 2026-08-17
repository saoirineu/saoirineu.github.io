import type { ProfileLocale } from '../../lib/profileCatalog';
import type { ProfileSectionsCopy } from './ProfileSections';

/**
 * Wording for the ICEFLU membership form. It sits beside the sections instead of
 * inside ProfilePage because the admin review screen renders the same form
 * read-only: the applicant and whoever reviews them must read identical labels.
 */

const birthDateMonthShortNamesByLocale: Record<ProfileLocale, string[]> = {
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
};

type RegistryCopyKey =
  | 'identity'
  | 'residence'
  | 'association'
  | 'memberLinked'
  | 'firstName'
  | 'surname'
  | 'fullName'
  | 'email2'
  | 'mobile'
  | 'fiscalCode'
  | 'fiscalCodeInvalid'
  | 'idNumber'
  | 'idType'
  | 'idTypePassport'
  | 'idTypeIdCard'
  | 'idTypeOther'
  | 'idTypeOtherSpecify'
  | 'sex'
  | 'sexFemale'
  | 'sexMale'
  | 'sexHint'
  | 'birthDate'
  | 'birthPlace'
  | 'birthProvince'
  | 'birthCountry'
  | 'citizenship'
  | 'citizenshipAdd'
  | 'citizenshipRemove'
  | 'citizenshipCurrent'
  | 'citizenshipSelected'
  | 'citizenshipHint'
  | 'nationality'
  | 'address'
  | 'postalCode'
  | 'province'
  | 'region'
  | 'profession'
  | 'memberCode'
  | 'memberStatus'
  | 'group'
  | 'category'
  | 'cardNumber'
  | 'cardExpiry'
  | 'referenceSeat'
  | 'originSociety'
  | 'referenceChurchOrCenter'
  | 'addReferenceChurch'
  | 'roleSelectPlaceholder'
  | 'roleCustomLabel'
  | 'roleCustomPlaceholder'
  | 'roleAdd'
  | 'roleRemove'
  | 'roleLimitReached'
  | 'doctrineRoleOptions'
  | 'registrationRequestDate'
  | 'registrationDate'
  | 'renewalDate'
  | 'cancellationDate'
  | 'alreadyParticipatedInSantoDaimeWork'
  | 'neverParticipatedInSantoDaimeWork'
  | 'firstWorkDate'
  | 'firstWorkChurchOrCenter'
  | 'identityDocumentPrimary'
  | 'identityDocumentSecondary'
  | 'membershipFeeAmount';

/**
 * Doctrine roles, sorted alphabetically by label within each locale. "other"
 * stays pinned last: it is an action, not a role. The `value` of each option is
 * what gets stored, so those keys must not change — only labels are translated.
 */
const doctrineRoleOptionsByLocale: Record<ProfileLocale, ProfileSectionsCopy['doctrineRoleOptions']> = {
  pt: [
    { value: 'setup', label: 'Arrumação' },
    { value: 'kitchen', label: 'Cozinha' },
    { value: 'children care', label: 'Cuidado de crianças' },
    { value: 'leader', label: 'Dirigente' },
    { value: 'nursing', label: 'Enfermagem/atendimento' },
    { value: 'feitor', label: 'Feitor(a)' },
    { value: 'fiscal', label: 'Fiscal' },
    { value: 'cleaning', label: 'Limpeza' },
    { value: 'musician', label: 'Músico' },
    { value: 'organization', label: 'Organização' },
    { value: 'puxador', label: 'Puxador(a)' },
    { value: 'reception', label: 'Recepção' },
    { value: 'secretary', label: 'Secretaria' },
    { value: 'treasurer', label: 'Tesoureiro' },
    { value: 'zelador', label: 'Zelador(a)' },
    { value: 'other', label: 'Descrever outro' }
  ],
  en: [
    { value: 'children care', label: 'Children care' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'feitor', label: 'Feitor(a)' },
    { value: 'fiscal', label: 'Fiscal' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'leader', label: 'Leader' },
    { value: 'musician', label: 'Musician' },
    { value: 'nursing', label: 'Nursing/care' },
    { value: 'organization', label: 'Organization' },
    { value: 'puxador', label: 'Puxador(a)' },
    { value: 'reception', label: 'Reception' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'setup', label: 'Setup' },
    { value: 'treasurer', label: 'Treasurer' },
    { value: 'zelador', label: 'Zelador(a)' },
    { value: 'other', label: 'Describe another role' }
  ],
  es: [
    { value: 'kitchen', label: 'Cocina' },
    { value: 'children care', label: 'Cuidado de niños' },
    { value: 'leader', label: 'Dirigente' },
    { value: 'nursing', label: 'Enfermería/atención' },
    { value: 'feitor', label: 'Feitor(a)' },
    { value: 'fiscal', label: 'Fiscal' },
    { value: 'cleaning', label: 'Limpieza' },
    { value: 'musician', label: 'Músico' },
    { value: 'organization', label: 'Organización' },
    { value: 'setup', label: 'Preparación' },
    { value: 'puxador', label: 'Puxador(a)' },
    { value: 'reception', label: 'Recepción' },
    { value: 'secretary', label: 'Secretaría' },
    { value: 'treasurer', label: 'Tesorero' },
    { value: 'zelador', label: 'Zelador(a)' },
    { value: 'other', label: 'Describir otro' }
  ],
  it: [
    { value: 'reception', label: 'Accoglienza' },
    { value: 'kitchen', label: 'Cucina' },
    { value: 'children care', label: 'Cura dei bambini' },
    { value: 'leader', label: 'Dirigente' },
    { value: 'feitor', label: 'Feitor(a)' },
    { value: 'fiscal', label: 'Fiscal' },
    { value: 'nursing', label: 'Infermeria/assistenza' },
    { value: 'musician', label: 'Musicista' },
    { value: 'organization', label: 'Organizzazione' },
    { value: 'setup', label: 'Preparazione' },
    { value: 'cleaning', label: 'Pulizia' },
    { value: 'puxador', label: 'Puxador(a)' },
    { value: 'secretary', label: 'Segreteria' },
    { value: 'treasurer', label: 'Tesoriere' },
    { value: 'zelador', label: 'Zelador(a)' },
    { value: 'other', label: 'Descrivere altro' }
  ]
};

const registryCopyByLocale: Record<ProfileLocale, Pick<ProfileSectionsCopy, RegistryCopyKey>> = {
  pt: {
    identity: 'Identidade',
    residence: 'Residência',
    association: 'Associação',
    memberLinked: 'Sócio vinculado',
    firstName: 'Nome',
    surname: 'Sobrenome',
    fullName: 'Nome completo',
    email2: 'Email secundário',
    mobile: 'Celular',
    fiscalCode: 'Codice Fiscale',
    fiscalCodeInvalid: 'Codice fiscale inválido — verifique os 16 caracteres.',
    idNumber: 'Número do documento de identidade',
    idType: 'Tipo de documento',
    idTypePassport: 'Passaporte',
    idTypeIdCard: 'Documento de identidade',
    idTypeOther: 'Outro',
    idTypeOtherSpecify: 'Qual documento?',
    sex: 'Sexo atribuído ao nascer',
    sexFemale: 'Feminino',
    sexMale: 'Masculino',
    sexHint: 'Usado para apoiar a acomodação e a organização ritualística.',
    birthDate: 'Data de nascimento',
    birthPlace: 'Local de nascimento',
    birthProvince: 'Província de nascimento',
    birthCountry: 'País de nascimento',
    citizenship: 'Cidadania',
    citizenshipAdd: '— Adicionar outra cidadania (opcional) —',
    citizenshipRemove: 'Remover cidadania',
    citizenshipCurrent: 'Do seu cadastro de sócio — selecione acima para confirmar',
    citizenshipSelected: 'Cidadania(s) selecionada(s)',
    citizenshipHint: 'Escolha a sua cidadania. Se tiver mais de uma, adicione cada uma delas. Clique numa etiqueta para removê-la.',
    nationality: 'Nacionalidade',
    address: 'Endereço',
    postalCode: 'CEP/CAP',
    province: 'Província',
    region: 'Região',
    profession: 'Profissão',
    memberCode: 'Código de sócio',
    memberStatus: 'Situação',
    group: 'Grupo',
    category: 'Categoria',
    cardNumber: 'Carteirinha',
    cardExpiry: 'Validade da carteirinha',
    referenceSeat: 'Sede de referência',
    originSociety: 'Sociedade de origem',
    referenceChurchOrCenter: 'Igreja ou centro de referência',
    addReferenceChurch: 'Cadastrar nova igreja ou centro',
    roleSelectPlaceholder: 'Selecionar papel...',
    roleCustomLabel: 'Descrever papel',
    roleCustomPlaceholder: 'Descreva o papel na doutrina',
    roleAdd: 'Adicionar',
    roleRemove: 'Remover papel',
    roleLimitReached: 'Limite de 20 papéis atingido.',
    doctrineRoleOptions: doctrineRoleOptionsByLocale.pt,
    registrationRequestDate: 'Data do pedido',
    registrationDate: 'Data de inscrição',
    renewalDate: 'Data de renovação',
    cancellationDate: 'Data de cancelamento',
    alreadyParticipatedInSantoDaimeWork: 'Já participei de um trabalho de Santo Daime',
    neverParticipatedInSantoDaimeWork: 'Nunca participei de um trabalho de Santo Daime',
    firstWorkDate: 'Data do primeiro trabalho',
    firstWorkChurchOrCenter: 'Igreja ou centro do primeiro trabalho',
    identityDocumentPrimary: 'Documento de identidade (frente/verso)',
    identityDocumentSecondary: 'Documento de identidade (verso opcional)',
    membershipFeeAmount: 'Quota'
  },
  en: {
    identity: 'Identity',
    residence: 'Residence',
    association: 'Association',
    memberLinked: 'Linked member',
    firstName: 'First name',
    surname: 'Last name',
    fullName: 'Full name',
    email2: 'Secondary email',
    mobile: 'Mobile',
    fiscalCode: 'Tax code',
    fiscalCodeInvalid: 'Invalid tax code — check the 16 characters.',
    idNumber: 'ID number',
    idType: 'ID type',
    idTypePassport: 'Passport',
    idTypeIdCard: 'ID card',
    idTypeOther: 'Other',
    idTypeOtherSpecify: 'Which document?',
    sex: 'Sex Assigned at Birth',
    sexFemale: 'Female',
    sexMale: 'Male',
    sexHint: 'Used to support accommodation and ritualistic organization.',
    birthDate: 'Birth date',
    birthPlace: 'Birthplace',
    birthProvince: 'Birth province',
    birthCountry: 'Birth country',
    citizenship: 'Citizenship',
    citizenshipAdd: '— Add another citizenship (optional) —',
    citizenshipRemove: 'Remove citizenship',
    citizenshipCurrent: 'From your member record — select above to confirm',
    citizenshipSelected: 'Selected citizenship(s)',
    citizenshipHint: 'Choose your citizenship. If you have more than one, add each of them. Click a tag to remove it.',
    nationality: 'Nationality',
    address: 'Address',
    postalCode: 'ZIP code',
    province: 'Province',
    region: 'Region',
    profession: 'Profession',
    memberCode: 'Member code',
    memberStatus: 'Status',
    group: 'Group',
    category: 'Category',
    cardNumber: 'Card number',
    cardExpiry: 'Card expiry',
    referenceSeat: 'Reference seat',
    originSociety: 'Origin society',
    referenceChurchOrCenter: 'Reference Church or Center',
    addReferenceChurch: 'Create new church or center',
    roleSelectPlaceholder: 'Select role...',
    roleCustomLabel: 'Describe role',
    roleCustomPlaceholder: 'Describe the role in the doctrine',
    roleAdd: 'Add',
    roleRemove: 'Remove role',
    roleLimitReached: 'Limit of 20 roles reached.',
    doctrineRoleOptions: doctrineRoleOptionsByLocale.en,
    registrationRequestDate: 'Request date',
    registrationDate: 'Registration date',
    renewalDate: 'Renewal date',
    cancellationDate: 'Cancellation date',
    alreadyParticipatedInSantoDaimeWork: 'I have already attended a Santo Daime work',
    neverParticipatedInSantoDaimeWork: 'I have never attended a Santo Daime work',
    firstWorkDate: 'First Work date',
    firstWorkChurchOrCenter: 'First Work church or center',
    identityDocumentPrimary: 'Document (identity card/passport)',
    identityDocumentSecondary: 'Document (optional second side)',
    membershipFeeAmount: 'Amount'
  },
  es: {
    identity: 'Identidad',
    residence: 'Residencia',
    association: 'Asociación',
    memberLinked: 'Socio vinculado',
    firstName: 'Nombre',
    surname: 'Apellido',
    fullName: 'Nombre completo',
    email2: 'Correo secundario',
    mobile: 'Celular',
    fiscalCode: 'Codice Fiscale',
    fiscalCodeInvalid: 'Codice fiscale inválido — comprueba los 16 caracteres.',
    idNumber: 'Número de documento de identidad',
    idType: 'Tipo de documento',
    idTypePassport: 'Pasaporte',
    idTypeIdCard: 'Documento de identidad',
    idTypeOther: 'Otro',
    idTypeOtherSpecify: '¿Qué documento?',
    sex: 'Sexo asignado al nacer',
    sexFemale: 'Femenino',
    sexMale: 'Masculino',
    sexHint: 'Se usa para apoyar la acomodación y la organización ritual.',
    birthDate: 'Fecha de nacimiento',
    birthPlace: 'Lugar de nacimiento',
    birthProvince: 'Provincia de nacimiento',
    birthCountry: 'País de nacimiento',
    citizenship: 'Ciudadanía',
    citizenshipAdd: '— Añadir otra ciudadanía (opcional) —',
    citizenshipRemove: 'Quitar ciudadanía',
    citizenshipCurrent: 'De su registro de socio — seleccione arriba para confirmar',
    citizenshipSelected: 'Ciudadanía(s) seleccionada(s)',
    citizenshipHint: 'Elija su ciudadanía. Si tiene más de una, añádalas todas. Haga clic en una etiqueta para quitarla.',
    nationality: 'Nacionalidad',
    address: 'Dirección',
    postalCode: 'Código postal',
    province: 'Provincia',
    region: 'Región',
    profession: 'Profesión',
    memberCode: 'Código de socio',
    memberStatus: 'Situación',
    group: 'Grupo',
    category: 'Categoría',
    cardNumber: 'Carné',
    cardExpiry: 'Validez del carné',
    referenceSeat: 'Sede de referencia',
    originSociety: 'Sociedad de origen',
    referenceChurchOrCenter: 'Iglesia o centro de referencia',
    addReferenceChurch: 'Registrar nueva iglesia o centro',
    roleSelectPlaceholder: 'Seleccionar rol...',
    roleCustomLabel: 'Describir rol',
    roleCustomPlaceholder: 'Describa el rol en la doctrina',
    roleAdd: 'Añadir',
    roleRemove: 'Quitar rol',
    roleLimitReached: 'Límite de 20 roles alcanzado.',
    doctrineRoleOptions: doctrineRoleOptionsByLocale.es,
    registrationRequestDate: 'Fecha de solicitud',
    registrationDate: 'Fecha de inscripción',
    renewalDate: 'Fecha de renovación',
    cancellationDate: 'Fecha de cancelación',
    alreadyParticipatedInSantoDaimeWork: 'Ya participé en un trabajo de Santo Daime',
    neverParticipatedInSantoDaimeWork: 'Nunca participé en un trabajo de Santo Daime',
    firstWorkDate: 'Fecha del primer trabajo',
    firstWorkChurchOrCenter: 'Iglesia o centro del primer trabajo',
    identityDocumentPrimary: 'Documento de identidad/pasaporte',
    identityDocumentSecondary: 'Documento (segunda cara opcional)',
    membershipFeeAmount: 'Cuota'
  },
  it: {
    identity: 'Identità',
    residence: 'Residenza',
    association: 'Associazione',
    memberLinked: 'Socio collegato',
    firstName: 'Nome',
    surname: 'Cognome',
    fullName: 'Nome completo',
    email2: 'Email secondaria',
    mobile: 'Cellulare',
    fiscalCode: 'Codice Fiscale',
    fiscalCodeInvalid: 'Codice fiscale non valido — controlla i 16 caratteri.',
    idNumber: 'Numero del documento d\'identità',
    idType: 'Tipo di documento',
    idTypePassport: 'Passaporto',
    idTypeIdCard: 'Carta d\'identità',
    idTypeOther: 'Altro',
    idTypeOtherSpecify: 'Quale documento?',
    sex: 'Sesso di nascita',
    sexFemale: 'Femmina',
    sexMale: 'Maschio',
    sexHint: 'Usato per supportare l\'alloggio e l\'organizzazione rituale.',
    birthDate: 'Data di nascita',
    birthPlace: 'Luogo di nascita',
    birthProvince: 'Provincia di nascita',
    birthCountry: 'Nazione di nascita',
    citizenship: 'Cittadinanza',
    citizenshipAdd: "— Aggiungi un'altra cittadinanza (facoltativo) —",
    citizenshipRemove: 'Rimuovi cittadinanza',
    citizenshipCurrent: 'Dalla tua anagrafica socio — seleziona sopra per confermare',
    citizenshipSelected: 'Cittadinanza/e selezionata/e',
    citizenshipHint: "Scegli la tua cittadinanza. Se ne hai più di una, aggiungile tutte. Clicca su un'etichetta per rimuoverla.",
    nationality: 'Nazionalità',
    address: 'Indirizzo',
    postalCode: 'CAP',
    province: 'Provincia',
    region: 'Regione',
    profession: 'Professione',
    memberCode: 'Codice socio',
    memberStatus: 'Stato',
    group: 'Gruppo',
    category: 'Categoria',
    cardNumber: 'Tessera',
    cardExpiry: 'Scadenza tessera',
    referenceSeat: 'Sede di riferimento',
    originSociety: 'Società di provenienza',
    referenceChurchOrCenter: 'Chiesa o centro di riferimento',
    addReferenceChurch: 'Registra nuova chiesa o centro',
    roleSelectPlaceholder: 'Seleziona ruolo...',
    roleCustomLabel: 'Descrivi ruolo',
    roleCustomPlaceholder: 'Descrivi il ruolo nella dottrina',
    roleAdd: 'Aggiungi',
    roleRemove: 'Rimuovi ruolo',
    roleLimitReached: 'Limite di 20 ruoli raggiunto.',
    doctrineRoleOptions: doctrineRoleOptionsByLocale.it,
    registrationRequestDate: 'Data richiesta',
    registrationDate: 'Data iscrizione',
    renewalDate: 'Data rinnovo',
    cancellationDate: 'Data cancellazione',
    alreadyParticipatedInSantoDaimeWork: 'Ho già partecipato a un lavoro di Santo Daime',
    neverParticipatedInSantoDaimeWork: 'Non ho mai partecipato a un lavoro di Santo Daime',
    firstWorkDate: 'Data del primo lavoro',
    firstWorkChurchOrCenter: 'Chiesa o centro del primo lavoro',
    identityDocumentPrimary: 'Carta di identità (fronte/retro)',
    identityDocumentSecondary: 'Carta identità (eventuale retro)',
    membershipFeeAmount: 'Quota'
  }
};

type ConsentCopyKey =
  | 'information'
  | 'privacyDocumentLink'
  | 'privacyDocumentUrl'
  | 'statuteDocumentLink'
  | 'statuteDocumentUrl'
  | 'privacyLabel'
  | 'privacyText'
  | 'declarationLabel'
  | 'declarationText'
  | 'consentAgree'
  | 'consentDisagree';

const consentCopyByLocale: Record<ProfileLocale, Pick<ProfileSectionsCopy, ConsentCopyKey>> = {
  pt: {
    information: 'Informações',
    privacyDocumentLink: 'Documento de privacidade',
    privacyDocumentUrl: 'https://firebasestorage.googleapis.com/v0/b/sao-irineu.firebasestorage.app/o/docs%2Ficeflu-privacy-pt.pdf?alt=media',
    statuteDocumentLink: 'Estatuto ICEFLU (em italiano)',
    statuteDocumentUrl: 'https://firebasestorage.googleapis.com/v0/b/sao-irineu.firebasestorage.app/o/docs%2Ficeflu-statuto-it.pdf?alt=media',
    privacyLabel: 'Privacidade',
    privacyText: 'Declaro que recebi, li e compreendi a informação sobre o tratamento de dados pessoais nos termos do artigo 13 do Regulamento (UE) 2016/679. Tomo conhecimento de que os meus dados pessoais serão tratados pela ICEFLU na medida necessária à gestão do pedido de inscrição, da relação associativa, dos cumprimentos legais e da prossecução dos fins estatutários. Dou o meu consentimento expresso, nos termos dos artigos 4.º, n.º 11, 6.º, 7.º e 9.º do Regulamento (UE) 2016/679, ao tratamento dos dados pessoais que possam revelar a minha adesão, participação ou interesse pela ICEFLU e a respetiva dimensão religiosa, para as finalidades indicadas na informação de privacidade. Consinto ainda a comunicação dos dados relativos à minha inscrição à Stella Azzurra ETS, entidade com a qual a ICEFLU colabora, para que esses dados sejam tratados na medida necessária ao cumprimento de obrigações legais, estatutárias, organizativas ou administrativas ligadas às atividades comuns. Estou consciente de que o consentimento pode ser retirado a qualquer momento, sem prejudicar a licitude do tratamento efetuado antes da retirada.',
    declarationLabel: 'Declaração',
    declarationText: 'Solicito a este Conselho Diretivo ser admitido(a) como sócio(a) da Associação e poder participar das atividades associativas. Para tal, declaro ter lido e compartilhado as disposições estatutárias vigentes e as deliberações dos órgãos sociais validamente constituídos, que me comprometo a respeitar.',
    consentAgree: 'Concordo',
    consentDisagree: 'Não concordo'
  },
  en: {
    information: 'Information',
    privacyDocumentLink: 'Privacy document',
    privacyDocumentUrl: 'https://firebasestorage.googleapis.com/v0/b/sao-irineu.firebasestorage.app/o/docs%2Ficeflu-privacy-en.pdf?alt=media',
    statuteDocumentLink: 'ICEFLU statute (in Italian)',
    statuteDocumentUrl: 'https://firebasestorage.googleapis.com/v0/b/sao-irineu.firebasestorage.app/o/docs%2Ficeflu-statuto-it.pdf?alt=media',
    privacyLabel: 'Privacy',
    privacyText: 'I declare that I have received, read and understood the privacy notice on the processing of personal data pursuant to Article 13 of Regulation (EU) 2016/679. I acknowledge that my personal data will be processed by ICEFLU to the extent necessary for the management of the membership application, the membership relationship, legal obligations and the pursuit of the statutory purposes. I expressly consent, pursuant to Articles 4(11), 6, 7 and 9 of Regulation (EU) 2016/679, to the processing of personal data that may reveal my adherence, participation or interest in ICEFLU and the related religious dimension, for the purposes indicated in the privacy notice. I also consent to the communication of data relating to my membership to Stella Azzurra ETS, an entity with which ICEFLU cooperates, so that such data may be processed to the extent necessary for compliance with legal, statutory, organisational or administrative obligations connected with joint activities. I am aware that consent may be withdrawn at any time, without affecting the lawfulness of processing carried out before withdrawal.',
    declarationLabel: 'Declaration',
    declarationText: 'I hereby submit a request to the Board of Directors to be admitted as a member of the Association and to be allowed to participate in its activities. To this end, I state having read and shared the current statutory provisions and the resolutions of the duly constituted social bodies, which I commit to respect.',
    consentAgree: 'I agree',
    consentDisagree: 'Not agree'
  },
  es: {
    information: 'Información',
    privacyDocumentLink: 'Documento de privacidad',
    privacyDocumentUrl: 'https://firebasestorage.googleapis.com/v0/b/sao-irineu.firebasestorage.app/o/docs%2Ficeflu-privacy-es.pdf?alt=media',
    statuteDocumentLink: 'Estatuto ICEFLU (en italiano)',
    statuteDocumentUrl: 'https://firebasestorage.googleapis.com/v0/b/sao-irineu.firebasestorage.app/o/docs%2Ficeflu-statuto-it.pdf?alt=media',
    privacyLabel: 'Privacidad',
    privacyText: 'Declaro haber recibido, leído y comprendido la información sobre el tratamiento de datos personales con arreglo al artículo 13 del Reglamento (UE) 2016/679. Tomo nota de que mis datos personales serán tratados por ICEFLU en la medida necesaria para la gestión de la solicitud de inscripción, de la relación asociativa, de los cumplimientos legales y de la consecución de los fines estatutarios. Presto mi consentimiento expreso, de conformidad con los artículos 4.11, 6, 7 y 9 del Reglamento (UE) 2016/679, al tratamiento de los datos personales que puedan revelar mi adhesión, participación o interés hacia ICEFLU y la correspondiente dimensión religiosa, para las finalidades indicadas en la información de privacidad. Asimismo, consiento la comunicación de los datos relativos a mi inscripción a Stella Azzurra ETS, entidad con la que ICEFLU colabora, para que dichos datos sean tratados en la medida necesaria para el cumplimiento de obligaciones legales, estatutarias, organizativas o administrativas vinculadas a las actividades comunes. Soy consciente de que el consentimiento puede retirarse en cualquier momento, sin que ello afecte a la licitud del tratamiento realizado antes de la retirada.',
    declarationLabel: 'Declaración',
    declarationText: 'Solicito a este Consejo Directivo ser admitido(a) como socio(a) de la Asociación y poder participar en las actividades asociativas. A tal fin, declaro haber leído y compartido las disposiciones estatutarias vigentes y las resoluciones de los órganos sociales válidamente constituidos, que me comprometo a respetar.',
    consentAgree: 'Acepto',
    consentDisagree: 'No acepto'
  },
  it: {
    information: 'Informative',
    privacyDocumentLink: 'Documento privacy',
    privacyDocumentUrl: 'https://firebasestorage.googleapis.com/v0/b/sao-irineu.firebasestorage.app/o/docs%2Ficeflu-privacy-it.pdf?alt=media',
    statuteDocumentLink: 'Statuto ICEFLU',
    statuteDocumentUrl: 'https://firebasestorage.googleapis.com/v0/b/sao-irineu.firebasestorage.app/o/docs%2Ficeflu-statuto-it.pdf?alt=media',
    privacyLabel: 'Privacy',
    privacyText: 'Dichiaro di aver ricevuto, letto e compreso l\'informativa sul trattamento dei dati personali ai sensi dell\'art. 13 del Regolamento (UE) 2016/679. Prendo atto che i miei dati personali saranno trattati da ICEFLU nella misura necessaria alla gestione della domanda di iscrizione, del rapporto associativo, degli adempimenti di legge e del perseguimento degli scopi statutari. Acconsento espressamente, ai sensi degli artt. 4 n. 11, 6, 7 e 9 del Regolamento (UE) 2016/679, al trattamento dei dati personali che possono rivelare la mia adesione, partecipazione o interesse verso ICEFLU e la relativa dimensione religiosa, per le finalità indicate nell\'informativa. Acconsento inoltre alla comunicazione dei dati relativi alla mia iscrizione a Stella Azzurra ETS, ente con cui ICEFLU collabora, affinché tali dati siano trattati nella misura necessaria all\'adempimento di obblighi di legge, statutari, organizzativi o amministrativi connessi alle attività comuni. Sono consapevole che il consenso può essere revocato in qualsiasi momento, senza pregiudicare la liceità del trattamento effettuato prima della revoca.',
    declarationLabel: 'Dichiarazione',
    declarationText: "Chiede a questo spett.le Consiglio Direttivo di essere ammesso/a quale socio/a dell'Associazione, e di poter partecipare alle attività associative. A tal fine, dichiara di aver letto e condiviso le disposizioni statutarie vigenti e le delibere degli organi sociali validamente costituiti, che si impegna a rispettare.",
    consentAgree: 'Acconsento',
    consentDisagree: 'Non Acconsento'
  }
};

export const profileCopyByLocale: Record<ProfileLocale, {
  title: string;
  intro: string;
  sessionExpired: string;
  saveError: string;
  saving: string;
  save: string;
  saved: string;
  submitForApproval: string;
  submittingForApproval: string;
  submittedForApproval: string;
  pendingBannerTitle: string;
  pendingBannerDesc: string;
  reviewBannerTitle: string;
  reviewBannerDesc: string;
  adminNoteLabel: string;
  snapshotSectionTitle: string;
  snapshotApprovedOn: string;
  requiredFieldsMissing: string;
  idUploadTitle: string;
  idUploadIntro: string;
  idUploadCurrent: string;
  idUploadChoose: string;
  idUploadSelected: string;
  familyEmailTitle: string;
  familyEmailIntro: string;
  thisIsMe: string;
  prefilledFrom: (name: string) => string;
  sections: ProfileSectionsCopy;
}> = {
  pt: {
    title: 'Perfil ICEFLU',
    intro: 'Todos os campos marcados com * são obrigatórios para enviar sua inscrição ICEFLU à aprovação. Você pode salvar um rascunho a qualquer momento e enviar quando todos os campos obrigatórios estiverem preenchidos.',
    sessionExpired: 'Sessão expirada',
    saveError: 'Erro ao salvar',
    saving: 'Salvando...',
    save: 'Salvar perfil',
    saved: 'Salvo.',
    submitForApproval: 'Enviar para aprovação',
    submittingForApproval: 'Enviando...',
    submittedForApproval: 'Enviado para aprovação.',
    pendingBannerTitle: 'Perfil em análise',
    pendingBannerDesc: 'Seu perfil foi enviado e está aguardando revisão. A edição fica bloqueada enquanto a aprovação está pendente.',
    reviewBannerTitle: 'Revisão solicitada pela administração',
    reviewBannerDesc: 'A administração analisou seu perfil e deixou uma nota. Atualize seu perfil conforme indicado e reenvie para aprovação.',
    adminNoteLabel: 'Nota da administração',
    snapshotSectionTitle: 'Perfil de associado aprovado',
    snapshotApprovedOn: 'Aprovado em',
    requiredFieldsMissing: 'Preencha todos os campos marcados com * (incluindo Privacidade e Declaração) antes de enviar à aprovação.',
    idUploadTitle: 'Documento de identidade',
    idUploadIntro: 'Envie um PDF, JPG ou PNG do seu documento para que a administração possa avaliar sua inscrição no ICEFLU.',
    idUploadCurrent: 'Documento enviado',
    idUploadChoose: 'Selecionar documento',
    idUploadSelected: 'Selecionado',
    familyEmailTitle: 'Encontramos mais de um sócio com o seu e-mail',
    familyEmailIntro: 'Este e-mail é compartilhado por mais de um cadastro de sócio. Selecione quem é você para preencher o perfil com os dados corretos.',
    thisIsMe: 'Sou eu',
    prefilledFrom: name => `Perfil pré-preenchido com os dados do sócio: ${name}. Você pode alterar tudo e salvar.`,
    sections: {
      ...registryCopyByLocale.pt, ...consentCopyByLocale.pt, name: 'Nome', yourName: 'Seu nome', nameHint: 'Como você gosta de ser chamado(a).', fullNameHint: 'Nome incluindo segundos nomes.', birthDateMonthShortNames: birthDateMonthShortNamesByLocale.pt, email: 'Email de login', emailHint: 'É o email usado para entrar no São Irineu.', email2Hint: 'Use este email se preferir receber comunicações nele ou se não conseguirmos contato pelo email de login.', preferredCommunicationEmail: 'Email preferido para comunicação', preferredLoginEmail: 'Email de login', preferredSecondaryEmail: 'Email secundário', phone: 'Telefone', optional: 'Opcional', city: 'Cidade', state: 'Estado/UF', country: 'País', avatar: 'Avatar', avatarUrl: 'URL do avatar', useGooglePhoto: 'Usar foto do Google', currentChurchRegistered: 'Igreja atual (cadastrada)', selectPlaceholder: '— Selecionar —', currentChurchText: 'Igreja atual (texto livre)', notRegisteredYet: 'Se não estiver cadastrada', originChurchText: 'Igreja de origem (texto livre)', originChurchPlaceholder: 'Linha ou igreja de onde veio', notes: 'Observações gerais', iAmInitiated: 'Sou fardado(a)', iAmSponsor: 'Sou padrinho/madrinha', initiationDate: 'Data do fardamento', initiationPlace: 'Local do fardamento', initiationPlacePlaceholder: 'Cidade/estado ou igreja', whoInitiatedMe: 'Quem me fardou', whoInitiatedMePlaceholder: 'Nome do padrinho/madrinha', initiationChurchRegistered: 'Igreja onde fui fardado (cadastrada)', initiationChurchOrCenter: 'Igreja ou centro do fardamento', initiationChurchText: 'Igreja onde fui fardado (texto livre)', withWhomIWasInitiated: 'Com quem me fardei', withWhomIWasInitiatedPlaceholder: 'Outras pessoas fardadas junto', sponsorChurchesRegistered: 'Igrejas onde sou padrinho/madrinha (cadastradas)', sponsorChurchesText: 'Igrejas onde sou padrinho/madrinha (texto livre)', sponsorChurchesPlaceholder: 'Ex.: nome de igrejas não cadastradas', roles: 'Papéis na doutrina (separar por vírgula)', rolesPlaceholder: 'Ex.: tesoureiro, coordenador, músico oficial, limpeza', rolesHint: 'Use termos livres (ex.: tesoureiro, cozinheira oficial, organização, arrumação, limpeza, músico, músico oficial).', icefluOnlyNote: 'Campo fora do formulário ICEFLU — desativado por enquanto.', nationalityQuestion: 'Você é cidadão ou residente italiano?', nationalityItalian: 'Italiano', nationalityNonItalian: 'Não italiano', nationalityHint: 'Como este portal está ligado à associação ICEFLU Itália com sede legal em Itália, os campos a preencher mudam se a inscrição for feita por um cidadão ou residente italiano.'
    }
  },
  en: {
    title: 'ICEFLU Profile', intro: 'All fields marked with * are required to submit your ICEFLU membership for approval. You can save a draft at any time and submit once every required field is filled.', sessionExpired: 'Session expired', saveError: 'Error while saving', saving: 'Saving...', save: 'Save profile', saved: 'Saved.', submitForApproval: 'Submit for approval', submittingForApproval: 'Submitting...', submittedForApproval: 'Submitted for approval.', pendingBannerTitle: 'Profile under review', pendingBannerDesc: 'Your profile has been submitted and is under review. Editing is locked while approval is pending.', reviewBannerTitle: 'Review requested by the administration', reviewBannerDesc: 'The administrator reviewed your profile and left a note. Please update your profile as indicated and resubmit for approval.', adminNoteLabel: 'Note from the administration', snapshotSectionTitle: 'Approved ICEFLU membership profile', snapshotApprovedOn: 'Approved on', requiredFieldsMissing: 'Fill in all fields marked with * (including Privacy and Declaration) before submitting for approval.', idUploadTitle: 'Identity document', idUploadIntro: 'Upload a PDF, JPG, or PNG of your ID so the administration can review your ICEFLU subscription.', idUploadCurrent: 'Uploaded document', idUploadChoose: 'Choose document', idUploadSelected: 'Selected', familyEmailTitle: 'We found more than one member with your email', familyEmailIntro: 'This email is shared by more than one member record. Select who you are to fill the profile with the right data.', thisIsMe: 'This is me', prefilledFrom: name => `Profile prefilled with member data: ${name}. You can change everything and save.`, sections: { ...registryCopyByLocale.en, ...consentCopyByLocale.en, name: 'Name', yourName: 'Your name', nameHint: 'How you like to be called.', fullNameHint: 'Name including middle names.', birthDateMonthShortNames: birthDateMonthShortNamesByLocale.en, email: 'Login email', emailHint: 'This is the email used to log in to São Irineu.', email2Hint: 'Use this email if we cannot reach you by the login email, or if you prefer it as your communication medium.', preferredCommunicationEmail: 'Preferred communication email', preferredLoginEmail: 'Login email', preferredSecondaryEmail: 'Secondary email', phone: 'Phone', optional: 'Optional', city: 'City', state: 'State/Region', country: 'Country', avatar: 'Avatar', avatarUrl: 'Avatar URL', useGooglePhoto: 'Use Google photo', currentChurchRegistered: 'Current church (registered)', selectPlaceholder: '— Select —', currentChurchText: 'Current church (free text)', notRegisteredYet: 'If it is not registered yet', originChurchText: 'Origin church (free text)', originChurchPlaceholder: 'Lineage or church you came from', notes: 'General notes', iAmInitiated: 'I am initiated (fardado)', iAmSponsor: 'I am sponsor/godparent', initiationDate: 'Initiation date', initiationPlace: 'Initiation place', initiationPlacePlaceholder: 'City/state or church', whoInitiatedMe: 'Who initiated me', whoInitiatedMePlaceholder: 'Name of sponsor/godparent', initiationChurchRegistered: 'Church where I was initiated (registered)', initiationChurchOrCenter: 'Church or center of Fardamento', initiationChurchText: 'Church where I was initiated (free text)', withWhomIWasInitiated: 'With whom I was initiated', withWhomIWasInitiatedPlaceholder: 'Other people initiated together', sponsorChurchesRegistered: 'Churches where I am sponsor/godparent (registered)', sponsorChurchesText: 'Churches where I am sponsor/godparent (free text)', sponsorChurchesPlaceholder: 'Example: churches not yet registered', roles: 'Roles in the doctrine (comma separated)', rolesPlaceholder: 'Example: treasurer, coordinator, official musician, cleaning', rolesHint: 'Use free terms such as treasurer, official cook, organization, setup, cleaning, musician, official musician.', icefluOnlyNote: 'Field not part of the ICEFLU form — disabled for now.', nationalityQuestion: 'Are you an Italian citizen or resident?', nationalityItalian: 'Italian', nationalityNonItalian: 'Non-Italian', nationalityHint: 'Since this portal is linked to ICEFLU Italia, an association registered in Italy, the fields to fill in change depending on whether the registration is made by an Italian citizen or resident.' }
  },
  es: {
    title: 'Perfil ICEFLU', intro: 'Todos los campos marcados con * son obligatorios para enviar su inscripción ICEFLU a aprobación. Puede guardar un borrador en cualquier momento y enviar cuando todos los campos obligatorios estén completos.', sessionExpired: 'Sesión expirada', saveError: 'Error al guardar', saving: 'Guardando...', save: 'Guardar perfil', saved: 'Guardado.', submitForApproval: 'Enviar a aprobación', submittingForApproval: 'Enviando...', submittedForApproval: 'Enviado a aprobación.', pendingBannerTitle: 'Perfil en revisión', pendingBannerDesc: 'Su perfil fue enviado y está pendiente de revisión. La edición está bloqueada mientras la aprobación está pendiente.', reviewBannerTitle: 'Revisión solicitada por la administración', reviewBannerDesc: 'La administración revisó su perfil y dejó una nota. Actualice su perfil según lo indicado y vuelva a enviar para aprobación.', adminNoteLabel: 'Nota de la administración', snapshotSectionTitle: 'Perfil de miembro ICEFLU aprobado', snapshotApprovedOn: 'Aprobado el', requiredFieldsMissing: 'Complete todos los campos marcados con * (incluidas Privacidad y Declaración) antes de enviar a aprobación.', idUploadTitle: 'Documento de identidad', idUploadIntro: 'Suba un PDF, JPG o PNG de su documento para que la administración pueda revisar su inscripción en ICEFLU.', idUploadCurrent: 'Documento enviado', idUploadChoose: 'Seleccionar documento', idUploadSelected: 'Seleccionado', familyEmailTitle: 'Encontramos más de un socio con su correo', familyEmailIntro: 'Este correo es compartido por más de un socio. Seleccione quién es usted para completar el perfil con los datos correctos.', thisIsMe: 'Soy yo', prefilledFrom: name => `Perfil precargado con los datos del socio: ${name}. Puede cambiar todo y guardar.`, sections: { ...registryCopyByLocale.es, ...consentCopyByLocale.es, name: 'Nombre', yourName: 'Su nombre', nameHint: 'Cómo le gusta que le llamen.', fullNameHint: 'Nombre incluyendo segundos nombres.', birthDateMonthShortNames: birthDateMonthShortNamesByLocale.es, email: 'Correo de inicio de sesión', emailHint: 'Es el correo usado para entrar en São Irineu.', email2Hint: 'Use este correo si prefiere recibir comunicaciones allí o si no logramos contactarle por el correo de inicio de sesión.', preferredCommunicationEmail: 'Correo preferido para comunicación', preferredLoginEmail: 'Correo de inicio de sesión', preferredSecondaryEmail: 'Correo secundario', phone: 'Teléfono', optional: 'Opcional', city: 'Ciudad', state: 'Estado/Provincia', country: 'País', avatar: 'Avatar', avatarUrl: 'URL del avatar', useGooglePhoto: 'Usar foto de Google', currentChurchRegistered: 'Iglesia actual (registrada)', selectPlaceholder: '— Seleccionar —', currentChurchText: 'Iglesia actual (texto libre)', notRegisteredYet: 'Si todavía no está registrada', originChurchText: 'Iglesia de origen (texto libre)', originChurchPlaceholder: 'Línea o iglesia de procedencia', notes: 'Observaciones generales', iAmInitiated: 'Soy fardado(a)', iAmSponsor: 'Soy padrino/madrina', initiationDate: 'Fecha del fardamento', initiationPlace: 'Lugar del fardamento', initiationPlacePlaceholder: 'Ciudad/estado o iglesia', whoInitiatedMe: 'Quién me fardó', whoInitiatedMePlaceholder: 'Nombre del padrino/madrina', initiationChurchRegistered: 'Iglesia donde fui fardado (registrada)', initiationChurchOrCenter: 'Iglesia o centro del fardamento', initiationChurchText: 'Iglesia donde fui fardado (texto libre)', withWhomIWasInitiated: 'Con quién me fardé', withWhomIWasInitiatedPlaceholder: 'Otras personas fardadas conmigo', sponsorChurchesRegistered: 'Iglesias donde soy padrino/madrina (registradas)', sponsorChurchesText: 'Iglesias donde soy padrino/madrina (texto libre)', sponsorChurchesPlaceholder: 'Ej.: iglesias no registradas', roles: 'Roles en la doctrina (separados por comas)', rolesPlaceholder: 'Ej.: tesorero, coordinador, músico oficial, limpieza', rolesHint: 'Use términos libres, por ejemplo tesorero, cocinera oficial, organización, arreglo, limpieza, músico, músico oficial.', icefluOnlyNote: 'Campo fuera del formulario ICEFLU — desactivado por ahora.', nationalityQuestion: '¿Es ciudadano o residente italiano?', nationalityItalian: 'Italiano', nationalityNonItalian: 'No italiano', nationalityHint: 'Dado que este portal está vinculado a la asociación ICEFLU Italia, con sede en Italia, los campos a completar cambian si la inscripción la realiza un ciudadano o residente italiano.' }
  },
  it: {
    title: 'Profilo ICEFLU', intro: 'Tutti i campi contrassegnati con * sono obbligatori per inviare la tua iscrizione ICEFLU all\'approvazione. Puoi salvare una bozza in qualsiasi momento e inviare quando tutti i campi obbligatori sono compilati.', sessionExpired: 'Sessione scaduta', saveError: 'Errore durante il salvataggio', saving: 'Salvataggio...', save: 'Salva profilo', saved: 'Salvato.', submitForApproval: 'Invia all\'approvazione', submittingForApproval: 'Invio...', submittedForApproval: 'Inviato all\'approvazione.', pendingBannerTitle: 'Profilo in revisione', pendingBannerDesc: 'Il tuo profilo è stato inviato ed è in attesa di revisione. La modifica è bloccata mentre l\'approvazione è in sospeso.', reviewBannerTitle: 'Revisione richiesta dall\'amministrazione', reviewBannerDesc: 'L\'amministrazione ha esaminato il tuo profilo e ha lasciato una nota. Aggiorna il profilo come indicato e invia nuovamente per l\'approvazione.', adminNoteLabel: 'Nota dell\'amministrazione', snapshotSectionTitle: 'Profilo membro ICEFLU approvato', snapshotApprovedOn: 'Approvato il', requiredFieldsMissing: 'Compila tutti i campi contrassegnati con * (incluse Privacy e Dichiarazione) prima di inviare all\'approvazione.', idUploadTitle: 'Documento di identità', idUploadIntro: 'Carica un PDF, JPG o PNG del tuo documento affinché l\'amministrazione possa valutare la tua iscrizione a ICEFLU.', idUploadCurrent: 'Documento caricato', idUploadChoose: 'Seleziona documento', idUploadSelected: 'Selezionato', familyEmailTitle: 'Abbiamo trovato più di un socio con la tua email', familyEmailIntro: 'Questa email è condivisa da più di un socio. Seleziona chi sei per compilare il profilo con i dati corretti.', thisIsMe: 'Sono io', prefilledFrom: name => `Profilo precompilato con i dati del socio: ${name}. Puoi modificare tutto e salvare.`, sections: { ...registryCopyByLocale.it, ...consentCopyByLocale.it, name: 'Nome', yourName: 'Il tuo nome', nameHint: 'Come preferisce essere chiamato/a.', fullNameHint: 'Nome comprensivo dei secondi nomi.', birthDateMonthShortNames: birthDateMonthShortNamesByLocale.it, email: 'Email di login', emailHint: 'È l\'email usata per accedere a São Irineu.', email2Hint: 'Usa questa email se preferisci ricevere comunicazioni qui o se non riusciamo a contattarti tramite l\'email di login.', preferredCommunicationEmail: 'Email preferita per le comunicazioni', preferredLoginEmail: 'Email di login', preferredSecondaryEmail: 'Email secondaria', phone: 'Telefono', optional: 'Facoltativo', city: 'Città', state: 'Stato/Provincia', country: 'Paese', avatar: 'Avatar', avatarUrl: 'URL avatar', useGooglePhoto: 'Usa foto Google', currentChurchRegistered: 'Chiesa attuale (registrata)', selectPlaceholder: '— Seleziona —', currentChurchText: 'Chiesa attuale (testo libero)', notRegisteredYet: 'Se non è ancora registrata', originChurchText: 'Chiesa di origine (testo libero)', originChurchPlaceholder: 'Linea o chiesa di provenienza', notes: 'Osservazioni generali', iAmInitiated: 'Sono fardado/a', iAmSponsor: 'Sono padrino/madrina', initiationDate: 'Data del fardamento', initiationPlace: 'Luogo del fardamento', initiationPlacePlaceholder: 'Città/stato o chiesa', whoInitiatedMe: 'Chi mi ha fardato', whoInitiatedMePlaceholder: 'Nome del padrino/madrina', initiationChurchRegistered: 'Chiesa dove ho ricevuto il fardamento (registrata)', initiationChurchOrCenter: 'Chiesa o centro del fardamento', initiationChurchText: 'Chiesa dove ho ricevuto il fardamento (testo libero)', withWhomIWasInitiated: 'Con chi mi sono fardato', withWhomIWasInitiatedPlaceholder: 'Altre persone fardate insieme a me', sponsorChurchesRegistered: 'Chiese dove sono padrino/madrina (registrate)', sponsorChurchesText: 'Chiese dove sono padrino/madrina (testo libero)', sponsorChurchesPlaceholder: 'Es.: chiese non registrate', roles: 'Ruoli nella dottrina (separati da virgola)', rolesPlaceholder: 'Es.: tesoriere, coordinatore, musicista ufficiale, pulizia', rolesHint: 'Usa termini liberi, ad esempio tesoriere, cuoca ufficiale, organizzazione, sistemazione, pulizia, musicista, musicista ufficiale.', icefluOnlyNote: 'Campo non presente nel modulo ICEFLU — disabilitato per ora.', nationalityQuestion: 'Sei cittadino o residente italiano?', nationalityItalian: 'Italiano', nationalityNonItalian: 'Non italiano', nationalityHint: 'Siccome questo portale è collegato all\'associazione ICEFLU Italia con sede legale in Italia, i campi da compilare cambiano se l\'iscrizione è fatta da un cittadino o residente italiano.' }
  }
};

const roleTitleByLocale: Record<ProfileLocale, string> = {
  pt: 'Papéis na doutrina (opcional)',
  en: 'Roles in the doctrine (optional)',
  es: 'Roles en la doctrina (opcional)',
  it: 'Ruoli nella dottrina (facoltativo)'
};

const roleHintByLocale: Record<ProfileLocale, string> = {
  pt: 'Selecione os papéis aplicáveis. Use a opção de descrever para papéis que não aparecem na lista.',
  en: 'Select the applicable roles. Use the describe option for roles that do not appear in the list.',
  es: 'Seleccione los roles aplicables. Use la opción de describir para roles que no aparecen en la lista.',
  it: 'Seleziona i ruoli applicabili. Usa l\'opzione di descrizione per ruoli non presenti nella lista.'
};

/**
 * Section copy as the form is really rendered: two labels only settle once the
 * locale is known ("Nazione" reads better than "Paese" in Italian), and the
 * roles block carries its own title and hint.
 */
export function profileSectionsCopy(locale: ProfileLocale): ProfileSectionsCopy {
  const base = profileCopyByLocale[locale].sections;
  return {
    ...base,
    country: locale === 'it' ? 'Nazione' : base.country,
    roles: roleTitleByLocale[locale],
    rolesHint: roleHintByLocale[locale]
  };
}
