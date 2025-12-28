# Pods de IA

Este documento descreve como organizar o trabalho dos agentes de IA em pods independentes para manter este repositório seguro, simples e escalável.

## Princípios Transversais
- **Simplicidade e minimalismo**: prefira soluções com menos arquivos, linhas e dependências. Refatore para remover redundâncias.
- **Tecnologias consolidadas**: adote frameworks e bibliotecas amplamente usadas e com manutenção ativa. Se precisar fugir desse escopo, registre o motivo em poucas linhas no diretório do pod.
- **Escolha contextual de stack**: cada pod define a stack específica ao iniciar uma funcionalidade, respeitando os princípios acima.
- **Boas práticas herdadas**: siga guias oficiais das tecnologias escolhidas, automatizando lint/tests quando fizer sentido.
- **Documentação enxuta**: registre decisões em anotações curtas (ADR leves) para manter rastreabilidade sem inflar o repo.
- **Isolamento de escopo**: nunca altere arquivos atribuídos a outro pod; negocie mudanças por issues ou pull requests.

## Pods Atuais

### 1. Pod Ontologias e Dados
- Mantém ontologias OWL, vocabulários SKOS e datasets RDF.
- Garante compatibilidade dos dados RDF com o Firebase, fornecendo scripts de sincronização.
- Define convenções (IRI, namespaces, alinhamentos) e prova consistência com testes.
- Trabalha principalmente em `ontologia/`, `vocabularios/` e `dados/`.

### 2. Pod Frontend
- Constrói o frontend 100% client-side (HTML/CSS/JS) para usuários finais.
- Implementa autenticação via Firebase (Google ou Email) e consome dados RDF aprovados pelo pod de dados.
- Renderiza grafos e descrições textuais sincronizadas.
- Mantém o código em `frontend/`, usando frameworks modernos (React, Vue, Svelte, etc.) conforme o contexto.

### 3. Pod Mestre de Git (opcional)
- Revisa PRs, garante que pods não invadam arquivos alheios e executa merges/commits/push.
- Padroniza mensagens de commit, releases e versionamento.
- Atua somente após as validações dos pods responsáveis.

## Fluxo de Trabalho Recomandado
1. Cada pod registra tarefas como issues descrevendo escopo, stack escolhida e diretórios afetados.
2. Entregas relevantes devem incluir um README curto no diretório correspondente, sinalizando dependências e próximos passos.
3. Antes de tocar arquivos de outro pod, solicite mudança por issue e aguarde concordância.
4. O Pod Mestre de Git só integra mudanças após confirmar que os princípios foram seguidos e que não há conflitos de escopo.
