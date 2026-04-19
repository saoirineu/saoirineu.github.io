import { Link } from 'react-router-dom';

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
      meeting: { title: 'Inscrição no encontro europeu', desc: 'Preencha, salve rascunho e envie sua inscrição dentro da área logada.' },
      registrations: { title: 'Inscrições do encontro', desc: 'Acompanhe os inscritos e faça a triagem administrativa.' }
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
      meeting: { title: 'European Meeting registration', desc: 'Fill in, save a draft, and submit your registration from inside the logged-in area.' },
      registrations: { title: 'Meeting registrations', desc: 'Follow registrations and perform administrative triage.' }
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
      meeting: { title: 'Inscripción al encuentro europeo', desc: 'Complete, guarde borrador y envíe su inscripción dentro del área autenticada.' },
      registrations: { title: 'Inscripciones del encuentro', desc: 'Siga a los inscritos y haga la gestión administrativa.' }
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
      meeting: { title: 'Iscrizione all\'incontro europeo', desc: 'Compila, salva la bozza e invia la tua iscrizione all\'interno dell\'area autenticata.' },
      registrations: { title: 'Iscrizioni all\'incontro', desc: 'Segui gli iscritti e svolgi la gestione amministrativa.' }
    }
  }
} as const;

export function DashboardPage() {
  const { devModeEnabled } = useDevMode();
  const { role } = useSystemRole();
  const { locale } = useSiteLocale();
  const copy = copyByLocale[locale];

  const stableCards = [
    { to: '/european-gathering', ...copy.stableCards.meeting },
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{devModeEnabled ? copy.panel : copy.home}</h1>
        {devModeEnabled ? (
          <>
            <p className="text-sm text-slate-600">{copy.devIntro}</p>
            <p className="mt-2 text-xs text-amber-700">{copy.devHint}</p>
          </>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(card => (
          <Link
            key={card.to}
            to={card.to}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span>{card.title}</span>
              {isAdminRegistrationsCard(card.to) ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                  Adm
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{card.desc}</p>
            <p className="mt-3 text-xs font-medium text-blue-700">{copy.enter}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
