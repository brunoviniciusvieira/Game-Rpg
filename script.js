// ==========================================
// 1. ESTADO GLOBAL & MODAL HUD
// ==========================================
let playerState = {
  hp: 100, maxHp: 100, inventory: ["Chave da Moto", "Mochila de Entrega"]
};

const btnHub = document.getElementById('btn-hub');
const modalHub = document.getElementById('hub-modal');
const btnCloseHub = document.getElementById('close-hub');

btnHub.addEventListener('click', () => {
  playClickSound();
  document.getElementById('modal-hp').textContent = `HP: ${playerState.hp} / ${playerState.maxHp}`;
  const invList = document.getElementById('modal-inv-list');
  invList.innerHTML = playerState.inventory.length === 0 
    ? '<li>(Mochila Vazia)</li>' 
    : playerState.inventory.map(i => `<li>[ ${i} ]</li>`).join('');
  modalHub.classList.remove('hidden');
});

btnCloseHub.addEventListener('click', () => {
  playClickSound();
  modalHub.classList.add('hidden');
});

// ==========================================
// 2. ROTEIRO INICIAL FIXO (LAVA-RÁPIDO & ENTREGAS)
// ==========================================
const storyData = {
  start: {
    text: "> Fim de tarde. Você encosta a moto no lava-rápido do Éder depois de um dia exaustivo de entregas. O sol tá baixando e ele tá secando um Opala preto com uma flanela. O cheiro de cera automotiva e asfalto quente domina o ar.\n\n'E aí, truta! Como foram os trampos hoje? Muita corrida?'",
    options: [
      { text: "1. 'Dia osso, Éder. Trânsito travado e cliente reclamando.'", nextState: "papo_entregas" },
      { text: "2. 'Tirei onda! Mandei grau na avenida e entreguei tudo no prazo.'", nextState: "papo_entregas" }
    ]
  },
  papo_entregas: {
    text: "> Éder dá risada e joga a flanela no capô do carro. \n\n'Faz parte do corre das motos, irmão. Mas ó, o dia acabou. Pega isso aqui, acabou de chegar o malote.' \nEle tira um pacote do bolso do moletom.",
    options: [
      { text: "1. Pegar o pacote com o Éder", nextState: "pegar_beck", addItem: "Beck de Colômbia" }
    ]
  },
  pegar_beck: {
    text: "> Você guarda o [Beck de Colômbia] no inventário. O clima tá tranquilo, um rap tocando baixinho numa caixa JBL cheia de graxa. \n\n'E aí, bora acender isso agora pra relaxar a mente?'",
    options: [
      { text: "1. [REQUER: Beck de Colômbia] Oferecer pra ele e acender", nextState: "a_viagem", requiredItem: "Beck de Colômbia", removeItem: "Beck de Colômbia" }
    ]
  },
  a_viagem: {
    text: "> Vocês acendem. A primeira tragada desce pesada. Na segunda, você olha pro Opala e a pintura dele parece estar escorrendo como tinta neon. O teto do lava-rápido some. A realidade quebra como um vidro digital e seu corpo levita...",
    options: [
      { text: "1. Fechar os olhos e deixar a viagem te levar [INICIAR LOUCURA]", nextState: "START_AI_LOOP", keyword: "inicio_viagem" }
    ]
  }
};

// ==========================================
// 3. MOTOR DE ÁUDIO WEB API
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function ensureAudioContext() { if (audioCtx.state === 'suspended') audioCtx.resume(); }

function playTypeSound() {
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = 'square'; osc.frequency.setValueAtTime(400 + Math.random() * 100, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.01, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.02);
}
function playClickSound() {
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = 'triangle'; osc.frequency.setValueAtTime(800, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.05);
}
function playDamageSound() {
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.25);
}
function playHealSound() {
  [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'sine'; const time = audioCtx.currentTime + (i * 0.05);
    osc.frequency.setValueAtTime(freq, time); gain.gain.setValueAtTime(0.05, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(time); osc.stop(time + 0.05);
  });
}

let bgmTimer = null; let isPlayingBgm = false; let currentStep = 0;
const bassPattern = [55.00, 55.00, 65.41, 55.00, 73.42, 55.00, 65.41, 82.41, 55.00, 55.00, 98.00, 55.00, 82.41, 73.42, 65.41, 98.00];

function playBass(freq, time) {
  const osc = audioCtx.createOscillator(); const filter = audioCtx.createBiquadFilter(); const gain = audioCtx.createGain();
  osc.type = 'sawtooth'; osc.frequency.setValueAtTime(freq, time); filter.type = 'lowpass'; filter.frequency.setValueAtTime(800, time); filter.frequency.exponentialRampToValueAtTime(200, time + 0.1);
  gain.gain.setValueAtTime(0.05, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination); osc.start(time); osc.stop(time + 0.1);
}
function scheduleStep() {
  const time = audioCtx.currentTime; playBass(bassPattern[currentStep % 16], time); currentStep++;
}
document.getElementById('bgm-btn').addEventListener('click', (e) => {
  ensureAudioContext();
  if (isPlayingBgm) { clearInterval(bgmTimer); isPlayingBgm = false; e.target.textContent = '♫ BGM: OFF'; } 
  else { currentStep = 0; bgmTimer = setInterval(scheduleStep, 136); isPlayingBgm = true; e.target.textContent = '♫ BGM: ON'; }
});

// ==========================================
// 4. LÓGICA DE INTERFACE & CONTINUIDADE
// ==========================================
const textElement = document.getElementById('story-text');
const optionsElement = document.getElementById('options-container');
const mediaDisplay = document.getElementById('media-display');
const sceneImage = document.getElementById('scene-image');
const glitchEffect = document.getElementById('visual-glitch');

let currentState = 'start';
let isTyping = false;

function typeWriter(text, i = 0, callback = null) {
  if (i === 0) { textElement.textContent = ''; isTyping = true; optionsElement.innerHTML = ''; }
  if (i < text.length) {
    textElement.textContent += text.charAt(i);
    if (text.charAt(i) !== ' ') playTypeSound();
    setTimeout(() => typeWriter(text, i + 1, callback), 15);
  } else {
    isTyping = false;
    if (callback) callback();
    else renderOptions();
  }
}

function renderOptions() {
  const currentStory = storyData[currentState];
  optionsElement.innerHTML = '';

  currentStory.options.forEach(option => {
    const hasRequiredItem = !option.requiredItem || playerState.inventory.includes(option.requiredItem);
    const button = document.createElement('button');
    button.classList.add('option-btn');
    button.textContent = option.text;

    if (!hasRequiredItem) {
      button.disabled = true; button.style.opacity = "0.35"; button.style.cursor = "not-allowed";
    } else {
      button.addEventListener('click', () => makeChoice(option));
    }
    optionsElement.appendChild(button);
  });
}

function makeChoice(option) {
  if (isTyping) return;
  playClickSound();
  ensureAudioContext();

  if (option.damage) { playDamageSound(); playerState.hp = Math.max(0, playerState.hp - option.damage); }
  if (option.heal) { playHealSound(); playerState.hp = Math.min(playerState.maxHp, playerState.hp + option.heal); }
  if (option.addItem) { playHealSound(); playerState.inventory.push(option.addItem); }
  if (option.removeItem) playerState.inventory = playerState.inventory.filter(i => i !== option.removeItem);

  if (playerState.hp <= 0) {
    textElement.textContent = "\n> A VIAGEM FOI DEMAIS PRO SEU CORPO. VOCÊ CAIU DURO NO LAVA-RÁPIDO.\n[ GAME OVER ]";
    optionsElement.innerHTML = '';
    return;
  }

  if (option.nextState === "START_AI_LOOP") {
    // Passa a palavra-chave para a IA manter o contexto!
    generateNextSceneWithAI(option.text, option.keyword);
    return;
  }

  currentState = option.nextState;
  typeWriter(storyData[currentState].text);
}

// ----------------------------------------------------
// MOTOR DE ALUCINAÇÃO CONTÍNUA (CAUSA E EFEITO)
// ----------------------------------------------------
const MAX_BRANCH_CHOICES = 50;
const branchState = { id: null, step: 0 };

const branchData = {
  rebeldes: {
    nome: "Rota Fantasma",
    objetivo: "levar o Núcleo Aurora para os Entregadores Fantasma",
    cor: "#00f3ff",
    cenarios: [
      "Avenida Holográfica", "Túnel da Marginal Quântica", "Favela Neon 404",
      "Viaduto das Antenas", "Ponte do Rio de Dados", "Mercado das Sombras"
    ],
    ameacas: [
      "drones fiscais", "snipers da corporação", "minas de pulso",
      "motoqueiros caçadores", "torres de varredura", "robôs cobradores"
    ],
    aliados: [
      "DJ Cifra", "Mecânica Luva", "Ancião do Beco", "Piloto Fantasma",
      "Rádio-Pombo", "Batedor de Grau"
    ],
    escolhasA: [
      "Acelerar pelo corredor lateral usando fumaça de freio",
      "Pedir cobertura de som pesado no paredão",
      "Cortar caminho por vielas com luz ultravioleta",
      "Ligar o turbo improvisado da moto",
      "Lançar isca térmica para distrair a patrulha",
      "Usar uma rampa de sucata para cruzar o bloqueio"
    ],
    escolhasB: [
      "Negociar passagem com um contato do submundo",
      "Invadir uma oficina e trocar de placa",
      "Desligar os faróis e seguir no escuro",
      "Entrar no fluxo de entregadores autônomos",
      "Subornar um fiscal com peça rara",
      "Esperar o comboio inimigo passar e seguir atrás"
    ]
  },
  corporacao: {
    nome: "Protocolo Vórtice",
    objetivo: "entregar o Núcleo Aurora para a Diretoria Orbital",
    cor: "#ff0055",
    cenarios: [
      "Setor Financeiro da Nova SP", "Anel Elevado da Corp Tower", "Docas Automatizadas",
      "Heliponto de Vidro", "Distrito dos Servidores", "Zona Alfa de Segurança"
    ],
    ameacas: [
      "rebeldes interceptadores", "vírus de tráfego", "drones sabotadores",
      "bloqueios anti-corp", "caçadores de recompensa", "EMP pirata"
    ],
    aliados: [
      "Analista Kira", "Capitão Ferro", "IA Vigia", "Agente Prisma",
      "Unidade VTR-9", "Técnico Rho"
    ],
    escolhasA: [
      "Abrir canal criptografado e pedir escolta blindada",
      "Executar protocolo de alta velocidade no corredor azul",
      "Ativar escudo eletromagnético por 30 segundos",
      "Enviar drone batedor e seguir o mapa seguro",
      "Chamar reforço de viaturas autônomas",
      "Desviar por cima da linha ferroviária suspensa"
    ],
    escolhasB: [
      "Silenciar transmissão e seguir em modo furtivo",
      "Assumir risco e cortar caminho pelo distrito rebelde",
      "Aceitar ajuda de um mercenário não rastreado",
      "Desmontar um bloqueio com explosivo de contenção",
      "Forjar um sinal de comboio oficial",
      "Descer para o nível subterrâneo e pilotar manualmente"
    ]
  }
};

function createVisualFromScene(titulo, subtitulo, cor, progresso) {
  const safeTitle = (titulo || "").replace(/</g, "").replace(/>/g, "");
  const safeSubtitle = (subtitulo || "").replace(/</g, "").replace(/>/g, "");
  const safeProgress = (progresso || "").replace(/</g, "").replace(/>/g, "");
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#080b14"/>
        <stop offset="100%" stop-color="#121b2b"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="675" fill="url(#bg)"/>
    <rect x="42" y="42" width="1116" height="591" rx="20" fill="none" stroke="${cor}" stroke-width="4"/>
    <text x="70" y="130" font-family="Courier New" font-size="54" fill="${cor}" font-weight="bold">${safeTitle}</text>
    <text x="70" y="210" font-family="Courier New" font-size="32" fill="#e0e0e0">${safeSubtitle}</text>
    <text x="70" y="595" font-family="Courier New" font-size="28" fill="${cor}">${safeProgress}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createBranchScene(branchId, step, playerActionText) {
  const branch = branchData[branchId];
  if (!branch) return null;

  if (step > MAX_BRANCH_CHOICES) {
    return {
      text: `> MISSÃO CONCLUÍDA (${MAX_BRANCH_CHOICES}/${MAX_BRANCH_CHOICES})\n\nVocê finalizou o ramo [${branch.nome}] e conseguiu ${branch.objetivo}. A cidade inteira conhece sua rota.`,
      visual_url: createVisualFromScene(branch.nome, "Final de rota alcançado", branch.cor, "Fim da campanha deste ramo"),
      options: [
        { text: "1. Reiniciar nova viagem psicodélica", keyword: "inicio_viagem", heal: 20 }
      ]
    };
  }

  const idx = (step - 1) % branch.cenarios.length;
  const cenario = branch.cenarios[idx];
  const ameaca = branch.ameacas[idx];
  const aliado = branch.aliados[idx];
  const escolhaA = branch.escolhasA[idx];
  const escolhaB = branch.escolhasB[idx];
  const progresso = `${step}/${MAX_BRANCH_CHOICES}`;
  const checkpointText = step % 10 === 0 ? "\n\n[CHECKPOINT] Sua reputação subiu e você recupera fôlego." : "";

  return {
    text: `> [${branch.nome}] Etapa ${progresso}\nApós "${playerActionText}", você entra em ${cenario}. ${aliado} avisa no rádio sobre ${ameaca}. Seu objetivo segue o mesmo: ${branch.objetivo}.${checkpointText}`,
    visual_url: createVisualFromScene(branch.nome, `${cenario} // ameaça: ${ameaca}`, branch.cor, `Progresso da rota: ${progresso}`),
    options: [
      {
        text: `1. ${escolhaA}`,
        keyword: `branch_step|${branchId}|${step + 1}`,
        heal: step % 3 === 0 ? 6 : 2,
        addItem: step % 15 === 0 ? `Patch de Reparo ${step / 15}` : undefined
      },
      {
        text: `2. ${escolhaB}`,
        keyword: `branch_step|${branchId}|${step + 1}`,
        damage: step % 4 === 0 ? 9 : 4,
        addItem: step % 12 === 0 ? `Credencial de Acesso ${step / 12}` : undefined
      }
    ]
  };
}

function generateNextSceneWithAI(playerActionText, actionKeyword) {
  isTyping = true;
  mediaDisplay.classList.remove('hidden');
  glitchEffect.classList.remove('hidden');
  sceneImage.classList.add('hidden');
  
  textElement.textContent = `> A realidade distorce num flash elétrico após você decidir "${playerActionText}"...`;
  optionsElement.innerHTML = '';

  setTimeout(() => {
    glitchEffect.classList.add('hidden');
    
    // BANCO DE DADOS DE CONTINUIDADE (A IA RESPONDENDO AO CONTEXTO)
    let nextScene = {};

    if (typeof actionKeyword === 'string' && actionKeyword.startsWith("branch_step|")) {
      const [, branchId, nextStepRaw] = actionKeyword.split("|");
      const nextStep = Number(nextStepRaw);
      branchState.id = branchId;
      branchState.step = Number.isNaN(nextStep) ? 1 : nextStep;
      nextScene = createBranchScene(branchId, branchState.step, playerActionText);
      renderAIScene(nextScene || {
        text: "> O sinal da rota falhou e a simulação reiniciou.",
        visual_url: createVisualFromScene("Falha de Rota", "Sinal perdido", "#ff0055", "Reiniciando"),
        options: [{ text: "1. Recomeçar viagem", keyword: "inicio_viagem" }]
      });
      return;
    }

    switch (actionKeyword) {
      
      case "inicio_viagem":
        nextScene = {
          text: `> A distorção te joga em Nova SP 2099. Dois sinais aparecem no visor da sua moto:\n\n[RAMO A] Entregadores Fantasma pedem ajuda para derrubar a corporação.\n[RAMO B] Diretoria Orbital oferece grana alta por uma entrega sigilosa.\n\nEscolha um ramo para iniciar uma campanha com ${MAX_BRANCH_CHOICES} escolhas.`,
          visual_url: createVisualFromScene("NOVA SP 2099", "Dois ramos surgem na rede", "#00ff66", `Cada ramo possui ${MAX_BRANCH_CHOICES} escolhas`),
          options: [
            { text: "1. Seguir o sinal dos Entregadores Fantasma [RAMO A]", keyword: "ramo_rebeldes", addItem: "Ping Rebelde" },
            { text: "2. Aceitar contrato da Diretoria Orbital [RAMO B]", keyword: "ramo_corporacao", addItem: "Token Corporativo" }
          ]
        };
        break;

      case "ramo_rebeldes":
        branchState.id = "rebeldes";
        branchState.step = 1;
        nextScene = createBranchScene("rebeldes", 1, playerActionText);
        break;

      case "ramo_corporacao":
        branchState.id = "corporacao";
        branchState.step = 1;
        nextScene = createBranchScene("corporacao", 1, playerActionText);
        break;

      default:
        nextScene = {
          text: "> O cenário bugou por um segundo, mas o sistema de navegação te devolve para a rota principal.",
          visual_url: createVisualFromScene("Sistema Recalibrado", "Rota principal restaurada", "#00ff66", "Continue pilotando"),
          options: [
            { text: "1. Escolher novamente um ramo", keyword: "inicio_viagem" }
          ]
        };
        break;
    }

    renderAIScene(nextScene);
  }, 2500);
}

function renderAIScene(aiData) {
  if (aiData.visual_url) {
    sceneImage.src = aiData.visual_url;
    sceneImage.classList.remove('hidden');
  }

  typeWriter(aiData.text, 0, () => {
    optionsElement.innerHTML = '';
    
    aiData.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.classList.add('option-btn');
      btn.textContent = opt.text;
      
      btn.onclick = () => {
        playClickSound();
        if (opt.damage) { playDamageSound(); playerState.hp -= opt.damage; }
        if (opt.heal) { playHealSound(); playerState.hp = Math.min(playerState.maxHp, playerState.hp + opt.heal); }
        if (opt.addItem) { playHealSound(); playerState.inventory.push(opt.addItem); }
        if (opt.removeItem) playerState.inventory = playerState.inventory.filter(i => i !== opt.removeItem);
        
        if (playerState.hp <= 0) {
          textElement.textContent = "> O delírio foi forte demais. A tela dá tela azul e seu cérebro desliga de vez.\n\nFIM DE JOGO.";
          optionsElement.innerHTML = '';
          return;
        }
        
        // Agora mandamos a keyword invisível pro motor gerar a cena correta!
        generateNextSceneWithAI(opt.text, opt.keyword); 
      };
      optionsElement.appendChild(btn);
    });
  });
}

// Botão de Reset
document.getElementById('restart-btn').addEventListener('click', () => {
  playerState = { hp: 100, maxHp: 100, inventory: ["Chave da Moto", "Mochila de Entrega"] };
  currentState = 'start';
   branchState.id = null;
   branchState.step = 0;
  mediaDisplay.classList.add('hidden');
  sceneImage.src = "";
  typeWriter(storyData.start.text);
});

// Inicializa
typeWriter(storyData.start.text);