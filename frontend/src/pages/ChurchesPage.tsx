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
import { IgrejaFormSection, IgrejasListSection } from './churches/ChurchesSections';
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
  const qc = useQueryClient();
  const igrejasQuery = useQuery({ queryKey: ['igrejas'], queryFn: fetchIgrejas });
  const trabalhosQuery = useQuery({ queryKey: ['trabalhos'], queryFn: fetchTrabalhos });
  const usuariosQuery = useQuery({ queryKey: ['usuarios'], queryFn: fetchUsuarios });

  const [form, setForm] = useState<IgrejaFormState>(initialIgrejaForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const setField = <K extends keyof IgrejaFormState>(field: K, value: IgrejaFormState[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Faça login para cadastrar');
      if (!form.nome.trim()) throw new Error('Nome é obrigatório');

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
      if (!user) throw new Error('Faça login para excluir');
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
        <h1 className="text-xl font-semibold text-slate-900">Igrejas</h1>
        <p className="text-sm text-slate-600">Cadastro simples de casas com localização e linhagem.</p>
      </div>

      <IgrejaFormSection
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
        deleteMutation={deleteMutation}
        igrejas={igrejasOrdenadas}
        isLoading={igrejasQuery.isLoading}
        onDelete={id => {
          if (!window.confirm('Excluir esta igreja?')) {
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
