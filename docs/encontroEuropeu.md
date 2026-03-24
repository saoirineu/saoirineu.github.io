## Pagina de iscrizione incontro europeo

Este documento descreve a especificacao funcional da pagina de inscricao para o encontro europeu.

## Regras gerais

- Um visitante deve poder preencher e enviar o formulario sem estar logado no site.
- A pagina deve estar disponivel em portugues, ingles, espanhol e italiano.
- Ao concluir o envio, o sistema deve mostrar uma confirmacao de inscricao.
- A mensagem de confirmacao deve informar que a organizacao aguarda a transferencia do valor para o IBAN informado na pagina.
- A mensagem de confirmacao deve incluir a causale obrigatoria: `donazione per l'incontro europeo`.
- A mensagem de confirmacao deve informar que o comprovante deve ser enviado para WhatsApp `XXX` ou email `YYY`.
- O programa geral do evento e as informacoes de deslocamento serao adicionados depois na mesma pagina ou em area associada.

## Idiomas

- Portugues
- Ingles
- Espanhol
- Italiano

## Dati da compilare

- Nome
- Cognome
- Paese (Nazione)
- Chiesa/Centro di riferimento
- Nome dirigente del centro di riferimento
- fardado: SI/NO
- membro ICEFLU, solo se em dia com as mensalidades: SI/NO
- Novizio (prima volta): SI/NO

## Regra para novizio

- Se a resposta para `Novizio` for `SI`, deve aparecer um link para baixar o consenso informato.
- O consenso informato deve estar disponivel em inglese, spagnolo, portoghese e italiano.
- Depois de preencher e assinar, o visitante deve fazer upload do documento assinado.

PDFs placeholder criados por enquanto:

- `/encontro-europeu/consenso-informado-pt.pdf`
- `/encontro-europeu/consenso-informado-en.pdf`
- `/encontro-europeu/consenso-informado-es.pdf`
- `/encontro-europeu/consenso-informado-it.pdf`

## Modalidade di partecipazione

Menu a tendina com estas opcoes:

- vitto e alloggio
- solo vitto
- solo lavori spirituali

## Datas de permanencia

Se a modalidade for `vitto e alloggio` ou `solo vitto`, mostrar:

- data check-in
- data check-out

## Lavori spirituali

Em qualquer modalidade, o visitante pode selecionar um ou mais trabalhos espirituais:

- venerdi 11 settembre ore 19:00
- sabato 12 settembre ore 19:00
- lunedi 14 settembre ore 11:00
- martedi 15 settembre ore 19:00

Observacao: mais adiante ainda sera descrito quais trabalhos sao esses.

## Calcolo contributo

Hospedagem:

- 70 euro por noite

Lavori spirituali:

- 1 lavoro: 100 euro, ou 80 euro para membro ICEFLU
- 2 lavori: 180 euro, ou 150 euro para membro ICEFLU
- 3 lavori: 240 euro, ou 210 euro para membro ICEFLU
- 4 lavori: 300 euro, ou 260 euro para membro ICEFLU

## Documenti da caricare

- copia carta identita
- contabile bonifico pagamento
- eventuale consenso informato firmato

## Alloggio e extras

- L'alloggio inclui apenas 1 lenzuolo no leito.
- Deve existir uma opcao para pedir segundo lenzuolo di sopra e asciugamani.
- Esse adicional custa 20 euro no total, para todo o periodo de permanencia.

## Campo facoltativo

- Deixar um campo opcional para indicar numero di camera, em funcao da mapa.

## PDFs placeholder adicionais

Programa geral do evento:

- `/encontro-europeu/programa-geral-pt.pdf`
- `/encontro-europeu/programa-geral-en.pdf`
- `/encontro-europeu/programa-geral-es.pdf`
- `/encontro-europeu/programa-geral-it.pdf`

Como chegar:

- `/encontro-europeu/como-chegar-pt.pdf`
- `/encontro-europeu/como-chegar-en.pdf`
- `/encontro-europeu/como-chegar-es.pdf`
- `/encontro-europeu/como-chegar-it.pdf`

Todos esses PDFs estao em branco por enquanto e servem apenas como placeholders de download ate a versao final do conteudo.

## Mensagem apos invio

Depois do envio bem-sucedido, mostrar uma mensagem com pelo menos estas informacoes:

- inscricao recebida com sucesso
- valor calculado da contribuicao
- IBAN para transferencia
- causale: `donazione per l'incontro europeo`
- enviar comprovante para WhatsApp `XXX` ou email `YYY`

## Pendencias de conteudo

- Inserir o IBAN real.
- Inserir o numero real de WhatsApp.
- Inserir o email real.
- Adicionar o programa geral do evento.
- Adicionar informacoes uteis sobre como chegar ao local.