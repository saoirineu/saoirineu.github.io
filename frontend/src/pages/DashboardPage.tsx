import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { fetchPublishedEvents } from '../lib/events';
import { hasRequiredRole } from '../lib/systemRole';
import { useDevMode } from '../providers/useDevMode';
import { useSiteLocale } from '../providers/useSiteLocale';
import { useSystemRole } from '../providers/useSystemRole';

const copyByLocale = {
  pt: {
    panel: 'Painel',
    home: 'Início',
    devIntro: 'Navegue pelos dados e ontologias do Santo Daime.',
    stableIntro: 'Acesse daqui apenas as áreas estáveis disponíveis para uso diário.',
    devHint: 'PWA: funciona offline após o primeiro acesso; dados sincronizam quando a conexão volta.',
    stableHint: 'O modo estável mantém visíveis somente perfil, igrejas, inscrição do encontro e páginas administrativas já prontas.',
    enter: 'Entrar →',
    reviewProfile: 'Atualizar perfil →',
    devCards: {
      profile: { title: 'Perfil', desc: 'Atualize seus dados de acesso e referência pessoal.' },
      people: { title: 'Pessoas', desc: 'Daimistas, papéis e perfis.' },
      churches: { title: 'Igrejas', desc: 'Casas, linhagens e vínculos.' },
      hymns: { title: 'Hinários / Hinos', desc: 'Taxonomia, autores, gravações.' },
      beverage: { title: 'Bebida', desc: 'Lotes, insumos, análises e destino.' },
      works: { title: 'Trabalhos', desc: 'Agenda, hinários, igrejas e participantes.' }
    },
    stableCards: {
      profile: { title: 'Perfil', desc: 'Atualize seus dados de acesso e referência pessoal.' },
      churches: { title: 'Igrejas', desc: 'Cadastre e consulte as igrejas já disponíveis no sistema.' },
      gathering: { title: 'Encontro Europeu ICEFLU', desc: 'Inscreva-se e acompanhe o Encontro Europeu ICEFLU.' },
      registrations: { title: 'Inscrições do encontro', desc: 'Acompanhe os inscritos e faça a triagem administrativa.' }
    },
    eventRegisterDesc: 'Inscreva-se e acompanhe este evento.',
    portalAccess: {
      needsProfileTitle: 'Complete sua inscrição no ICEFLU',
      needsProfileDesc: 'Para liberar as funcionalidades do portal, atualize seu perfil e envie um documento de identidade.',
      pendingTitle: 'Aguardando aprovação administrativa',
      pendingDesc: 'Recebemos seus dados e seu documento. A administração irá revisar sua inscrição no ICEFLU.',
      approvedTitle: 'Acesso ao portal aprovado',
      approvedDesc: 'Sua inscrição no ICEFLU foi aprovada. Mantenha seu perfil atualizado.'
    },
    membershipStatus: {
      'needs-profile': 'Formulário não enviado',
      pending: 'Aguardando aprovação',
      approved: 'Membro aprovado',
      'needs-info': 'Atualização solicitada'
    }
  },
  en: {
    panel: 'Dashboard',
    home: 'Home',
    devIntro: 'Browse Santo Daime data and ontologies.',
    stableIntro: 'Access here only the stable areas available for day-to-day use.',
    devHint: 'PWA: works offline after the first visit; data syncs when the connection returns.',
    stableHint: 'Stable mode keeps only profile, churches, meeting registration, and ready admin pages visible.',
    enter: 'Open →',
    reviewProfile: 'Update profile →',
    devCards: {
      profile: { title: 'Profile', desc: 'Update your access and personal reference data.' },
      people: { title: 'People', desc: 'Daimistas, roles, and profiles.' },
      churches: { title: 'Churches', desc: 'Houses, lineages, and links.' },
      hymns: { title: 'Hymns', desc: 'Taxonomy, authors, recordings.' },
      beverage: { title: 'Beverage', desc: 'Batches, inputs, analysis, and destination.' },
      works: { title: 'Works', desc: 'Agenda, hymnals, churches, and participants.' }
    },
    stableCards: {
      profile: { title: 'Profile', desc: 'Update your access and personal reference data.' },
      churches: { title: 'Churches', desc: 'Register and review the churches already available in the system.' },
      gathering: { title: 'ICEFLU Gathering', desc: 'Register and follow the ICEFLU European Gathering event.' },
      registrations: { title: 'Meeting registrations', desc: 'Follow registrations and perform administrative triage.' }
    },
    eventRegisterDesc: 'Register and follow this event.',
    portalAccess: {
      needsProfileTitle: 'Complete your ICEFLU registration',
      needsProfileDesc: 'To unlock the portal features, update your profile and upload an identity document.',
      pendingTitle: 'Waiting for administrative approval',
      pendingDesc: 'We received your profile and identity document. The administration will review your ICEFLU subscription.',
      approvedTitle: 'Portal access approved',
      approvedDesc: 'Your ICEFLU subscription has been approved. Keep your profile up to date.'
    },
    membershipStatus: {
      'needs-profile': 'Member form not submitted',
      pending: 'Awaiting membership approval',
      approved: 'Approved member',
      'needs-info': 'Profile update requested'
    }
  },
  es: {
    panel: 'Panel',
    home: 'Inicio',
    devIntro: 'Navegue por los datos y ontologías del Santo Daime.',
    stableIntro: 'Acceda aquí solo a las áreas estables disponibles para el uso diario.',
    devHint: 'PWA: funciona sin conexión después del primer acceso; los datos se sincronizan cuando vuelve la conexión.',
    stableHint: 'El modo estable mantiene visibles solo perfil, iglesias, inscripción al encuentro y páginas administrativas ya listas.',
    enter: 'Entrar →',
    reviewProfile: 'Actualizar perfil →',
    devCards: {
      profile: { title: 'Perfil', desc: 'Actualice sus datos de acceso y referencia personal.' },
      people: { title: 'Personas', desc: 'Daimistas, papeles y perfiles.' },
      churches: { title: 'Iglesias', desc: 'Casas, linajes y vínculos.' },
      hymns: { title: 'Himnarios / Himnos', desc: 'Taxonomía, autores y grabaciones.' },
      beverage: { title: 'Bebida', desc: 'Lotes, insumos, análisis y destino.' },
      works: { title: 'Trabajos', desc: 'Agenda, himnarios, iglesias y participantes.' }
    },
    stableCards: {
      profile: { title: 'Perfil', desc: 'Actualice sus datos de acceso y referencia personal.' },
      churches: { title: 'Iglesias', desc: 'Registre y consulte las iglesias ya disponibles en el sistema.' },
      gathering: { title: 'Encuentro Europeo ICEFLU', desc: 'Inscríbase y siga el Encuentro Europeo ICEFLU.' },
      registrations: { title: 'Inscripciones del encuentro', desc: 'Siga a los inscritos y haga la gestión administrativa.' }
    },
    eventRegisterDesc: 'Inscríbase y siga este evento.',
    portalAccess: {
      needsProfileTitle: 'Complete su inscripción en ICEFLU',
      needsProfileDesc: 'Para desbloquear las funciones del portal, actualice su perfil y suba un documento de identidad.',
      pendingTitle: 'Esperando aprobación administrativa',
      pendingDesc: 'Recibimos sus datos y su documento. La administración revisará su inscripción en ICEFLU.',
      approvedTitle: 'Acceso al portal aprobado',
      approvedDesc: 'Su inscripción en ICEFLU fue aprobada. Mantenga su perfil actualizado.'
    },
    membershipStatus: {
      'needs-profile': 'Formulario no enviado',
      pending: 'Esperando aprobación',
      approved: 'Miembro aprobado',
      'needs-info': 'Actualización solicitada'
    }
  },
  it: {
    panel: 'Pannello',
    home: 'Inizio',
    devIntro: 'Naviga tra i dati e le ontologie del Santo Daime.',
    stableIntro: 'Accedi qui solo alle aree stabili disponibili per l\'uso quotidiano.',
    devHint: 'PWA: funziona offline dopo il primo accesso; i dati si sincronizzano quando torna la connessione.',
    stableHint: 'La modalità stabile mantiene visibili solo profilo, chiese, iscrizione all\'incontro e pagine amministrative già pronte.',
    enter: 'Apri →',
    reviewProfile: 'Aggiorna profilo →',
    devCards: {
      profile: { title: 'Profilo', desc: 'Aggiorna i tuoi dati di accesso e di riferimento personale.' },
      people: { title: 'Persone', desc: 'Daimisti, ruoli e profili.' },
      churches: { title: 'Chiese', desc: 'Case, linee e collegamenti.' },
      hymns: { title: 'Inni', desc: 'Tassonomia, autori e registrazioni.' },
      beverage: { title: 'Bevanda', desc: 'Lotti, ingredienti, analisi e destinazione.' },
      works: { title: 'Lavori', desc: 'Agenda, innari, chiese e partecipanti.' }
    },
    stableCards: {
      profile: { title: 'Profilo', desc: 'Aggiorna i tuoi dati di accesso e di riferimento personale.' },
      churches: { title: 'Chiese', desc: 'Registra e consulta le chiese già disponibili nel sistema.' },
      gathering: { title: 'Incontro Europeo ICEFLU', desc: 'Iscriviti e segui l\'Incontro Europeo ICEFLU.' },
      registrations: { title: 'Iscrizioni all\'incontro', desc: 'Segui gli iscritti e svolgi la gestione amministrativa.' }
    },
    eventRegisterDesc: 'Iscriviti e segui questo evento.',
    portalAccess: {
      needsProfileTitle: 'Completa la tua iscrizione a ICEFLU',
      needsProfileDesc: 'Per sbloccare le funzionalità del portale, aggiorna il profilo e carica un documento di identità.',
      pendingTitle: 'In attesa di approvazione amministrativa',
      pendingDesc: 'Abbiamo ricevuto i tuoi dati e il documento. L\'amministrazione esaminerà la tua iscrizione a ICEFLU.',
      approvedTitle: 'Accesso al portale approvato',
      approvedDesc: 'La tua iscrizione a ICEFLU è stata approvata. Mantieni aggiornato il profilo.'
    },
    membershipStatus: {
      'needs-profile': 'Modulo non inviato',
      pending: 'In attesa di approvazione',
      approved: 'Membro approvato',
      'needs-info': 'Aggiornamento richiesto'
    }
  }
} as const;

function membershipStatusBadgeClass(status: string) {
  const base = 'shrink-0 rounded-full px-3 py-1 text-xs font-medium ';
  if (status === 'approved') return base + 'bg-emerald-100 text-emerald-800';
  if (status === 'pending') return base + 'bg-amber-100 text-amber-800';
  if (status === 'needs-info') return base + 'bg-orange-100 text-orange-800';
  return base + 'bg-slate-100 text-slate-600';
}

export function DashboardPage() {
  const { devModeEnabled } = useDevMode();
  const { profile, role } = useSystemRole();
  const { locale } = useSiteLocale();
  const copy = copyByLocale[locale];

  const approvalStatus = profile?.approvalStatus ?? 'needs-profile';

  const publishedEventsQuery = useQuery({
    queryKey: ['publishedEvents'],
    queryFn: fetchPublishedEvents,
    enabled: approvalStatus === 'approved'
  });
  const eventCards = (publishedEventsQuery.data ?? []).map(event => ({
    to: `/events/${event.slug}`,
    title: event.title[locale] || event.title.en || event.title.pt || event.slug,
    desc: copy.eventRegisterDesc
  }));

  const portalAccessCard = approvalStatus === 'pending'
    ? { to: '/profile', title: copy.portalAccess.pendingTitle, desc: copy.portalAccess.pendingDesc }
    : approvalStatus === 'needs-info' || approvalStatus === 'needs-profile'
      ? { to: '/profile', title: copy.portalAccess.needsProfileTitle, desc: copy.portalAccess.needsProfileDesc }
      : null;

  const stableCards = [
    ...(portalAccessCard ? [portalAccessCard] : []),
    ...(approvalStatus === 'approved' ? eventCards : []),
    ...(hasRequiredRole(role, 'admin')
      ? [{ to: '/admin/european-gathering', ...copy.stableCards.registrations }]
      : [])
  ];

  const devCards = [
    { to: '/profile', ...copy.devCards.profile },
    { to: '/people', ...copy.devCards.people },
    { to: '/churches', ...copy.devCards.churches },
    { to: '/hymnals', ...copy.devCards.hymns },
    { to: '/beverage', ...copy.devCards.beverage },
    { to: '/works', ...copy.devCards.works }
  ];

  const cards = devModeEnabled ? devCards : stableCards;

  const isAdminRegistrationsCard = (to: string) => to === '/admin/european-gathering';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{devModeEnabled ? copy.panel : copy.home}</h1>
        {!devModeEnabled ? (
          <span className={membershipStatusBadgeClass(approvalStatus)}>
            {copy.membershipStatus[approvalStatus]}
          </span>
        ) : null}
      </div>
      {devModeEnabled ? (
        <div>
          <p className="text-sm text-slate-600">{copy.devIntro}</p>
          <p className="mt-2 text-xs text-amber-700">{copy.devHint}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(card => (
          <div key={card.to} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span>{card.title}</span>
              {isAdminRegistrationsCard(card.to) ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                  Adm
                </span>
              ) : null}
            </div>
            {card.desc ? <p className="mt-1 text-sm text-slate-600">{card.desc}</p> : null}
            <Link
              to={card.to}
              className="mt-3 block text-xs font-medium text-blue-700 hover:underline"
            >
              {card.to === '/profile' ? copy.reviewProfile : copy.enter}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
