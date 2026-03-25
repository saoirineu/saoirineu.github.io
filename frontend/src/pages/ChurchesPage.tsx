import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createIgreja,
  deleteIgreja,
  fetchIgrejas,
  fetchTrabalhos,
  updateIgreja
} from '../lib/trabalhos';
import { fetchUsuarios } from '../lib/usuarios';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';
import { IgrejaFormSection, IgrejasListSection, type ChurchesCopy } from './churches/ChurchesSections';
import {
  buildIgrejaPayload,
  buildUsoIgrejasMap,
  initialIgrejaForm,
  prefillIgrejaForm,
  sortIgrejas,
  type IgrejaFormState
} from './churches/form';

export default function ChurchesPage() {
  const { user } = useAuth();
  const { locale } = useSiteLocale();
  const qc = useQueryClient();
  const igrejasQuery = useQuery({ queryKey: ['igrejas'], queryFn: fetchIgrejas });
  const trabalhosQuery = useQuery({ queryKey: ['trabalhos'], queryFn: fetchTrabalhos });
  const usuariosQuery = useQuery({ queryKey: ['usuarios'], queryFn: fetchUsuarios });

  const [form, setForm] = useState<IgrejaFormState>(initialIgrejaForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const copyByLocale: Record<'pt' | 'en' | 'es' | 'it', {
    title: string;
    intro: string;
    loginToCreate: string;
    requiredName: string;
    loginToDelete: string;
    confirmDelete: string;
    sections: ChurchesCopy;
  }> = {
    pt: {
      title: 'Igrejas', intro: 'Cadastro simples de casas com localização e linhagem.', loginToCreate: 'Faça login para cadastrar', requiredName: 'Nome é obrigatório', loginToDelete: 'Faça login para excluir', confirmDelete: 'Excluir esta igreja?', sections: { newChurch: 'Nova igreja', formHint: 'Preencha o nome e, se quiser, localização, linhagem e coordenadas (para mapa).', editing: 'Editando', loginToSave: 'Faça login para salvar', name: 'Nome', lineage: 'Linhagem / casa', city: 'Cidade', state: 'Estado', country: 'País', latitude: 'Latitude', longitude: 'Longitude', notes: 'Observações', saveChanges: 'Salvar alterações', createChurch: 'Cadastrar igreja', saving: 'Salvando...', cancelEdit: 'Cancelar edição', saved: 'Salvo.', map: 'Ver no mapa', works: 'Trabalhos', local: 'Local', responsible: 'Responsável', people: 'Pessoas', current: 'Atuais', fardamento: 'Fardamento', edit: 'Editar', deleting: 'Excluindo...', delete: 'Excluir', churchesRegistered: 'Igrejas cadastradas', loading: 'Carregando...', noChurches: 'Nenhuma igreja cadastrada ainda.' }
    },
    en: {
      title: 'Churches', intro: 'Simple church registry with location and lineage.', loginToCreate: 'Sign in to create', requiredName: 'Name is required', loginToDelete: 'Sign in to delete', confirmDelete: 'Delete this church?', sections: { newChurch: 'New church', formHint: 'Fill in the name and, if desired, location, lineage, and coordinates (for maps).', editing: 'Editing', loginToSave: 'Sign in to save', name: 'Name', lineage: 'Lineage / house', city: 'City', state: 'State', country: 'Country', latitude: 'Latitude', longitude: 'Longitude', notes: 'Notes', saveChanges: 'Save changes', createChurch: 'Create church', saving: 'Saving...', cancelEdit: 'Cancel edit', saved: 'Saved.', map: 'View on map', works: 'Works', local: 'Location', responsible: 'Responsible', people: 'People', current: 'Current', fardamento: 'Fardamento', edit: 'Edit', deleting: 'Deleting...', delete: 'Delete', churchesRegistered: 'Registered churches', loading: 'Loading...', noChurches: 'No churches registered yet.' }
    },
    es: {
      title: 'Iglesias', intro: 'Registro simple de casas con ubicación y linaje.', loginToCreate: 'Inicie sesión para registrar', requiredName: 'El nombre es obligatorio', loginToDelete: 'Inicie sesión para eliminar', confirmDelete: '¿Eliminar esta iglesia?', sections: { newChurch: 'Nueva iglesia', formHint: 'Complete el nombre y, si quiere, ubicación, linaje y coordenadas (para el mapa).', editing: 'Editando', loginToSave: 'Inicie sesión para guardar', name: 'Nombre', lineage: 'Linaje / casa', city: 'Ciudad', state: 'Estado', country: 'País', latitude: 'Latitud', longitude: 'Longitud', notes: 'Observaciones', saveChanges: 'Guardar cambios', createChurch: 'Registrar iglesia', saving: 'Guardando...', cancelEdit: 'Cancelar edición', saved: 'Guardado.', map: 'Ver en el mapa', works: 'Trabajos', local: 'Local', responsible: 'Responsable', people: 'Personas', current: 'Actuales', fardamento: 'Fardamento', edit: 'Editar', deleting: 'Eliminando...', delete: 'Eliminar', churchesRegistered: 'Iglesias registradas', loading: 'Cargando...', noChurches: 'Todavía no hay iglesias registradas.' }
    },
    it: {
      title: 'Chiese', intro: 'Registro semplice delle case con posizione e linea.', loginToCreate: 'Accedi per registrare', requiredName: 'Il nome è obbligatorio', loginToDelete: 'Accedi per eliminare', confirmDelete: 'Eliminare questa chiesa?', sections: { newChurch: 'Nuova chiesa', formHint: 'Compila il nome e, se vuoi, posizione, linea e coordinate (per la mappa).', editing: 'Modifica', loginToSave: 'Accedi per salvare', name: 'Nome', lineage: 'Linea / casa', city: 'Città', state: 'Stato', country: 'Paese', latitude: 'Latitudine', longitude: 'Longitudine', notes: 'Osservazioni', saveChanges: 'Salva modifiche', createChurch: 'Registra chiesa', saving: 'Salvataggio...', cancelEdit: 'Annulla modifica', saved: 'Salvato.', map: 'Vedi sulla mappa', works: 'Lavori', local: 'Luogo', responsible: 'Responsabile', people: 'Persone', current: 'Attuali', fardamento: 'Fardamento', edit: 'Modifica', deleting: 'Eliminazione...', delete: 'Elimina', churchesRegistered: 'Chiese registrate', loading: 'Caricamento...', noChurches: 'Nessuna chiesa registrata.' }
    }
  };

  const copy = copyByLocale[locale];

  const setField = <K extends keyof IgrejaFormState>(field: K, value: IgrejaFormState[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(copy.loginToCreate);
      if (!form.nome.trim()) throw new Error(copy.requiredName);

      const payload = buildIgrejaPayload(form);

      if (editingId) {
        return updateIgreja(editingId, payload);
      }

      return createIgreja(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['igrejas'] });
      setForm(initialIgrejaForm);
      setEditingId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error(copy.loginToDelete);
      return deleteIgreja(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['igrejas'] });
      if (editingId) {
        setEditingId(null);
        setForm(initialIgrejaForm);
      }
    }
  });

  const igrejasOrdenadas = useMemo(() => sortIgrejas(igrejasQuery.data ?? []), [igrejasQuery.data]);
  const usoIgrejas = useMemo(
    () => buildUsoIgrejasMap(trabalhosQuery.data ?? [], usuariosQuery.data ?? []),
    [trabalhosQuery.data, usuariosQuery.data]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>
        <p className="text-sm text-slate-600">{copy.intro}</p>
      </div>

      <IgrejaFormSection
        copy={copy.sections}
        editingId={editingId}
        errorMessage={mutation.error?.message}
        form={form}
        isSuccess={mutation.isSuccess}
        mutation={mutation}
        onCancelEdit={() => {
          setEditingId(null);
          setForm(initialIgrejaForm);
        }}
        onSubmit={() => mutation.mutate()}
        setField={setField}
        userPresent={!!user}
      />

      <IgrejasListSection
        copy={copy.sections}
        deleteMutation={deleteMutation}
        igrejas={igrejasOrdenadas}
        isLoading={igrejasQuery.isLoading}
        onDelete={id => {
          if (!window.confirm(copy.confirmDelete)) {
            return;
          }

          deleteMutation.mutate(id);
        }}
        onEdit={igreja => {
          setEditingId(igreja.id);
          setForm(prefillIgrejaForm(igreja));
        }}
        usoIgrejas={usoIgrejas}
      />
    </div>
  );
}
