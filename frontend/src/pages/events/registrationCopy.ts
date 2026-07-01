import type { EventLocale } from '../../lib/events';
import type { EventRegistrationValidationError } from '../../lib/eventRegistrations';

export type RegistrationCopy = {
  loggedIntro: string;
  outcomeStatusTitle: string;
  outcomeApproved: string;
  outcomeAwaitingPayment: string;
  outcomeFullyApproved: string;
  outcomeInterview: string;
  outcomeRejected: string;
  personalTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  church: string;
  centerLeader: string;
  centerLeaderEmail: string;
  centerLeaderEmailInfo: string;
  statusTitle: string;
  initiated: string;
  icefluMember: string;
  novice: string;
  yes: string;
  no: string;
  participationTitle: string;
  attendanceMode: string;
  modeLodging: string;
  modeMeals: string;
  modeSpiritual: string;
  checkIn: string;
  checkOut: string;
  slotsAvailableLabel: string;
  bedNote: string;
  extraLinen: string;
  worksTitle: string;
  worksHint: string;
  documentsTitle: string;
  paymentProof: string;
  consentDocument: string;
  consentNote: string;
  priceTableTitle: string;
  priceTableWorksHeading: string;
  priceTableWorksCount: string;
  priceTierStandard: string;
  priceTierFardado: string;
  priceTierIceflu: string;
  priceTableStayHeading: string;
  priceTableLodging: string;
  priceTableMeals: string;
  priceTableExtraLinen: string;
  priceTablePerNight: string;
  contributionTitle: string;
  nights: string;
  lodging: string;
  spiritualWorks: string;
  extras: string;
  total: string;
  cautionDeposit: string;
  paymentTooltip: string;
  submit: string;
  update: string;
  submitting: string;
  notFound: string;
  closed: string;
  approvalRequiredTitle: string;
  approvalRequiredBody: string;
  approvalRequiredCta: string;
  fileSelect: string;
  fileRemove: string;
  filePreview: string;
  fileInfoTitle: string;
  fileInfoBody: string;
  fileInvalidType: string;
  fileTooLarge: string;
  fileCompressionError: string;
  fileProcessing: string;
  fileCompressionTitle: string;
  fileCompressionBody: string;
  fileOriginalSize: string;
  fileCompressedSize: string;
  fileApproveCompressed: string;
  fileKeepOriginal: string;
  filePreviewTitle: string;
  fileDownload: string;
  fileOpenNewTab: string;
  close: string;
  resourcesTitle: string;
  generalProgram: string;
  directions: string;
  paymentInfoButton: string;
  paymentBeneficiary: string;
  paymentCausale: string;
  paymentNote: string;
  privacyConsent: string;
  contactInfo: string;
  successTitle: string;
  successIntro: string;
  registrationId: string;
  backHome: string;
  saveDraft: string;
  draftSaved: string;
  draftLoaded: string;
  consentDownload: string;
  errors: Record<EventRegistrationValidationError, string>;
};

export const registrationCopyByLocale: Record<EventLocale, RegistrationCopy> = {
  pt: {
    loggedIntro: 'Preencha o formulário abaixo e envie a inscrição quando estiver completa.',
    outcomeStatusTitle: 'Situação da sua inscrição',
    outcomeApproved: 'A sua inscrição foi aprovada.',
    outcomeAwaitingPayment: 'O dirigente aprovou a sua inscrição. Ela está agora aguardando a verificação do pagamento pela administração.',
    outcomeFullyApproved: 'A sua inscrição foi aprovada tanto pelo dirigente quanto pela administração e está confirmada.',
    outcomeInterview: 'A sua inscrição está em suspenso porque primeiro você precisa fazer a entrevista de conhecimento preliminar. Entre em contato com o centro de referência para fazer a entrevista.',
    outcomeRejected: 'A sua inscrição foi rejeitada; para mais esclarecimentos procure o seu centro de referência.',
    personalTitle: 'Dados pessoais',
    firstName: 'Nome',
    lastName: 'Sobrenome',
    email: 'Email',
    phone: 'Telefone (com código do país)',
    country: 'País',
    church: 'Igreja ou centro de referência',
    centerLeader: 'Nome do dirigente do centro',
    centerLeaderEmail: 'E-mail da igreja ou centro',
    centerLeaderEmailInfo: 'Se não souber, pergunte a quem lhe enviou o link deste portal. Se ainda assim não souber ou não existir, informe "international.secretariat@stellazzurra.org".',
    statusTitle: 'Vínculo com a doutrina',
    initiated: 'Fardado',
    icefluMember: 'Membro ICEFLU em dia com as mensalidades',
    novice: 'Primeira participação',
    yes: 'Sim',
    no: 'Não',
    participationTitle: 'Participação e estadia',
    attendanceMode: 'Modalidade',
    modeLodging: 'Hospedagem, alimentação e trabalhos espirituais',
    modeMeals: 'Somente alimentação e trabalhos espirituais',
    modeSpiritual: 'Somente trabalhos espirituais',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    slotsAvailableLabel: 'Vagas de participação disponíveis',
    bedNote: 'Nota: no leito está incluído apenas o lençol de baixo.',
    extraLinen: 'Quero lençol de cima e kit de toalhas',
    worksTitle: 'Trabalhos espirituais',
    worksHint: 'Selecione um ou mais trabalhos. O valor é calculado automaticamente.',
    documentsTitle: 'Documentos',
    paymentProof: 'Comprovante de pagamento',
    consentDocument: 'Consentimento informado assinado',
    consentNote: 'É necessário um consentimento informado assinado (não há um registrado ou o último aprovado tem mais de 12 meses). Assine-o e envie-o aqui.',
    priceTableTitle: 'Tabela de preços',
    priceTableWorksHeading: 'Trabalhos espirituais',
    priceTableWorksCount: '{count} trabalho(s)',
    priceTierStandard: 'Padrão',
    priceTierFardado: 'Fardado',
    priceTierIceflu: 'Membro ICEFLU',
    priceTableStayHeading: 'Estadia e extras',
    priceTableLodging: 'Hospedagem',
    priceTableMeals: 'Alimentação',
    priceTableExtraLinen: 'Lençol de cima + kit de toalhas',
    priceTablePerNight: 'por noite',
    contributionTitle: 'Resumo da contribuição',
    nights: 'Noites',
    lodging: 'Hospedagem / alimentação',
    spiritualWorks: 'Trabalhos espirituais',
    extras: 'Extras',
    total: 'Total',
    cautionDeposit: 'Depósito de caução',
    paymentTooltip: 'Faça a transferência no valor do depósito de caução ou do total para a conta indicada e depois envie o comprovante em "Comprovante de pagamento".',
    submit: 'Enviar inscrição',
    update: 'Atualizar inscrição',
    submitting: 'Enviando...',
    notFound: 'Evento não encontrado.',
    closed: 'As inscrições para este evento não estão abertas.',
    approvalRequiredTitle: 'Filiação ICEFLU pendente de aprovação',
    approvalRequiredBody: 'A inscrição neste evento está disponível apenas para membros ICEFLU com o perfil aprovado. Complete e envie seu perfil para aprovação; após a aprovação você poderá se inscrever.',
    approvalRequiredCta: 'Ir para o perfil',
    fileSelect: 'Escolher ou soltar arquivo',
    fileRemove: 'Remover',
    filePreview: 'Ver',
    fileInfoTitle: 'Formatos e tamanho',
    fileInfoBody: 'Aceitamos PDF, JPG, JPEG e PNG, até 10 MB.',
    fileInvalidType: 'Envie um arquivo PDF, JPG, JPEG ou PNG.',
    fileTooLarge: 'O arquivo precisa ter no máximo 10 MB.',
    fileCompressionError: 'Não foi possível reduzir a imagem automaticamente.',
    fileProcessing: 'Preparando imagem...',
    fileCompressionTitle: 'Revisar imagem reduzida',
    fileCompressionBody: 'A imagem foi reduzida antes do envio. Escolha se deseja usar a versão reduzida ou o original.',
    fileOriginalSize: 'Tamanho original',
    fileCompressedSize: 'Tamanho reduzido',
    fileApproveCompressed: 'Usar imagem reduzida',
    fileKeepOriginal: 'Manter original',
    filePreviewTitle: 'Visualizar arquivo',
    fileDownload: 'Baixar',
    fileOpenNewTab: 'Abrir em nova aba',
    close: 'Fechar',
    resourcesTitle: 'Informações',
    generalProgram: 'Programa geral',
    directions: 'Como chegar',
    paymentInfoButton: 'Dados bancários',
    paymentBeneficiary: 'Beneficiário',
    paymentCausale: 'Causale',
    paymentNote: 'Use estes dados para a transferência (caução ou total).',
    privacyConsent: 'Autorizo o tratamento dos meus dados pessoais para as finalidades relativas à realização e participação neste evento e em outros eventos organizados pelo ICEFLU Santo Daime Europa e centros associados.',
    contactInfo: 'Dúvidas? Escreva para international.secretariat@stellazzurra.org',
    successTitle: 'Inscrição recebida',
    successIntro: 'Sua inscrição foi recebida. A organização irá verificar as informações que você forneceu e o seu pagamento. Após a aprovação, você receberá um e-mail.',
    registrationId: 'Número da inscrição',
    backHome: 'Voltar ao início',
    saveDraft: 'Salvar rascunho',
    draftSaved: 'Rascunho salvo neste navegador. Arquivos não armazenados.',
    draftLoaded: 'Rascunho carregado automaticamente.',
    consentDownload: 'Baixe o termo de consentimento informado',
    errors: {
      firstName: 'Preencha o nome.',
      lastName: 'Preencha o sobrenome.',
      email: 'Preencha o e-mail.',
      phone: 'Preencha o telefone.',
      country: 'Preencha o país.',
      church: 'Preencha a igreja ou centro.',
      centerLeader: 'Preencha o nome do dirigente.',
      centerLeaderEmail: 'Informe o e-mail da igreja ou centro.',
      selectedWorks: 'Selecione ao menos um trabalho.',
      checkIn: 'Informe a data de check-in.',
      checkOut: 'Informe uma data de check-out válida.',
      paymentProof: 'Anexe o comprovante de pagamento.',
      consentDocument: 'Anexe o consentimento informado assinado.'
    }
  },
  en: {
    loggedIntro: 'Fill in the form below and submit the registration once it is complete.',
    outcomeStatusTitle: 'Your registration status',
    outcomeApproved: 'Your registration has been approved.',
    outcomeAwaitingPayment: 'The reference church approved your registration. It is now awaiting payment verification by the administration.',
    outcomeFullyApproved: 'Your registration has been approved by both the reference church and the administration and is confirmed.',
    outcomeInterview: 'Your registration is on hold because you first need to have the preliminary introductory interview. Get in touch with your reference center to arrange the interview.',
    outcomeRejected: 'Your registration has been rejected; for further clarification please contact your reference center.',
    personalTitle: 'Personal details',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone (with country code)',
    country: 'Country',
    church: 'Reference church or center',
    centerLeader: 'Leader name of the reference center',
    centerLeaderEmail: 'Email of the church or center',
    centerLeaderEmailInfo: 'If you do not know it, ask whoever gave you the link to this portal. If still unknown or non-existent, enter "international.secretariat@stellazzurra.org".',
    statusTitle: 'Doctrinal status',
    initiated: 'Fardado',
    icefluMember: 'ICEFLU member up to date with monthly dues',
    novice: 'First participation',
    yes: 'Yes',
    no: 'No',
    participationTitle: 'Participation and stay',
    attendanceMode: 'Attendance mode',
    modeLodging: 'Meals, lodging and spiritual works',
    modeMeals: 'Meals and spiritual works only',
    modeSpiritual: 'Spiritual works only',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    slotsAvailableLabel: 'Available participation slots',
    bedNote: 'Note: the bed includes only the bottom sheet.',
    extraLinen: 'I need a top sheet and towel kit',
    worksTitle: 'Spiritual works',
    worksHint: 'Select one or more works. The contribution is calculated automatically.',
    documentsTitle: 'Documents',
    paymentProof: 'Payment proof',
    consentDocument: 'Signed informed consent',
    consentNote: 'A signed informed consent is required (none on file, or the last approved one is older than 12 months). Sign it and upload it here.',
    priceTableTitle: 'Price table',
    priceTableWorksHeading: 'Spiritual works',
    priceTableWorksCount: '{count} work(s)',
    priceTierStandard: 'Standard',
    priceTierFardado: 'Fardado',
    priceTierIceflu: 'ICEFLU member',
    priceTableStayHeading: 'Stay and extras',
    priceTableLodging: 'Lodging',
    priceTableMeals: 'Meals',
    priceTableExtraLinen: 'Top sheet + towel kit',
    priceTablePerNight: 'per night',
    contributionTitle: 'Contribution summary',
    nights: 'Nights',
    lodging: 'Lodging / meals',
    spiritualWorks: 'Spiritual works',
    extras: 'Extras',
    total: 'Total',
    cautionDeposit: 'Caution deposit',
    paymentTooltip: 'Transfer either the caution deposit or the full total to the account shown, then upload the receipt to "Payment proof".',
    submit: 'Submit registration',
    update: 'Update registration',
    submitting: 'Submitting...',
    notFound: 'Event not found.',
    closed: 'Registration for this event is not open.',
    approvalRequiredTitle: 'ICEFLU membership pending approval',
    approvalRequiredBody: 'Registration for this event is available only to ICEFLU members with an approved profile. Complete and submit your profile for approval; once approved you will be able to register.',
    approvalRequiredCta: 'Go to profile',
    fileSelect: 'Choose or drop file',
    fileRemove: 'Remove',
    filePreview: 'View',
    fileInfoTitle: 'Formats and size',
    fileInfoBody: 'Accepted: PDF, JPG, JPEG, and PNG, up to 10 MB.',
    fileInvalidType: 'Please upload a PDF, JPG, JPEG, or PNG file.',
    fileTooLarge: 'The file must be at most 10 MB.',
    fileCompressionError: 'The image could not be reduced automatically.',
    fileProcessing: 'Preparing image...',
    fileCompressionTitle: 'Review reduced image',
    fileCompressionBody: 'This image was reduced before upload. Choose the reduced version or keep the original.',
    fileOriginalSize: 'Original size',
    fileCompressedSize: 'Reduced size',
    fileApproveCompressed: 'Use reduced image',
    fileKeepOriginal: 'Keep original',
    filePreviewTitle: 'Preview file',
    fileDownload: 'Download',
    fileOpenNewTab: 'Open in new tab',
    close: 'Close',
    resourcesTitle: 'Information',
    generalProgram: 'General program',
    directions: 'How to get there',
    paymentInfoButton: 'Payment details',
    paymentBeneficiary: 'Beneficiary',
    paymentCausale: 'Payment reason',
    paymentNote: 'Use these details for the transfer (caution deposit or full total).',
    privacyConsent: 'I consent to the processing of my personal data for the purposes related to the organisation and participation in this event and other events organised by ICEFLU Santo Daime Europe and affiliated centres.',
    contactInfo: 'Questions? Write to international.secretariat@stellazzurra.org',
    successTitle: 'Registration received',
    successIntro: 'Your registration has been received. The organization will verify the information you provided and your payment. Once approved, you will receive an email.',
    registrationId: 'Registration number',
    backHome: 'Back to home',
    saveDraft: 'Save draft',
    draftSaved: 'Draft saved in this browser. Attached files not stored.',
    draftLoaded: 'Draft loaded automatically.',
    consentDownload: 'Download the informed consent form',
    errors: {
      firstName: 'Please fill in the first name.',
      lastName: 'Please fill in the last name.',
      email: 'Please fill in the email.',
      phone: 'Please fill in the phone number.',
      country: 'Please fill in the country.',
      church: 'Please fill in the church or center.',
      centerLeader: 'Please fill in the leader name.',
      centerLeaderEmail: 'Please provide the church or center email.',
      selectedWorks: 'Select at least one spiritual work.',
      checkIn: 'Please provide the check-in date.',
      checkOut: 'Please provide a valid check-out date.',
      paymentProof: 'Please attach the payment proof.',
      consentDocument: 'Please attach the signed informed consent.'
    }
  },
  es: {
    loggedIntro: 'Complete el formulario y envíe la inscripción cuando esté completa.',
    outcomeStatusTitle: 'Situación de tu inscripción',
    outcomeApproved: 'Tu inscripción ha sido aprobada.',
    outcomeAwaitingPayment: 'El dirigente aprobó tu inscripción. Ahora está a la espera de la verificación del pago por parte de la administración.',
    outcomeFullyApproved: 'Tu inscripción ha sido aprobada tanto por el dirigente como por la administración y está confirmada.',
    outcomeInterview: 'Tu inscripción está en suspenso porque primero debes hacer la entrevista de conocimiento preliminar. Ponte en contacto con tu centro de referencia para hacer la entrevista.',
    outcomeRejected: 'Tu inscripción ha sido rechazada; para más aclaraciones busca tu centro de referencia.',
    personalTitle: 'Datos personales',
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Email',
    phone: 'Teléfono (con código de país)',
    country: 'País',
    church: 'Iglesia o centro de referencia',
    centerLeader: 'Nombre del dirigente del centro',
    centerLeaderEmail: 'Correo de la iglesia o centro',
    centerLeaderEmailInfo: 'Si no lo conoces, pregunta a quien te dio el enlace de este portal. Si aún así no lo sabes o no existe, escribe "international.secretariat@stellazzurra.org".',
    statusTitle: 'Vínculo con la doctrina',
    initiated: 'Fardado',
    icefluMember: 'Miembro ICEFLU al día con las mensualidades',
    novice: 'Primera participación',
    yes: 'Sí',
    no: 'No',
    participationTitle: 'Participación y estancia',
    attendanceMode: 'Modalidad',
    modeLodging: 'Alojamiento, comidas y trabajos espirituales',
    modeMeals: 'Solo comidas y trabajos espirituales',
    modeSpiritual: 'Solo trabajos espirituales',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    slotsAvailableLabel: 'Plazas de participación disponibles',
    bedNote: 'Nota: la cama incluye solo la sábana de abajo.',
    extraLinen: 'Quiero sábana de encima y kit de toallas',
    worksTitle: 'Trabajos espirituales',
    worksHint: 'Seleccione uno o más trabajos. El valor se calcula automáticamente.',
    documentsTitle: 'Documentos',
    paymentProof: 'Comprobante de pago',
    consentDocument: 'Consentimiento informado firmado',
    consentNote: 'Se requiere un consentimiento informado firmado (no hay ninguno registrado o el último aprobado tiene más de 12 meses). Fírmalo y súbelo aquí.',
    priceTableTitle: 'Tabla de precios',
    priceTableWorksHeading: 'Trabajos espirituales',
    priceTableWorksCount: '{count} trabajo(s)',
    priceTierStandard: 'Estándar',
    priceTierFardado: 'Fardado',
    priceTierIceflu: 'Miembro ICEFLU',
    priceTableStayHeading: 'Estadía y extras',
    priceTableLodging: 'Alojamiento',
    priceTableMeals: 'Comidas',
    priceTableExtraLinen: 'Sábana de arriba + kit de toallas',
    priceTablePerNight: 'por noche',
    contributionTitle: 'Resumen de la contribución',
    nights: 'Noches',
    lodging: 'Alojamiento / comidas',
    spiritualWorks: 'Trabajos espirituales',
    extras: 'Extras',
    total: 'Total',
    cautionDeposit: 'Depósito de garantía',
    paymentTooltip: 'Transfiere el importe del depósito de garantía o del total a la cuenta indicada y luego sube el comprobante en "Comprobante de pago".',
    submit: 'Enviar inscripción',
    update: 'Actualizar inscripción',
    submitting: 'Enviando...',
    notFound: 'Evento no encontrado.',
    closed: 'La inscripción a este evento no está abierta.',
    approvalRequiredTitle: 'Afiliación ICEFLU pendiente de aprobación',
    approvalRequiredBody: 'La inscripción a este evento está disponible solo para miembros ICEFLU con el perfil aprobado. Completa y envía tu perfil para aprobación; una vez aprobado podrás inscribirte.',
    approvalRequiredCta: 'Ir al perfil',
    fileSelect: 'Elegir o soltar archivo',
    fileRemove: 'Quitar',
    filePreview: 'Ver',
    fileInfoTitle: 'Formatos y tamaño',
    fileInfoBody: 'Se aceptan PDF, JPG, JPEG y PNG, hasta 10 MB.',
    fileInvalidType: 'Suba un archivo PDF, JPG, JPEG o PNG.',
    fileTooLarge: 'El archivo debe tener como máximo 10 MB.',
    fileCompressionError: 'No fue posible reducir la imagen automáticamente.',
    fileProcessing: 'Preparando imagen...',
    fileCompressionTitle: 'Revisar imagen reducida',
    fileCompressionBody: 'La imagen se redujo antes del envío. Elija la versión reducida o el original.',
    fileOriginalSize: 'Tamaño original',
    fileCompressedSize: 'Tamaño reducido',
    fileApproveCompressed: 'Usar imagen reducida',
    fileKeepOriginal: 'Mantener original',
    filePreviewTitle: 'Ver archivo',
    fileDownload: 'Descargar',
    fileOpenNewTab: 'Abrir en una pestaña nueva',
    close: 'Cerrar',
    resourcesTitle: 'Información',
    generalProgram: 'Programa general',
    directions: 'Cómo llegar',
    paymentInfoButton: 'Datos bancarios',
    paymentBeneficiary: 'Beneficiario',
    paymentCausale: 'Concepto',
    paymentNote: 'Use estos datos para la transferencia (depósito de garantía o total).',
    privacyConsent: 'Autorizo el tratamiento de mis datos personales para las finalidades relativas a la realización y participación en este evento y en otros eventos organizados por ICEFLU Santo Daime Europa y centros asociados.',
    contactInfo: '¿Preguntas? Escríbenos a international.secretariat@stellazzurra.org',
    successTitle: 'Inscripción recibida',
    successIntro: 'Su inscripción ha sido recibida. La organización verificará la información que proporcionó y su pago. Una vez aprobada, recibirá un correo electrónico.',
    registrationId: 'Número de inscripción',
    backHome: 'Volver al inicio',
    saveDraft: 'Guardar borrador',
    draftSaved: 'Borrador guardado en este navegador. Archivos adjuntos no almacenados.',
    draftLoaded: 'Borrador cargado automáticamente.',
    consentDownload: 'Descarga el consentimiento informado',
    errors: {
      firstName: 'Complete el nombre.',
      lastName: 'Complete el apellido.',
      email: 'Complete el correo electrónico.',
      phone: 'Complete el teléfono.',
      country: 'Complete el país.',
      church: 'Complete la iglesia o centro.',
      centerLeader: 'Complete el nombre del dirigente.',
      centerLeaderEmail: 'Indique el correo de la iglesia o centro.',
      selectedWorks: 'Seleccione al menos un trabajo.',
      checkIn: 'Indique la fecha de check-in.',
      checkOut: 'Indique una fecha de check-out válida.',
      paymentProof: 'Adjunte el comprobante de pago.',
      consentDocument: 'Adjunte el consentimiento informado firmado.'
    }
  },
  it: {
    loggedIntro: "Compila il modulo qui sotto e invia l'iscrizione quando è completa.",
    outcomeStatusTitle: 'Stato della tua iscrizione',
    outcomeApproved: 'La tua iscrizione è stata approvata.',
    outcomeAwaitingPayment: 'Il dirigente ha approvato la tua iscrizione. È ora in attesa della verifica del pagamento da parte dell\'amministrazione.',
    outcomeFullyApproved: 'La tua iscrizione è stata approvata sia dal dirigente sia dall\'amministrazione ed è confermata.',
    outcomeInterview: 'La tua iscrizione è in sospeso perché prima devi fare il colloquio conoscitivo preliminare. Entra in contatto col centro di riferimento per fare il colloquio.',
    outcomeRejected: 'La tua iscrizione è stata rifiutata; per maggiori chiarimenti cerca il tuo centro di riferimento.',
    personalTitle: 'Dati personali',
    firstName: 'Nome',
    lastName: 'Cognome',
    email: 'Email',
    phone: 'Telefono (con prefisso internazionale)',
    country: 'Paese',
    church: 'Chiesa o centro di riferimento',
    centerLeader: 'Nome del dirigente del centro',
    centerLeaderEmail: 'Email della chiesa o centro',
    centerLeaderEmailInfo: 'Se non lo conosci, chiedi a chi ti ha dato il link di questo portale. Se ancora non lo sai o non esiste, inserisci "international.secretariat@stellazzurra.org".',
    statusTitle: 'Rapporto con la dottrina',
    initiated: 'Fardado',
    icefluMember: 'Membro ICEFLU in pari con le mensilità',
    novice: 'Prima partecipazione',
    yes: 'Sì',
    no: 'No',
    participationTitle: 'Partecipazione e permanenza',
    attendanceMode: 'Modalità',
    modeLodging: 'Vitto, alloggio e lavori spirituali',
    modeMeals: 'Solo vitto e lavori spirituali',
    modeSpiritual: 'Solo lavori spirituali',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    slotsAvailableLabel: 'Posti di partecipazione disponibili',
    bedNote: 'Nota: nel letto è incluso soltanto il lenzuolo di sotto.',
    extraLinen: 'Desidero lenzuolo di sopra e kit asciugamani',
    worksTitle: 'Lavori spirituali',
    worksHint: 'Seleziona uno o più lavori. Il contributo è calcolato automaticamente.',
    documentsTitle: 'Documenti',
    paymentProof: 'Contabile bonifico pagamento',
    consentDocument: 'Consenso informato firmato',
    consentNote: "È richiesto un consenso informato firmato (non presente o con l'ultimo approvato più vecchio di 12 mesi). Firmalo e caricalo qui.",
    priceTableTitle: 'Listino prezzi',
    priceTableWorksHeading: 'Lavori spirituali',
    priceTableWorksCount: '{count} lavoro/i',
    priceTierStandard: 'Standard',
    priceTierFardado: 'Fardado',
    priceTierIceflu: 'Membro ICEFLU',
    priceTableStayHeading: 'Soggiorno ed extra',
    priceTableLodging: 'Alloggio',
    priceTableMeals: 'Pasti',
    priceTableExtraLinen: 'Lenzuolo di sopra + kit asciugamani',
    priceTablePerNight: 'a notte',
    contributionTitle: 'Riepilogo del contributo',
    nights: 'Notti',
    lodging: 'Alloggio / vitto',
    spiritualWorks: 'Lavori spirituali',
    extras: 'Extra',
    total: 'Totale',
    cautionDeposit: 'Caparra',
    paymentTooltip: 'Effettua il bonifico per l\'importo della caparra o del totale sul conto indicato e poi carica la contabile in "Contabile bonifico".',
    submit: 'Invia iscrizione',
    update: 'Aggiorna iscrizione',
    submitting: 'Invio in corso...',
    notFound: 'Evento non trovato.',
    closed: 'Le iscrizioni per questo evento non sono aperte.',
    approvalRequiredTitle: 'Iscrizione ICEFLU in attesa di approvazione',
    approvalRequiredBody: "L'iscrizione a questo evento è disponibile solo per i membri ICEFLU con il profilo approvato. Completa e invia il tuo profilo per l'approvazione; una volta approvato potrai iscriverti.",
    approvalRequiredCta: 'Vai al profilo',
    fileSelect: 'Scegli o trascina file',
    fileRemove: 'Rimuovi',
    filePreview: 'Apri',
    fileInfoTitle: 'Formati e dimensione',
    fileInfoBody: 'Sono accettati PDF, JPG, JPEG e PNG, fino a 10 MB.',
    fileInvalidType: 'Carica un file PDF, JPG, JPEG o PNG.',
    fileTooLarge: 'Il file deve essere al massimo di 10 MB.',
    fileCompressionError: "Non è stato possibile ridurre automaticamente l'immagine.",
    fileProcessing: 'Preparazione immagine...',
    fileCompressionTitle: 'Controlla immagine ridotta',
    fileCompressionBody: "L'immagine è stata ridotta prima del caricamento. Scegli la versione ridotta o l'originale.",
    fileOriginalSize: 'Dimensione originale',
    fileCompressedSize: 'Dimensione ridotta',
    fileApproveCompressed: 'Usa immagine ridotta',
    fileKeepOriginal: 'Mantieni originale',
    filePreviewTitle: 'Anteprima file',
    fileDownload: 'Scarica',
    fileOpenNewTab: 'Apri in una nuova scheda',
    close: 'Chiudi',
    resourcesTitle: 'Informazioni',
    generalProgram: 'Programma generale',
    directions: 'Come arrivare',
    paymentInfoButton: 'Dati bancari',
    paymentBeneficiary: 'Beneficiario',
    paymentCausale: 'Causale',
    paymentNote: 'Usa questi dati per il bonifico (caparra o totale).',
    privacyConsent: 'Autorizzo al trattamento dei dati personali per le finalità relative alla realizzazione e partecipazione di questo evento e di altri eventi organizzati da ICEFLU Santo Daime Europa e centri collegati.',
    contactInfo: 'Domande? Scrivi a international.secretariat@stellazzurra.org',
    successTitle: 'Iscrizione ricevuta',
    successIntro: "La tua iscrizione è stata ricevuta. L'organizzazione verificherà le informazioni che hai fornito e il tuo pagamento. Una volta approvata, riceverai un'email.",
    registrationId: 'Numero iscrizione',
    backHome: "Torna all'inizio",
    saveDraft: 'Salva bozza',
    draftSaved: 'Bozza salvata in questo browser. File allegati non archiviati.',
    draftLoaded: 'Bozza caricata automaticamente.',
    consentDownload: 'Scarica il consenso informato',
    errors: {
      firstName: 'Compila il nome.',
      lastName: 'Compila il cognome.',
      email: "Compila l'email.",
      phone: 'Compila il telefono.',
      country: 'Compila il paese.',
      church: 'Compila la chiesa o centro.',
      centerLeader: 'Compila il nome del dirigente.',
      centerLeaderEmail: "Indica l'email della chiesa o centro.",
      selectedWorks: 'Seleziona almeno un lavoro.',
      checkIn: 'Indica la data di check-in.',
      checkOut: 'Indica una data di check-out valida.',
      paymentProof: 'Allega la contabile del bonifico.',
      consentDocument: 'Allega il consenso informato firmato.'
    }
  }
};
