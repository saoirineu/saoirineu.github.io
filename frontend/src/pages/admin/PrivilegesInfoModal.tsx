import { useEffect, useId, useRef, useState } from 'react';

import type { SiteLocale } from '../../lib/siteLocale';
import { privilegedSystemRoleOptions, type PrivilegedSystemRole } from '../../lib/systemRole';

type PrivilegeCopy = {
  summary: string;
  opens: string;
  can: string[];
  cannot: string[];
};

type Copy = {
  button: string;
  title: string;
  intro: string;
  opens: string;
  can: string;
  cannot: string;
  churchManagerNote: string;
  close: string;
  roles: Record<PrivilegedSystemRole, PrivilegeCopy>;
};

// Written from what the rules, routes and pages actually enforce, not from the role
// names: admin does not include useradmin, and custodian cannot edit batches.
const copyByLocale: Record<SiteLocale, Copy> = {
  pt: {
    button: 'O que cada privilégio permite',
    title: 'O que cada privilégio permite',
    intro: 'Os privilégios se somam: uma conta pode ter vários, e recebe tudo o que cada um permite.',
    opens: 'Abre',
    can: 'Pode',
    cannot: 'Não pode',
    churchManagerNote: 'Gestor de igreja não é um privilégio: os admins o atribuem em Trabalhos → Gestores das igrejas, e ele permite registrar os trabalhos daquela igreja.',
    close: 'Fechar',
    roles: {
      useradmin: {
        summary: 'Administração de membros.',
        opens: 'Usuários, Inscrições',
        can: [
          'Aprovar as inscrições ICEFLU ou devolvê-las pedindo ajustes',
          'Ler os perfis dos membros e os documentos de identidade enviados',
          'Aprovar os consentimentos informados assinados',
          'Ver os cadastros que nunca confirmaram o e-mail',
          'Escolher quem recebe o e-mail de nova inscrição'
        ],
        cannot: ['Conceder ou retirar privilégios, nem excluir contas (só superadmin)']
      },
      custodian: {
        summary: 'Mantém o registro do Sacramento (Daime).',
        opens: 'Sacramento',
        can: [
          'Cadastrar lotes de Daime em um estoque',
          'Registrar entradas e saídas',
          'Corrigir os movimentos que ele mesmo registrou'
        ],
        cannot: [
          'Criar ou excluir estoques (admin)',
          'Editar ou excluir lotes (admin)',
          'Alterar ou excluir movimentos de outras pessoas (admin)',
          'Vincular um estoque a uma igreja (admin)'
        ]
      },
      eventadmin: {
        summary: 'Organiza eventos, como o Encontro Europeu.',
        opens: 'Eventos',
        can: [
          'Criar, editar, publicar e excluir eventos: trabalhos, preços e vagas',
          'Mudar o estado de qualquer inscrição, aprovar ou recusar o pagamento, ou excluí-la',
          'Abrir os documentos enviados pelos inscritos: identidade, comprovante de pagamento, consentimento'
        ],
        cannot: ['Aprovar inscrições ICEFLU (useradmin)']
      },
      admin: {
        summary: 'Operação do dia a dia. Inclui custodian e eventadmin.',
        opens: 'Sacramento, Eventos, Sócios, Trabalhos',
        can: [
          'Tudo o que custodian e eventadmin podem',
          'Gerenciar o cadastro de Sócios da associação: revisar, corrigir, mesclar e excluir registros',
          'Ver todos os registros de Trabalhos, marcá-los como revisados, atribuir gestores das igrejas e editar a lista de tipos de trabalho',
          'Gerenciar por completo estoques, lotes e movimentos do Sacramento, e vincular estoques a igrejas'
        ],
        cannot: [
          'Aprovar membros nem abrir Usuários e Inscrições: para isso é preciso também useradmin',
          'Conceder privilégios ou excluir contas (só superadmin)'
        ]
      },
      superadmin: {
        summary: 'Acesso total. Inclui todos os privilégios acima.',
        opens: 'Todas as páginas',
        can: [
          'Tudo o que os outros privilégios permitem',
          'Conceder ou retirar privilégios (a coluna Privilégios)',
          'Excluir contas de usuário definitivamente',
          'Ativar o modo Dev, que mostra as páginas em protótipo'
        ],
        cannot: []
      }
    }
  },
  en: {
    button: 'What each privilege allows',
    title: 'What each privilege allows',
    intro: 'Privileges add up: an account can hold several, and gets everything each of them allows.',
    opens: 'Opens',
    can: 'Can',
    cannot: 'Cannot',
    churchManagerNote: 'Church manager is not a privilege: admins assign it in Works → Church managers, and it lets an account record the works of that church.',
    close: 'Close',
    roles: {
      useradmin: {
        summary: 'Membership administration.',
        opens: 'Users, Registrations',
        can: [
          'Approve ICEFLU membership submissions, or send them back asking for changes',
          'Read members\' profiles and the identity documents they uploaded',
          'Approve signed informed-consent forms',
          'See signups that never confirmed their email',
          'Choose who is emailed when a new membership submission arrives'
        ],
        cannot: ['Grant or remove privileges, or delete accounts (superadmin only)']
      },
      custodian: {
        summary: 'Keeps the Sacrament (Daime) ledger.',
        opens: 'Sacrament',
        can: [
          'Add Daime batches to a stock',
          'Log entries and exits',
          'Correct the movements they logged themselves'
        ],
        cannot: [
          'Create or delete stocks (admin)',
          'Edit or delete batches (admin)',
          'Change or delete movements logged by others (admin)',
          'Link a stock to a church (admin)'
        ]
      },
      eventadmin: {
        summary: 'Runs events, such as the European Gathering.',
        opens: 'Events',
        can: [
          'Create, edit, publish and delete events: works, prices and places',
          'Change the status of any registration, approve or reject its payment, or delete it',
          'Open the documents registrants upload: identity, payment proof, consent'
        ],
        cannot: ['Approve ICEFLU memberships (useradmin)']
      },
      admin: {
        summary: 'Day-to-day operations. Includes custodian and eventadmin.',
        opens: 'Sacrament, Events, Members, Works',
        can: [
          'Everything custodian and eventadmin can do',
          'Manage the association\'s Members registry: review, correct, merge and delete records',
          'See every record in Works, mark records reviewed, assign church managers and edit the work-type list',
          'Fully manage Sacrament stocks, batches and movements, and link stocks to churches'
        ],
        cannot: [
          'Approve members or open Users and Registrations: that also needs useradmin',
          'Grant privileges or delete accounts (superadmin only)'
        ]
      },
      superadmin: {
        summary: 'Full access. Includes every privilege above.',
        opens: 'Every page',
        can: [
          'Everything the other privileges allow',
          'Grant or remove privileges (the Privileges column)',
          'Permanently delete user accounts',
          'Turn on Dev mode, which shows the prototype pages'
        ],
        cannot: []
      }
    }
  },
  es: {
    button: 'Qué permite cada privilegio',
    title: 'Qué permite cada privilegio',
    intro: 'Los privilegios se suman: una cuenta puede tener varios y recibe todo lo que permite cada uno.',
    opens: 'Abre',
    can: 'Puede',
    cannot: 'No puede',
    churchManagerNote: 'Gestor de iglesia no es un privilegio: los admins lo asignan en Trabajos → Gestores de las iglesias, y permite registrar los trabajos de esa iglesia.',
    close: 'Cerrar',
    roles: {
      useradmin: {
        summary: 'Administración de miembros.',
        opens: 'Usuarios, Inscripciones',
        can: [
          'Aprobar las inscripciones ICEFLU o devolverlas pidiendo cambios',
          'Consultar los perfiles de los miembros y los documentos de identidad subidos',
          'Aprobar los consentimientos informados firmados',
          'Ver los registros que nunca confirmaron el correo',
          'Elegir quién recibe el correo de nueva inscripción'
        ],
        cannot: ['Conceder o quitar privilegios, ni eliminar cuentas (solo superadmin)']
      },
      custodian: {
        summary: 'Lleva el registro del Sacramento (Daime).',
        opens: 'Sacramento',
        can: [
          'Registrar lotes de Daime en un stock',
          'Anotar entradas y salidas',
          'Corregir los movimientos que anotó'
        ],
        cannot: [
          'Crear o eliminar stocks (admin)',
          'Editar o eliminar lotes (admin)',
          'Cambiar o eliminar movimientos de otras personas (admin)',
          'Vincular un stock a una iglesia (admin)'
        ]
      },
      eventadmin: {
        summary: 'Organiza eventos, como el Encuentro Europeo.',
        opens: 'Eventos',
        can: [
          'Crear, editar, publicar y eliminar eventos: trabajos, precios y plazas',
          'Cambiar el estado de cualquier inscripción, aprobar o rechazar su pago, o eliminarla',
          'Abrir los documentos que suben los inscritos: identidad, comprobante de pago, consentimiento'
        ],
        cannot: ['Aprobar inscripciones ICEFLU (useradmin)']
      },
      admin: {
        summary: 'Operación diaria. Incluye custodian y eventadmin.',
        opens: 'Sacramento, Eventos, Socios, Trabajos',
        can: [
          'Todo lo que pueden custodian y eventadmin',
          'Gestionar el registro de Socios de la asociación: revisar, corregir, fusionar y eliminar registros',
          'Ver todos los registros de Trabajos, marcarlos como revisados, asignar gestores de las iglesias y editar la lista de tipos de trabajo',
          'Gestionar por completo stocks, lotes y movimientos del Sacramento, y vincular stocks a iglesias'
        ],
        cannot: [
          'Aprobar miembros ni abrir Usuarios e Inscripciones: para eso también hace falta useradmin',
          'Conceder privilegios o eliminar cuentas (solo superadmin)'
        ]
      },
      superadmin: {
        summary: 'Acceso total. Incluye todos los privilegios anteriores.',
        opens: 'Todas las páginas',
        can: [
          'Todo lo que permiten los demás privilegios',
          'Conceder o quitar privilegios (la columna Privilegios)',
          'Eliminar cuentas de usuario definitivamente',
          'Activar el modo Dev, que muestra las páginas en prototipo'
        ],
        cannot: []
      }
    }
  },
  it: {
    button: 'Cosa consente ogni privilegio',
    title: 'Cosa consente ogni privilegio',
    intro: 'I privilegi si sommano: un account può averne più di uno e ottiene tutto ciò che ciascuno consente.',
    opens: 'Apre',
    can: 'Può',
    cannot: 'Non può',
    churchManagerNote: 'Gestore di chiesa non è un privilegio: lo assegnano gli admin in Lavori → Gestori delle chiese, e consente di registrare i lavori di quella chiesa.',
    close: 'Chiudi',
    roles: {
      useradmin: {
        summary: 'Gestione dei membri.',
        opens: 'Utenti, Iscrizioni',
        can: [
          'Approvare le iscrizioni ICEFLU o rimandarle chiedendo modifiche',
          'Consultare i profili dei membri e i documenti d\'identità caricati',
          'Approvare i consensi informati firmati',
          'Vedere le registrazioni mai confermate via e-mail',
          'Scegliere chi riceve l\'e-mail delle nuove iscrizioni'
        ],
        cannot: ['Assegnare o togliere privilegi, né eliminare account (solo superadmin)']
      },
      custodian: {
        summary: 'Tiene il registro del Sacramento (Daime).',
        opens: 'Sacramento',
        can: [
          'Inserire lotti di Daime in uno stock',
          'Registrare entrate e uscite',
          'Correggere i movimenti che ha registrato'
        ],
        cannot: [
          'Creare o eliminare stock (admin)',
          'Modificare o eliminare lotti (admin)',
          'Cambiare o eliminare movimenti registrati da altri (admin)',
          'Collegare uno stock a una chiesa (admin)'
        ]
      },
      eventadmin: {
        summary: 'Organizza gli eventi, come l\'Incontro Europeo.',
        opens: 'Eventi',
        can: [
          'Creare, modificare, pubblicare ed eliminare eventi: lavori, prezzi e posti',
          'Cambiare lo stato di qualsiasi iscrizione, approvarne o rifiutarne il pagamento, o eliminarla',
          'Aprire i documenti caricati dagli iscritti: identità, ricevuta di pagamento, consenso'
        ],
        cannot: ['Approvare le iscrizioni ICEFLU (useradmin)']
      },
      admin: {
        summary: 'Operatività quotidiana. Include custodian ed eventadmin.',
        opens: 'Sacramento, Eventi, Soci, Lavori',
        can: [
          'Tutto ciò che possono custodian ed eventadmin',
          'Gestire il registro dei Soci dell\'associazione: revisionare, correggere, unire ed eliminare schede',
          'Vedere tutti i registri in Lavori, segnarli come revisionati, assegnare i gestori delle chiese e modificare l\'elenco dei tipi di lavoro',
          'Gestire completamente stock, lotti e movimenti del Sacramento, e collegare gli stock alle chiese'
        ],
        cannot: [
          'Approvare i membri o aprire Utenti e Iscrizioni: serve anche useradmin',
          'Assegnare privilegi o eliminare account (solo superadmin)'
        ]
      },
      superadmin: {
        summary: 'Accesso completo. Include tutti i privilegi sopra.',
        opens: 'Tutte le pagine',
        can: [
          'Tutto ciò che consentono gli altri privilegi',
          'Assegnare o togliere privilegi (la colonna Privilegi)',
          'Eliminare definitivamente gli account utente',
          'Attivare la modalità Dev, che mostra le pagine prototipo'
        ],
        cannot: []
      }
    }
  }
};

export function PrivilegesInfoButton({ locale, onClick }: { locale: SiteLocale; onClick: () => void }) {
  const label = copyByLocale[locale].button;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-haspopup="dialog"
      title={label}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-[color:var(--brand-blue-deep)] hover:text-[color:var(--brand-blue-deep)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-blue-deep)]"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 10.5v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <circle cx="12" cy="7.5" r="1" fill="currentColor" />
      </svg>
    </button>
  );
}

/** Explains each privilege of the Privileges column, at reading pace. */
export function PrivilegesInfoModal({ locale, onClose }: { locale: SiteLocale; onClose: () => void }) {
  const copy = copyByLocale[locale];
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  // Captured while rendering, before focus moves into the dialog, so it can be given back.
  const [returnFocusTo] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        // Close is the dialog's only control: keep keyboard focus from wandering behind it.
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">{copy.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{copy.intro}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {copy.close}
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {privilegedSystemRoleOptions.map(option => {
            const role = copy.roles[option];
            return (
              <section key={option} className="rounded-xl border border-slate-200 p-4" aria-labelledby={`${titleId}-${option}`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3
                    id={`${titleId}-${option}`}
                    className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-sm font-semibold text-slate-800"
                  >
                    {option}
                  </h3>
                  <p className="text-sm font-medium text-slate-700">{role.summary}</p>
                </div>

                <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-slate-900">{copy.opens}:</dt>
                    <dd>{role.opens}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{copy.can}</dt>
                    <dd>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {role.can.map(item => <li key={item}>{item}</li>)}
                      </ul>
                    </dd>
                  </div>
                  {role.cannot.length ? (
                    <div>
                      <dt className="font-semibold text-slate-900">{copy.cannot}</dt>
                      <dd>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                          {role.cannot.map(item => <li key={item}>{item}</li>)}
                        </ul>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            );
          })}

          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">{copy.churchManagerNote}</p>
        </div>
      </div>
    </div>
  );
}
