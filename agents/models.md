# Modelos por agente

Critério: usar o **modelo mais barato que dá conta** da tarefa. Subir de modelo só quando o erro for caro
(segurança, licença, supply chain, arquitetura). Os IDs são os da família Claude 5.

| Agente | Modelo padrão | Modelo de revisão/escalonamento | Motivo |
|---|---|---|---|
| `frontend-player` | **Sonnet** (`claude-sonnet-5-5`) | Opus para decisão de UX/arquitetura do menu ou do fluxo de sessão | Implementação em JS vanilla com DOM, eventos, teclado e controle. Exige raciocínio de estado (sessão, SRAM, estado, miniatura), mas é trabalho de implementação, não de arquitetura. |
| `api-seguranca` | **Sonnet** | **Opus** em toda revisão de `guard.js`, da CSP, do tratamento de token ou de mudança de protocolo | Fronteira de confiança: bloqueio de rede, origem de `postMessage`, token. Erro aqui vaza credencial ou libera rede externa. Implementar é Sonnet; revisar a fronteira é Opus. |
| `build-vendor` | **Sonnet** | **Opus** para troca de versão do EmulatorJS ou de núcleo (SHA256, licença, supply chain). Haiku para `npm run build` e checagens de arquivo | Script bash/Node com verificação de SHA256 e cópia de árvore. Mudança de vendor altera o que o usuário executa, por isso revisão Opus. |
| `testes-e2e` | **Sonnet** | Haiku para ler log e resumir falha; Opus se a falha for intermitente e envolver timing do emulador | Puppeteer, mock de servidor e asserções sobre canvas/SRAM exigem depuração de código, mas não de arquitetura. |
| `docs-licencas` | **Haiku** (`claude-haiku-5-5`) | **Sonnet** para escrever seção nova (ex.: instalação, plataforma nova); decisão de licença fica com a pessoa | Texto e tabela com fatos já presentes no repo (`THIRD_PARTY.md`, `README.md`). Barato e suficiente para atualizar versões, links e SHAs já verificados. |
| `orquestrador` | **Sonnet** (`claude-sonnet-5-5`) | **Opus** só quando a própria tarefa for decisão de arquitetura que cruza áreas (regra 2, último item) | Roteamento, ordem de fluxo e leitura da prova dos workers são raciocínio curto, mas exigem julgar se a prova cobre o critério de pronto e quando redistribuir. Haiku bastaria para despachar, mas erraria mais nesse julgamento, que é o ponto de falha caro (tarefa dada como pronta sem prova). Sonnet é o custo-benefício: não usa Opus, porque o orquestrador não decide arquitetura, só roteia. |

## Usos de Haiku fora de "docs"

Tarefas mecânicas ou de busca podem rodar em Haiku, independentemente do dono do arquivo:

- localizar onde uma função/constante é usada (`grep`, leitura de arquivos) para o agente dono;
- resumir a saída de `npm run build` ou de `npm test` (sem decidir correção);
- conferir que caminhos citados em docs existem.

## Regra de roteamento

1. **Começa no padrão** do agente.
2. **Sobe para Opus** quando a tarefa toca um destes itens:
   - `src/guard.js`, `src/api.js` (fluxo de token), meta CSP em `src/index.html`;
   - mudança no contrato da Games API (`README.md`, seção "Contrato");
   - troca de versão do EmulatorJS, de núcleo ou de SHA256 em `scripts/fetch-emulatorjs.sh`;
   - decisão de arquitetura que afeta mais de uma área (ex.: adicionar plataforma nova).
3. **Sobe para Sonnet** (de Haiku) quando o texto novo exige julgamento: explicação de comportamento, seção nova,
   correção de contrato descrito de forma ambígua.
4. **Desce para Haiku** quando a tarefa é só mecânica: rodar comando, copiar número já verificado, conferir caminho,
   atualizar link quebrado.
5. **Falhou duas vezes no mesmo modelo** com o mesmo erro: sobe um nível, ou para o escalonamento.
6. **Nunca desce** para Haiku em código de `src/` ou `scripts/`, nem em tarefa de segurança/licença.

## Por que não usar Opus por padrão

Opus cobre arquitetura e revisão difícil. Como a base tem ~5 áreas e a maior parte do trabalho é implementação
localizada (um arquivo ou dois por tarefa), Opus como padrão custaria mais sem ganho proporcional. Sonnet como
padrão e Opus só nas fronteiras de risco mantém o custo baixo onde o erro é barato e sobe onde o erro é caro.

## Revisão

Revisar esta tabela quando: a estrutura de `src/` mudar, o projeto ganhar CI/backend, ou um agente mostrar
retrabalho recorrente (nesse caso, medir antes de trocar de modelo).
