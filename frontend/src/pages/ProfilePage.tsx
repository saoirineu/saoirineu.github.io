import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchChurches } from '../lib/sessions';
import { fetchUser, upsertUser } from '../lib/users';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';
import { buildProfileForm, buildUserPayload, initialProfileForm, type ProfileFormState } from './profile/form';
import {
  ProfilePersonalSection,
  ProfileInitiationSection,
  ProfileChurchesSection,
  ProfileRolesSection,
  type ProfileSectionsCopy
} from './profile/ProfileSections';

const copyByLocale: Record<'pt' | 'en' | 'es' | 'it', {
  title: string;
  intro: string;
  sessionExpired: string;
  saveError: string;
  saving: string;
  save: string;
  saved: string;
  sections: ProfileSectionsCopy;
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
      name: 'Nome', yourName: 'Seu nome', email: 'Email', phone: 'Telefone', optional: 'Opcional', city: 'Cidade', state: 'Estado/UF', country: 'País', avatar: 'Avatar', avatarUrl: 'URL do avatar', useGooglePhoto: 'Usar foto do Google', currentChurchRegistered: 'Igreja atual (cadastrada)', selectPlaceholder: '— Selecionar —', currentChurchText: 'Igreja atual (texto livre)', notRegisteredYet: 'Se não estiver cadastrada', originChurchText: 'Igreja de origem (texto livre)', originChurchPlaceholder: 'Linha ou igreja de onde veio', notes: 'Observações gerais', iAmInitiated: 'Sou fardado(a)', iAmSponsor: 'Sou padrinho/madrinha', initiationDate: 'Data do fardamento', initiationPlace: 'Local do fardamento', initiationPlacePlaceholder: 'Cidade/estado ou igreja', whoInitiatedMe: 'Quem me fardou', whoInitiatedMePlaceholder: 'Nome do padrinho/madrinha', initiationChurchRegistered: 'Igreja onde fui fardado (cadastrada)', initiationChurchText: 'Igreja onde fui fardado (texto livre)', withWhomIWasInitiated: 'Com quem me fardei', withWhomIWasInitiatedPlaceholder: 'Outras pessoas fardadas junto', sponsorChurchesRegistered: 'Igrejas onde sou padrinho/madrinha (cadastradas)', sponsorChurchesText: 'Igrejas onde sou padrinho/madrinha (texto livre)', sponsorChurchesPlaceholder: 'Ex.: nome de igrejas não cadastradas', roles: 'Papéis na doutrina (separar por vírgula)', rolesPlaceholder: 'Ex.: tesoureiro, coordenador, músico oficial, limpeza', rolesHint: 'Use termos livres (ex.: tesoureiro, cozinheira oficial, organização, arrumação, limpeza, músico, músico oficial).'
    }
  },
  en: {
    title: 'Profile', intro: 'User details and initiation information.', sessionExpired: 'Session expired', saveError: 'Error while saving', saving: 'Saving...', save: 'Save profile', saved: 'Saved.', sections: { name: 'Name', yourName: 'Your name', email: 'Email', phone: 'Phone', optional: 'Optional', city: 'City', state: 'State/Region', country: 'Country', avatar: 'Avatar', avatarUrl: 'Avatar URL', useGooglePhoto: 'Use Google photo', currentChurchRegistered: 'Current church (registered)', selectPlaceholder: '— Select —', currentChurchText: 'Current church (free text)', notRegisteredYet: 'If it is not registered yet', originChurchText: 'Origin church (free text)', originChurchPlaceholder: 'Lineage or church you came from', notes: 'General notes', iAmInitiated: 'I am initiated (fardado)', iAmSponsor: 'I am sponsor/godparent', initiationDate: 'Initiation date', initiationPlace: 'Initiation place', initiationPlacePlaceholder: 'City/state or church', whoInitiatedMe: 'Who initiated me', whoInitiatedMePlaceholder: 'Name of sponsor/godparent', initiationChurchRegistered: 'Church where I was initiated (registered)', initiationChurchText: 'Church where I was initiated (free text)', withWhomIWasInitiated: 'With whom I was initiated', withWhomIWasInitiatedPlaceholder: 'Other people initiated together', sponsorChurchesRegistered: 'Churches where I am sponsor/godparent (registered)', sponsorChurchesText: 'Churches where I am sponsor/godparent (free text)', sponsorChurchesPlaceholder: 'Example: churches not yet registered', roles: 'Roles in the doctrine (comma separated)', rolesPlaceholder: 'Example: treasurer, coordinator, official musician, cleaning', rolesHint: 'Use free terms such as treasurer, official cook, organization, setup, cleaning, musician, official musician.' }
  },
  es: {
    title: 'Perfil', intro: 'Datos del usuario e información de fardamento.', sessionExpired: 'Sesión expirada', saveError: 'Error al guardar', saving: 'Guardando...', save: 'Guardar perfil', saved: 'Guardado.', sections: { name: 'Nombre', yourName: 'Su nombre', email: 'Correo electrónico', phone: 'Teléfono', optional: 'Opcional', city: 'Ciudad', state: 'Estado/Provincia', country: 'País', avatar: 'Avatar', avatarUrl: 'URL del avatar', useGooglePhoto: 'Usar foto de Google', currentChurchRegistered: 'Iglesia actual (registrada)', selectPlaceholder: '— Seleccionar —', currentChurchText: 'Iglesia actual (texto libre)', notRegisteredYet: 'Si todavía no está registrada', originChurchText: 'Iglesia de origen (texto libre)', originChurchPlaceholder: 'Línea o iglesia de procedencia', notes: 'Observaciones generales', iAmInitiated: 'Soy fardado(a)', iAmSponsor: 'Soy padrino/madrina', initiationDate: 'Fecha del fardamento', initiationPlace: 'Lugar del fardamento', initiationPlacePlaceholder: 'Ciudad/estado o iglesia', whoInitiatedMe: 'Quién me fardó', whoInitiatedMePlaceholder: 'Nombre del padrino/madrina', initiationChurchRegistered: 'Iglesia donde fui fardado (registrada)', initiationChurchText: 'Iglesia donde fui fardado (texto libre)', withWhomIWasInitiated: 'Con quién me fardé', withWhomIWasInitiatedPlaceholder: 'Otras personas fardadas conmigo', sponsorChurchesRegistered: 'Iglesias donde soy padrino/madrina (registradas)', sponsorChurchesText: 'Iglesias donde soy padrino/madrina (texto libre)', sponsorChurchesPlaceholder: 'Ej.: iglesias no registradas', roles: 'Roles en la doctrina (separados por comas)', rolesPlaceholder: 'Ej.: tesorero, coordinador, músico oficial, limpieza', rolesHint: 'Use términos libres, por ejemplo tesorero, cocinera oficial, organización, arreglo, limpieza, músico, músico oficial.' }
  },
  it: {
    title: 'Profilo', intro: 'Dati utente e informazioni sul fardamento.', sessionExpired: 'Sessione scaduta', saveError: 'Errore durante il salvataggio', saving: 'Salvataggio...', save: 'Salva profilo', saved: 'Salvato.', sections: { name: 'Nome', yourName: 'Il tuo nome', email: 'Email', phone: 'Telefono', optional: 'Facoltativo', city: 'Città', state: 'Stato/Provincia', country: 'Paese', avatar: 'Avatar', avatarUrl: 'URL avatar', useGooglePhoto: 'Usa foto Google', currentChurchRegistered: 'Chiesa attuale (registrata)', selectPlaceholder: '— Seleziona —', currentChurchText: 'Chiesa attuale (testo libero)', notRegisteredYet: 'Se non è ancora registrata', originChurchText: 'Chiesa di origine (testo libero)', originChurchPlaceholder: 'Linea o chiesa di provenienza', notes: 'Osservazioni generali', iAmInitiated: 'Sono fardado/a', iAmSponsor: 'Sono padrino/madrina', initiationDate: 'Data del fardamento', initiationPlace: 'Luogo del fardamento', initiationPlacePlaceholder: 'Città/stato o chiesa', whoInitiatedMe: 'Chi mi ha fardato', whoInitiatedMePlaceholder: 'Nome del padrino/madrina', initiationChurchRegistered: 'Chiesa dove ho ricevuto il fardamento (registrata)', initiationChurchText: 'Chiesa dove ho ricevuto il fardamento (testo libero)', withWhomIWasInitiated: 'Con chi mi sono fardato', withWhomIWasInitiatedPlaceholder: 'Altre persone fardate insieme a me', sponsorChurchesRegistered: 'Chiese dove sono padrino/madrina (registrate)', sponsorChurchesText: 'Chiese dove sono padrino/madrina (testo libero)', sponsorChurchesPlaceholder: 'Es.: chiese non registrate', roles: 'Ruoli nella dottrina (separati da virgola)', rolesPlaceholder: 'Es.: tesoriere, coordinatore, musicista ufficiale, pulizia', rolesHint: 'Usa termini liberi, ad esempio tesoriere, cuoca ufficiale, organizzazione, sistemazione, pulizia, musicista, musicista ufficiale.' }
  }
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { locale } = useSiteLocale();
  const qc = useQueryClient();
  const copy = copyByLocale[locale];

  const [form, setForm] = useState<ProfileFormState>(initialProfileForm);
  const [errorMsg, setErrorMsg] = useState('');

  const churchesQuery = useQuery({ queryKey: ['churches'], queryFn: fetchChurches });
  const profileQuery = useQuery({
    queryKey: ['user', user?.uid],
    queryFn: () => fetchUser(user!.uid),
    enabled: !!user
  });

  useEffect(() => {
    if (!user) return;
    setForm(buildProfileForm(user, profileQuery.data));
  }, [profileQuery.data, user]);

  const setField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(copy.sessionExpired);
      setErrorMsg('');

      return upsertUser(user.uid, buildUserPayload(user, form));
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
        <ProfilePersonalSection
          avatarUrl={avatar}
          copy={copy.sections}
          form={form}
          setField={setField}
          userPhotoURL={user.photoURL}
        />

        <ProfileChurchesSection copy={copy.sections} form={form} churches={churchesQuery.data} setField={setField} />

        <ProfileInitiationSection copy={copy.sections} form={form} churches={churchesQuery.data} setField={setField} />

        <ProfileRolesSection copy={copy.sections} form={form} setField={setField} />

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
