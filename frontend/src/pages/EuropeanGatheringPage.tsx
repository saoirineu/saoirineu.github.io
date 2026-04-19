import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { siteLocaleOptions } from '../lib/siteLocale';
import {
  createEuropeanGatheringRegistration,
  europeanGatheringRoomOptions,
  fetchEuropeanGatheringRoomAvailability
} from '../lib/europeanGathering';
import {
  compressEuropeanGatheringImage,
  europeanGatheringImageCompressionThresholdBytes,
  europeanGatheringUploadAccept,
  europeanGatheringUploadMaxBytes,
  formatFileSize,
  shouldOfferEuropeanGatheringImageCompression,
  validateEuropeanGatheringUploadFile
} from '../lib/europeanGatheringUpload';
import { useSiteLocale } from '../providers/useSiteLocale';
import {
  buildEuropeanGatheringPayload,
  calculateContribution,
  consentDocumentPaths,
  directionsPaths,
  generalProgramPaths,
  initialEuropeanGatheringFormValues,
  resolveInitialLocale,
  suggestedCheckInDate,
  suggestedCheckOutDate,
  type EuropeanGatheringFormValues,
  type Locale,
  type SpiritualWorkId,
  validateEuropeanGatheringForm
} from './european-gathering/form';

type Copy = {
  pageTitle: string;
  pageIntro: string;
  loggedIntro: string;
  languageLabel: string;
  anonymousNote: string;
  resourcesTitle: string;
  resourcesIntro: string;
  generalProgram: string;
  directions: string;
  consentDownload: string;
  consentHint: string;
  formTitle: string;
  personalTitle: string;
  firstName: string;
  lastName: string;
  country: string;
  church: string;
  centerLeader: string;
  statusTitle: string;
  initiated: string;
  icefluMember: string;
  novice: string;
  participationTitle: string;
  attendanceMode: string;
  modeLodging: string;
  modeMeals: string;
  modeSpiritual: string;
  checkIn: string;
  checkOut: string;
  datePlaceholder: string;
  roomNumber: string;
  roomHelpTrigger: string;
  roomHelpTitle: string;
  roomHelpIntro: string;
  roomHelpCapacity: string;
  roomRemaining: string;
  roomSelectPlaceholder: string;
  noRoomsAvailable: string;
  noRoomsAvailableDetail: string;
  extraLinen: string;
  worksTitle: string;
  worksHint: string;
  documentsTitle: string;
  identityDocument: string;
  paymentProof: string;
  consentDocument: string;
  fileSelect: string;
  fileRemove: string;
  filePreview: string;
  fileInfoTrigger: string;
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
  consentDownloadInline: string;
  documentsHint: string;
  contributionTitle: string;
  nights: string;
  lodging: string;
  spiritualWorks: string;
  extras: string;
  total: string;
  submit: string;
  saveDraft: string;
  draftSaved: string;
  draftLoaded: string;
  draftHint: string;
  submitting: string;
  successTitle: string;
  successIntro: string;
  paymentTitle: string;
  ibanLabel: string;
  causaleLabel: string;
  sendProof: string;
  registrationId: string;
  restart: string;
  close: string;
  errors: Record<string, string>;
  workLabels: Record<SpiritualWorkId, string>;
};

type DocumentState = {
  identityDocument: File | null;
  paymentProof: File | null;
  consentDocument: File | null;
};

type SuccessState = {
  contributionTotal: number;
  registrationId: string;
};

type DraftDateSelections = {
  checkIn: boolean;
  checkOut: boolean;
};

type EuropeanGatheringDraft = {
  locale?: Locale;
  values?: Partial<EuropeanGatheringFormValues>;
  dateSelections?: Partial<DraftDateSelections>;
};

const paymentInfo = {
  iban: 'IBAN A PREENCHER',
  causale: 'donazione per l\'incontro europeo',
  whatsapp: 'XXX',
  email: 'YYY'
};

const monthLabelsByLocale: Record<Locale, string[]> = {
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
};

const copyByLocale: Record<Locale, Copy> = {
  pt: {
    pageTitle: 'Inscrição no Encontro Europeu',
    pageIntro: 'Preencha o formulário abaixo para registrar sua participação. Não é necessário fazer login.',
    loggedIntro: 'Preencha ou retome seu rascunho e envie a inscrição quando estiver completa.',
    languageLabel: 'Idioma',
    anonymousNote: 'Esta inscrição é pública e pode ser enviada sem conta no site.',
    resourcesTitle: 'Documentos e informações',
    resourcesIntro: 'Os arquivos abaixo estão publicados como PDFs temporários enquanto o conteúdo final é preparado.',
    generalProgram: 'Programa geral',
    directions: 'Como chegar',
    consentDownload: 'Consentimento informado',
    consentHint: 'Se você marcar que é novizio, baixe, assine e envie o arquivo.',
    formTitle: 'Formulário de inscrição',
    personalTitle: 'Dados pessoais',
    firstName: 'Nome',
    lastName: 'Sobrenome',
    country: 'País',
    church: 'Igreja ou centro de referência',
    centerLeader: 'Nome do dirigente do centro',
    statusTitle: 'Vínculo com a doutrina',
    initiated: 'Fardado',
    icefluMember: 'Membro ICEFLU em dia',
    novice: 'Novizio / primeira vez',
    participationTitle: 'Participação e estadia',
    attendanceMode: 'Modalidade',
    modeLodging: 'Hospedagem e alimentação',
    modeMeals: 'Somente alimentação',
    modeSpiritual: 'Somente trabalhos espirituais',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    datePlaceholder: 'dd/mmm/aaaa',
    roomNumber: 'Quarto desejado (opcional)',
    roomHelpTrigger: '?',
    roomHelpTitle: 'Quartos e vagas',
    roomHelpIntro: 'Distribuição provisória para orientar o preenchimento do quarto desejado.',
    roomHelpCapacity: 'vagas',
    roomRemaining: 'restantes',
    roomSelectPlaceholder: 'Selecione um quarto',
    noRoomsAvailable: 'Sem vagas disponíveis no momento',
    noRoomsAvailableDetail: 'Todos os quartos estão ocupados no momento. Tente novamente mais tarde ou fale com a organização.',
    extraLinen: 'Quero segundo lençol superior e toalhas (+20 euro)',
    worksTitle: 'Lavori spirituali',
    worksHint: 'Selecione um ou mais trabalhos. O valor é calculado automaticamente.',
    documentsTitle: 'Documentos',
    identityDocument: 'Cópia do documento de identidade',
    paymentProof: 'Comprovante de pagamento',
    consentDocument: 'Consentimento informado assinado',
    fileSelect: 'Escolher ou soltar arquivo',
    fileRemove: 'Remover',
    filePreview: 'Ver',
    fileInfoTrigger: 'i',
    fileInfoTitle: 'Formatos e tamanho',
    fileInfoBody: 'Aceitamos PDF, JPG, JPEG e PNG. Tamanho maximo: XXX. Imagens acima de YYY podem ser reduzidas neste navegador antes do envio, e voce podera revisar o resultado antes de aprovar.',
    fileInvalidType: 'Envie um arquivo PDF, JPG, JPEG ou PNG.',
    fileTooLarge: 'O arquivo precisa ter no maximo XXX.',
    fileCompressionError: 'Nao foi possivel reduzir a imagem automaticamente. Voce pode manter o arquivo original se ele estiver dentro do limite.',
    fileProcessing: 'Preparando imagem...',
    fileCompressionTitle: 'Revisar imagem reduzida',
    fileCompressionBody: 'A imagem foi reduzida antes do envio. Verifique o resultado e escolha se deseja usar a versao reduzida ou manter o arquivo original.',
    fileOriginalSize: 'Tamanho original',
    fileCompressedSize: 'Tamanho reduzido',
    fileApproveCompressed: 'Usar imagem reduzida',
    fileKeepOriginal: 'Manter original',
    filePreviewTitle: 'Visualizar arquivo',
    fileDownload: 'Baixar',
    fileOpenNewTab: 'Abrir em nova aba',
    consentDownloadInline: 'Baixar PDF do consentimento informado',
    documentsHint: 'Os arquivos enviados ficam associados à inscrição e armazenados com segurança.',
    contributionTitle: 'Resumo da contribuição',
    nights: 'Noites',
    lodging: 'Hospedagem / alimentação',
    spiritualWorks: 'Lavori spirituali',
    extras: 'Extras',
    total: 'Total',
    submit: 'Enviar inscrição',
    saveDraft: 'Salvar rascunho',
    draftSaved: 'Rascunho salvo neste navegador.',
    draftLoaded: 'Rascunho carregado automaticamente.',
    draftHint: 'Os arquivos anexados não podem ser guardados no rascunho; será preciso selecioná-los novamente antes do envio.',
    submitting: 'Enviando...',
    successTitle: 'Inscrição recebida',
    successIntro: 'Sua inscrição foi registrada. A organização agora aguarda a transferência e o envio do comprovante.',
    paymentTitle: 'Instruções de pagamento',
    ibanLabel: 'IBAN',
    causaleLabel: 'Causale',
    sendProof: 'Envie o comprovante para WhatsApp XXX ou email YYY.',
    registrationId: 'Número da inscrição',
    restart: 'Fazer nova inscrição',
    close: 'Fechar',
    errors: {
      firstName: 'Preencha o nome.',
      lastName: 'Preencha o sobrenome.',
      country: 'Preencha o país.',
      church: 'Preencha a igreja ou centro de referência.',
      centerLeader: 'Preencha o nome do dirigente do centro.',
      selectedWorks: 'Selecione pelo menos um trabalho espiritual.',
      checkIn: 'Informe a data de check-in.',
      checkOut: 'Informe uma data de check-out válida.'
    },
    workLabels: {
      'fri-11-19': 'Sexta-feira, 11 de setembro, 19:00',
      'sat-12-19': 'Sábado, 12 de setembro, 19:00',
      'mon-14-11': 'Segunda-feira, 14 de setembro, 11:00',
      'tue-15-19': 'Terça-feira, 15 de setembro, 19:00'
    }
  },
  en: {
    pageTitle: 'European Meeting Registration',
    pageIntro: 'Fill in the form below to register for the event. No sign-in is required.',
    loggedIntro: 'Fill in or resume your draft and submit the registration once it is complete.',
    languageLabel: 'Language',
    anonymousNote: 'This registration is public and can be submitted without an account.',
    resourcesTitle: 'Documents and information',
    resourcesIntro: 'The files below are temporary PDFs published until the final content is ready.',
    generalProgram: 'General program',
    directions: 'How to get there',
    consentDownload: 'Informed consent',
    consentHint: 'If you mark yourself as a novice, download it, sign it, and upload it.',
    formTitle: 'Registration form',
    personalTitle: 'Personal details',
    firstName: 'First name',
    lastName: 'Last name',
    country: 'Country',
    church: 'Reference church or center',
    centerLeader: 'Leader name of the reference center',
    statusTitle: 'Doctrinal status',
    initiated: 'Fardado',
    icefluMember: 'ICEFLU member in good standing',
    novice: 'Novice / first time',
    participationTitle: 'Participation and stay',
    attendanceMode: 'Attendance mode',
    modeLodging: 'Meals and lodging',
    modeMeals: 'Meals only',
    modeSpiritual: 'Spiritual works only',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    datePlaceholder: 'dd/mmm/yyyy',
    roomNumber: 'Preferred room (optional)',
    roomHelpTrigger: '?',
    roomHelpTitle: 'Rooms and available beds',
    roomHelpIntro: 'Temporary room allocation to help you choose the preferred room.',
    roomHelpCapacity: 'beds',
    roomRemaining: 'remaining',
    roomSelectPlaceholder: 'Select a room',
    noRoomsAvailable: 'No rooms currently available',
    noRoomsAvailableDetail: 'All rooms are currently occupied. Please try again later or contact the organizers.',
    extraLinen: 'I need an extra top sheet and towels (+20 euro)',
    worksTitle: 'Spiritual works',
    worksHint: 'Select one or more works. The contribution is calculated automatically.',
    documentsTitle: 'Documents',
    identityDocument: 'Identity document copy',
    paymentProof: 'Payment proof',
    consentDocument: 'Signed informed consent',
    fileSelect: 'Choose or drop file',
    fileRemove: 'Remove',
    filePreview: 'View',
    fileInfoTrigger: 'i',
    fileInfoTitle: 'Formats and size',
    fileInfoBody: 'Accepted files: PDF, JPG, JPEG, and PNG. Maximum size: XXX. Images larger than YYY may be reduced in this browser before upload, and you will be able to review the result before approving it.',
    fileInvalidType: 'Please upload a PDF, JPG, JPEG, or PNG file.',
    fileTooLarge: 'The file must be at most XXX.',
    fileCompressionError: 'The image could not be reduced automatically. You may keep the original file if it is within the limit.',
    fileProcessing: 'Preparing image...',
    fileCompressionTitle: 'Review reduced image',
    fileCompressionBody: 'This image was reduced before upload. Review the result and choose whether to use the reduced version or keep the original file.',
    fileOriginalSize: 'Original size',
    fileCompressedSize: 'Reduced size',
    fileApproveCompressed: 'Use reduced image',
    fileKeepOriginal: 'Keep original',
    filePreviewTitle: 'Preview file',
    fileDownload: 'Download',
    fileOpenNewTab: 'Open in new tab',
    consentDownloadInline: 'Download the informed consent PDF',
    documentsHint: 'Uploaded files are attached to the registration and stored securely.',
    contributionTitle: 'Contribution summary',
    nights: 'Nights',
    lodging: 'Lodging / meals',
    spiritualWorks: 'Spiritual works',
    extras: 'Extras',
    total: 'Total',
    submit: 'Submit registration',
    saveDraft: 'Save draft',
    draftSaved: 'Draft saved in this browser.',
    draftLoaded: 'Draft loaded automatically.',
    draftHint: 'Attached files cannot be stored in the draft; you will need to select them again before submitting.',
    submitting: 'Submitting...',
    successTitle: 'Registration received',
    successIntro: 'Your registration has been recorded. The organization is now waiting for the transfer and the payment proof.',
    paymentTitle: 'Payment instructions',
    ibanLabel: 'IBAN',
    causaleLabel: 'Payment reason',
    sendProof: 'Send the proof to WhatsApp XXX or email YYY.',
    registrationId: 'Registration number',
    restart: 'Start a new registration',
    close: 'Close',
    errors: {
      firstName: 'Please fill in the first name.',
      lastName: 'Please fill in the last name.',
      country: 'Please fill in the country.',
      church: 'Please fill in the church or center.',
      centerLeader: 'Please fill in the center leader name.',
      selectedWorks: 'Select at least one spiritual work.',
      checkIn: 'Please provide the check-in date.',
      checkOut: 'Please provide a valid check-out date.'
    },
    workLabels: {
      'fri-11-19': 'Friday, September 11, 19:00',
      'sat-12-19': 'Saturday, September 12, 19:00',
      'mon-14-11': 'Monday, September 14, 11:00',
      'tue-15-19': 'Tuesday, September 15, 19:00'
    }
  },
  es: {
    pageTitle: 'Inscripción al Encuentro Europeo',
    pageIntro: 'Complete el siguiente formulario para registrar su participación. No es necesario iniciar sesión.',
    loggedIntro: 'Complete o retome su borrador y envíe la inscripción cuando esté completa.',
    languageLabel: 'Idioma',
    anonymousNote: 'Esta inscripción es pública y puede enviarse sin cuenta en el sitio.',
    resourcesTitle: 'Documentos e información',
    resourcesIntro: 'Los archivos siguientes son PDFs temporales publicados mientras se prepara el contenido final.',
    generalProgram: 'Programa general',
    directions: 'Cómo llegar',
    consentDownload: 'Consentimiento informado',
    consentHint: 'Si marca que es novizio, descárguelo, fírmelo y súbalo.',
    formTitle: 'Formulario de inscripción',
    personalTitle: 'Datos personales',
    firstName: 'Nombre',
    lastName: 'Apellido',
    country: 'País',
    church: 'Iglesia o centro de referencia',
    centerLeader: 'Nombre del dirigente del centro',
    statusTitle: 'Vínculo con la doctrina',
    initiated: 'Fardado',
    icefluMember: 'Miembro ICEFLU al día',
    novice: 'Novizio / primera vez',
    participationTitle: 'Participación y estancia',
    attendanceMode: 'Modalidad',
    modeLodging: 'Alojamiento y comidas',
    modeMeals: 'Solo comidas',
    modeSpiritual: 'Solo trabajos espirituales',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    datePlaceholder: 'dd/mmm/aaaa',
    roomNumber: 'Habitación deseada (opcional)',
    roomHelpTrigger: '?',
    roomHelpTitle: 'Habitaciones y plazas',
    roomHelpIntro: 'Distribución provisional para orientar la elección de la habitación deseada.',
    roomHelpCapacity: 'plazas',
    roomRemaining: 'disponibles',
    roomSelectPlaceholder: 'Seleccione una habitación',
    noRoomsAvailable: 'No hay plazas disponibles por ahora',
    noRoomsAvailableDetail: 'Todas las habitaciones están ocupadas en este momento. Inténtelo más tarde o contacte a la organización.',
    extraLinen: 'Quiero una sábana superior adicional y toallas (+20 euro)',
    worksTitle: 'Lavori spirituali',
    worksHint: 'Seleccione uno o más trabajos. El valor se calcula automáticamente.',
    documentsTitle: 'Documentos',
    identityDocument: 'Copia del documento de identidad',
    paymentProof: 'Comprobante de pago',
    consentDocument: 'Consentimiento informado firmado',
    fileSelect: 'Elegir o soltar archivo',
    fileRemove: 'Quitar',
    filePreview: 'Ver',
    fileInfoTrigger: 'i',
    fileInfoTitle: 'Formatos y tamano',
    fileInfoBody: 'Se aceptan PDF, JPG, JPEG y PNG. Tamano maximo: XXX. Las imagenes mayores que YYY pueden reducirse en este navegador antes del envio, y podras revisar el resultado antes de aprobarlo.',
    fileInvalidType: 'Suba un archivo PDF, JPG, JPEG o PNG.',
    fileTooLarge: 'El archivo debe tener como maximo XXX.',
    fileCompressionError: 'No fue posible reducir la imagen automaticamente. Puede mantener el archivo original si esta dentro del limite.',
    fileProcessing: 'Preparando imagen...',
    fileCompressionTitle: 'Revisar imagen reducida',
    fileCompressionBody: 'La imagen se redujo antes del envio. Revise el resultado y elija si desea usar la version reducida o mantener el archivo original.',
    fileOriginalSize: 'Tamano original',
    fileCompressedSize: 'Tamano reducido',
    fileApproveCompressed: 'Usar imagen reducida',
    fileKeepOriginal: 'Mantener original',
    filePreviewTitle: 'Ver archivo',
    fileDownload: 'Descargar',
    fileOpenNewTab: 'Abrir en una pestaña nueva',
    consentDownloadInline: 'Descargar el PDF del consentimiento informado',
    documentsHint: 'Los archivos enviados quedan asociados a la inscripción y almacenados de forma segura.',
    contributionTitle: 'Resumen de la contribución',
    nights: 'Noches',
    lodging: 'Alojamiento / comidas',
    spiritualWorks: 'Trabajos espirituales',
    extras: 'Extras',
    total: 'Total',
    submit: 'Enviar inscripción',
    saveDraft: 'Guardar borrador',
    draftSaved: 'Borrador guardado en este navegador.',
    draftLoaded: 'Borrador cargado automáticamente.',
    draftHint: 'Los archivos adjuntos no se pueden guardar en el borrador; tendrás que seleccionarlos de nuevo antes de enviar.',
    submitting: 'Enviando...',
    successTitle: 'Inscripción recibida',
    successIntro: 'Su inscripción ha sido registrada. La organización ahora espera la transferencia y el envío del comprobante.',
    paymentTitle: 'Instrucciones de pago',
    ibanLabel: 'IBAN',
    causaleLabel: 'Concepto',
    sendProof: 'Envíe el comprobante a WhatsApp XXX o al correo YYY.',
    registrationId: 'Número de inscripción',
    restart: 'Hacer una nueva inscripción',
    close: 'Cerrar',
    errors: {
      firstName: 'Complete el nombre.',
      lastName: 'Complete el apellido.',
      country: 'Complete el país.',
      church: 'Complete la iglesia o centro de referencia.',
      centerLeader: 'Complete el nombre del dirigente del centro.',
      selectedWorks: 'Seleccione al menos un trabajo espiritual.',
      checkIn: 'Indique la fecha de check-in.',
      checkOut: 'Indique una fecha de check-out válida.'
    },
    workLabels: {
      'fri-11-19': 'Viernes 11 de septiembre, 19:00',
      'sat-12-19': 'Sábado 12 de septiembre, 19:00',
      'mon-14-11': 'Lunes 14 de septiembre, 11:00',
      'tue-15-19': 'Martes 15 de septiembre, 19:00'
    }
  },
  it: {
    pageTitle: 'Iscrizione all\'Incontro Europeo',
    pageIntro: 'Compila il modulo qui sotto per registrare la tua partecipazione. Non è necessario effettuare il login.',
    loggedIntro: 'Compila o riprendi la tua bozza e invia l\'iscrizione quando è completa.',
    languageLabel: 'Lingua',
    anonymousNote: 'Questa iscrizione è pubblica e può essere inviata senza un account.',
    resourcesTitle: 'Documenti e informazioni',
    resourcesIntro: 'I file qui sotto sono PDF temporanei pubblicati finché il contenuto finale non sarà pronto.',
    generalProgram: 'Programma generale',
    directions: 'Come arrivare',
    consentDownload: 'Consenso informato',
    consentHint: 'Se indichi che sei novizio, scaricalo, firmalo e caricalo.',
    formTitle: 'Modulo di iscrizione',
    personalTitle: 'Dati personali',
    firstName: 'Nome',
    lastName: 'Cognome',
    country: 'Paese',
    church: 'Chiesa o centro di riferimento',
    centerLeader: 'Nome del dirigente del centro',
    statusTitle: 'Rapporto con la dottrina',
    initiated: 'Fardado',
    icefluMember: 'Membro ICEFLU in regola',
    novice: 'Novizio / prima volta',
    participationTitle: 'Partecipazione e permanenza',
    attendanceMode: 'Modalità',
    modeLodging: 'Vitto e alloggio',
    modeMeals: 'Solo vitto',
    modeSpiritual: 'Solo lavori spirituali',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    datePlaceholder: 'gg/mmm/aaaa',
    roomNumber: 'Camera desiderata (facoltativo)',
    roomHelpTrigger: '?',
    roomHelpTitle: 'Camere e posti disponibili',
    roomHelpIntro: 'Distribuzione provvisoria delle camere per aiutarti a scegliere la camera desiderata.',
    roomHelpCapacity: 'posti',
    roomRemaining: 'disponibili',
    roomSelectPlaceholder: 'Seleziona una camera',
    noRoomsAvailable: 'Nessuna camera disponibile al momento',
    noRoomsAvailableDetail: 'Tutte le camere sono occupate al momento. Riprova più tardi o contatta l\'organizzazione.',
    extraLinen: 'Desidero un secondo lenzuolo superiore e asciugamani (+20 euro)',
    worksTitle: 'Lavori spirituali',
    worksHint: 'Seleziona uno o più lavori. Il contributo viene calcolato automaticamente.',
    documentsTitle: 'Documenti',
    identityDocument: 'Copia del documento di identità',
    paymentProof: 'Contabile bonifico pagamento',
    consentDocument: 'Consenso informato firmato',
    fileSelect: 'Scegli o trascina file',
    fileRemove: 'Rimuovi',
    filePreview: 'Apri',
    fileInfoTrigger: 'i',
    fileInfoTitle: 'Formati e dimensione',
    fileInfoBody: 'Sono accettati PDF, JPG, JPEG e PNG. Dimensione massima: XXX. Le immagini piu grandi di YYY possono essere ridotte in questo browser prima del caricamento, e potrai controllare il risultato prima di approvarlo.',
    fileInvalidType: 'Carica un file PDF, JPG, JPEG o PNG.',
    fileTooLarge: 'Il file deve essere al massimo di XXX.',
    fileCompressionError: 'Non e stato possibile ridurre automaticamente l\'immagine. Puoi mantenere il file originale se rientra nel limite.',
    fileProcessing: 'Preparazione immagine...',
    fileCompressionTitle: 'Controlla immagine ridotta',
    fileCompressionBody: 'L\'immagine e stata ridotta prima del caricamento. Controlla il risultato e scegli se usare la versione ridotta o mantenere il file originale.',
    fileOriginalSize: 'Dimensione originale',
    fileCompressedSize: 'Dimensione ridotta',
    fileApproveCompressed: 'Usa immagine ridotta',
    fileKeepOriginal: 'Mantieni originale',
    filePreviewTitle: 'Anteprima file',
    fileDownload: 'Scarica',
    fileOpenNewTab: 'Apri in una nuova scheda',
    consentDownloadInline: 'Scarica il PDF del consenso informato',
    documentsHint: 'I file inviati restano associati all\'iscrizione e vengono archiviati in modo sicuro.',
    contributionTitle: 'Riepilogo del contributo',
    nights: 'Notti',
    lodging: 'Alloggio / vitto',
    spiritualWorks: 'Lavori spirituali',
    extras: 'Extra',
    total: 'Totale',
    submit: 'Invia iscrizione',
    saveDraft: 'Salva bozza',
    draftSaved: 'Bozza salvata in questo browser.',
    draftLoaded: 'Bozza caricata automaticamente.',
    draftHint: 'I file allegati non possono essere salvati nella bozza; dovrai selezionarli di nuovo prima dell’invio.',
    submitting: 'Invio in corso...',
    successTitle: 'Iscrizione ricevuta',
    successIntro: 'La tua iscrizione è stata registrata. L\'organizzazione attende ora il bonifico e la contabile.',
    paymentTitle: 'Istruzioni di pagamento',
    ibanLabel: 'IBAN',
    causaleLabel: 'Causale',
    sendProof: 'Invia la contabile via WhatsApp XXX o email YYY.',
    registrationId: 'Numero iscrizione',
    restart: 'Compila una nuova iscrizione',
    close: 'Chiudi',
    errors: {
      firstName: 'Compila il nome.',
      lastName: 'Compila il cognome.',
      country: 'Compila il paese.',
      church: 'Compila la chiesa o centro di riferimento.',
      centerLeader: 'Compila il nome del dirigente del centro.',
      selectedWorks: 'Seleziona almeno un lavoro spirituale.',
      checkIn: 'Indica la data di check-in.',
      checkOut: 'Indica una data di check-out valida.'
    },
    workLabels: {
      'fri-11-19': 'Venerdì 11 settembre, ore 19:00',
      'sat-12-19': 'Sabato 12 settembre, ore 19:00',
      'mon-14-11': 'Lunedì 14 settembre, ore 11:00',
      'tue-15-19': 'Martedì 15 settembre, ore 19:00'
    }
  }
};

const workIds: SpiritualWorkId[] = ['fri-11-19', 'sat-12-19', 'mon-14-11', 'tue-15-19'];

function Field({
  children,
  className,
  label,
  labelClassName
}: {
  children: ReactNode;
  className?: string;
  label: ReactNode;
  labelClassName?: string;
}) {
  return (
    <label className={`text-sm text-slate-700 ${className ?? ''}`.trim()}>
      <span className={`mb-1 block font-medium ${labelClassName ?? ''}`.trim()}>{label}</span>
      {children}
    </label>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatLocalizedShortDate(value: string, locale: Locale) {
  if (!value) {
    return '';
  }

  const [year, month, day] = value.split('-').map(part => Number(part));
  if (!year || !month || !day) {
    return value;
  }

  return `${String(day).padStart(2, '0')}/${monthLabelsByLocale[locale][month - 1]}/${year}`;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-slate-500">
      <path
        d="M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.5v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

function LocalizedDateField({
  label,
  locale,
  onChange,
  onOpen,
  placeholder,
  suggestedValue,
  value
}: {
  label: string;
  locale: Locale;
  onChange: (value: string) => void;
  onOpen: () => void;
  placeholder: string;
  suggestedValue: string;
  value: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Field label={label}>
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={value || suggestedValue}
          onChange={event => onChange(event.target.value)}
          tabIndex={-1}
          aria-hidden="true"
        />
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-slate-300"
          onClick={() => {
            onOpen();
            const picker = inputRef.current;
            if (!picker) {
              return;
            }

            if (typeof picker.showPicker === 'function') {
              picker.showPicker();
              return;
            }

            picker.focus();
            picker.click();
          }}
        >
          <span className={value ? 'text-slate-900' : 'text-slate-400'}>
            {value ? formatLocalizedShortDate(value, locale) : placeholder}
          </span>
          <CalendarIcon />
        </button>
      </div>
    </Field>
  );
}

function InfoTooltip({
  body,
  title,
  triggerLabel
}: {
  body: string;
  title: string;
  triggerLabel: string;
}) {
  const tooltipId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [supportsHover, setSupportsHover] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const updateMode = () => {
      const nextSupportsHover = mediaQuery.matches;
      setSupportsHover(nextSupportsHover);
      if (nextSupportsHover) {
        setIsOpen(false);
      }
    };

    updateMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMode);
      return () => mediaQuery.removeEventListener('change', updateMode);
    }

    mediaQuery.addListener(updateMode);
    return () => mediaQuery.removeListener(updateMode);
  }, []);

  useEffect(() => {
    if (!isOpen || supportsHover || typeof document === 'undefined') {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, supportsHover]);

  const tooltipClassName = supportsHover
    ? 'pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-64 max-w-[min(18rem,calc(100vw-4rem))] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-normal leading-5 text-amber-950 shadow-lg group-hover:block'
    : `absolute left-0 top-full z-20 mt-2 w-64 max-w-[min(18rem,calc(100vw-4rem))] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-normal leading-5 text-amber-950 shadow-lg ${isOpen ? 'block' : 'hidden'}`;

  return (
    <div ref={containerRef} className="group relative inline-flex shrink-0">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 focus:border-amber-300 focus:bg-amber-50 focus:text-amber-900 focus:outline-none"
        aria-label={title}
        aria-describedby={tooltipId}
        aria-expanded={!supportsHover ? isOpen : undefined}
        title={title}
        onClick={event => {
          if (!supportsHover) {
            setIsOpen(current => !current);
            return;
          }

          event.currentTarget.blur();
        }}
      >
        {triggerLabel === 'i' ? <InfoIcon /> : triggerLabel}
      </button>
      <div id={tooltipId} role="tooltip" className={tooltipClassName}>
        <div className="font-semibold">{title}</div>
        <p className="mt-1">{body}</p>
      </div>
    </div>
  );
}

function FileUploadField({
  accept,
  className,
  file,
  closeLabel,
  compressedSizeLabel,
  compressionBody,
  compressionError,
  compressionTitle,
  downloadLabel,
  invalidTypeError,
  keepOriginalLabel,
  label,
  labelClassName,
  openInNewTabLabel,
  originalSizeLabel,
  onChange,
  previewLabel,
  previewTitle,
  processingLabel,
  removeLabel,
  selectLabel,
  tooLargeError,
  useCompressedLabel
}: {
  accept: string;
  className?: string;
  file: File | null;
  closeLabel: string;
  compressedSizeLabel: string;
  compressionBody: string;
  compressionError: string;
  compressionTitle: string;
  downloadLabel: string;
  invalidTypeError: string;
  keepOriginalLabel: string;
  label: ReactNode;
  labelClassName?: string;
  openInNewTabLabel: string;
  originalSizeLabel: string;
  onChange: (file: File | null) => void;
  previewLabel: string;
  previewTitle: string;
  processingLabel: string;
  removeLabel: string;
  selectLabel: string;
  tooLargeError: string;
  useCompressedLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [compressionCandidate, setCompressionCandidate] = useState<{ compressed: File; original: File } | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const compressionPreviewUrl = useMemo(
    () => (compressionCandidate ? URL.createObjectURL(compressionCandidate.compressed) : null),
    [compressionCandidate]
  );

  const openPicker = () => {
    if (isProcessing) {
      return;
    }

    inputRef.current?.click();
  };

  const resetPicker = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleSelectedFile = async (nextFile: File | null) => {
    if (!nextFile) {
      setErrorMessage('');
      setCompressionCandidate(null);
      onChange(null);
      return;
    }

    const validationError = validateEuropeanGatheringUploadFile(nextFile);
    if (validationError === 'invalid-type') {
      setErrorMessage(invalidTypeError);
      setCompressionCandidate(null);
      resetPicker();
      return;
    }

    if (validationError === 'file-too-large') {
      setErrorMessage(tooLargeError);
      setCompressionCandidate(null);
      resetPicker();
      return;
    }

    setErrorMessage('');

    if (shouldOfferEuropeanGatheringImageCompression(nextFile)) {
      setIsProcessing(true);

      try {
        const compressed = await compressEuropeanGatheringImage(nextFile);
        if (compressed !== nextFile) {
          setCompressionCandidate({ compressed, original: nextFile });
          return;
        }
      } catch {
        setErrorMessage(compressionError);
      } finally {
        setIsProcessing(false);
      }
    }

    setCompressionCandidate(null);
    onChange(nextFile);
  };

  const handleDroppedFiles = async (files: FileList | null) => {
    const nextFile = files?.[0] ?? null;
    await handleSelectedFile(nextFile);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (compressionPreviewUrl) {
        URL.revokeObjectURL(compressionPreviewUrl);
      }
    };
  }, [compressionPreviewUrl]);

  const compressionReviewModal =
    compressionCandidate && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true" aria-label={compressionTitle}>
            <div className="flex min-h-full items-center justify-center">
              <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{compressionTitle}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{compressionBody}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                    onClick={() => {
                      setCompressionCandidate(null);
                    }}
                  >
                    {closeLabel}
                  </button>
                </div>

                {compressionPreviewUrl ? (
                  <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                    <img src={compressionPreviewUrl} alt={compressionTitle} className="max-h-[60vh] w-full object-contain" />
                  </div>
                ) : null}

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-500">{originalSizeLabel}</dt>
                    <dd className="mt-1 font-semibold text-slate-900">{formatFileSize(compressionCandidate.original.size)}</dd>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                    <dt className="text-emerald-700">{compressedSizeLabel}</dt>
                    <dd className="mt-1 font-semibold text-emerald-900">{formatFileSize(compressionCandidate.compressed.size)}</dd>
                  </div>
                </dl>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                    onClick={() => {
                      onChange(compressionCandidate.compressed);
                      setCompressionCandidate(null);
                    }}
                  >
                    {useCompressedLabel}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => {
                      onChange(compressionCandidate.original);
                      setCompressionCandidate(null);
                    }}
                  >
                    {keepOriginalLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const previewModal =
    isPreviewOpen && previewUrl && file && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true" aria-label={previewTitle}>
            <div className="flex min-h-full items-center justify-center">
              <div className="w-full max-w-4xl rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900">{previewTitle}</h2>
                    <p className="mt-2 truncate text-sm text-slate-600" title={file.name}>{file.name}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                    onClick={() => setIsPreviewOpen(false)}
                  >
                    {closeLabel}
                  </button>
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                  {file.type.startsWith('image/') ? (
                    <img src={previewUrl} alt={file.name} className="max-h-[70vh] w-full object-contain" />
                  ) : (
                    <iframe title={file.name} src={previewUrl} className="h-[70vh] w-full bg-white" />
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <a
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                    href={previewUrl}
                    download={file.name}
                  >
                    {downloadLabel}
                  </a>
                  <a
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {openInNewTabLabel}
                  </a>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setIsPreviewOpen(false)}
                  >
                    {closeLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className={`text-sm text-slate-700 ${className ?? ''}`.trim()}>
        <div className={`mb-1 block font-medium ${labelClassName ?? ''}`.trim()}>{label}</div>

        <div
          className={`rounded-[26px] border bg-white p-4 shadow-sm transition ${isDragOver ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200'}`}
          onDragOver={event => {
            event.preventDefault();
            if (!isProcessing) {
              setIsDragOver(true);
            }
          }}
          onDragEnter={event => {
            event.preventDefault();
            if (!isProcessing) {
              setIsDragOver(true);
            }
          }}
          onDragLeave={event => {
            event.preventDefault();
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
              return;
            }
            setIsDragOver(false);
          }}
          onDrop={event => {
            event.preventDefault();
            setIsDragOver(false);
            void handleDroppedFiles(event.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={event => {
              const files = event.target.files;
              event.target.value = '';
              void handleDroppedFiles(files);
            }}
          />

          {file ? (
            <>
              <div className="min-w-0 text-center text-sm text-slate-700">
                <div className="truncate text-center font-medium text-slate-900" title={file.name}>
                  {file.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">{formatFileSize(file.size)}</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {previewUrl ? (
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    {previewLabel}
                  </button>
                ) : null}

                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                  onClick={() => {
                    resetPicker();
                    setErrorMessage('');
                    setCompressionCandidate(null);
                    onChange(null);
                  }}
                >
                  {removeLabel}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="flex min-h-[112px] w-full items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-wait disabled:opacity-70"
              onClick={openPicker}
              disabled={isProcessing}
            >
              {isProcessing ? processingLabel : selectLabel}
            </button>
          )}

          {errorMessage ? (
            <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700">{errorMessage}</p>
          ) : null}
        </div>
      </div>

      {compressionReviewModal}
      {previewModal}
    </>
  );
}

const europeanGatheringDraftKey = 'european-gathering-draft-v1';
const fallbackDraftLocale = resolveInitialLocale(undefined);
const initialDraftDateSelections: DraftDateSelections = {
  checkIn: false,
  checkOut: false
};

function normalizeDraftValues(
  draft: EuropeanGatheringDraft
): { values: Partial<EuropeanGatheringFormValues>; dateSelections: DraftDateSelections } {
  const values = { ...(draft.values ?? {}) };
  const dateSelections: DraftDateSelections = {
    checkIn: draft.dateSelections?.checkIn ?? false,
    checkOut: draft.dateSelections?.checkOut ?? false
  };

  // Migrate legacy drafts created before date interaction flags existed.
  if (!draft.dateSelections) {
    if (values.checkIn === suggestedCheckInDate) {
      values.checkIn = '';
    }

    if (values.checkOut === suggestedCheckOutDate) {
      values.checkOut = '';
    }
  }

  return { values, dateSelections };
}

type EuropeanGatheringPageProps = {
  showPublicHero?: boolean;
};

export default function EuropeanGatheringPage({ showPublicHero = true }: EuropeanGatheringPageProps) {
  const { locale, setLocale } = useSiteLocale();
  const [values, setValues] = useState<EuropeanGatheringFormValues>(initialEuropeanGatheringFormValues);
  const [documents, setDocuments] = useState<DocumentState>({
    identityDocument: null,
    paymentProof: null,
    consentDocument: null
  });
  const [submitError, setSubmitError] = useState<string>('');
  const [draftMessage, setDraftMessage] = useState('');
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [draftDateSelections, setDraftDateSelections] = useState<DraftDateSelections>(initialDraftDateSelections);

  const copy = copyByLocale[locale];
  const uploadInfoBody = copy.fileInfoBody
    .replace('XXX', formatFileSize(europeanGatheringUploadMaxBytes))
    .replace('YYY', formatFileSize(europeanGatheringImageCompressionThresholdBytes));
  const uploadTooLargeError = copy.fileTooLarge.replace('XXX', formatFileSize(europeanGatheringUploadMaxBytes));
  const contribution = useMemo(() => calculateContribution(values), [values]);
  const roomAvailabilityQuery = useQuery({
    queryKey: ['european-gathering-room-availability'],
    queryFn: fetchEuropeanGatheringRoomAvailability
  });

  const roomAvailability = roomAvailabilityQuery.data ?? europeanGatheringRoomOptions.map(room => ({ ...room, reserved: 0, available: room.capacity }));
  const availableRooms = roomAvailability.filter(room => room.available > 0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const rawDraft = window.localStorage.getItem(europeanGatheringDraftKey);
    if (!rawDraft) {
      return;
    }

    try {
      const parsedDraft = JSON.parse(rawDraft) as EuropeanGatheringDraft;
      const normalizedDraft = normalizeDraftValues(parsedDraft);

      if (parsedDraft.locale) {
        setLocale(parsedDraft.locale);
      }

      setValues(current => ({ ...current, ...normalizedDraft.values }));
      setDraftDateSelections(normalizedDraft.dateSelections);

      setDraftMessage(copyByLocale[parsedDraft.locale ?? fallbackDraftLocale].draftLoaded);
    } catch {
      window.localStorage.removeItem(europeanGatheringDraftKey);
    }
  }, [setLocale]);

  useEffect(() => {
    if (values.attendanceMode !== 'lodging' || !values.roomNumber) {
      return;
    }

    if (availableRooms.some(room => room.name === values.roomNumber)) {
      return;
    }

    setValues(current => ({ ...current, roomNumber: '' }));
  }, [availableRooms, values.attendanceMode, values.roomNumber]);

  const mutation = useMutation({
    mutationFn: async () => {
      const validationKey = validateEuropeanGatheringForm(values);
      if (validationKey) {
        throw new Error(copy.errors[validationKey] ?? 'Invalid form');
      }

      const payload = buildEuropeanGatheringPayload({
        values,
        locale,
        contribution,
        documents: {
          identityDocumentName: documents.identityDocument?.name,
          paymentProofName: documents.paymentProof?.name,
          consentDocumentName: documents.consentDocument?.name
        }
      });

      return createEuropeanGatheringRegistration({
        input: payload,
        documents: {
          identityDocument: documents.identityDocument,
          paymentProof: documents.paymentProof,
          consentDocument: values.isNovice ? documents.consentDocument : null
        }
      });
    },
    onSuccess: result => {
      setSuccessState({ contributionTotal: contribution.total, registrationId: result.id });
      setSubmitError('');
      setDraftMessage('');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(europeanGatheringDraftKey);
      }
    },
    onError: error => {
      setSubmitError(error.message);
    }
  });

  const setField = <K extends keyof EuropeanGatheringFormValues>(field: K, value: EuropeanGatheringFormValues[K]) => {
    setValues(current => ({ ...current, [field]: value }));
  };

  const toggleWork = (workId: SpiritualWorkId) => {
    setValues(current => ({
      ...current,
      selectedWorks: current.selectedWorks.includes(workId)
        ? current.selectedWorks.filter(item => item !== workId)
        : [...current.selectedWorks, workId]
    }));
  };

  const resetForm = () => {
    setValues(initialEuropeanGatheringFormValues);
    setDocuments({ identityDocument: null, paymentProof: null, consentDocument: null });
    setSubmitError('');
    setDraftMessage('');
    setSuccessState(null);
    setIsRoomModalOpen(false);
    setDraftDateSelections(initialDraftDateSelections);
    mutation.reset();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(europeanGatheringDraftKey);
    }
  };

  const saveDraft = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      europeanGatheringDraftKey,
      JSON.stringify({
        locale,
        values,
        dateSelections: draftDateSelections
      })
    );

    setDraftMessage(copy.draftSaved);
  };

  const actionArea = (
    <>
      {submitError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p> : null}
      {draftMessage ? <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{draftMessage}</p> : null}
      <p className="text-xs leading-5 text-slate-500">{copy.draftHint}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={saveDraft}>
          {copy.saveDraft}
        </button>
        <button type="submit" form="european-gathering-form" className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={mutation.isPending}>
          {mutation.isPending ? copy.submitting : copy.submit}
        </button>
      </div>
    </>
  );

  return (
    <div className={showPublicHero ? 'min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_50%,_#e2e8f0)]' : ''}>
      <main className={showPublicHero ? 'mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8' : 'space-y-6'}>
        {showPublicHero ? (
          <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{copy.pageTitle}</h1>
              <p className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{copy.anonymousNote}</p>
            </div>

            <Field label={copy.languageLabel}>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:w-48"
                value={locale}
                onChange={event => setLocale(event.target.value as Locale)}
              >
                {siteLocaleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}

        {successState ? (
          <section className="rounded-[28px] border border-emerald-200 bg-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="grid gap-6 lg:grid-cols-[1.4fr,0.9fr]">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">OK</p>
                <h2 className="text-2xl font-semibold text-slate-900">{copy.successTitle}</h2>
                <p className="text-sm leading-6 text-slate-600">{copy.successIntro}</p>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">{copy.registrationId}</div>
                  <div className="mt-1 break-all">{successState.registrationId}</div>
                </div>
                <button
                  type="button"
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={resetForm}
                >
                  {copy.restart}
                </button>
              </div>

              <div className="rounded-[24px] bg-slate-950 p-6 text-slate-50 shadow-xl">
                <h3 className="text-lg font-semibold">{copy.paymentTitle}</h3>
                <dl className="mt-4 space-y-4 text-sm">
                  <div>
                    <dt className="text-slate-400">{copy.ibanLabel}</dt>
                    <dd className="mt-1 font-medium text-white">{paymentInfo.iban}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">{copy.causaleLabel}</dt>
                    <dd className="mt-1 font-medium text-white">{paymentInfo.causale}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">{copy.total}</dt>
                    <dd className="mt-1 text-xl font-semibold text-amber-300">{formatCurrency(successState.contributionTotal)}</dd>
                  </div>
                </dl>
                <p className="mt-6 text-sm leading-6 text-slate-300">
                  {copy.sendProof.replace('XXX', paymentInfo.whatsapp).replace('YYY', paymentInfo.email)}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <h2 className="text-xl font-semibold text-slate-900">{copy.formTitle}</h2>

              <form
                id="european-gathering-form"
                className="mt-6 space-y-8"
                onSubmit={event => {
                  event.preventDefault();
                  mutation.mutate();
                }}
              >
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.personalTitle}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={copy.firstName}>
                      <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" value={values.firstName} onChange={event => setField('firstName', event.target.value)} />
                    </Field>
                    <Field label={copy.lastName}>
                      <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" value={values.lastName} onChange={event => setField('lastName', event.target.value)} />
                    </Field>
                    <Field label={copy.country}>
                      <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" value={values.country} onChange={event => setField('country', event.target.value)} />
                    </Field>
                    <Field label={copy.church}>
                      <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" value={values.church} onChange={event => setField('church', event.target.value)} />
                    </Field>
                  </div>
                  <Field label={copy.centerLeader}>
                    <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" value={values.centerLeader} onChange={event => setField('centerLeader', event.target.value)} />
                  </Field>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.statusTitle}</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <input type="checkbox" checked={values.isInitiated} onChange={event => setField('isInitiated', event.target.checked)} />
                      {copy.initiated}
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <input type="checkbox" checked={values.isIcefluMember} onChange={event => setField('isIcefluMember', event.target.checked)} />
                      {copy.icefluMember}
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <input type="checkbox" checked={values.isNovice} onChange={event => setField('isNovice', event.target.checked)} />
                      {copy.novice}
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.participationTitle}</h3>
                  <Field label={copy.attendanceMode}>
                    <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" value={values.attendanceMode} onChange={event => setField('attendanceMode', event.target.value as EuropeanGatheringFormValues['attendanceMode'])}>
                      <option value="lodging">{copy.modeLodging}</option>
                      <option value="meals">{copy.modeMeals}</option>
                      <option value="spiritual">{copy.modeSpiritual}</option>
                    </select>
                  </Field>

                  {values.attendanceMode !== 'spiritual' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <LocalizedDateField
                        label={copy.checkIn}
                        locale={locale}
                        onChange={nextValue => {
                          setDraftDateSelections(current => ({ ...current, checkIn: true }));
                          setField('checkIn', nextValue);
                        }}
                        onOpen={() => {
                          setDraftDateSelections(current => ({ ...current, checkIn: true }));
                          if (!values.checkIn) {
                            setField('checkIn', suggestedCheckInDate);
                          }
                        }}
                        placeholder={copy.datePlaceholder}
                        suggestedValue={suggestedCheckInDate}
                        value={values.checkIn}
                      />
                      <LocalizedDateField
                        label={copy.checkOut}
                        locale={locale}
                        onChange={nextValue => {
                          setDraftDateSelections(current => ({ ...current, checkOut: true }));
                          setField('checkOut', nextValue);
                        }}
                        onOpen={() => {
                          setDraftDateSelections(current => ({ ...current, checkOut: true }));
                          if (!values.checkOut) {
                            setField('checkOut', suggestedCheckOutDate);
                          }
                        }}
                        placeholder={copy.datePlaceholder}
                        suggestedValue={suggestedCheckOutDate}
                        value={values.checkOut}
                      />
                    </div>
                  ) : null}

                  {values.attendanceMode === 'lodging' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label={
                          <span className="inline-flex items-center gap-2">
                            <span>{copy.roomNumber}</span>
                            <button
                              type="button"
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white"
                              aria-label={copy.roomHelpTitle}
                              onClick={() => setIsRoomModalOpen(true)}
                            >
                              {copy.roomHelpTrigger}
                            </button>
                          </span>
                        }
                      >
                        <select className={`w-full rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ${availableRooms.length === 0 ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border border-slate-200'}`} value={values.roomNumber} onChange={event => setField('roomNumber', event.target.value)} disabled={roomAvailabilityQuery.isLoading || availableRooms.length === 0}>
                          <option value="">{availableRooms.length > 0 ? copy.roomSelectPlaceholder : copy.noRoomsAvailable}</option>
                          {availableRooms.map(room => (
                            <option key={room.name} value={room.name}>
                              {room.name} — {room.available} {copy.roomHelpCapacity} {copy.roomRemaining}
                            </option>
                          ))}
                        </select>
                        {availableRooms.length === 0 ? (
                          <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {copy.noRoomsAvailableDetail}
                          </p>
                        ) : null}
                      </Field>
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:mt-7">
                        <input type="checkbox" checked={values.needsExtraLinen} onChange={event => setField('needsExtraLinen', event.target.checked)} />
                        {copy.extraLinen}
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.worksTitle}</h3>
                  <p className="text-sm leading-6 text-slate-600">{copy.worksHint}</p>
                  <div className="grid gap-3">
                    {workIds.map(workId => (
                      <label key={workId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <input type="checkbox" checked={values.selectedWorks.includes(workId)} onChange={() => toggleWork(workId)} />
                        {copy.workLabels[workId]}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="hidden space-y-3 lg:block">{actionArea}</div>
              </form>
            </section>

            <aside className="space-y-6">
              <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                <h2 className="text-xl font-semibold text-slate-900">{copy.resourcesTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.resourcesIntro}</p>

                <div className="mt-5 grid gap-3">
                  <a className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50" href={generalProgramPaths[locale]} target="_blank" rel="noreferrer">
                    {copy.generalProgram}
                  </a>
                  <a className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50" href={directionsPaths[locale]} target="_blank" rel="noreferrer">
                    {copy.directions}
                  </a>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">{copy.documentsTitle}</h2>
                  <InfoTooltip body={uploadInfoBody} title={copy.fileInfoTitle} triggerLabel={copy.fileInfoTrigger} />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <FileUploadField
                    accept={europeanGatheringUploadAccept}
                    className="flex h-full flex-col"
                    closeLabel={copy.close}
                    compressedSizeLabel={copy.fileCompressedSize}
                    compressionBody={copy.fileCompressionBody}
                    compressionError={copy.fileCompressionError}
                    compressionTitle={copy.fileCompressionTitle}
                    downloadLabel={copy.fileDownload}
                    file={documents.identityDocument}
                    invalidTypeError={copy.fileInvalidType}
                    keepOriginalLabel={copy.fileKeepOriginal}
                    label={copy.identityDocument}
                    labelClassName="min-h-[2.5rem] leading-5"
                    openInNewTabLabel={copy.fileOpenNewTab}
                    onChange={file => setDocuments(current => ({ ...current, identityDocument: file }))}
                    originalSizeLabel={copy.fileOriginalSize}
                    previewLabel={copy.filePreview}
                    previewTitle={copy.filePreviewTitle}
                    processingLabel={copy.fileProcessing}
                    removeLabel={copy.fileRemove}
                    selectLabel={copy.fileSelect}
                    tooLargeError={uploadTooLargeError}
                    useCompressedLabel={copy.fileApproveCompressed}
                  />
                  <FileUploadField
                    accept={europeanGatheringUploadAccept}
                    className="flex h-full flex-col"
                    closeLabel={copy.close}
                    compressedSizeLabel={copy.fileCompressedSize}
                    compressionBody={copy.fileCompressionBody}
                    compressionError={copy.fileCompressionError}
                    compressionTitle={copy.fileCompressionTitle}
                    downloadLabel={copy.fileDownload}
                    file={documents.paymentProof}
                    invalidTypeError={copy.fileInvalidType}
                    keepOriginalLabel={copy.fileKeepOriginal}
                    label={copy.paymentProof}
                    labelClassName="min-h-[2.5rem] leading-5"
                    openInNewTabLabel={copy.fileOpenNewTab}
                    onChange={file => setDocuments(current => ({ ...current, paymentProof: file }))}
                    originalSizeLabel={copy.fileOriginalSize}
                    previewLabel={copy.filePreview}
                    previewTitle={copy.filePreviewTitle}
                    processingLabel={copy.fileProcessing}
                    removeLabel={copy.fileRemove}
                    selectLabel={copy.fileSelect}
                    tooLargeError={uploadTooLargeError}
                    useCompressedLabel={copy.fileApproveCompressed}
                  />
                  {values.isNovice ? (
                    <div className="sm:col-span-2 space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <FileUploadField
                        accept={europeanGatheringUploadAccept}
                        className="flex flex-col"
                        closeLabel={copy.close}
                        compressedSizeLabel={copy.fileCompressedSize}
                        compressionBody={copy.fileCompressionBody}
                        compressionError={copy.fileCompressionError}
                        compressionTitle={copy.fileCompressionTitle}
                        downloadLabel={copy.fileDownload}
                        file={documents.consentDocument}
                        invalidTypeError={copy.fileInvalidType}
                        keepOriginalLabel={copy.fileKeepOriginal}
                        label={copy.consentDocument}
                        labelClassName="leading-5"
                        openInNewTabLabel={copy.fileOpenNewTab}
                        onChange={file => setDocuments(current => ({ ...current, consentDocument: file }))}
                        originalSizeLabel={copy.fileOriginalSize}
                        previewLabel={copy.filePreview}
                        previewTitle={copy.filePreviewTitle}
                        processingLabel={copy.fileProcessing}
                        removeLabel={copy.fileRemove}
                        selectLabel={copy.fileSelect}
                        tooLargeError={uploadTooLargeError}
                        useCompressedLabel={copy.fileApproveCompressed}
                      />
                      <a className="inline-flex rounded-2xl border border-amber-300 bg-white px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100" href={consentDocumentPaths[locale]} target="_blank" rel="noreferrer">
                        {copy.consentDownloadInline}
                      </a>
                      <p className="text-xs leading-5 text-slate-600">{copy.consentHint}</p>
                    </div>
                  ) : null}
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">{copy.documentsHint}</p>
              </section>

              <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                <h2 className="text-xl font-semibold text-slate-900">{copy.contributionTitle}</h2>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-600">{copy.nights}</dt>
                    <dd className="font-semibold text-slate-900">{contribution.nights}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-600">{copy.lodging}</dt>
                    <dd className="font-semibold text-slate-900">{formatCurrency(contribution.lodging)}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-600">{copy.spiritualWorks}</dt>
                    <dd className="font-semibold text-slate-900">{formatCurrency(contribution.spiritualWorks)}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-600">{copy.extras}</dt>
                    <dd className="font-semibold text-slate-900">{formatCurrency(contribution.extras)}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-4 text-white">
                    <dt className="font-medium">{copy.total}</dt>
                    <dd className="text-xl font-semibold text-amber-300">{formatCurrency(contribution.total)}</dd>
                  </div>
                </dl>
              </section>
            </aside>

            <div className="space-y-3 lg:hidden">{actionArea}</div>
          </div>
        )}
      </main>

      {isRoomModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4" role="dialog" aria-modal="true" aria-label={copy.roomHelpTitle}>
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{copy.roomHelpTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.roomHelpIntro}</p>
              </div>
              <button type="button" className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600" onClick={() => setIsRoomModalOpen(false)}>
                {copy.close}
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {roomAvailability.map(room => (
                <div key={room.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div>
                    <span className="font-medium text-slate-900">{room.name}</span>
                    <p className="text-xs text-slate-500">{room.available} {copy.roomRemaining}</p>
                  </div>
                  <span>
                    {room.available}/{room.capacity} {copy.roomHelpCapacity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}