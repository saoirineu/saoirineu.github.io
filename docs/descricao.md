# Descrição do site (PT-BR)

Este é um site em Português.

Disponibiliza toda sistematização
sobre o que é o Santo Daime:
A Religião,
As Igrejas,
As instituições,
Os Daimistas,
Os textos,
A Bebida,
Os Hinos os Hinários.

Esta sistematização é feita em OWL e SKOS.

## Organização em Pods de IA

Os princípios, responsabilidades e fluxo completo dos pods vivem em `docs/pods.md`. Cada pod é independente, atua apenas em seus diretórios e escolhe a stack por funcionalidade desde que mantenha simplicidade e use tecnologias consolidadas.

Um daimista é um conceito amplo e pode querer dizer:
membro sócio ativo,
um padrinho,
um fardado,
uma pessoa que só tomou uma vez só?
um ayahuasqueiro?

A bebida tem classificação básica de

0)
grau ou graus (primeiro grau, segundo grau... até nono grau)
concentração (5x1, 3x1, 1)

1)
ano
localidade

2)
plantas:
rainha:
    amazonica
    mata atlantica
    rainha tem várias?

jagube:
    com nó grande, forte e dá mal estar, demora p crescer, detona construção
    o outro sem nó grande e que cresce mais rápido
    tem mais 3 ao menos jagube

3)
quantidade,
recipiente de armazenamento
localidade de armazenamento
condições de armazentamento

4)
responsável, proprietario, falar com, etc
feitores, feitores responsáveis, feitor responsável

5)
destinação de uso:
    igreja/s
    data, ambito de data

6)
análise química
cor
viscosidade
gosto
cheiro

os hinos podem ser classificados em:
assemico / assemântico
    tema:
        sonoridade, sílabas
        rítmo, melodia, harmonia
semico (oposto de assemâmtico)
    tema:
        teísta
            monoteísta
                tríade
                uníade
                díade
                semi-politeíspta
            politeísta
        natureza
        entidades:
            Deus/es ( teísta )
            demideuses
            avatares
            espíritos
                iluminados
                    mestres
                        do heiki
                    gurus
            proveniência:
                lugares: paises, regiões, continentes, etc.
                religião: católica (santo), budismo, hinduísmo, orixás, umbanda, kardecismo

## Fonte de verdade e convenções

- **Este arquivo** define escopo e termos centrais.
- As definições formais vivem em:
  - `ontologia/` (OWL)
  - `vocabulario/` (SKOS)
  - `docs/` (decisões, guias e contratos internos)

**Consistência de diretórios:** use nomes em português (ex.: `ontologia/`, `vocabulario/`). Se existir legado em inglês (`ontology/`, `vocab/`), manter mapeamento claro (ex.: README, links, ou redirecionamento), mas a convenção “oficial” do projeto deve ser PT.

**Termos técnicos e UI:** este documento é para uso interno no desenvolvimento do software. Na interface para o usuário, as definições devem estar sempre acessíveis (ex.: tooltips/ajuda, e.g. via `rdfs:comment`, `skos:definition`, `skos:scopeNote` e propriedades equivalentes).

**Princípio:** tudo que virar página deve existir como *entidade* ou *conceito* (OWL/SKOS), com rótulos e descrições.

## Conceitos nucleares a modelar

### 1) “Daimista” (conceito amplo)

Um daimista é um conceito amplo e pode querer dizer:
membro sócio ativo,
um padrinho,
um fardado,
uma pessoa que só tomou uma vez só?
um ayahuasqueiro?

---

## 2) Bebida (classificação inicial)

A bebida tem classificação básica de

0)
grau ou graus (primeiro grau, segundo grau... até nono grau)
concentração (5x1, 3x1, 1)

1)
ano
localidade

2)
plantas / insumos:
- Rainha (ex.: variedades por bioma/região — “amazônica”, “mata atlântica”, etc.)
- Jagube:
  - variações observadas (ex.: “com nó grande”, “sem nó grande”, etc.)
  - nota: podem existir múltiplas variedades (mapear ao menos as conhecidas)
- Observação de escopo: em geral, no Santo Daime, a princípio considera-se Rainha, Jagube e água; se houver variações/adições em contextos específicos, modelar explicitamente como exceção/fonte.

3)
quantidade,
recipiente de armazenamento
localidade de armazenamento
condições de armazentamento

4)
responsável, proprietario, falar com, etc
feitores, feitores responsáveis, feitor responsável

5)
destinação de uso:
    igreja/s
    data, ambito de data

6)
análise química
cor
viscosidade
gosto
cheiro

---

## 3) Hinos (classificação inicial)

Os hinos podem ser classificados por **nível semântico** e por **temas**.

### 3.1) Assemêmico / assemântico
- foco em sonoridade / sílabas / vocalizações
- elementos musicais:
  - ritmo
  - melodia
  - harmonia

### 3.2) Sêmico (oposto de assemântico)
Temas possíveis (primeira taxonomia):

- Sem entidade (quando não há referência a entidades/pessoas/seres, apenas estados, qualidades, caminhos, imperativos, imagens, etc.)
- Não-teísta (quando não há teísmo explícito; pode incluir linguagem espiritual/ética sem referência a divindade)
- Teísta
  - monoteísta (ex.: Deus, Allah, etc.)
    - tríade (ex.: Trindade)
    - uníade
    - díade
  - semi-políteísta
  - politeísta
- Natureza
- Entidades
  - Deus(es) (no âmbito teísta)
  - anjos
  - santos
  - semideuses
  - avatares
  - espíritos
    - iluminados
      - mestres
        - (ex.: do reiki)
      - gurus
- Proveniência / referência cultural
  - lugares (países, regiões, continentes, etc.)
  - tradições/religiões (ex.: catolicismo/santos, budismo, hinduísmo, orixás, umbanda, kardecismo)

---

## 4) Objetivo prático do conhecimento (para gerar o site)

O site deve permitir, no mínimo:
- páginas de entidades (igrejas, pessoas/papéis, hinários, hinos, lotes de bebida, plantas, lugares)
- navegação por taxonomias (SKOS) e relações (OWL)
- busca por rótulos, sinônimos e descrições
- trilhas: “do conceito → exemplos → fontes”

E também (produto/funcionalidade):
- **login/autenticação** de usuários
- **perfil do usuário** com atributos e vínculos (exemplos):
  - declarar se é fardado ou não
  - ano de fardamento
  - igreja/centro/ponto associado
  - quem o fardou (quando aplicável)
  - declarar-se membro de uma (ou mais) igreja/centro/ponto e/ou instituição
- **trabalhos (eventos/atividades)**:
  - usuário declarar um trabalho feito ou por fazer (cadastro/agenda)
  - usuário cadastrar-se em um trabalho feito ou por fazer (declarando-se participante)
  - permitir consolidação de participação (ex.: presença confirmada vs intenção)
- **relatórios**:
  - usuário obter relatório final de um ou mais trabalhos, incluindo (quando disponível):
    - igreja(s)/centro(s) participante(s)
    - número de participantes (homens/mulheres/outros campos conforme política de privacidade)
    - local e data
    - Daime utilizado (quantidade e tipo/lote/concentração quando aplicável)

---

## Notas e pendências (a resolver em docs)

Grau é o cozimento: primeiro grau é o primeiro cozimento da panela, segundo grau o segundo cozimento, etc...

- Definir nomenclatura padrão (ex.: “Daime”, "Santo Daime", “Bebida”, “Ayahuasca”, "Iajé", "Huasca").
- Definir o que constitui uma “Igreja” vs “Centro” vs "Terreiro" vs "Ponto" vs “Linha”.
- Definir política de fontes e cuidado com afirmações (histórico, teológico, medicinal): evitar afirmações fortes sem fonte; preferir “segundo X”, “em geral”, “em algumas linhas”, etc.




