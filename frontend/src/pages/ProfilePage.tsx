import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchChurches } from '../lib/trabalhos';
import { fetchUser, upsertUser } from '../lib/users';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';
import { buildPerfilForm, buildUsuarioPayload, initialPerfilForm, type PerfilFormState } from './perfil/form';
import {
  PerfilDadosPessoaisSection,
  PerfilFardamentoSection,
  PerfilIgrejasSection,
  PerfilPapeisSection,
  type PerfilSectionsCopy
} from './perfil/PerfilSections';

const copyByLocale: Record<'pt' | 'en' | 'es' | 'it', {
  title: string;
  intro: string;
  sessionExpired: string;
  saveError: string;
  saving: string;
  save: string;
  saved: string;
  sections: PerfilSectionsCopy;
}> = {
  pt: {
    title: 'Perfil',
    intro: 'Dados do usuário e informações de fardamento.',
    sessionExpired: 'Sessão expirada',
    saveError: 'Erro ao salvar',
    saving: 'Salvando...',
    save: 'Salvar perfil',
    saved: 'Salvo.',
    sections: {
      name: 'Nome', yourName: 'Seu nome', email: 'Email', phone: 'Telefone', optional: 'Opcional', city: 'Cidade', state: 'Estado/UF', country: 'País', avatar: 'Avatar', avatarUrl: 'URL do avatar', useGooglePhoto: 'Usar foto do Google', currentChurchRegistered: 'Igreja atual (cadastrada)', selectPlaceholder: '— Selecionar —', currentChurchText: 'Igreja atual (texto livre)', notRegisteredYet: 'Se não estiver cadastrada', originChurchText: 'Igreja de origem (texto livre)', originChurchPlaceholder: 'Linha ou igreja de onde veio', notes: 'Observações gerais', iAmFardado: 'Sou fardado(a)', iAmSponsor: 'Sou padrinho/madrinha', fardamentoDate: 'Data do fardamento', fardamentoPlace: 'Local do fardamento', fardamentoPlacePlaceholder: 'Cidade/estado ou igreja', whoFardouMe: 'Quem me fardou', whoFardouMePlaceholder: 'Nome do padrinho/madrinha', fardamentoChurchRegistered: 'Igreja onde fui fardado (cadastrada)', fardamentoChurchText: 'Igreja onde fui fardado (texto livre)', withWhomIWasFardado: 'Com quem me fardei', withWhomIWasFardadoPlaceholder: 'Outras pessoas fardadas junto', sponsorChurchesRegistered: 'Igrejas onde sou padrinho/madrinha (cadastradas)', sponsorChurchesText: 'Igrejas onde sou padrinho/madrinha (texto livre)', sponsorChurchesPlaceholder: 'Ex.: nome de igrejas não cadastradas', roles: 'Papéis na doutrina (separar por vírgula)', rolesPlaceholder: 'Ex.: tesoureiro, coordenador, músico oficial, limpeza', rolesHint: 'Use termos livres (ex.: tesoureiro, cozinheira oficial, organização, arrumação, limpeza, músico, músico oficial).'
    }
  },
  en: {
    title: 'Profile', intro: 'User details and fardamento information.', sessionExpired: 'Session expired', saveError: 'Error while saving', saving: 'Saving...', save: 'Save profile', saved: 'Saved.', sections: { name: 'Name', yourName: 'Your name', email: 'Email', phone: 'Phone', optional: 'Optional', city: 'City', state: 'State/Region', country: 'Country', avatar: 'Avatar', avatarUrl: 'Avatar URL', useGooglePhoto: 'Use Google photo', currentChurchRegistered: 'Current church (registered)', selectPlaceholder: '— Select —', currentChurchText: 'Current church (free text)', notRegisteredYet: 'If it is not registered yet', originChurchText: 'Origin church (free text)', originChurchPlaceholder: 'Lineage or church you came from', notes: 'General notes', iAmFardado: 'I am fardado', iAmSponsor: 'I am sponsor/godparent', fardamentoDate: 'Fardamento date', fardamentoPlace: 'Fardamento place', fardamentoPlacePlaceholder: 'City/state or church', whoFardouMe: 'Who gave me fardamento', whoFardouMePlaceholder: 'Name of sponsor/godparent', fardamentoChurchRegistered: 'Church where I received fardamento (registered)', fardamentoChurchText: 'Church where I received fardamento (free text)', withWhomIWasFardado: 'With whom I received fardamento', withWhomIWasFardadoPlaceholder: 'Other people who received fardamento together', sponsorChurchesRegistered: 'Churches where I am sponsor/godparent (registered)', sponsorChurchesText: 'Churches where I am sponsor/godparent (free text)', sponsorChurchesPlaceholder: 'Example: churches not yet registered', roles: 'Roles in the doctrine (comma separated)', rolesPlaceholder: 'Example: treasurer, coordinator, official musician, cleaning', rolesHint: 'Use free terms such as treasurer, official cook, organization, setup, cleaning, musician, official musician.' }
  },
  es: {
    title: 'Perfil', intro: 'Datos del usuario e información de fardamento.', sessionExpired: 'Sesión expirada', saveError: 'Error al guardar', saving: 'Guardando...', save: 'Guardar perfil', saved: 'Guardado.', sections: { name: 'Nombre', yourName: 'Su nombre', email: 'Correo electrónico', phone: 'Teléfono', optional: 'Opcional', city: 'Ciudad', state: 'Estado/Provincia', country: 'País', avatar: 'Avatar', avatarUrl: 'URL del avatar', useGooglePhoto: 'Usar foto de Google', currentChurchRegistered: 'Iglesia actual (registrada)', selectPlaceholder: '— Seleccionar —', currentChurchText: 'Iglesia actual (texto libre)', notRegisteredYet: 'Si todavía no está registrada', originChurchText: 'Iglesia de origen (texto libre)', originChurchPlaceholder: 'Línea o iglesia de procedencia', notes: 'Observaciones generales', iAmFardado: 'Soy fardado(a)', iAmSponsor: 'Soy padrino/madrina', fardamentoDate: 'Fecha del fardamento', fardamentoPlace: 'Lugar del fardamento', fardamentoPlacePlaceholder: 'Ciudad/estado o iglesia', whoFardouMe: 'Quién me fardó', whoFardouMePlaceholder: 'Nombre del padrino/madrina', fardamentoChurchRegistered: 'Iglesia donde fui fardado (registrada)', fardamentoChurchText: 'Iglesia donde fui fardado (texto libre)', withWhomIWasFardado: 'Con quién me fardé', withWhomIWasFardadoPlaceholder: 'Otras personas fardadas conmigo', sponsorChurchesRegistered: 'Iglesias donde soy padrino/madrina (registradas)', sponsorChurchesText: 'Iglesias donde soy padrino/madrina (texto libre)', sponsorChurchesPlaceholder: 'Ej.: iglesias no registradas', roles: 'Roles en la doctrina (separados por comas)', rolesPlaceholder: 'Ej.: tesorero, coordinador, músico oficial, limpieza', rolesHint: 'Use términos libres, por ejemplo tesorero, cocinera oficial, organización, arreglo, limpieza, músico, músico oficial.' }
  },
  it: {
    title: 'Profilo', intro: 'Dati utente e informazioni sul fardamento.', sessionExpired: 'Sessione scaduta', saveError: 'Errore durante il salvataggio', saving: 'Salvataggio...', save: 'Salva profilo', saved: 'Salvato.', sections: { name: 'Nome', yourName: 'Il tuo nome', email: 'Email', phone: 'Telefono', optional: 'Facoltativo', city: 'Città', state: 'Stato/Provincia', country: 'Paese', avatar: 'Avatar', avatarUrl: 'URL avatar', useGooglePhoto: 'Usa foto Google', currentChurchRegistered: 'Chiesa attuale (registrata)', selectPlaceholder: '— Seleziona —', currentChurchText: 'Chiesa attuale (testo libero)', notRegisteredYet: 'Se non è ancora registrata', originChurchText: 'Chiesa di origine (testo libero)', originChurchPlaceholder: 'Linea o chiesa di provenienza', notes: 'Osservazioni generali', iAmFardado: 'Sono fardado/a', iAmSponsor: 'Sono padrino/madrina', fardamentoDate: 'Data del fardamento', fardamentoPlace: 'Luogo del fardamento', fardamentoPlacePlaceholder: 'Città/stato o chiesa', whoFardouMe: 'Chi mi ha fardato', whoFardouMePlaceholder: 'Nome del padrino/madrina', fardamentoChurchRegistered: 'Chiesa dove ho ricevuto il fardamento (registrata)', fardamentoChurchText: 'Chiesa dove ho ricevuto il fardamento (testo libero)', withWhomIWasFardado: 'Con chi mi sono fardato', withWhomIWasFardadoPlaceholder: 'Altre persone fardate insieme a me', sponsorChurchesRegistered: 'Chiese dove sono padrino/madrina (registrate)', sponsorChurchesText: 'Chiese dove sono padrino/madrina (testo libero)', sponsorChurchesPlaceholder: 'Es.: chiese non registrate', roles: 'Ruoli nella dottrina (separati da virgola)', rolesPlaceholder: 'Es.: tesoriere, coordinatore, musicista ufficiale, pulizia', rolesHint: 'Usa termini liberi, ad esempio tesoriere, cuoca ufficiale, organizzazione, sistemazione, pulizia, musicista, musicista ufficiale.' }
  }
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { locale } = useSiteLocale();
  const qc = useQueryClient();
  const copy = copyByLocale[locale];

  const [form, setForm] = useState<PerfilFormState>(initialPerfilForm);
  const [errorMsg, setErrorMsg] = useState('');

  const churchesQuery = useQuery({ queryKey: ['churches'], queryFn: fetchChurches });
  const profileQuery = useQuery({
    queryKey: ['user', user?.uid],
    queryFn: () => fetchUser(user!.uid),
    enabled: !!user
  });

  useEffect(() => {
    if (!user) return;
    setForm(buildPerfilForm(user, profileQuery.data));
  }, [profileQuery.data, user]);

  const setField = <K extends keyof PerfilFormState>(field: K, value: PerfilFormState[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(copy.sessionExpired);
      setErrorMsg('');

      return upsertUser(user.uid, buildUsuarioPayload(user, form));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', user?.uid] });
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

      <form
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={e => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <PerfilDadosPessoaisSection
          avatarUrl={avatar}
          copy={copy.sections}
          form={form}
          setField={setField}
          userPhotoURL={user.photoURL}
        />

        <PerfilIgrejasSection copy={copy.sections} form={form} igrejas={churchesQuery.data} setField={setField} />

        <PerfilFardamentoSection copy={copy.sections} form={form} igrejas={churchesQuery.data} setField={setField} />

        <PerfilPapeisSection copy={copy.sections} form={form} setField={setField} />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {mutation.isPending ? copy.saving : copy.save}
          </button>
          {mutation.isError ? <span className="text-sm text-red-600">{copy.saveError}.</span> : null}
          {mutation.isSuccess ? <span className="text-sm text-green-700">{copy.saved}</span> : null}
          {errorMsg ? <span className="text-sm text-red-600">{errorMsg}</span> : null}
        </div>
      </form>
    </div>
  );
}
