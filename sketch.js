/**
 * PBL 專題：臺灣鳥類生態大解密 - 上方單題拖曳配對與錯題重考版
 * 技術：p5.js 上方單題大卡片、圖片拖曳吸附、答錯不收回、錯題集輪迴機制、Web Audio 音效[cite: 1, 2]
 */

const STYLE = {
  bg: "#F4F6F0",
  primary: "#2E7D32",
  accent: "#FBC02D",
  cardBg: "#FFFFFF",
  cardBorder: "#A5D6A7",
  lineOk: "#4CAF50",
  lineBad: "#D32F2F",
  text: "#1B5E20"
};

const ALL_PAIRS = [
  { id: 1, name: "臺灣藍鵲", feature: "保育類特有種，擁有絢麗長藍尾羽與強烈護巢習性", imgUrl: "media/bird1.jpg" },
  { id: 2, name: "五色鳥", feature: "頭頂五彩羽毛，常在樹幹敲擊喙部發出規律木魚聲", imgUrl: "media/bird2.jpg" },
  { id: 3, name: "綠繡眼", feature: "體型小巧，眼周有標誌性白色眼圈，叫聲急促清脆", imgUrl: "media/bird3.jpg" },
  { id: 4, name: "黑面琵鷺", feature: "冬候鳥，擁有扁平如琵鷺匙狀的黑色嘴喙在水中掃食", imgUrl: "media/bird4.jpg" }
];

let birdImages = {};
let imageCards = [];       // 下方選項圖片卡
let questionQueue = [];     // 當前輪次的題目佇列
let wrongQueue = [];        // 答錯題目紀錄
let currentQIndex = 0;      // 當前題目索引
let currentQuestion = null; // 當前題目物件
let targetQuestionCard = null; // 上方大題目卡座標尺寸

let draggingCard = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let isSnapLocked = false;   // 答對吸附鎖定狀態
let snapCard = null;        // 當前吸附在上方大卡的圖片

let gameState = "START";
let startTime = 0;
let endTime = 0;
let audioCtx = null;

// 預載圖片[cite: 1, 2]
function preload() {
  ALL_PAIRS.forEach(item => {
    birdImages[item.id] = loadImage(
      item.imgUrl,
      img => console.log(`已成功載入: ${item.name}`),
      err => console.error(`載入失敗: ${item.imgUrl}`, err)
    );
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("sans-serif");
  textWrap(CHAR);
  initGame();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  recalculatePositions();
}

// 遊戲全新開局[cite: 1, 2]
function initGame() {
  draggingCard = null;
  isSnapLocked = false;
  snapCard = null;
  wrongQueue = [];
  
  // 建立題目佇列並打亂順序[cite: 1, 2]
  questionQueue = [...ALL_PAIRS].sort(() => Math.random() - 0.5);
  currentQIndex = 0;
  currentQuestion = questionQueue[currentQIndex];

  // 建立下方 4 張圖片卡（預設全部顯示且未消除）[cite: 1, 2]
  imageCards = ALL_PAIRS.map(item => ({
    id: item.id,
    name: item.name,
    cleared: false, // 答對後變為 true 並消失
    x: 0, y: 0, origX: 0, origY: 0, w: 0, h: 0
  }));

  recalculatePositions();
}

// 重新計算畫面佈局[cite: 1, 2]
function recalculatePositions() {
  // 1. 上方大題目卡（比下方圖片卡更大）[cite: 1, 2]
  let qW = min(width * 0.75, 700);
  let qH = min(height * 0.28, 180);
  targetQuestionCard = {
    x: (width - qW) / 2,
    y: height * 0.12,
    w: qW,
    h: qH
  };

  // 2. 下方 4 張圖片選項卡均勻橫向分佈[cite: 1, 2]
  let totalCards = imageCards.length;
  let cardW = min(width * 0.2, 160);
  let cardH = min(height * 0.22, 150);
  let gap = (width - (cardW * totalCards)) / (totalCards + 1);
  let startY = height * 0.65;

  imageCards.forEach((card, idx) => {
    card.origX = gap + idx * (cardW + gap);
    card.origY = startY;
    
    if (!draggingCard || draggingCard.id !== card.id) {
      if (!isSnapLocked || snapCard?.id !== card.id) {
        card.x = card.origX;
        card.y = card.origY;
      }
    }
    card.w = cardW;
    card.h = cardH;
  });
}

function draw() {
  background(STYLE.bg);

  if (gameState === "START") {
    drawStartScreen();
  } else if (gameState === "PLAY") {
    drawPlayScreen();
  } else if (gameState === "WIN") {
    drawWinScreen();
  }
}

// F1: 開始畫面[cite: 1, 2]
function drawStartScreen() {
  let boxW = min(width * 0.8, 600);
  let boxH = min(height * 0.8, 500);

  fill(STYLE.cardBg);
  stroke(STYLE.primary);
  strokeWeight(2);
  rect((width - boxW) / 2, (height - boxH) / 2, boxW, boxH, 16);

  noStroke();
  fill(STYLE.primary);
  textAlign(CENTER, TOP);
  textSize(min(width * 0.03, 28));
  textStyle(BOLD);
  text("臺灣鳥類生態大解密", width / 2, (height - boxH) / 2 + 40);
  textSize(min(width * 0.022, 22));
  text("【單題式圖片拖曳大挑戰】", width / 2, (height - boxH) / 2 + 85);

  textSize(min(width * 0.018, 16));
  fill(STYLE.text);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  let ruleText = "遊戲規則：\n觀察【上方大題目】的鳥類生態特徵說明，\n將下方正確的【鳥類圖片】拖曳至上方題目卡上！\n答對圖片將會消除，答錯圖片留存並會在最後重新複習錯題！";
  text(ruleText, width / 2 - boxW * 0.4, (height - boxH) / 2 + 130, boxW * 0.8, boxH * 0.4);

  drawButton(width / 2 - 100, (height - boxH) / 2 + boxH - 80, 200, 50, "開始挑戰", STYLE.primary, () => {
    initAudio();
    gameState = "PLAY";
    startTime = millis();
  });
}

// F2, F3, F4: 主舞台（單題模式）[cite: 1, 2]
function drawPlayScreen() {
  // 頁眉資訊[cite: 1, 2]
  fill(STYLE.text);
  noStroke();
  textSize(min(width * 0.02, 20));
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  let roundTitle = wrongQueue.length > 0 && currentQIndex === 0 ? "【錯題複習輪迴】" : "【生態特徵解密】";
  text(`${roundTitle} 第 ${currentQIndex + 1} / ${questionQueue.length} 題`, width / 2, height * 0.04);

  // 1. 繪製上方大題目卡 (尺寸較大)[cite: 1, 2]
  stroke(STYLE.primary);
  strokeWeight(3);
  fill(STYLE.cardBg);
  rect(targetQuestionCard.x, targetQuestionCard.y, targetQuestionCard.w, targetQuestionCard.h, 16);

  fill(STYLE.text);
  noStroke();
  textSize(min(width * 0.022, 18));
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  // 文字置中於大題目卡[cite: 1, 2]
  text(currentQuestion.feature, targetQuestionCard.x + 30, targetQuestionCard.y + 20, targetQuestionCard.w - 60, targetQuestionCard.h - 40);

  // 2. 繪製下方圖片選項卡 (未消除者)[cite: 1, 2]
  imageCards.forEach(card => {
    if (!card.cleared && card !== draggingCard && card !== snapCard) {
      drawOptionCard(card);
    }
  });

  // 3. 繪製吸附在上方的圖片卡 (答對時過場)[cite: 1, 2]
  if (snapCard) {
    drawOptionCard(snapCard);
  }

  // 4. 繪製最上層被拖曳的圖片卡[cite: 1, 2]
  if (draggingCard) {
    drawOptionCard(draggingCard);
  }
}

// 繪製下方選項圖片卡[cite: 1, 2]
function drawOptionCard(card) {
  push();
  if (card === draggingCard) {
    drawingContext.shadowOffsetX = 6;
    drawingContext.shadowOffsetY = 6;
    drawingContext.shadowBlur = 12;
    drawingContext.shadowColor = 'rgba(0, 0, 0, 0.25)';
  }

  stroke(isSnapLocked && card === snapCard ? STYLE.lineOk : STYLE.cardBorder);
  strokeWeight(isSnapLocked && card === snapCard ? 4 : 2);
  fill(STYLE.cardBg);
  rect(card.x, card.y, card.w, card.h, 12);

  let imgH = card.h * 0.65;
  let imgW = card.w * 0.85;
  if (birdImages[card.id]) {
    image(birdImages[card.id], card.x + (card.w - imgW) / 2, card.y + 10, imgW, imgH);
  }

  fill(STYLE.text);
  noStroke();
  textSize(min(width * 0.016, 14));
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(card.name, card.x + card.w / 2, card.y + card.h - 18);
  pop();
}

// 進入下一題或下一輪[cite: 1, 2]
function nextQuestion() {
  isSnapLocked = false;
  snapCard = null;

  currentQIndex++;

  if (currentQIndex < questionQueue.length) {
    currentQuestion = questionQueue[currentQIndex];
  } else {
    // 當前輪次結束，檢查是否有錯題需要重考[cite: 1, 2]
    if (wrongQueue.length > 0) {
      questionQueue = [...wrongQueue];
      wrongQueue = [];
      currentQIndex = 0;
      currentQuestion = questionQueue[currentQIndex];
    } else {
      // 全部答對通關！[cite: 1, 2]
      endTime = millis();
      gameState = "WIN";
    }
  }
}

// F5: 成績頁[cite: 1, 2]
function drawWinScreen() {
  let boxW = min(width * 0.8, 680);
  let boxH = min(height * 0.85, 540);

  fill(STYLE.cardBg);
  stroke(STYLE.primary);
  strokeWeight(2);
  rect((width - boxW) / 2, (height - boxH) / 2, boxW, boxH, 16);

  let totalSec = Math.round((endTime - startTime) / 1000);

  noStroke();
  fill(STYLE.primary);
  textAlign(CENTER, TOP);
  textSize(min(width * 0.025, 24));
  textStyle(BOLD);
  text("🎉 恭喜完全通關！成為鳥類生態大師", width / 2, (height - boxH) / 2 + 30);

  textSize(min(width * 0.018, 16));
  fill(STYLE.text);
  text(`總挑戰時間：${totalSec} 秒 | 生態圖鑑已完全解鎖！`, width / 2, (height - boxH) / 2 + 75);

  ALL_PAIRS.forEach((item, idx) => {
    let my = (height - boxH) / 2 + 120 + idx * (boxH * 0.14);
    fill(STYLE.bg);
    rect((width - boxW) / 2 + 30, my, boxW - 60, boxH * 0.12, 8);

    let imgSize = boxH * 0.09;
    if (birdImages[item.id]) {
      image(birdImages[item.id], (width - boxW) / 2 + 40, my + (boxH * 0.12 - imgSize) / 2, imgSize, imgSize);
    }
    
    fill(STYLE.primary);
    textAlign(LEFT, TOP);
    textSize(min(width * 0.016, 15));
    textStyle(BOLD);
    text(`• ${item.name}`, (width - boxW) / 2 + 45 + imgSize, my + 8);

    fill(STYLE.text);
    textSize(min(width * 0.013, 12));
    textStyle(NORMAL);
    text(item.feature, (width - boxW) / 2 + 45 + imgSize, my + 28, boxW - 120 - imgSize, boxH * 0.06);
  });

  drawButton(width / 2 - 90, (height - boxH) / 2 + boxH - 65, 180, 45, "再挑戰一次", STYLE.primary, () => {
    initGame();
    gameState = "PLAY";
    startTime = millis();
  });
}

// 點擊抓取圖片[cite: 1, 2]
function mousePressed() {
  if (gameState === "PLAY" && !isSnapLocked) {
    imageCards.forEach(card => {
      if (!card.cleared) {
        if (mouseX >= card.x && mouseX <= card.x + card.w &&
            mouseY >= card.y && mouseY <= card.y + card.h) {
          draggingCard = card;
          dragOffsetX = mouseX - card.x;
          dragOffsetY = mouseY - card.y;
        }
      }
    });
  }
}

// 滑鼠拖曳圖片移動[cite: 1, 2]
function mouseDragged() {
  if (gameState === "PLAY" && draggingCard && !isSnapLocked) {
    draggingCard.x = mouseX - dragOffsetX;
    draggingCard.y = mouseY - dragOffsetY;
  }
}

// 放開滑鼠進行判定[cite: 1, 2]
function mouseReleased() {
  if (gameState === "PLAY" && draggingCard && !isSnapLocked) {
    let tCard = targetQuestionCard;

    // 碰撞檢測：圖片是否拖放到上方大題目卡上[cite: 1, 2]
    if (draggingCard.x < tCard.x + tCard.w &&
        draggingCard.x + draggingCard.w > tCard.x &&
        draggingCard.y < tCard.y + tCard.h &&
        draggingCard.y + draggingCard.h > tCard.y) {

      if (draggingCard.id === currentQuestion.id) {
        // 【答對了】：圖片吸附在題目卡中央，播放正確音效，然後消除圖片並切換下一題[cite: 1, 2]
        isSnapLocked = true;
        snapCard = draggingCard;
        snapCard.x = tCard.x + (tCard.w - snapCard.w) / 2;
        snapCard.y = tCard.y + (tCard.h - snapCard.h) / 2;
        playFeedbackSound(true);

        setTimeout(() => {
          snapCard.cleared = true; // 下方圖片消除消失[cite: 1, 2]
          nextQuestion();
        }, 800);

      } else {
        // 【答錯了】：播放答錯音效，卡片不收回（彈回原位），記錄錯題並切換下一題[cite: 1, 2]
        playFeedbackSound(false);
        
        // 將該題存入錯題庫（若尚未紀錄）[cite: 1, 2]
        if (!wrongQueue.some(q => q.id === currentQuestion.id)) {
          wrongQueue.push(currentQuestion);
        }

        // 圖片彈回下方原始位置[cite: 1, 2]
        draggingCard.x = draggingCard.origX;
        draggingCard.y = draggingCard.origY;

        setTimeout(() => {
          nextQuestion();
        }, 600);
      }
    } else {
      // 未拖到題目卡上，單純放回原位[cite: 1, 2]
      draggingCard.x = draggingCard.origX;
      draggingCard.y = draggingCard.origY;
    }

    draggingCard = null;
  }
}

function drawButton(x, y, w, h, label, bgCol, onClick) {
  let isHover = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
  fill(isHover ? "#1B5E20" : bgCol);
  stroke("#FFFFFF");
  strokeWeight(1);
  rect(x, y, w, h, 10);

  fill("#FFFFFF");
  noStroke();
  textSize(min(width * 0.018, 16));
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2);

  if (isHover && mouseIsPressed) {
    onClick();
  }
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playFeedbackSound(isCorrect) {
  initAudio();
  if (!audioCtx) return;

  let now = audioCtx.currentTime;
  let osc = audioCtx.createOscillator();
  let gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (isCorrect) {
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } else {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}