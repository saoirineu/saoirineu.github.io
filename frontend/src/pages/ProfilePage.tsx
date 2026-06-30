import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';

import { fetchChurches } from '../lib/works';
import { fetchMembersByEmail, type MemberRecord } from '../lib/members';
import { fetchUser, fetchApprovedSnapshots, nextUserApprovalStatus, resolveUserDocumentUrl, uploadUserIdentityDocument, upsertUser } from '../lib/users';
import { uploadAccept } from '../lib/uploads';
import { getFileUploadLabels } from '../lib/fileUploadLabels';
import { FileUploadField } from '../components/FileUploadField';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';
import { formatFullName } from './members/form';
import {
  applyAuthFallback,
  applyMemberPrefill,
  buildProfileForm,
  buildUserPayload,
  initialProfileForm,
  isProfileFormReadyForApproval,
  type ProfileFormState
} from './profile/form';
import {
  IcefluDisabledGroup,
  ProfileAssociationSection,
  ProfileConsentsSection,
  ProfileIdentitySection,
  ProfileNationalityDeclaration,
  ProfileNotesSection,
  ProfilePersonalSection,
  ProfileInitiationSection,
  ProfileChurchesSection,
  ProfileResidenceSection,
  ProfileRolesSection,
  type ProfileSectionsCopy
} from './profile/ProfileSections';

type ProfileLocale = 'pt' | 'en' | 'es' | 'it';
type ProfileSaveMode = 'save' | 'submit';

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
  | 'sex'
  | 'sexFemale'
  | 'sexMale'
  | 'birthDate'
  | 'birthPlace'
  | 'birthProvince'
  | 'birthCountry'
  | 'citizenship'
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
  | 'registrationRequestDate'
  | 'registrationDate'
  | 'renewalDate'
  | 'cancellationDate'
  | 'firstWorkDate'
  | 'identityDocumentPrimary'
  | 'identityDocumentSecondary'
  | 'membershipFeeAmount';

const registryCopyByLocale: Record<ProfileLocale, Pick<ProfileSectionsCopy, RegistryCopyKey>> = {
  pt: {
    identity: 'Identidade',
    residence: 'Residência',
    association: 'Associação',
    memberLinked: 'Sócio vinculado',
    firstName: 'Nome',
    surname: 'Sobrenome',
    fullName: 'Nome completo',
    email2: 'Email 2',
    mobile: 'Celular',
    fiscalCode: 'Codice Fiscale',
    sex: 'Sexo',
    sexFemale: 'Feminino',
    sexMale: 'Masculino',
    birthDate: 'Data de nascimento',
    birthPlace: 'Local de nascimento',
    birthProvince: 'Província de nascimento',
    birthCountry: 'País de nascimento',
    citizenship: 'Cidadania',
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
    registrationRequestDate: 'Data do pedido',
    registrationDate: 'Data de inscrição',
    renewalDate: 'Data de renovação',
    cancellationDate: 'Data de cancelamento',
    firstWorkDate: 'Primeiro Trabalho',
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
    email2: 'Email 2',
    mobile: 'Mobile',
    fiscalCode: 'Tax code',
    sex: 'Sex',
    sexFemale: 'Female',
    sexMale: 'Male',
    birthDate: 'Birth date',
    birthPlace: 'Birthplace',
    birthProvince: 'Birth province',
    birthCountry: 'Birth country',
    citizenship: 'Citizenship',
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
    registrationRequestDate: 'Request date',
    registrationDate: 'Registration date',
    renewalDate: 'Renewal date',
    cancellationDate: 'Cancellation date',
    firstWorkDate: 'First Work',
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
    email2: 'Correo 2',
    mobile: 'Celular',
    fiscalCode: 'Codice Fiscale',
    sex: 'Sexo',
    sexFemale: 'Femenino',
    sexMale: 'Masculino',
    birthDate: 'Fecha de nacimiento',
    birthPlace: 'Lugar de nacimiento',
    birthProvince: 'Provincia de nacimiento',
    birthCountry: 'País de nacimiento',
    citizenship: 'Ciudadanía',
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
    registrationRequestDate: 'Fecha de solicitud',
    registrationDate: 'Fecha de inscripción',
    renewalDate: 'Fecha de renovación',
    cancellationDate: 'Fecha de cancelación',
    firstWorkDate: 'Primer Trabajo',
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
    email2: 'E-mail 2',
    mobile: 'Cellulare',
    fiscalCode: 'Codice Fiscale',
    sex: 'Sesso',
    sexFemale: 'Femmina',
    sexMale: 'Maschio',
    birthDate: 'Data di nascita',
    birthPlace: 'Luogo di nascita',
    birthProvince: 'Provincia di nascita',
    birthCountry: 'Paese di nascita',
    citizenship: 'Cittadinanza',
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
    registrationRequestDate: 'Data richiesta',
    registrationDate: 'Data iscrizione',
    renewalDate: 'Data rinnovo',
    cancellationDate: 'Data cancellazione',
    firstWorkDate: 'Primo Lavoro',
    identityDocumentPrimary: 'Carta di identità (fronte/retro)',
    identityDocumentSecondary: 'Carta identità (eventuale retro)',
    membershipFeeAmount: 'Quota'
  }
};

type ConsentCopyKey =
  | 'information'
  | 'privacyLabel'
  | 'privacyText'
  | 'declarationLabel'
  | 'declarationText'
  | 'consentAgree'
  | 'consentDisagree';

const consentCopyByLocale: Record<ProfileLocale, Pick<ProfileSectionsCopy, ConsentCopyKey>> = {
  pt: {
    information: 'Informações',
    privacyLabel: 'Privacidade',
    privacyText: 'Tendo recebido, lido e aprovado a política de privacidade relativa ao uso dos meus dados pessoais, consinto, nos termos do art. 4, n.º 11 do GDPR 697/2016, ao seu tratamento na medida necessária à realização das finalidades estatutárias. Consinto também que os dados relativos à inscrição sejam comunicados à entidade Stella Azzurra ETS, com a qual a Associação colabora, e por esta tratados na medida necessária ao cumprimento das obrigações previstas em lei e nas normas estatutárias.',
    declarationLabel: 'Declaração',
    declarationText: 'Solicito a este Conselho Diretivo ser admitido(a) como sócio(a) da Associação e poder participar das atividades associativas. Para tal, declaro ter lido e compartilhado as disposições estatutárias vigentes e as deliberações dos órgãos sociais validamente constituídos, que me comprometo a respeitar.',
    consentAgree: 'Concordo',
    consentDisagree: 'Não concordo'
  },
  en: {
    information: 'Information',
    privacyLabel: 'Privacy',
    privacyText: 'Having received, read, and approved the privacy policy regarding the use of my personal data, I consent, pursuant to Article 4, No. 11 of GDPR 697/2016, to the processing of such data as necessary for the pursuit of the statutory purposes. I also consent to my registration data being communicated to Stella Azzurra ETS, with which the Association cooperates, to be processed to the extent necessary to the fulfillment of the obligations required by law and statutory regulations.',
    declarationLabel: 'Declaration',
    declarationText: 'I hereby submit a request to the Board of Directors to be admitted as a member of the Association and to be allowed to participate in its activities. To this end, I state having read and shared the current statutory provisions and the resolutions of the duly constituted social bodies, which I commit to respect.',
    consentAgree: 'I agree',
    consentDisagree: 'Not agree'
  },
  es: {
    information: 'Información',
    privacyLabel: 'Privacidad',
    privacyText: 'Habiendo recibido, leído y aprobado la política de privacidad relativa al uso de mis datos personales, consiento, conforme al art. 4, n.º 11 del GDPR 697/2016, a su tratamiento en la medida necesaria para la consecución de los fines estatutarios. Consiento también que los datos relativos a la inscripción sean comunicados a la entidad Stella Azzurra ETS, con la que la Asociación colabora, y tratados por esta en la medida necesaria para el cumplimiento de las obligaciones previstas por la ley y las normas estatutarias.',
    declarationLabel: 'Declaración',
    declarationText: 'Solicito a este Consejo Directivo ser admitido(a) como socio(a) de la Asociación y poder participar en las actividades asociativas. A tal fin, declaro haber leído y compartido las disposiciones estatutarias vigentes y las resoluciones de los órganos sociales válidamente constituidos, que me comprometo a respetar.',
    consentAgree: 'Acepto',
    consentDisagree: 'No acepto'
  },
  it: {
    information: 'Informative',
    privacyLabel: 'Privacy',
    privacyText: "Ricevuta, letta ed approvata l'informativa sull'utilizzazione dei miei dati personali, consento ai sensi dell'art. 4 n. 11 G.D.P.R. 697/2016 al loro trattamento nella misura necessaria per il perseguimento degli scopi statutari. Consento anche che i dati riguardanti l'iscrizione siano comunicati all'ente Stella Azzurra ETS con cui l'Associazione collabora e da questi trattati nella misura necessaria all'adempimento di obblighi previsti dalla legge e dalle norme statutarie.",
    declarationLabel: 'Dichiarazione',
    declarationText: "Chiede a questo spett.le Consiglio Direttivo di essere ammesso/a quale socio/a dell'Associazione, e di poter partecipare alle attività associative. A tal fine, dichiara di aver letto e condiviso le disposizioni statutarie vigenti e le delibere degli organi sociali validamente costituiti, che si impegna a rispettare.",
    consentAgree: 'Acconsento',
    consentDisagree: 'Non Acconsento'
  }
};

const copyByLocale: Record<ProfileLocale, {
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
    title: 'Perfil',
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
      ...registryCopyByLocale.pt, ...consentCopyByLocale.pt, name: 'Nome', yourName: 'Seu nome', email: 'Email', phone: 'Telefone', optional: 'Opcional', city: 'Cidade', state: 'Estado/UF', country: 'País', avatar: 'Avatar', avatarUrl: 'URL do avatar', useGooglePhoto: 'Usar foto do Google', currentChurchRegistered: 'Igreja atual (cadastrada)', selectPlaceholder: '— Selecionar —', currentChurchText: 'Igreja atual (texto livre)', notRegisteredYet: 'Se não estiver cadastrada', originChurchText: 'Igreja de origem (texto livre)', originChurchPlaceholder: 'Linha ou igreja de onde veio', notes: 'Observações gerais', iAmInitiated: 'Sou fardado(a)', iAmSponsor: 'Sou padrinho/madrinha', initiationDate: 'Data do fardamento', initiationPlace: 'Local do fardamento', initiationPlacePlaceholder: 'Cidade/estado ou igreja', whoInitiatedMe: 'Quem me fardou', whoInitiatedMePlaceholder: 'Nome do padrinho/madrinha', initiationChurchRegistered: 'Igreja onde fui fardado (cadastrada)', initiationChurchText: 'Igreja onde fui fardado (texto livre)', withWhomIWasInitiated: 'Com quem me fardei', withWhomIWasInitiatedPlaceholder: 'Outras pessoas fardadas junto', sponsorChurchesRegistered: 'Igrejas onde sou padrinho/madrinha (cadastradas)', sponsorChurchesText: 'Igrejas onde sou padrinho/madrinha (texto livre)', sponsorChurchesPlaceholder: 'Ex.: nome de igrejas não cadastradas', roles: 'Papéis na doutrina (separar por vírgula)', rolesPlaceholder: 'Ex.: tesoureiro, coordenador, músico oficial, limpeza', rolesHint: 'Use termos livres (ex.: tesoureiro, cozinheira oficial, organização, arrumação, limpeza, músico, músico oficial).', icefluOnlyNote: 'Campo fora do formulário ICEFLU — desativado por enquanto.', nationalityQuestion: 'Você é cidadão ou residente italiano?', nationalityItalian: 'Italiano', nationalityNonItalian: 'Não italiano', nationalityHint: 'Define quais campos o formulário de inscrição ICEFLU exige.'
    }
  },
  en: {
    title: 'Profile', intro: 'All fields marked with * are required to submit your ICEFLU membership for approval. You can save a draft at any time and submit once every required field is filled.', sessionExpired: 'Session expired', saveError: 'Error while saving', saving: 'Saving...', save: 'Save profile', saved: 'Saved.', submitForApproval: 'Submit for approval', submittingForApproval: 'Submitting...', submittedForApproval: 'Submitted for approval.', pendingBannerTitle: 'Profile under review', pendingBannerDesc: 'Your profile has been submitted and is under review. Editing is locked while approval is pending.', reviewBannerTitle: 'Review requested by the administration', reviewBannerDesc: 'The administrator reviewed your profile and left a note. Please update your profile as indicated and resubmit for approval.', adminNoteLabel: 'Note from the administration', snapshotSectionTitle: 'Approved ICEFLU membership profile', snapshotApprovedOn: 'Approved on', requiredFieldsMissing: 'Fill in all fields marked with * (including Privacy and Declaration) before submitting for approval.', idUploadTitle: 'Identity document', idUploadIntro: 'Upload a PDF, JPG, or PNG of your ID so the administration can review your ICEFLU subscription.', idUploadCurrent: 'Uploaded document', idUploadChoose: 'Choose document', idUploadSelected: 'Selected', familyEmailTitle: 'We found more than one member with your email', familyEmailIntro: 'This email is shared by more than one member record. Select who you are to fill the profile with the right data.', thisIsMe: 'This is me', prefilledFrom: name => `Profile prefilled with member data: ${name}. You can change everything and save.`, sections: { ...registryCopyByLocale.en, ...consentCopyByLocale.en, name: 'Name', yourName: 'Your name', email: 'Email', phone: 'Phone', optional: 'Optional', city: 'City', state: 'State/Region', country: 'Country', avatar: 'Avatar', avatarUrl: 'Avatar URL', useGooglePhoto: 'Use Google photo', currentChurchRegistered: 'Current church (registered)', selectPlaceholder: '— Select —', currentChurchText: 'Current church (free text)', notRegisteredYet: 'If it is not registered yet', originChurchText: 'Origin church (free text)', originChurchPlaceholder: 'Lineage or church you came from', notes: 'General notes', iAmInitiated: 'I am initiated (fardado)', iAmSponsor: 'I am sponsor/godparent', initiationDate: 'Initiation date', initiationPlace: 'Initiation place', initiationPlacePlaceholder: 'City/state or church', whoInitiatedMe: 'Who initiated me', whoInitiatedMePlaceholder: 'Name of sponsor/godparent', initiationChurchRegistered: 'Church where I was initiated (registered)', initiationChurchText: 'Church where I was initiated (free text)', withWhomIWasInitiated: 'With whom I was initiated', withWhomIWasInitiatedPlaceholder: 'Other people initiated together', sponsorChurchesRegistered: 'Churches where I am sponsor/godparent (registered)', sponsorChurchesText: 'Churches where I am sponsor/godparent (free text)', sponsorChurchesPlaceholder: 'Example: churches not yet registered', roles: 'Roles in the doctrine (comma separated)', rolesPlaceholder: 'Example: treasurer, coordinator, official musician, cleaning', rolesHint: 'Use free terms such as treasurer, official cook, organization, setup, cleaning, musician, official musician.', icefluOnlyNote: 'Field not part of the ICEFLU form — disabled for now.', nationalityQuestion: 'Are you an Italian citizen or resident?', nationalityItalian: 'Italian', nationalityNonItalian: 'Non-Italian', nationalityHint: 'Determines which fields the ICEFLU membership form requires.' }
  },
  es: {
    title: 'Perfil', intro: 'Todos los campos marcados con * son obligatorios para enviar su inscripción ICEFLU a aprobación. Puede guardar un borrador en cualquier momento y enviar cuando todos los campos obligatorios estén completos.', sessionExpired: 'Sesión expirada', saveError: 'Error al guardar', saving: 'Guardando...', save: 'Guardar perfil', saved: 'Guardado.', submitForApproval: 'Enviar a aprobación', submittingForApproval: 'Enviando...', submittedForApproval: 'Enviado a aprobación.', pendingBannerTitle: 'Perfil en revisión', pendingBannerDesc: 'Su perfil fue enviado y está pendiente de revisión. La edición está bloqueada mientras la aprobación está pendiente.', reviewBannerTitle: 'Revisión solicitada por la administración', reviewBannerDesc: 'La administración revisó su perfil y dejó una nota. Actualice su perfil según lo indicado y vuelva a enviar para aprobación.', adminNoteLabel: 'Nota de la administración', snapshotSectionTitle: 'Perfil de miembro ICEFLU aprobado', snapshotApprovedOn: 'Aprobado el', requiredFieldsMissing: 'Complete todos los campos marcados con * (incluidas Privacidad y Declaración) antes de enviar a aprobación.', idUploadTitle: 'Documento de identidad', idUploadIntro: 'Suba un PDF, JPG o PNG de su documento para que la administración pueda revisar su inscripción en ICEFLU.', idUploadCurrent: 'Documento enviado', idUploadChoose: 'Seleccionar documento', idUploadSelected: 'Seleccionado', familyEmailTitle: 'Encontramos más de un socio con su correo', familyEmailIntro: 'Este correo es compartido por más de un socio. Seleccione quién es usted para completar el perfil con los datos correctos.', thisIsMe: 'Soy yo', prefilledFrom: name => `Perfil precargado con los datos del socio: ${name}. Puede cambiar todo y guardar.`, sections: { ...registryCopyByLocale.es, ...consentCopyByLocale.es, name: 'Nombre', yourName: 'Su nombre', email: 'Correo electrónico', phone: 'Teléfono', optional: 'Opcional', city: 'Ciudad', state: 'Estado/Provincia', country: 'País', avatar: 'Avatar', avatarUrl: 'URL del avatar', useGooglePhoto: 'Usar foto de Google', currentChurchRegistered: 'Iglesia actual (registrada)', selectPlaceholder: '— Seleccionar —', currentChurchText: 'Iglesia actual (texto libre)', notRegisteredYet: 'Si todavía no está registrada', originChurchText: 'Iglesia de origen (texto libre)', originChurchPlaceholder: 'Línea o iglesia de procedencia', notes: 'Observaciones generales', iAmInitiated: 'Soy fardado(a)', iAmSponsor: 'Soy padrino/madrina', initiationDate: 'Fecha del fardamento', initiationPlace: 'Lugar del fardamento', initiationPlacePlaceholder: 'Ciudad/estado o iglesia', whoInitiatedMe: 'Quién me fardó', whoInitiatedMePlaceholder: 'Nombre del padrino/madrina', initiationChurchRegistered: 'Iglesia donde fui fardado (registrada)', initiationChurchText: 'Iglesia donde fui fardado (texto libre)', withWhomIWasInitiated: 'Con quién me fardé', withWhomIWasInitiatedPlaceholder: 'Otras personas fardadas conmigo', sponsorChurchesRegistered: 'Iglesias donde soy padrino/madrina (registradas)', sponsorChurchesText: 'Iglesias donde soy padrino/madrina (texto libre)', sponsorChurchesPlaceholder: 'Ej.: iglesias no registradas', roles: 'Roles en la doctrina (separados por comas)', rolesPlaceholder: 'Ej.: tesorero, coordinador, músico oficial, limpieza', rolesHint: 'Use términos libres, por ejemplo tesorero, cocinera oficial, organización, arreglo, limpieza, músico, músico oficial.', icefluOnlyNote: 'Campo fuera del formulario ICEFLU — desactivado por ahora.', nationalityQuestion: '¿Es ciudadano o residente italiano?', nationalityItalian: 'Italiano', nationalityNonItalian: 'No italiano', nationalityHint: 'Define qué campos exige el formulario de inscripción ICEFLU.' }
  },
  it: {
    title: 'Profilo', intro: 'Tutti i campi contrassegnati con * sono obbligatori per inviare la tua iscrizione ICEFLU all\'approvazione. Puoi salvare una bozza in qualsiasi momento e inviare quando tutti i campi obbligatori sono compilati.', sessionExpired: 'Sessione scaduta', saveError: 'Errore durante il salvataggio', saving: 'Salvataggio...', save: 'Salva profilo', saved: 'Salvato.', submitForApproval: 'Invia all\'approvazione', submittingForApproval: 'Invio...', submittedForApproval: 'Inviato all\'approvazione.', pendingBannerTitle: 'Profilo in revisione', pendingBannerDesc: 'Il tuo profilo è stato inviato ed è in attesa di revisione. La modifica è bloccata mentre l\'approvazione è in sospeso.', reviewBannerTitle: 'Revisione richiesta dall\'amministrazione', reviewBannerDesc: 'L\'amministrazione ha esaminato il tuo profilo e ha lasciato una nota. Aggiorna il profilo come indicato e invia nuovamente per l\'approvazione.', adminNoteLabel: 'Nota dell\'amministrazione', snapshotSectionTitle: 'Profilo membro ICEFLU approvato', snapshotApprovedOn: 'Approvato il', requiredFieldsMissing: 'Compila tutti i campi contrassegnati con * (incluse Privacy e Dichiarazione) prima di inviare all\'approvazione.', idUploadTitle: 'Documento di identità', idUploadIntro: 'Carica un PDF, JPG o PNG del tuo documento affinché l\'amministrazione possa valutare la tua iscrizione a ICEFLU.', idUploadCurrent: 'Documento caricato', idUploadChoose: 'Seleziona documento', idUploadSelected: 'Selezionato', familyEmailTitle: 'Abbiamo trovato più di un socio con la tua email', familyEmailIntro: 'Questa email è condivisa da più di un socio. Seleziona chi sei per compilare il profilo con i dati corretti.', thisIsMe: 'Sono io', prefilledFrom: name => `Profilo precompilato con i dati del socio: ${name}. Puoi modificare tutto e salvare.`, sections: { ...registryCopyByLocale.it, ...consentCopyByLocale.it, name: 'Nome', yourName: 'Il tuo nome', email: 'Email', phone: 'Telefono', optional: 'Facoltativo', city: 'Città', state: 'Stato/Provincia', country: 'Paese', avatar: 'Avatar', avatarUrl: 'URL avatar', useGooglePhoto: 'Usa foto Google', currentChurchRegistered: 'Chiesa attuale (registrata)', selectPlaceholder: '— Seleziona —', currentChurchText: 'Chiesa attuale (testo libero)', notRegisteredYet: 'Se non è ancora registrata', originChurchText: 'Chiesa di origine (testo libero)', originChurchPlaceholder: 'Linea o chiesa di provenienza', notes: 'Osservazioni generali', iAmInitiated: 'Sono fardado/a', iAmSponsor: 'Sono padrino/madrina', initiationDate: 'Data del fardamento', initiationPlace: 'Luogo del fardamento', initiationPlacePlaceholder: 'Città/stato o chiesa', whoInitiatedMe: 'Chi mi ha fardato', whoInitiatedMePlaceholder: 'Nome del padrino/madrina', initiationChurchRegistered: 'Chiesa dove ho ricevuto il fardamento (registrata)', initiationChurchText: 'Chiesa dove ho ricevuto il fardamento (testo libero)', withWhomIWasInitiated: 'Con chi mi sono fardato', withWhomIWasInitiatedPlaceholder: 'Altre persone fardate insieme a me', sponsorChurchesRegistered: 'Chiese dove sono padrino/madrina (registrate)', sponsorChurchesText: 'Chiese dove sono padrino/madrina (testo libero)', sponsorChurchesPlaceholder: 'Es.: chiese non registrate', roles: 'Ruoli nella dottrina (separati da virgola)', rolesPlaceholder: 'Es.: tesoriere, coordinatore, musicista ufficiale, pulizia', rolesHint: 'Usa termini liberi, ad esempio tesoriere, cuoca ufficiale, organizzazione, sistemazione, pulizia, musicista, musicista ufficiale.', icefluOnlyNote: 'Campo non presente nel modulo ICEFLU — disabilitato per ora.', nationalityQuestion: 'Sei cittadino o residente italiano?', nationalityItalian: 'Italiano', nationalityNonItalian: 'Non italiano', nationalityHint: 'Determina i campi richiesti dal modulo di iscrizione ICEFLU.' }
  }
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { locale } = useSiteLocale();
  const qc = useQueryClient();
  const copy = copyByLocale[locale];
  const uploadLabels = getFileUploadLabels(locale);

  const [form, setForm] = useState<ProfileFormState>(initialProfileForm);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [identityDocumentFile, setIdentityDocumentFile] = useState<File | null>(null);

  const churchesQuery = useQuery({ queryKey: ['churches'], queryFn: fetchChurches });
  const profileQuery = useQuery({
    queryKey: ['user', user?.uid],
    queryFn: () => fetchUser(user!.uid),
    enabled: !!user
  });
  const memberMatchesQuery = useQuery({
    queryKey: ['memberMatches', user?.email],
    queryFn: async (): Promise<MemberRecord[]> => {
      try {
        return await fetchMembersByEmail(user!.email!);
      } catch {
        return []; // prefill is an enhancement; never block the profile on it
      }
    },
    enabled: !!user?.email
  });

  const memberMatches = useMemo(() => memberMatchesQuery.data ?? [], [memberMatchesQuery.data]);
  // The member this user declared to be: an in-session choice wins, then the
  // saved link; with a single email match the link is automatic. With several
  // matches (family email) nothing is prefilled until the user picks one.
  const [declaredMemberId, setDeclaredMemberId] = useState('');
  const linkedMember = useMemo(() => {
    const chosenId = declaredMemberId || profileQuery.data?.memberId;
    const chosen = chosenId ? memberMatches.find(member => member.id === chosenId) ?? null : null;
    if (chosen) return chosen;
    return memberMatches.length === 1 ? memberMatches[0] : null;
  }, [declaredMemberId, memberMatches, profileQuery.data?.memberId]);

  useEffect(() => {
    if (!user) return;
    let next = buildProfileForm(user, profileQuery.data);
    if (linkedMember) next = applyMemberPrefill(next, linkedMember);
    setForm(applyAuthFallback(next, user));
  }, [profileQuery.data, user, linkedMember]);

  const setField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const canSubmitForApproval = isProfileFormReadyForApproval(form, !!identityDocumentFile);
  const isPending = profileQuery.data?.approvalStatus === 'pending';
  const isNeedsInfo = profileQuery.data?.approvalStatus === 'needs-info';
  const adminNote = profileQuery.data?.adminNote;

  const snapshotsQuery = useQuery({
    queryKey: ['approvedSnapshots', user?.uid],
    queryFn: () => fetchApprovedSnapshots(user!.uid),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (mode: ProfileSaveMode) => {
      if (!user) throw new Error(copy.sessionExpired);
      setErrorMsg('');
      setSuccessMessage('');

      let nextForm = form;
      if (identityDocumentFile) {
        const uploadedDocument = await uploadUserIdentityDocument(user.uid, identityDocumentFile);
        nextForm = {
          ...form,
          identityDocumentPrimaryName: uploadedDocument.name,
          identityDocumentPrimaryPath: uploadedDocument.path
        };
      }

      const payload = buildUserPayload(user, nextForm);
      if (mode === 'save') {
        return upsertUser(user.uid, payload);
      }

      if (!isProfileFormReadyForApproval(nextForm)) {
        throw new Error(copy.requiredFieldsMissing);
      }

      const approvalStatus = nextUserApprovalStatus(payload, profileQuery.data?.approvalStatus);

      return upsertUser(user.uid, {
        ...payload,
        approvalStatus,
        approvalSubmittedAt: approvalStatus === 'pending' && profileQuery.data?.approvalStatus !== 'pending'
          ? Timestamp.now()
          : undefined
      });
    },
    onSuccess: (_data, mode) => {
      qc.invalidateQueries({ queryKey: ['user', user?.uid] });
      setIdentityDocumentFile(null);
      setSuccessMessage(mode === 'submit' ? copy.submittedForApproval : copy.saved);
    },
    onError: err => {
      const msg = err instanceof Error ? err.message : copy.saveError;
      setErrorMsg(msg);
    }
  });

  const avatar = useMemo(() => {
    if (form.avatarUrl) return form.avatarUrl;
    if (user?.photoURL) return user.photoURL;
    return '';
  }, [form.avatarUrl, user?.photoURL]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>
        <p className="text-sm text-slate-600">{copy.intro}</p>
      </div>

      {memberMatches.length > 1 ? (
        <section className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-sky-900">{copy.familyEmailTitle}</h2>
            <p className="text-sm text-sky-800">{copy.familyEmailIntro}</p>
          </div>
          <ul className="space-y-2">
            {memberMatches.map(candidate => (
              <li
                key={candidate.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2"
              >
                <div className="text-sm text-slate-800">
                  <div className="font-medium">{formatFullName(candidate) || candidate.id}</div>
                  <div className="text-xs text-slate-500">
                    {[candidate.birthDate, candidate.city].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {linkedMember?.id === candidate.id ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {copy.sections.memberLinked}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
                    onClick={() => setDeclaredMemberId(candidate.id)}
                  >
                    {copy.thisIsMe}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {linkedMember ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {copy.prefilledFrom(formatFullName(linkedMember) || linkedMember.id)}
        </div>
      ) : null}

      {snapshotsQuery.data && snapshotsQuery.data.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-sm font-semibold text-emerald-900">{copy.snapshotSectionTitle}</h2>
          {snapshotsQuery.data.map(snap => {
            const approvedAt = new Date(snap.approvedAt.toMillis()).toLocaleDateString();
            const displayName = snap.fullName ?? snap.displayName ?? ([snap.firstName, snap.surname].filter(Boolean).join(' ') || '—');
            return (
              <div key={snap.snapshotId} className="rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium text-slate-900">{displayName}</span>
                  <span className="text-xs text-emerald-700">{copy.snapshotApprovedOn}: {approvedAt}</span>
                </div>
                {snap.email ? <div className="text-xs text-slate-600">{snap.email}</div> : null}
                {snap.currentChurchName ? <div className="text-xs text-slate-600">{snap.currentChurchName}</div> : null}
                {snap.identityDocumentPrimaryPath ? (
                  <ProfileSnapshotDocumentLink name={snap.identityDocumentPrimaryName} path={snap.identityDocumentPrimaryPath} />
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {isPending ? (
        <section className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">{copy.pendingBannerTitle}</h2>
          <p className="text-sm text-amber-800">{copy.pendingBannerDesc}</p>
        </section>
      ) : null}

      {isNeedsInfo && adminNote ? (
        <section className="space-y-2 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <h2 className="text-sm font-semibold text-orange-900">{copy.reviewBannerTitle}</h2>
          <p className="text-sm text-orange-800">{copy.reviewBannerDesc}</p>
          <blockquote className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-800">
            <span className="mb-1 block text-xs font-semibold text-orange-700">{copy.adminNoteLabel}</span>
            {adminNote}
          </blockquote>
        </section>
      ) : null}

      <form
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={e => {
          e.preventDefault();
          if (!isPending) mutation.mutate('save');
        }}
      >
        <fieldset disabled={isPending} className="space-y-4 border-0 p-0 m-0 min-w-0">
          <ProfileNationalityDeclaration copy={copy.sections} form={form} setField={setField} />

          <ProfilePersonalSection
            avatarUrl={avatar}
            copy={copy.sections}
            form={form}
            setField={setField}
            userPhotoURL={user.photoURL}
          />

          <ProfileIdentitySection copy={copy.sections} form={form} setField={setField} />

          <ProfileResidenceSection copy={copy.sections} form={form} setField={setField} />

          <IcefluDisabledGroup note={copy.sections.icefluOnlyNote}>
            <ProfileAssociationSection copy={copy.sections} form={form} setField={setField} />
          </IcefluDisabledGroup>

          <section className="space-y-3 rounded-lg bg-slate-100 p-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {copy.idUploadTitle}
                <span className="text-red-500"> *</span>
              </h2>
              <p className="mt-1 text-xs text-slate-600">{copy.idUploadIntro}</p>
            </div>
            {form.identityDocumentPrimaryName && !identityDocumentFile ? (
              <p className="text-sm text-slate-700">
                <span className="font-medium">{copy.idUploadCurrent}:</span> {form.identityDocumentPrimaryName}
              </p>
            ) : null}
            <FileUploadField
              accept={uploadAccept}
              file={identityDocumentFile}
              label={copy.idUploadChoose}
              onChange={setIdentityDocumentFile}
              {...uploadLabels}
            />
          </section>

          <ProfileConsentsSection copy={copy.sections} form={form} setField={setField} />

          <ProfileNotesSection copy={copy.sections} form={form} setField={setField} />

          <IcefluDisabledGroup note={copy.sections.icefluOnlyNote}>
            <ProfileChurchesSection copy={copy.sections} form={form} churches={churchesQuery.data} setField={setField} />
          </IcefluDisabledGroup>

          <IcefluDisabledGroup note={copy.sections.icefluOnlyNote}>
            <ProfileInitiationSection copy={copy.sections} form={form} churches={churchesQuery.data} setField={setField} />
          </IcefluDisabledGroup>

          <IcefluDisabledGroup note={copy.sections.icefluOnlyNote}>
            <ProfileRolesSection copy={copy.sections} form={form} setField={setField} />
          </IcefluDisabledGroup>
        </fieldset>

        {!isPending ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              {mutation.isPending && mutation.variables === 'save' ? copy.saving : copy.save}
            </button>
            {profileQuery.data?.approvalStatus !== 'approved' ? (
              <button
                type="button"
                disabled={mutation.isPending || !canSubmitForApproval}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => mutation.mutate('submit')}
              >
                {mutation.isPending && mutation.variables === 'submit' ? copy.submittingForApproval : copy.submitForApproval}
              </button>
            ) : null}
            {mutation.isError ? <span className="text-sm text-red-600">{copy.saveError}.</span> : null}
            {successMessage ? <span className="text-sm text-green-700">{successMessage}</span> : null}
            {errorMsg ? <span className="text-sm text-red-600">{errorMsg}</span> : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}

function ProfileSnapshotDocumentLink({ name, path }: { name?: string; path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noreferrer"
      className="text-xs font-medium text-blue-700 underline decoration-blue-300 underline-offset-2"
      onClick={async event => {
        if (url || loading) return;
        event.preventDefault();
        setLoading(true);
        try {
          const resolved = await resolveUserDocumentUrl(path);
          setUrl(resolved);
          window.open(resolved, '_blank', 'noopener,noreferrer');
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? '...' : (name ?? path.split('/').pop())}
    </a>
  );
}
