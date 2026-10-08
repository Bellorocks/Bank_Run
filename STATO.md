# DEAL DESK — stato del lavoro

Aggiornato al 17 agosto 2026 (chiusura curriculum-M7, contenuto M8-M12 arrivato da un'altra sessione).
Riferimento normativo: `PROMPT_CLAUDE_CODE.md` (il build spec).

**Nota sul ritmo di lavoro:** da qui in avanti il contenuto procede in autonomia, un modulo curriculare
alla volta, senza pause per conferma — su istruzione esplicita dell'utente ("vai avanti finché non
finisce tutto il gioco"). Ogni batch è un `Workflow` autore+verificatore per template, verificato di
nuovo a mano (tsc, test suite intera, spot-check dei template più a rischio) prima di aggiornare
questo file e passare al modulo successivo. Se un batch si interrompe per il limite del pool agenti,
si riprende con `resumeFromRunId` non appena possibile.

```bash
npm test
```

```bash
npm run dev
```

```bash
npm run tauri dev
```

**Ambiente:** node e cargo non sono nel PATH delle shell non interattive. Anteporli:
`$env:Path = "C:\Program Files\nodejs;$env:USERPROFILE\.cargo\bin;$env:Path"`

**Scorciatoia utile:** `http://localhost:5183/?level=M0A-05-ANCORAGGI&seed=42` apre direttamente
un'istanza. Il seed è deterministico, quindi il link riproduce il livello identico.

---

## 1. Dove siamo

**1158 test verdi, `tsc --noEmit` pulito, `cargo check` pulito.**

| Milestone (§12) | Stato |
|---|---|
| **M1 — Fondamenta** | **completa.** Criterio d'uscita verificato nell'app vera: il livello M0-A-05 si gioca da tastiera dal primo tasto a «4/4» |
| **M2 — Grader** | **completa.** Un hardcode col numero giusto viene bocciato col messaggio corretto |
| **M3 — Motore di gioco** | **completa.** Ciclo intero verificato a mano nel browser: gioco → Verifica → DEAL CLOSED con breakdown XP → riprova stesso seed → cheat sheet → export .xlsx, zero errori console. Persistenza SQLite: schema e query (comprese le multi-VALUES di `runs.ts`) verificate offline contro sqlite vero con uno script Python. **Non ancora verificata dentro un vero giro IPC di Tauri.** In più, aggiunto il lock vero di `mouseFreeLocked`: nei livelli SPEEDRUN il mouse è disabilitato hard, non più un interruttore riattivabile (spec §3.3) — 6 test dedicati |
| **M4 — Contenuto** | **144 template a terra** (oltre il minimo spec di 132). M0 (42) + curriculum-M1..M7 (12+12+8+10+10+6+14=72) **verificati da questa sessione** con la pipeline autore+verificatore indipendente (soluzione vera su piu' seed, `gradeLevel(...).passed===true`, controlli avversariali — vedi §2.2 per il dettaglio modulo per modulo). M8 (11/16), M9 (7/8), M10 (5/5), M11 (6/6), M12 (1/6) **sono arrivati da un'altra sessione/utente in parallelo**: compilano, passano `templates.test.ts` (16/16, quindi caricabili, non passabili a vuoto, celle correttamente bloccate/sbloccate), ma **non hanno ancora ricevuto la verifica di fedeltà dedicata** (soluzione vera + controlli avversariali) che gli altri moduli hanno — da fare prima di considerarli definitivi con la stessa fiducia del resto |
| M5 (tutorial), M7 (rifinitura) | non iniziate. M6 (grafica/audio) in corso, su richiesta esplicita dell'utente: stile 8-bit fiabesco, tanta natura, cielo blu |

### Com'è fatto

```
tasto → keySignature → bindings → GridSession → Workbook → HyperFormula
                                       ↓
                                  Grid (React)
```

`GridSession` (`src/game/session.ts`) è il motore di interazione ed è **senza React**: gira in Node,
quindi le scorciatoie si testano senza montare un DOM. La griglia disegna e basta. Se la logica
comincia a filtrare nei componenti, i test che tengono in piedi la fedeltà a Excel smettono di valere.

| Area | File | Test |
|---|---|---|
| Indirizzamento A1 | `src/engine/address.ts` | 15 |
| Formule: tokenizer, parser, AST, riferimenti, ancoraggi, frammenti | `src/engine/formula/*` | 50 |
| Navigazione e selezione | `src/engine/{navigation,selection}.ts` | 100 |
| Workbook (adattatore HyperFormula) | `src/engine/workbook.ts` | 60 |
| Calcolo iterativo | `src/engine/iterative.ts` | 17 |
| Appunti e incolla speciale | `src/engine/clipboard.ts` | 63 |
| Formati numerici Excel | `src/engine/numberFormat.ts` | 118 |
| Keymap: firme, sequenze Alt, binding, cheat sheet | `src/keymap/*` | 110 |
| **Motore di interazione** | `src/game/session.ts` | 67 |
| **Grader** | `src/grader/*` | 28 |
| Geometria e resa della griglia | `src/grid/{geometry,cellDisplay}.ts` | 36 |
| RNG e distribuzioni di dominio | `src/rng/*` | 106 |
| InputRecorder, metriche, XP | `src/input/*` | 46 |
| Export .xlsx | `src/export/toXlsx.ts` | 12 |
| Skill tree (105 nodi) | `src/content/skills.ts` | 5 |
| Registry, authoring, caricatore, template M0-A | `src/content/*`, `src/game/loadLevel.ts` | 16 |
| Markdown dei brief | `src/ui/markdown.ts` | 20+ |
| Persistenza: profilo, streak, mastery, run, errori ricorrenti, impostazioni | `src/persistence/*` | 10 (solo logica pura: `nextStreak`, `rankForXp`) |
| Shell Tauri + schema SQLite §10 | `src-tauri/**` | `cargo check` |

### Senza test automatico

`src/grid/Grid.tsx`, `src/grid/FormulaBar.tsx`, `src/ui/*.tsx` (incluse `Risultato.tsx` e
`CheatSheet.tsx`), `src/game/PlayScreen.tsx`. Sono componenti di presentazione e **non c'è una
testing library installata** (scelta deliberata: nessuna dipendenza fuori dallo stack fisso del §2).
Verificati a mano nell'app: vedi §2.1 sotto per cosa è stato provato davvero e cosa no.

Le query di `src/persistence/{runs,profile,settings}.ts` non hanno test propri: richiedono una
connessione `@tauri-apps/plugin-sql` vera, disponibile solo dentro il runtime Tauri. La logica pura
che contengono (`nextStreak`, `rankForXp`, `xpWithinRank`) è testata; le query SQL in se' no.

---

## 2. Cosa manca (in ordine)

### 2.1 Verificare la persistenza dentro Tauri vero

Tutto il resto di M3 è stato giocato e verificato nel browser (vedi tabella sopra), ma
**`npm run tauri dev` non è mai stato lanciato in questa sessione** — il browser embedded non ha un
runtime Tauri dietro, quindi `@tauri-apps/plugin-sql` fallisce per costruzione (verificato: l'errore
è `Cannot read properties of undefined (reading 'invoke')`, catturato e loggato, la partita
continua). Prima di dichiarare M3 chiusa per davvero va aperta l'app desktop e verificato che:

- le migrazioni girino alla prima apertura e producano `dealdesk.db`
- `recordRun` scriva `level_runs` + `task_results` + `error_log` per una run vera
- **un dettaglio da verificare con attenzione**: in `src/persistence/runs.ts` ho dovuto abbandonare
  `BEGIN`/`COMMIT` perche' ho letto nel sorgente Rust del plugin (`~/.cargo/registry/.../
  tauri-plugin-sql-2.4.0/src/wrapper.rs`) che ogni `Database.execute()` preleva una connessione dal
  pool sqlx e la rilascia subito — niente garantisce che due chiamate consecutive usino la stessa
  connessione, quindi una transazione scritta con statement separati e' un'illusione. Ho comprimuto
  ogni tabella in un solo statement multi-VALUES (sempre atomico su una connessione). Non l'ho potuto
  verificare contro sqlite vero: vale la pena un test manuale con una run che abbia piu' task, per
  controllare che tutte le righe di `task_results` arrivino davvero.
- `touchStreak` e `addXp` persistano fra un riavvio e l'altro dell'app

### 2.2 M4 — i 66 template mancanti

M0 (spec §5) è chiuso per intero: M0-A/B/C/D/E/F, 42 template. **Manca ancora il check-out di
M0-A/M0-B** (spec §5: «3 livelli in modalità BLIND, uno per sotto-modulo più uno misto» — se
superati, M0-A/M0-B risultano completati senza rigiocarli tutti; se uno fallisce, quel
sotto-modulo diventa obbligatorio). Lo schema SQLite (`module_checkout`) è già pronto in
`src-tauri/src/lib.rs`, manca la logica che lo pilota.

**M0-F** (10 template, meccaniche avanzate) è a terra:
01 data table 1-way, 02 data table 2-way, 03 Goal Seek, 04 calcolo iterativo (vero, con
`iterativeCalculation: true` e `requiresCircular`), 05 formattazione condizionale, 06 formati
numerici avanzati (via copia/incolla-solo-formati reale, `Ctrl+Alt+V` poi `T`), 07 raggruppamento,
08 sanity check, 09 funzioni data (EOMONTH/EDATE/YEARFRAC), 10 audit di un modello rotto. Data
Table, Goal Seek, formattazione condizionale e raggruppamento non esistono come feature vere nel
motore (verificato via grep prima di scrivere il contenuto): questi template le insegnano con un
workaround pedagogico coerente, stesso pattern già usato in `m0b/06-named-ranges.ts`. Calcolo
iterativo e formati numerici custom **sono** feature vere e i template le usano per davvero.

Verifica di fedeltà: 04, 06 e 09 hanno ricevuto un test dedicato (soluzione vera applicata su più
seed via `Workbook`/`GridSession` reali, `gradeLevel(...).passed === true` confermato, poi il test
cancellato); anche 02 ha avuto uno stress test mirato (200 seed) sul guard-rail del denominatore
WACC−g. I restanti sei (01, 03, 05, 07, 08, 10) hanno solo uno stress test aggregato leggero (150
seed ciascuno: nessuna eccezione, nessun pass a vuoto) — non una verifica di fedeltà della
soluzione vera. Vale la pena un giro di verifica più approfondito su questi sei prima di
considerarli definitivi.

**Curriculum-M1** (contabilità e i tre prospetti, 12 template) è a terra: 01 schema CEE → 02
riclassificazione (valore aggiunto/MOL, margine di contribuzione) → 03 ratei e risconti (con
`DATE()`, riuso di xl.date-functions) → 04 fondi rischi e TFR (rollforward) → 05 rimanenze (costo
medio ponderato) → 06 capitalizzazione costi di sviluppo → **07 [COMBO] i tre prospetti collegati
con balance check obbligatorio** → 08 D&A schedule per cespite (riusa `consistentRow`) → 09
imposte correnti e differite (DTA) → 10 IFRS 16 (effetto EBITDA) → 11 stock comp e diluizione EPS →
12 minorities e metodo del patrimonio netto. L'ordine non è quello del §12 letto alla lettera
("M0, poi M2, M4, M8"): lo skill tree già scritto in `skills.ts` rende `acc.reclass` (M1) un
prerequisito reale di `qoe.normalization` (M2), quindi si è seguito il grafo di dipendenza concreto
invece della prosa generica. Ogni template dichiara come `prerequisites` gli id dei template-tier
precedenti (01 → 02..06 → 07 → 08..12), non solo la skill: `validateRegistry()` lo controlla.

Verifica di fedeltà: tutti e 12 hanno ricevuto un test dedicato (soluzione vera applicata su
8-12 seed via `Workbook` reale, `gradeLevel(...).passed === true`, più check avversariali —
hardcode, literal al posto del riferimento, segno invertito — bocciati correttamente). Il template
07 (il combo) in più ha una derivazione algebrica per cui il controllo di quadratura è una
tautologia costruita apposta: fa zero per costruzione, non per arrotondamento fortunato,
confermato sia a mano sia su uno scan di 5.000 seed. Durante questa verifica è emerso un bug reale
— non nel template ma in un test throwaway di M1-08: `fillFrom(..., {rows: N})` riempie N righe
TOTALI includendo l'origine (non N righe aggiuntive), un uso scorretto della funzione lasciava fuori
l'ultimo cespite dalla somma. Vale la pena ricordarlo: è un errore facile da ripetere in futuri test
di fedeltà che usano `fillFrom` su un range di più di 2 righe.

**Curriculum-M2** (Quality of Earnings / EBITDA normalizzato, 12 template) è a terra: 01
normalizzazione (la meccanica generale: EBITDA normalizzato = EBITDA riportato + Σ rettifiche, e la
regola del segno) → 02 compenso amministratore fuori mercato → 03 affitti infragruppo → 04 costi
personali del socio → 05 one-off legali e ristrutturazioni (SUMIF su una colonna criterio) → 06
plus/minusvalenze da cessione (primo template con rettifica strutturalmente negativa: un provento
one-off si toglie) → 07 capitalizzazione impropria (il caso speculare di M1-06, qui la
capitalizzazione è scorretta e va tolta) + contributi pubblici non ricorrenti → 08 effetti cambio →
09 run-rate vs pro-forma aspirazionale (con un distrattore — un risparmio "sperato" — che il
giocatore deve riconoscere ed escludere) → 10 LTM e calendarizzazione (FY + H1 corrente − H1
precedente, con verifica a 12 mesi via sottrazione di date) → 11 addback aggressivi (SUMIF su
etichette realistiche da leggere e giudicare) → **12 [COMBO] QoE completa da bilancio sporco a
EBITDA adjusted difendibile**, con uno schedule di rettifiche miste (positive e negative) invece di
una singola rettifica per volta. `qoe.normalization` dipende da `acc.reclass` (M1): l'ordine dei
tier segue il grafo di dipendenza reale dello skill tree, non la sola prosa del §12.

Verifica di fedeltà: tutti e 12 hanno ricevuto un test dedicato (soluzione vera su 8+ seed,
`gradeLevel(...).passed === true`, più controlli avversariali — hardcode, literal al posto del
riferimento, segno invertito, inclusione indebita del distrattore in 09). Questo batch è filato
liscio: 24/24 agenti (autore + verificatore per ognuno dei 12 template) completati senza
interruzioni da limite di sessione, a differenza dei batch M0-F e M1.

**Curriculum-M3** (Capitale circolante e cassa, 8 template) è a terra: 01 cos'è il NWC (definizione
operativa, crediti+rimanenze-debiti, collegata esplicitamente alla ΔCCN di M1-07) → 02 DSO/DIO/DPO
e cash conversion cycle → 03 NWC e FCF (costruisce davvero la ΔNWC che in M1-07 arrivava come dato)
→ 04 capex maintenance vs growth → **05 [COMBO] il peg del NWC** (media 12 mesi su un pattern
stagionale deliberato, aggiustamento prezzo al closing) → 06 factoring come debito mascherato → 07
locked box vs completion accounts → 08 leakage (permesso/non permesso, SUMIF). `nwc.peg` è il combo
pur non essendo l'ultimo nodo del grafo di dipendenza (altri tre skill dipendono da lui) — stesso
schema già visto con `acc.three-statement` in M1.

Verifica di fedeltà: tutti e 8 hanno ricevuto un test dedicato. Il verificatore di M3-05 (il combo)
ha trovato e corretto un bug reale non banale: il generatore calcolava l'aggiustamento di prezzo con
il segno OPPOSTO a quello che tutto il resto del file (commento, prompt, hint, brief) dichiarava
esplicitamente — confermato sbagliando la formula, non il testo, verificando la convenzione standard
delle completion accounts (l'aggiustamento ha lo stesso segno dello scostamento dal peg, non
l'opposto). Il primo tentativo di questo batch si è interrotto quasi subito per il limite di sessione
del pool agenti (solo M3-01 completato); il resume via `resumeFromRunId` ha rieseguito dalla cache il
tier già fatto e completato gli altri 7 template senza ulteriori interruzioni.

**Curriculum-M4** (Bridge EV↔Equity Value, 10 template) è a terra: 01 Net Debt (cosa entra e cosa
no, SUMIF su un elenco misto finanziario/operativo) → 02 debt-like classici (TFR, fondo pensione,
leasing) → 03 debt-like M&A-specific (earn-out, contenziosi, dividendi deliberati, con un
distrattore operativo da escludere) → 04 cash-like (restricted cash, cassa operativa minima) →
**05 [COMBO] il bridge completo** (10-12 poste miste da classificare in tre categorie via SUMIF) →
06 minorities e partecipazioni non consolidate nel bridge → 07 treasury stock method (opzioni) →
08 warrant (stesso TSM, secondo strumento) → 09 convertibili (if-converted test, con `IF` — primo
template del progetto a testare esplicitamente ENTRAMBI i rami di una condizione su seed diversi) →
10 prezzo per azione (chiusura: fully diluted shares e ultimo passo del bridge). `ev.bridge` è il
combo pur non essendo l'ultimo nodo (minorities/options dipendono da lui), stesso schema di M1/M3.

Verifica di fedeltà: tutti e 10 hanno ricevuto un test dedicato, incluso M4-06 (il cui verificatore
si è interrotto per limite di sessione prima di partire: verificato da me direttamente, pulito). Il
verificatore di M4-09 ha confermato empiricamente che sia il ramo in-the-money sia quello
out-of-the-money del test IF vengono davvero generati su un intervallo ampio di seed, non solo
assunti — e ha dimostrato a mano che una clausola di sicurezza nel generatore non scatta mai nella
pratica (difesa corretta, non un bug mascherato). Questo batch si è interrotto due volte per il
limite di sessione (una a metà tier3, una piena su tier4-5): entrambe le volte il resume diretto
con `resumeFromRunId` ha funzionato al primo tentativo, senza bisogno di aspettare.

**Curriculum-M5** (Trading comps, 10 template) è a terra: 01 selezione dei peer (AND + COUNTIF su
due criteri, con la scoperta — verificata due volte con probe diretto — che `COUNTIF` in questo
motore richiede `TRUE()` con le parentesi, non `TRUE` nudo, o restituisce `#NAME?`) → 02 LTM vs NTM
→ 03 calendarizzazione (stessa tecnica di M2-10, riapplicata) → 04 multipli enterprise-based
(EV/EBITDA, EV/EBIT, EV/Sales) → 05 multipli equity-based (EV/(EBITDA−Capex), P/E, P/BV) → 06
mediana vs media (con un outlier deliberato sempre presente) → 07 trattamento outlier
(AVERAGEIF con motivazione dichiarata) → 08 aggiustamenti size/crescita → 09 sconto illiquidità e
premio di controllo → **10 [COMBO] football field** (comp set da 8 società con multipli da
calcolare, mediana, range min-max). `comps.football-field` è l'unico combo finora che coincide
anche con l'ultimo nodo del grafo di dipendenza del modulo (nessun altro skill dipende da lui).

Verifica di fedeltà: tutti e 10 verificati, nessun bug reale trovato in questo batch (il più pulito
finora). Il batch si è interrotto una volta a metà tier5 (limite di sessione); il resume diretto ha
funzionato al primo tentativo.

**Curriculum-M6** (Precedent transactions, 6 template) è a terra: 01 multipli di transazione
(perché sono strutturalmente più alti del trading) → 02 premio di controllo (estratto da un deal
osservato, poi applicato in un esercizio inverso su un nuovo target) → 03 sinergie nel prezzo
(scomposizione del premio in controllo puro + sinergie "regalate") → 04 announced vs completed →
05 aggiustamento per ciclo di mercato → **06 [COMBO] triangolazione** comps/precedenti/DCF. Il DCF
non è ancora stato scritto in questo momento della sequenza di build: il suo valore nel combo è un
dato bloccato diretto, mai derivato — dichiarato esplicitamente, stesso stile delle altre
semplificazioni documentate nel progetto.

Verifica di fedeltà: tutti e 6 verificati, nessun bug reale trovato — batch completato in un solo
giro, senza interruzioni da limite di sessione.

**Curriculum-M7** (DCF, 14 template — il modulo più esteso e matematicamente delicato finora) è a
terra: 01 FCFF vs FCFE → 02 costruzione del FCF da EBITDA → 03 mid-year convention e stub period →
04 CAPM → 05 beta di Hamada (unlevered/relevered) → 06 country risk premium → 07 WACC → 08
struttura finanziaria target vs corrente → 09 Terminal Value (Gordon growth, con guard-rail
esplicito su WACC−g) → 10 exit multiple e cross-check fra i due metodi di TV → 11 capex terminale
normalizzato (richiama M3-04) → 12 NOL e perdite fiscali riportabili → 13 sensitivity WACC×g
(workaround Data Table, come M0F-02) → **14 [COMBO] DCF completo a tre scenari con reconciliation
al valore di mercato**. Verificato con particolare cura vista la delicatezza delle formule
finanziarie (ogni brief includeva la formula esatta, non solo il concetto, apposta per ridurre il
rischio di segni invertiti); il verificatore di M7-14 si è interrotto per limite di sessione prima
di partire — verificato da me direttamente, pulito, incluso il caso con denominatore invertito e
quello con sottrazione invertita in T4, entrambi correttamente bocciati dal grader.

Nel frattempo, **M8 (LBO, 11/16), M9 (M&A, 7/8), M10 (Credito, 5/5 completo), M11 (dati sporchi,
6/6 completo) e M12 (boss, 1/6)** sono arrivati da un'altra sessione in parallelo — non costruiti
né ancora verificati in profondità da questa. Passano tutti `tsc` e `templates.test.ts`; la verifica
di fedeltà dedicata (soluzione vera + avversariali) resta da fare prima di fidarsene quanto del
resto.

Restano per il curriculum: completare M8 (5), M9 (1), M12 (5), poi verificare in profondità
M8-M12, poi il check-out BLIND di M0-A/M0-B. ~11 template mancanti sul minimo spec, più la verifica
approfondita di 30 già scritti.

La pipeline è provata: `defineTemplate` → `instantiate(id, seed)` → `loadInstance` → `gradeLevel`.
`src/content/templates.test.ts` verifica **ogni** template su 4 seed (determinismo, caricabilità,
celle bersaglio sbloccate, non-passabilità a livello vuoto): un template nuovo eredita quelle
garanzie senza scrivere una riga di test. In più, per i template con geometria delicata (righe/colonne
che si spostano, refusi che diventano errori del motore), vale la pena un test manuale dedicato,
scritto e poi cancellato prima di consegnare — è così che si sono trovati due bug reali in questa
sessione (vedi §3).

Ordine consigliato dal §12 era "M0, poi M2, M4, M8" (le aree con più valore per ora spesa) — ma lo
skill tree già scritto rende curriculum-M1 un prerequisito reale di M2 (vedi sopra), quindi l'ordine
seguito è M0 → **M1 (chiuso)** → **M2 (chiuso)** → **M3 (chiuso)** → M4, M8, poi il resto, verificando
di volta in volta i prerequisiti reali in `skills.ts` prima di scegliere il prossimo modulo.

### 2.3 Rifiniture note

- **Font non inclusi.** I `@font-face` in `global.css` sono commentati: senza i `.woff2` in
  `public/fonts/` Vite risponde con index.html e il browser sputa sei warning per caricamento.
  I fallback monospace reggono. Per attivarli, vedi il commento nel file.
- La griglia limita righe e colonne scorribili all'area usata più un margine (`MARGINE_RIGHE`,
  `MARGINE_COLONNE` in `Grid.tsx`). La navigazione da tastiera resta libera fino alla riga
  1.048.576 e la finestra la segue; è la barra di scorrimento a non essere lunga chilometri,
  esattamente come in Excel.

---

## 3. Deviazioni dallo spec, e perché

**HyperFormula non ha l'iterative calculation.** Il §2 gliela attribuisce; la 3.4.0 su un
riferimento circolare restituisce `#CYCLE!` e non ha alcuna opzione. Il §3.1 la dichiara
obbligatoria per gli LBO. Poiché il §2 dice anche «se una scelta crea attrito, risolvi l'attrito —
non cambiare la scelta», è costruita **sopra** il motore in `src/engine/iterative.ts`: solver a
punto fisso Gauss–Seidel su un motore ombra, che parte da zero come fa Excel. Il debt schedule LBO
di test converge in 5 sweep e 35 ms.

**Due `Check` in più** rispetto al §4.1: `mustUseFunction` e `mustNotUseFunction`. Senza, la lezione
«perché non si usa VLOOKUP» del §5 (M0-C) non sarebbe verificabile dal grader.

**Due comandi in più** rispetto a una lettura letterale del §3.1: `edit.confirmAndTabNext/Prev`.
Confermare con Tab e confermare con la freccia destra sembrano lo stesso gesto e non lo sono: Tab
apre la catena che Invio poi chiude riportando il cursore a capo. Mapparli sullo stesso comando fa
perdere il «ritorno a capo», che il §3.1 chiede esplicitamente.

**Convenzione numerica internazionale.** Punto decimale e virgola come separatore di argomenti, come
nell'Excel in inglese che si usa in ufficio. L'interfaccia è italiana e i formati numerici rendono
con i separatori italiani.

**Limite noto, non una scelta:** la build community di SheetJS scrive i formati numerici ma non i
colori di carattere. La disciplina dei colori resta verificabile solo dentro il gioco.

**Niente `BEGIN`/`COMMIT` nella persistenza.** Non e' fedele allo spec ne' ci si discosta da esso
apposta: e' un limite dell'API pubblica di `tauri-plugin-sql` (vedi §2.1). Ogni tabella si scrive con
un solo statement multi-VALUES, che e' atomico da solo; un crollo a meta' fra `level_runs` e
`task_results` resta possibile in teoria ma i totali sono gia' salvati nella riga di `level_runs`,
quindi il dato aggregato non si perde.

**Soglia di carriera dichiarata, non dedotta.** Lo spec elenca la scala `Intern → ... → MD` (§6) ma
non da' i numeri di XP per gradino. `src/persistence/progression.ts` usa 1000 XP a gradino, in una
costante sola e commentata, cosi' il giorno in cui si vorra' una curva diversa il cambiamento e' li'.

**Due bug reali trovati scrivendo M0, che vale la pena ricordare come classe di errore:**
1. Un template (`m0d/01-cinque-errori.ts`) referenziava celle con indirizzi letterali fissi
   dentro formule il cui ORDINE viene rimescolato per seed (`rng.shuffle`): a seconda del seed la
   stessa formula finiva su una riga diversa da quella per cui l'indirizzo era stato scritto,
   puntando a una cella sbagliata. Fix: indirizzi calcolati come funzione della riga reale (`(r) =>
   `=B${r-1}/B${r+1}``), mai un letterale, quando la posizione dipende dal seed.
2. Un secondo template (`m0e/05-righe-colonne.ts`) aveva due esercizi sullo stesso foglio, uno che
   elimina una riga e uno che elimina una colonna: la cella di risposta del secondo si trovava
   "sotto" la riga che il primo elimina, quindi si spostava insieme ai dati e il suo indirizzo
   smetteva di corrispondere a quanto scritto nel prompt. Regola generale per chi scrive livelli con
   inserimento/eliminazione: **eliminare una riga sposta tutto cio' che sta sotto, in OGNI colonna;
   eliminare una colonna sposta tutto cio' che sta a destra, in OGNI riga.** Un esercizio che elimina
   va messo per ultimo nella sua direzione (niente altro sotto/a destra), e la sua cella di risposta
   deve stare sopra/a sinistra dei suoi stessi dati, mai dopo. Entrambi i bug sono stati confermati
   con un test che esegue l'operazione strutturale VERA (`Workbook.removeRows`/`removeCols`), non solo
   `applySolution`: quel tipo di test è l'unico che li avrebbe scoperti.

---

## 4. Convenzioni da rispettare

- righe e colonne **sempre** 0-based; range **sempre** inclusivi su entrambi gli estremi; la
  conversione da e verso A1 avviene solo in `address.ts`
- **HyperFormula possiede il contenuto** (testo, formule, valori, grafo). `Workbook` possiede stili,
  layout, celle bloccate, undo. Non duplicare mai il contenuto
- ogni comando che tocca più di una cella passa da `Workbook.batch(...)`: in Excel un'azione è **un**
  annullamento, e la differenza si sente subito
- navigazione, selezione, formule, appunti e formati sono **puri**: nessun DOM, nessun HyperFormula
- `GridSession` è senza React di proposito: la logica va lì, non nei componenti
- commenti in italiano, terminologia tecnica in inglese
- `tsconfig` ha `strict`, `noUnusedLocals`, `noUnusedParameters`
- un template nuovo è **un file** sotto `src/content/templates/**` con `export default
  defineTemplate({...})` importato da `../../authoring` — **non** da `registry.ts`, o si crea un
  ciclo di import
