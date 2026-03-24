import { useMemo, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';

import { createEncontroEuropeuRegistration } from '../lib/encontroEuropeu';
import {
  buildEncontroEuropeuPayload,
  calculateContribution,
  consentDocumentPaths,
  directionsPaths,
  generalProgramPaths,
  initialEncontroEuropeuFormValues,
  resolveInitialLocale,
  type EncontroEuropeuFormValues,
  type Locale,
  type SpiritualWorkId,
  validateEncontroEuropeuForm
} from './encontro-europeu/form';

type Copy = {
  pageTitle: string;
  pageIntro: string;
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
  fardado: string;
  icefluMember: string;
  novice: string;
  participationTitle: string;
  attendanceMode: string;
  modeLodging: string;
  modeMeals: string;
  modeSpiritual: string;
  checkIn: string;
  checkOut: string;
  roomNumber: string;
  extraLinen: string;
  worksTitle: string;
  worksHint: string;
  documentsTitle: string;
  identityDocument: string;
  paymentProof: string;
  consentDocument: string;
  documentsHint: string;
  contributionTitle: string;
  nights: string;
  lodging: string;
  spiritualWorks: string;
  extras: string;
  total: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successIntro: string;
  paymentTitle: string;
  ibanLabel: string;
  causaleLabel: string;
  sendProof: string;
  registrationId: string;
  restart: string;
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

const paymentInfo = {
  iban: 'IBAN A PREENCHER',
  causale: 'donazione per l\'incontro europeo',
  whatsapp: 'XXX',
  email: 'YYY'
};

const localeOptions: Array<{ value: Locale; label: string }> = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' }
];

const copyByLocale: Record<Locale, Copy> = {
  pt: {
    pageTitle: 'Inscrição no Encontro Europeu',
    pageIntro: 'Preencha o formulário abaixo para registrar sua participação. Não é necessário fazer login.',
    languageLabel: 'Idioma',
    anonymousNote: 'Esta inscrição é pública e pode ser enviada sem conta no site.',
    resourcesTitle: 'Documentos e informações',
    resourcesIntro: 'Os arquivos abaixo estão publicados como PDFs temporários enquanto o conteúdo final é preparado.',
    generalProgram: 'Programa geral',
    directions: 'Como chegar',
    consentDownload: 'Consentimento informado',
    consentHint: 'Se você marcar que é novizio, baixe, assine e tenha o arquivo pronto.',
    formTitle: 'Formulário de inscrição',
    personalTitle: 'Dados pessoais',
    firstName: 'Nome',
    lastName: 'Sobrenome',
    country: 'País',
    church: 'Igreja ou centro de referência',
    centerLeader: 'Nome do dirigente do centro',
    statusTitle: 'Vínculo com a doutrina',
    fardado: 'Fardado',
    icefluMember: 'Membro ICEFLU em dia',
    novice: 'Novizio / primeira vez',
    participationTitle: 'Participação e estadia',
    attendanceMode: 'Modalidade',
    modeLodging: 'Vitto e alloggio',
    modeMeals: 'Solo vitto',
    modeSpiritual: 'Solo lavori spirituali',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    roomNumber: 'Número do quarto (opcional)',
    extraLinen: 'Quero segundo lençol superior e toalhas (+20 euro)',
    worksTitle: 'Lavori spirituali',
    worksHint: 'Selecione um ou mais trabalhos. O valor é calculado automaticamente.',
    documentsTitle: 'Documentos',
    identityDocument: 'Cópia do documento de identidade',
    paymentProof: 'Comprovante de pagamento',
    consentDocument: 'Consentimento informado assinado',
    documentsHint: 'Nesta primeira versão, os nomes dos arquivos ficam registrados junto com a inscrição. O comprovante final continua sendo esperado por WhatsApp ou email.',
    contributionTitle: 'Resumo da contribuição',
    nights: 'Noites',
    lodging: 'Hospedagem / alimentação',
    spiritualWorks: 'Lavori spirituali',
    extras: 'Extras',
    total: 'Total',
    submit: 'Enviar inscrição',
    submitting: 'Enviando...',
    successTitle: 'Inscrição recebida',
    successIntro: 'Sua inscrição foi registrada. A organização agora aguarda a transferência e o envio do comprovante.',
    paymentTitle: 'Instruções de pagamento',
    ibanLabel: 'IBAN',
    causaleLabel: 'Causale',
    sendProof: 'Envie o comprovante para WhatsApp XXX ou email YYY.',
    registrationId: 'Número da inscrição',
    restart: 'Fazer nova inscrição',
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
    languageLabel: 'Language',
    anonymousNote: 'This registration is public and can be submitted without an account.',
    resourcesTitle: 'Documents and information',
    resourcesIntro: 'The files below are temporary PDFs published until the final content is ready.',
    generalProgram: 'General program',
    directions: 'How to get there',
    consentDownload: 'Informed consent',
    consentHint: 'If you mark yourself as a novice, download it, sign it, and keep the file ready.',
    formTitle: 'Registration form',
    personalTitle: 'Personal details',
    firstName: 'First name',
    lastName: 'Last name',
    country: 'Country',
    church: 'Reference church or center',
    centerLeader: 'Leader name of the reference center',
    statusTitle: 'Doctrinal status',
    fardado: 'Fardado',
    icefluMember: 'ICEFLU member in good standing',
    novice: 'Novice / first time',
    participationTitle: 'Participation and stay',
    attendanceMode: 'Attendance mode',
    modeLodging: 'Meals and lodging',
    modeMeals: 'Meals only',
    modeSpiritual: 'Spiritual works only',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    roomNumber: 'Room number (optional)',
    extraLinen: 'I need an extra top sheet and towels (+20 euro)',
    worksTitle: 'Spiritual works',
    worksHint: 'Select one or more works. The contribution is calculated automatically.',
    documentsTitle: 'Documents',
    identityDocument: 'Identity document copy',
    paymentProof: 'Payment proof',
    consentDocument: 'Signed informed consent',
    documentsHint: 'In this first version, only the selected file names are stored with the registration. The final proof is still expected by WhatsApp or email.',
    contributionTitle: 'Contribution summary',
    nights: 'Nights',
    lodging: 'Lodging / meals',
    spiritualWorks: 'Spiritual works',
    extras: 'Extras',
    total: 'Total',
    submit: 'Submit registration',
    submitting: 'Submitting...',
    successTitle: 'Registration received',
    successIntro: 'Your registration has been recorded. The organization is now waiting for the transfer and the payment proof.',
    paymentTitle: 'Payment instructions',
    ibanLabel: 'IBAN',
    causaleLabel: 'Payment reason',
    sendProof: 'Send the proof to WhatsApp XXX or email YYY.',
    registrationId: 'Registration number',
    restart: 'Start a new registration',
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
    languageLabel: 'Idioma',
    anonymousNote: 'Esta inscripción es pública y puede enviarse sin cuenta en el sitio.',
    resourcesTitle: 'Documentos e información',
    resourcesIntro: 'Los archivos siguientes son PDFs temporales publicados mientras se prepara el contenido final.',
    generalProgram: 'Programa general',
    directions: 'Cómo llegar',
    consentDownload: 'Consentimiento informado',
    consentHint: 'Si marca que es novizio, descárguelo, fírmelo y tenga el archivo listo.',
    formTitle: 'Formulario de inscripción',
    personalTitle: 'Datos personales',
    firstName: 'Nombre',
    lastName: 'Apellido',
    country: 'País',
    church: 'Iglesia o centro de referencia',
    centerLeader: 'Nombre del dirigente del centro',
    statusTitle: 'Vínculo con la doctrina',
    fardado: 'Fardado',
    icefluMember: 'Miembro ICEFLU al día',
    novice: 'Novizio / primera vez',
    participationTitle: 'Participación y estancia',
    attendanceMode: 'Modalidad',
    modeLodging: 'Vitto e alloggio',
    modeMeals: 'Solo vitto',
    modeSpiritual: 'Solo lavori spirituali',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    roomNumber: 'Número de habitación (opcional)',
    extraLinen: 'Quiero una sábana superior adicional y toallas (+20 euro)',
    worksTitle: 'Lavori spirituali',
    worksHint: 'Seleccione uno o más trabajos. El valor se calcula automáticamente.',
    documentsTitle: 'Documentos',
    identityDocument: 'Copia del documento de identidad',
    paymentProof: 'Comprobante de pago',
    consentDocument: 'Consentimiento informado firmado',
    documentsHint: 'En esta primera versión, solo se registran los nombres de los archivos seleccionados. El comprobante final sigue siendo esperado por WhatsApp o correo electrónico.',
    contributionTitle: 'Resumen de la contribución',
    nights: 'Noches',
    lodging: 'Alojamiento / comidas',
    spiritualWorks: 'Trabajos espirituales',
    extras: 'Extras',
    total: 'Total',
    submit: 'Enviar inscripción',
    submitting: 'Enviando...',
    successTitle: 'Inscripción recibida',
    successIntro: 'Su inscripción ha sido registrada. La organización ahora espera la transferencia y el envío del comprobante.',
    paymentTitle: 'Instrucciones de pago',
    ibanLabel: 'IBAN',
    causaleLabel: 'Concepto',
    sendProof: 'Envíe el comprobante a WhatsApp XXX o al correo YYY.',
    registrationId: 'Número de inscripción',
    restart: 'Hacer una nueva inscripción',
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
    languageLabel: 'Lingua',
    anonymousNote: 'Questa iscrizione è pubblica e può essere inviata senza un account.',
    resourcesTitle: 'Documenti e informazioni',
    resourcesIntro: 'I file qui sotto sono PDF temporanei pubblicati finché il contenuto finale non sarà pronto.',
    generalProgram: 'Programma generale',
    directions: 'Come arrivare',
    consentDownload: 'Consenso informato',
    consentHint: 'Se indichi che sei novizio, scaricalo, firmalo e tieni il file pronto.',
    formTitle: 'Modulo di iscrizione',
    personalTitle: 'Dati personali',
    firstName: 'Nome',
    lastName: 'Cognome',
    country: 'Paese',
    church: 'Chiesa o centro di riferimento',
    centerLeader: 'Nome del dirigente del centro',
    statusTitle: 'Rapporto con la dottrina',
    fardado: 'Fardado',
    icefluMember: 'Membro ICEFLU in regola',
    novice: 'Novizio / prima volta',
    participationTitle: 'Partecipazione e permanenza',
    attendanceMode: 'Modalità',
    modeLodging: 'Vitto e alloggio',
    modeMeals: 'Solo vitto',
    modeSpiritual: 'Solo lavori spirituali',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    roomNumber: 'Numero di camera (facoltativo)',
    extraLinen: 'Desidero un secondo lenzuolo superiore e asciugamani (+20 euro)',
    worksTitle: 'Lavori spirituali',
    worksHint: 'Seleziona uno o più lavori. Il contributo viene calcolato automaticamente.',
    documentsTitle: 'Documenti',
    identityDocument: 'Copia del documento di identità',
    paymentProof: 'Contabile bonifico pagamento',
    consentDocument: 'Consenso informato firmato',
    documentsHint: 'In questa prima versione, insieme all\'iscrizione vengono registrati solo i nomi dei file selezionati. La contabile finale resta comunque attesa via WhatsApp o email.',
    contributionTitle: 'Riepilogo del contributo',
    nights: 'Notti',
    lodging: 'Alloggio / vitto',
    spiritualWorks: 'Lavori spirituali',
    extras: 'Extra',
    total: 'Totale',
    submit: 'Invia iscrizione',
    submitting: 'Invio in corso...',
    successTitle: 'Iscrizione ricevuta',
    successIntro: 'La tua iscrizione è stata registrata. L\'organizzazione attende ora il bonifico e la contabile.',
    paymentTitle: 'Istruzioni di pagamento',
    ibanLabel: 'IBAN',
    causaleLabel: 'Causale',
    sendProof: 'Invia la contabile via WhatsApp XXX o email YYY.',
    registrationId: 'Numero iscrizione',
    restart: 'Compila una nuova iscrizione',
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

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function EncontroEuropeuPage() {
  const [locale, setLocale] = useState<Locale>(() => resolveInitialLocale(typeof navigator === 'undefined' ? undefined : navigator.language));
  const [values, setValues] = useState<EncontroEuropeuFormValues>(initialEncontroEuropeuFormValues);
  const [documents, setDocuments] = useState<DocumentState>({
    identityDocument: null,
    paymentProof: null,
    consentDocument: null
  });
  const [submitError, setSubmitError] = useState<string>('');
  const [successState, setSuccessState] = useState<SuccessState | null>(null);

  const copy = copyByLocale[locale];
  const contribution = useMemo(() => calculateContribution(values), [values]);

  const mutation = useMutation({
    mutationFn: async () => {
      const validationKey = validateEncontroEuropeuForm(values);
      if (validationKey) {
        throw new Error(copy.errors[validationKey] ?? 'Invalid form');
      }

      const payload = buildEncontroEuropeuPayload({
        values,
        locale,
        contribution,
        documents: {
          identityDocumentName: documents.identityDocument?.name,
          paymentProofName: documents.paymentProof?.name,
          consentDocumentName: documents.consentDocument?.name
        }
      });

      return createEncontroEuropeuRegistration(payload);
    },
    onSuccess: result => {
      setSuccessState({ contributionTotal: contribution.total, registrationId: result.id });
      setSubmitError('');
    },
    onError: error => {
      setSubmitError(error.message);
    }
  });

  const setField = <K extends keyof EncontroEuropeuFormValues>(field: K, value: EncontroEuropeuFormValues[K]) => {
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
    setValues(initialEncontroEuropeuFormValues);
    setDocuments({ identityDocument: null, paymentProof: null, consentDocument: null });
    setSubmitError('');
    setSuccessState(null);
    mutation.reset();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_50%,_#e2e8f0)]">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Encontro Europeu</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{copy.pageTitle}</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">{copy.pageIntro}</p>
            <p className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{copy.anonymousNote}</p>
          </div>

          <Field label={copy.languageLabel}>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:w-48"
              value={locale}
              onChange={event => setLocale(event.target.value as Locale)}
            >
              {localeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

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
          <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
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
                  <a className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50" href={consentDocumentPaths[locale]} target="_blank" rel="noreferrer">
                    {copy.consentDownload}
                  </a>
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">{copy.consentHint}</p>
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

            <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <h2 className="text-xl font-semibold text-slate-900">{copy.formTitle}</h2>

              <form
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
                      <input type="checkbox" checked={values.isFardado} onChange={event => setField('isFardado', event.target.checked)} />
                      {copy.fardado}
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
                    <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" value={values.attendanceMode} onChange={event => setField('attendanceMode', event.target.value as EncontroEuropeuFormValues['attendanceMode'])}>
                      <option value="lodging">{copy.modeLodging}</option>
                      <option value="meals">{copy.modeMeals}</option>
                      <option value="spiritual">{copy.modeSpiritual}</option>
                    </select>
                  </Field>

                  {values.attendanceMode !== 'spiritual' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={copy.checkIn}>
                        <input type="date" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" value={values.checkIn} onChange={event => setField('checkIn', event.target.value)} />
                      </Field>
                      <Field label={copy.checkOut}>
                        <input type="date" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" value={values.checkOut} onChange={event => setField('checkOut', event.target.value)} />
                      </Field>
                    </div>
                  ) : null}

                  {values.attendanceMode === 'lodging' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={copy.roomNumber}>
                        <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" value={values.roomNumber} onChange={event => setField('roomNumber', event.target.value)} />
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

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.documentsTitle}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={copy.identityDocument}>
                      <input type="file" accept=".pdf,image/*" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" onChange={event => setDocuments(current => ({ ...current, identityDocument: event.target.files?.[0] ?? null }))} />
                    </Field>
                    <Field label={copy.paymentProof}>
                      <input type="file" accept=".pdf,image/*" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" onChange={event => setDocuments(current => ({ ...current, paymentProof: event.target.files?.[0] ?? null }))} />
                    </Field>
                    {values.isNovice ? (
                      <Field label={copy.consentDocument}>
                        <input type="file" accept=".pdf,image/*" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" onChange={event => setDocuments(current => ({ ...current, consentDocument: event.target.files?.[0] ?? null }))} />
                      </Field>
                    ) : null}
                  </div>
                  <p className="text-xs leading-5 text-slate-500">{copy.documentsHint}</p>
                </div>

                {submitError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p> : null}

                <button type="submit" className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={mutation.isPending}>
                  {mutation.isPending ? copy.submitting : copy.submit}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}