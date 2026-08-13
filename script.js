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

    switch (actionKeyword) {
      
      case "inicio_viagem":
        nextScene = {
          text: "> Tudo escurece. Você pisca e tá no espaço sideral, numa barraca de cachorro-quente iluminada por neon. O atendente é um Vira-Lata Caramelo de óculos escuros. Ele late e te estende um Dogão Cósmico brilhante.",
          visual_url: "https://media.giphy.com/media/3o7aD2saal6qNmGUQQ/giphy.gif",
          options: [
            { text: "1. Comer o dogão cósmico", heal: 30, keyword: "comeu_dogao" },
            { text: "2. Roubar o pote de purê radioativo e sair correndo", damage: 10, addItem: "Purê Radioativo", keyword: "roubou_pure" }
          ]
        };
        break;

      case "roubou_pure":
        nextScene = {
          text: "> VOCÊ ROUBOU O PURÊ! O Vira-Lata Caramelo uiva e aperta um botão vermelho. Sirenes tocam. Três drones policiais em formato de viatura da ROTA aparecem no espaço atirando lasers azuis na sua direção!",
          visual_url: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif",
          options: [
            { text: "1. Jogar o purê radioativo nos drones", damage: 0, removeItem: "Purê Radioativo", keyword: "jogou_pure" },
            { text: "2. Tentar despistar os drones correndo pelas estrelas", damage: 25, keyword: "fuga_espacial" }
          ]
        };
        break;

      case "jogou_pure":
        nextScene = {
          text: "> O purê radioativo acerta o para-brisa da viatura espacial! O drone policial entra em curto-circuito e explode numa nuvem de neon rosa. O impacto te joga para uma fenda no tempo e você cai de cara no asfalto de Nova SP.",
          visual_url: "https://media.giphy.com/media/xT9IgzoVuwqr8MzptO/giphy.gif",
          options: [
            { text: "1. Levantar tonto e procurar sua moto", heal: 0, keyword: "procurar_moto" }
          ]
        };
        break;

      case "procurar_moto":
      case "fuga_espacial":
        nextScene = {
          text: "> Você tá no meio de um viaduto flutuante. Do nada, uma figura amarela cortando giro numa moto de entregas cruza a pista. É uma esponja do mar ciborgue mandando um grau impossível! Ele grita: 'Sobe aí truta, a corporação tá vindo!'",
          visual_url: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzAzZTk2YWQ3ZGFmZTc5YjUzNjVkY2Q4YzUzZjcxYTkxZjA1MWZiZSZlcD12MV9pbnRlcm5hbF9naWZzX3NlYXJjaCZjdD1n/H54T9B2xYvY9QoNpqI/giphy.gif",
          options: [
            { text: "1. Pular na garupa do Bob Esponja Motoqueiro", heal: 20, keyword: "garupa_esponja" },
            { text: "2. Recusar a carona e puxar um fuzil do inventário", damage: 15, keyword: "tiroteio_viaduto" }
          ]
        };
        break;

      case "garupa_esponja":
        nextScene = {
          text: "> Você pula na garupa! A esponja solta a embreagem e a moto empina num grau a 200 km/h. Atrás de vocês, um carro-forte da corporação joga mísseis sônicos no viaduto, estourando o asfalto. Vocês precisam de um atalho!",
          visual_url: "https://media.giphy.com/media/l1Aswx03WbLDf9kYw/giphy.gif",
          options: [
            { text: "1. Gritar pra ele entrar no Beco do Baile Funk", damage: 0, keyword: "entrou_baile" },
            { text: "2. Hackear o outdoor pra ele virar uma rampa", damage: 10, keyword: "rampa_outdoor" }
          ]
        };
        break;

      case "entrou_baile":
        nextScene = {
          text: "> Vocês invadem o beco de moto! O lugar é um paredão de som gigante, um Baile Funk cibernético rolando pesado. Os graves batem tão forte que os mísseis do carro-forte explodem no ar. Um ciborgue gigante te chama pra roda.",
          visual_url: "https://media.giphy.com/media/l41Yh18f5TbiWHE0o/giphy.gif",
          options: [
            { text: "1. Mandar o passinho do romano espacial", heal: 30, keyword: "passinho_romano" },
            { text: "2. Ficar com vergonha e tentar fugir a pé", damage: 20, keyword: "fuga_pe" }
          ]
        };
        break;

      default:
        // Caso Genérico (Se a IA se perder, ela joga um cenário aleatório novo)
        nextScene = {
          text: "> O cenário ao seu redor buga completamente. Códigos verdes caem como chuva (Matrix style). Você vê o Éder gigante no céu rindo de você com a flanela na mão.",
          visual_url: "https://media.giphy.com/media/V83xgGXXFDrJ6/giphy.gif",
          options: [
            { text: "1. Tentar acordar dessa viagem louca", damage: 15, keyword: "inicio_viagem" },
            { text: "2. Aceitar que agora você mora na simulação", heal: 20, keyword: "procurar_moto" }
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
  mediaDisplay.classList.add('hidden');
  sceneImage.src = "";
  typeWriter(storyData.start.text);
});

// Inicializa
typeWriter(storyData.start.text);