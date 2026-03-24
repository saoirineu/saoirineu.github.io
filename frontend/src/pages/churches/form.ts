import type { IgrejaInfo, IgrejaInput, Trabalho } from '../../lib/trabalhos';
import type { UsuarioPerfil } from '../../lib/usuarios';

export type IgrejaFormState = {
  nome: string;
  cidade: string;
  estado: string;
  pais: string;
  linhagem: string;
  observacoes: string;
  lat: string;
  lng: string;
};

export type IgrejaUsageStats = {
  trabalhosLocal: number;
  trabalhosResponsavel: number;
  pessoasAtuais: number;
  pessoasFardamento: number;
};

export const emptyIgrejaUsageStats: IgrejaUsageStats = {
  trabalhosLocal: 0,
  trabalhosResponsavel: 0,
  pessoasAtuais: 0,
  pessoasFardamento: 0
};

export const initialIgrejaForm: IgrejaFormState = {
  nome: '',
  cidade: '',
  estado: '',
  pais: '',
  linhagem: '',
  observacoes: '',
  lat: '',
  lng: ''
};

function incrementUsage(map: Map<string, IgrejaUsageStats>, id: string, field: keyof IgrejaUsageStats) {
  const current = map.get(id) ?? { ...emptyIgrejaUsageStats };
  current[field] += 1;
  map.set(id, current);
}

export function buildIgrejaPayload(form: IgrejaFormState): IgrejaInput {
  const latNum = form.lat.trim() ? Number(form.lat) : undefined;
  const lngNum = form.lng.trim() ? Number(form.lng) : undefined;

  return {
    nome: form.nome.trim(),
    cidade: form.cidade.trim() || undefined,
    estado: form.estado.trim() || undefined,
    pais: form.pais.trim() || undefined,
    linhagem: form.linhagem.trim() || undefined,
    observacoes: form.observacoes.trim() || undefined,
    lat: Number.isFinite(latNum) ? latNum : undefined,
    lng: Number.isFinite(lngNum) ? lngNum : undefined
  };
}

export function prefillIgrejaForm(igreja: IgrejaInfo): IgrejaFormState {
  return {
    nome: igreja.nome ?? '',
    cidade: igreja.cidade ?? '',
    estado: igreja.estado ?? '',
    pais: igreja.pais ?? '',
    linhagem: igreja.linhagem ?? '',
    observacoes: igreja.observacoes ?? '',
    lat: igreja.lat?.toString() ?? '',
    lng: igreja.lng?.toString() ?? ''
  };
}

export function sortIgrejas(igrejas: IgrejaInfo[]) {
  return igrejas.slice().sort((left, right) => left.nome.localeCompare(right.nome));
}

export function buildUsoIgrejasMap(trabalhos: Trabalho[], usuarios: UsuarioPerfil[]) {
  const map = new Map<string, IgrejaUsageStats>();

  trabalhos.forEach(trabalho => {
    if (trabalho.localId) {
      incrementUsage(map, trabalho.localId, 'trabalhosLocal');
    }

    (trabalho.igrejasResponsaveisIds ?? []).forEach(id => {
      incrementUsage(map, id, 'trabalhosResponsavel');
    });
  });

  usuarios.forEach(usuario => {
    if (usuario.igrejaAtualId) {
      incrementUsage(map, usuario.igrejaAtualId, 'pessoasAtuais');
    }

    if (usuario.fardamentoIgrejaId) {
      incrementUsage(map, usuario.fardamentoIgrejaId, 'pessoasFardamento');
    }
  });

  return map;
}