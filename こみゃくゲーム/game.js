// --- 設定 ---
// レスポンシブなキャンバスサイズを計算
function getCanvasSize() {
    const isMobile = window.innerWidth < 768;
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isMobile) {
        if (isPortrait) {
            // スマホ縦向き
            const maxWidth = Math.min(window.innerWidth - 40, 400);
            const maxHeight = window.innerHeight - 200;
            return { width: maxWidth, height: Math.min(maxHeight, maxWidth * 1.6) };
        } else {
            // スマホ横向き
            const maxHeight = window.innerHeight - 40;
            const maxWidth = window.innerWidth - 250;
            return { width: Math.min(maxWidth, maxHeight * 0.6), height: maxHeight };
        }
    } else {
        // タブレット・PC
        return { width: 400, height: 650 };
    }
}

let canvasSize = getCanvasSize();
let ENGINE_WIDTH = canvasSize.width;
let ENGINE_HEIGHT = canvasSize.height;

// ミャクミャク画像
const IMG_MYAKU_SRC = 'myakumyaku.png';

// NEXT描画用にあらかじめ画像をロードしておく
const myakuImageObj = new Image();
let imageLoaded = false;
myakuImageObj.onload = () => {
    imageLoaded = true;
    console.log('ミャクミャク画像の読み込み完了');
    // 画像読み込み後に進化の輪を再描画
    drawEvolutionRing();
};
myakuImageObj.onerror = () => {
    console.error('ミャクミャク画像の読み込み失敗:', IMG_MYAKU_SRC);
    imageLoaded = false;
};
myakuImageObj.src = IMG_MYAKU_SRC;

// ベストスコアの取得
function getBestScore() {
    return parseInt(localStorage.getItem('komyakuBestScore') || '0');
}

// ベストスコアの保存
function saveBestScore(score) {
    const currentBest = getBestScore();
    if (score > currentBest) {
        localStorage.setItem('komyakuBestScore', score.toString());
        return true;
    }
    return false;
}

// ベストスコア表示の更新
function updateBestScoreDisplay() {
    const bestScore = getBestScore();
    document.getElementById('best-score').textContent = `BEST: ${bestScore}`;
}

// スコア更新関数
function updateScore(points) {
    score += points;
    document.getElementById('score-display').textContent = score;
    
    // ベストスコアを超えたら即座に更新
    if (score > getBestScore()) {
        updateBestScoreDisplay();
    }
}

// --- 効果音システム ---
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// 合体音（レベルに応じて音程が上がる）
function playMergeSound(level) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // レベルが高いほど高い音
        const baseFreq = 300;
        oscillator.frequency.value = baseFreq + (level * 50);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// 落下音
function playDropSound() {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 150;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// ゲームオーバー音
function playGameOverSound() {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// ミャクミャク完成音（特別な音）
function playSpecialSound() {
    try {
        // 和音を鳴らす
        [523.25, 659.25, 783.99].forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const startTime = audioContext.currentTime + (index * 0.1);
            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.4);
        });
    } catch (e) {
        console.log('Audio not supported');
    }
}

// 進化リスト（2種類追加して難易度アップ）
const FRUITS = [
    { label: '一番小さいこみゃく(赤)', radius: 15, color: '#FF0000' },
    { label: '青', radius: 25, color: '#0000FF' },
    { label: '緑', radius: 35, color: '#00FF00' },
    { label: '黄色', radius: 45, color: '#FFFF00' },
    { label: 'オレンジ', radius: 60, color: '#FFA500' },
    { label: 'ピンク', radius: 70, color: '#FF69B4' },
    { label: '紫', radius: 80, color: '#9370DB' },
    { label: '赤青マーブル', radius: 90, type: 'marble' },
    { label: 'レインボー', radius: 100, type: 'rainbow' },
    { label: 'ミャクミャク', radius: 105, imageSrc: IMG_MYAKU_SRC }
];

const { Engine, Render, Runner, World, Bodies, Body, Events, Composite } = Matter;

const engine = Engine.create();
const world = engine.world;

// デバッグ: 要素の存在確認
const canvasWrapper = document.getElementById('game-canvas-wrapper');
console.log('game-canvas-wrapper element:', canvasWrapper);
if (!canvasWrapper) {
    throw new Error('game-canvas-wrapper要素が見つかりません');
}

const render = Render.create({
    element: canvasWrapper,
    engine: engine,
    options: {
        width: ENGINE_WIDTH,
        height: ENGINE_HEIGHT,
        wireframes: false,
        background: '#ffffff'
    }
});

const wallOptions = { isStatic: true, render: { visible: false } };
const ground = Bodies.rectangle(ENGINE_WIDTH/2, ENGINE_HEIGHT + 30, ENGINE_WIDTH, 60, wallOptions);
const leftWall = Bodies.rectangle(-30, ENGINE_HEIGHT/2, 60, ENGINE_HEIGHT, wallOptions);
const rightWall = Bodies.rectangle(ENGINE_WIDTH + 30, ENGINE_HEIGHT/2, 60, ENGINE_HEIGHT, wallOptions);
World.add(world, [ground, leftWall, rightWall]);

// --- ゲーム状態管理 ---
let currentFruit = null;
let nextFruitLevel = 0;
let isDropping = false;
const spawnY = 60;
let score = 0;
let lastMouseX = ENGINE_WIDTH / 2;
let lastTouchX = ENGINE_WIDTH / 2;
let isGameOver = false;
const gameOverLine = 100;
let gameOverTimer = null;
let gameOverBody = null;
let isPaused = false;

// --- こみゃく生成関数 ---
function createKomyaku(x, y, level, isStatic = false) {
    const fruitDef = FRUITS[level];
    if (!fruitDef) {
        console.error('Invalid fruit level:', level);
        return null;
    }
    
    const radius = fruitDef.radius;
    
    let renderOptions = { visible: false };
    
    // ミャクミャクの場合もカスタム描画を使用
    // Matter.jsの標準描画はOFFにして、afterRenderでカスタム描画

    const body = Bodies.circle(x, y, radius, {
        isStatic: isStatic,
        label: level.toString(),
        restitution: 0.5,
        friction: 0.1,
        render: renderOptions
    });
    
    body.fruitLevel = level;
    body.baseRadius = radius; 
    body.phaseOffset = Math.random() * 100;
    
    return body;
}

// --- 共通描画関数 ---
function drawKomyakuOnCanvas(ctx, x, y, radius, level, angle = 0, scaleX = 1, scaleY = 1) {
    const fruitDef = FRUITS[level];
    if (!fruitDef) return;

    if (fruitDef.imageSrc) {
        // 画像が読み込まれていれば画像を描画
        if (imageLoaded && myakuImageObj.complete) {
            const imgSize = radius * 2;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.scale(scaleX, scaleY);
            try {
                ctx.drawImage(myakuImageObj, -radius, -radius, imgSize, imgSize);
            } catch (e) {
                console.error('Image draw error:', e);
                // 画像描画に失敗したら赤い円を描画
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, 2 * Math.PI);
                ctx.fillStyle = '#E60012';
                ctx.fill();
            }
            ctx.restore();
        } else {
            // 画像がまだ読み込まれていない場合は赤い円
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.scale(scaleX, scaleY);
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, 2 * Math.PI);
            ctx.fillStyle = '#E60012';
            ctx.fill();
            ctx.strokeStyle = '#C5000F';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
        return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scaleX, scaleY);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    
    if (fruitDef.type === 'marble') {
        const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        grad.addColorStop(0, 'red');
        grad.addColorStop(1, 'blue');
        ctx.fillStyle = grad;
    } else if (fruitDef.type === 'rainbow') {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        grad.addColorStop(0, 'red');
        grad.addColorStop(0.2, 'orange');
        grad.addColorStop(0.4, 'yellow');
        grad.addColorStop(0.6, 'green');
        grad.addColorStop(0.8, 'blue');
        grad.addColorStop(1, 'purple');
        ctx.fillStyle = grad;
    } else {
        ctx.fillStyle = fruitDef.color;
    }
    ctx.fill();

    // 目玉の描画
    const eyeOffsetX = radius * 0.35;
    const eyeOffsetY = -radius * 0.2;
    const eyeRadius = radius * 0.38;
    
    ctx.beginPath();
    ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    const pupilOffsetX = eyeOffsetX + eyeRadius * 0.2;
    const pupilOffsetY = eyeOffsetY - eyeRadius * 0.1;
    const pupilRadius = eyeRadius * 0.6;
    
    ctx.beginPath();
    ctx.arc(pupilOffsetX, pupilOffsetY, pupilRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#0000FF';
    ctx.fill();

    ctx.restore();
}

// --- NEXTキャンバスの描画 ---
function drawNextPreview() {
    const nextCanvas = document.getElementById('next-canvas');
    if (!nextCanvas) return;
    
    const nextCtx = nextCanvas.getContext('2d');
    const canvasWidth = nextCanvas.width;
    const canvasHeight = nextCanvas.height;
    
    nextCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    const nextDef = FRUITS[nextFruitLevel];
    let displayRadius = nextDef.radius;
    const maxRadius = Math.min(canvasWidth, canvasHeight) / 2 - 10;
    if (displayRadius > maxRadius) displayRadius = maxRadius;
    
    drawKomyakuOnCanvas(nextCtx, canvasWidth/2, canvasHeight/2, displayRadius, nextFruitLevel);
}

// --- カスタム描画ループ ---
Events.on(render, 'afterRender', function() {
    try {
        const ctx = render.context;
        const time = engine.timing.timestamp;
        const bodies = Composite.allBodies(world);

        // ゲームオーバーラインを描画
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, gameOverLine);
        ctx.lineTo(ENGINE_WIDTH, gameOverLine);
        ctx.stroke();
        ctx.setLineDash([]);



        // 全てのこみゃくを描画
        bodies.forEach(body => {
            if (!body || body.fruitLevel === undefined) return;
            
            const level = body.fruitLevel;
            if (level < 0 || level >= FRUITS.length) return;
            
            const fruitDef = FRUITS[level];
            if (!fruitDef) return;

            // 全てのこみゃくをカスタム描画（ミャクミャクも含む）
            const pulse = Math.sin(time * 0.008 + body.phaseOffset) * 0.04;
            
            drawKomyakuOnCanvas(
                ctx, 
                body.position.x, 
                body.position.y, 
                body.baseRadius, 
                level, 
                body.angle, 
                1 + pulse, 
                1 - pulse
            );
        });
    } catch (error) {
        console.error('Render error:', error);
    }
});

// --- スポーン処理 ---
function spawnCurrentFruit() {
    if (isDropping || isGameOver || isPaused) return;

    const spawnX = lastTouchX || lastMouseX;
    currentFruit = createKomyaku(spawnX, spawnY, nextFruitLevel, true);
    World.add(world, currentFruit);
    
    nextFruitLevel = Math.floor(Math.random() * 3);
    drawNextPreview();
}

// --- 入力処理（マウスとタッチ両対応） ---
function getInputX(clientX) {
    const rect = render.canvas.getBoundingClientRect();
    let x = clientX - rect.left;
    
    if (currentFruit) {
        const limit = currentFruit.circleRadius + 5;
        x = Math.max(limit, Math.min(x, ENGINE_WIDTH - limit));
    }
    
    return x;
}

function handleMove(clientX) {
    if (isGameOver) return;
    
    const x = getInputX(clientX);
    lastMouseX = x;
    lastTouchX = x;
    
    if (currentFruit && !isDropping) {
        Body.setPosition(currentFruit, { x: x, y: spawnY });
    }
}

function handleDrop() {
    if (currentFruit && !isDropping && !isGameOver) {
        isDropping = true;
        Body.setStatic(currentFruit, false);
        currentFruit = null;
        
        // 落下音を再生
        playDropSound();
        
        setTimeout(() => {
            isDropping = false;
            spawnCurrentFruit();
        }, 800);
    }
}

// マウスイベント
const canvasElement = render.canvas;

canvasElement.addEventListener('mousemove', (e) => {
    handleMove(e.clientX);
});

canvasElement.addEventListener('click', () => {
    handleDrop();
});

// タッチイベント
canvasElement.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
    }
}, { passive: false });

canvasElement.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
    }
}, { passive: false });

canvasElement.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleDrop();
}, { passive: false });

// 合体判定
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        
        // 基本チェック
        if (!bodyA || !bodyB) return;
        if (bodyA.fruitLevel === undefined || bodyB.fruitLevel === undefined) return;
        if (bodyA.isStatic || bodyB.isStatic) return;
        if (bodyA.label !== bodyB.label) return;
        
        const level = parseInt(bodyA.label);
        if (isNaN(level) || level < 0 || level >= FRUITS.length) return;
        
        try {
            if (level < FRUITS.length - 1) {
                // 通常の合体
                const newX = (bodyA.position.x + bodyB.position.x) / 2;
                const newY = (bodyA.position.y + bodyB.position.y) / 2;
                const nextLevel = level + 1;
                
                World.remove(world, [bodyA, bodyB]);
                const newBody = createKomyaku(newX, newY, nextLevel, false);
                World.add(world, newBody);
                
                const points = (level + 1) * 10;
                updateScore(points);
                playMergeSound(nextLevel);
                
                // ミャクミャクが完成したら特別な音
                if (nextLevel === FRUITS.length - 1) {
                    setTimeout(() => playSpecialSound(), 100);
                }
            } else {
                // 最大レベル同士の合体（消滅）
                World.remove(world, [bodyA, bodyB]);
                updateScore(1000);
                playSpecialSound();
            }
        } catch (error) {
            console.error('Merge error:', error);
        }
    });
});

// ゲームオーバー判定
Events.on(engine, 'afterUpdate', () => {
    if (isGameOver || isPaused) return;
    
    try {
        const bodies = Composite.allBodies(world);
        let foundOverLine = false;
        
        for (let body of bodies) {
            if (body && body.fruitLevel !== undefined && !body.isStatic) {
                // こみゃくの位置がゲームオーバーラインより上にあり、速度がほぼゼロの場合
                if (body.position && body.position.y - body.circleRadius < gameOverLine &&
                    body.velocity && Math.abs(body.velocity.y) < 0.5 && Math.abs(body.velocity.x) < 0.5) {
                    foundOverLine = true;
                    
                    // 同じボディが1.5秒以上ラインを超えている場合のみゲームオーバー
                    if (!gameOverTimer) {
                        gameOverBody = body;
                        gameOverTimer = setTimeout(() => {
                            if (!isGameOver && !isPaused) {
                                isGameOver = true;
                                
                                // ゲームオーバー音を再生
                                playGameOverSound();
                                
                                // スコアを保存
                                const oldBest = getBestScore();
                                const isNewBest = saveBestScore(score);
                                const newBest = getBestScore();
                                updateBestScoreDisplay();
                                
                                // ゲームオーバー画面を表示
                                const currentScoreElement = document.getElementById('current-score-display');
                                const bestScoreElement = document.getElementById('best-score-result');
                                const newRecordBadge = document.getElementById('new-record-badge');
                                const gameOverElement = document.getElementById('game-over');
                                
                                if (currentScoreElement) {
                                    currentScoreElement.textContent = `スコア: ${score}`;
                                }
                                
                                if (bestScoreElement) {
                                    bestScoreElement.textContent = `ベストスコア: ${newBest}`;
                                }
                                
                                if (newRecordBadge && isNewBest) {
                                    newRecordBadge.style.display = 'inline-block';
                                    // 新記録の特別な音を鳴らす
                                    setTimeout(() => playSpecialSound(), 200);
                                }
                                
                                if (gameOverElement) {
                                    gameOverElement.style.display = 'block';
                                }
                            }
                        }, 1500); // 1.5秒待つ
                    }
                    break;
                }
            }
        }
        
        // ラインを超えているこみゃくがなければタイマーをリセット
        if (!foundOverLine && gameOverTimer) {
            clearTimeout(gameOverTimer);
            gameOverTimer = null;
            gameOverBody = null;
        }
    } catch (error) {
        console.error('Game over check error:', error);
    }
});

// リサイズ対応
window.addEventListener('resize', () => {
    const newSize = getCanvasSize();
    if (newSize.width !== ENGINE_WIDTH || newSize.height !== ENGINE_HEIGHT) {
        location.reload(); // 簡易的にリロード（完全な対応には物理エンジンの再構築が必要）
    }
});

// Xシェア機能
function shareToX(isGameOver = false) {
    const currentScore = score;
    const bestScore = getBestScore();
    
    let text;
    if (isGameOver) {
        if (currentScore === bestScore && currentScore > 0) {
            text = `🎉 こみゃくゲームで新記録達成！\nスコア: ${currentScore}点\n\nあなたも挑戦してみよう！ #こみゃくゲーム`;
        } else {
            text = `こみゃくゲームでスコア ${currentScore}点を記録！\n最高記録: ${bestScore}点\n\nあなたも挑戦してみよう！ #こみゃくゲーム`;
        }
    } else {
        text = `こみゃくゲームをプレイ中！\n現在のスコア: ${currentScore}点\n最高記録: ${bestScore}点\n\nミャクミャクを作って高得点を目指そう！ #こみゃくゲーム`;
    }
    
    const url = window.location.href;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, '_blank', 'width=550,height=420');
}

// 一時停止機能
function togglePause() {
    isPaused = !isPaused;
    const pausePopup = document.getElementById('pause-popup');
    
    if (isPaused) {
        // 一時停止を開始
        pausePopup.style.display = 'flex';
        console.log('Game paused');
    } else {
        // 一時停止を解除
        pausePopup.style.display = 'none';
        console.log('Game resumed');
    }
}

// ボタンイベントの設定関数
function setupButtons() {
    console.log('Setting up buttons...');
    
    // 一時停止ボタン
    const pauseButton = document.getElementById('pause-button');
    console.log('Pause button:', pauseButton);
    if (pauseButton) {
        pauseButton.onclick = () => {
            console.log('Pause button clicked');
            togglePause();
        };
    }

    // 続けるボタン
    const continueButton = document.getElementById('continue-button');
    console.log('Continue button:', continueButton);
    if (continueButton) {
        continueButton.onclick = () => {
            console.log('Continue button clicked');
            togglePause();
        };
    }

    // やり直しボタン（一時停止ポップアップ内）
    const restartButton = document.getElementById('restart-button');
    console.log('Restart button:', restartButton);
    if (restartButton) {
        restartButton.onclick = () => {
            console.log('Restart button clicked');
            if (confirm('本当にやり直しますか？現在のスコアは失われます。')) {
                location.reload();
            }
        };
    }

    // シェアボタン（一時停止ポップアップ内）
    const shareIngameButton = document.getElementById('share-ingame-button');
    console.log('Share in-game button:', shareIngameButton);
    if (shareIngameButton) {
        shareIngameButton.onclick = () => {
            console.log('Share button clicked (pause menu)');
            shareToX(false);
        };
    }

    // リトライボタン（ゲームオーバー画面）
    const retryButton = document.getElementById('retry-button');
    console.log('Retry button:', retryButton);
    if (retryButton) {
        retryButton.onclick = () => {
            console.log('Retry button clicked');
            location.reload();
        };
    }

    // ゲームオーバー画面のシェアボタン
    const shareButton = document.getElementById('share-button');
    console.log('Share button:', shareButton);
    if (shareButton) {
        shareButton.onclick = () => {
            console.log('Share button clicked (game over)');
            shareToX(true);
        };
    }
}


// シンカの輪を描画
function drawEvolutionRing() {
    const ringCanvas = document.getElementById('evolution-ring-canvas');
    if (!ringCanvas) return;
    
    const ctx = ringCanvas.getContext('2d');
    ctx.clearRect(0, 0, ringCanvas.width, ringCanvas.height);
    
    let currentY = 20;
    const centerX = 30;
    
    FRUITS.forEach((fruit, level) => {
        // ミャクミャク（最後）は少し大きく表示
        const isMyakumyaku = level === FRUITS.length - 1;
        const miniRadius = isMyakumyaku ? Math.min(fruit.radius * 0.45, 24) : Math.min(fruit.radius * 0.35, 18);
        
        // スペースチェック
        if (currentY + miniRadius * 2 + 10 > ringCanvas.height) return;
        
        ctx.save();
        ctx.globalAlpha = isMyakumyaku ? 0.95 : 0.85;
        
        // 外枠（白い縁）- ミャクミャクは少し太く
        ctx.beginPath();
        ctx.arc(centerX, currentY, miniRadius + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = isMyakumyaku ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = isMyakumyaku ? 3 : 2;
        ctx.stroke();
        
        // ミニこみゃくを実際のdrawKomyakuOnCanvas関数で描画
        drawKomyakuOnCanvas(ctx, centerX, currentY, miniRadius, level, 0, 1, 1);
        
        ctx.restore();
        
        currentY += miniRadius * 2 + (isMyakumyaku ? 15 : 12);
    });
}

// 初期化
try {
    // ボタンのイベントリスナーを設定
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupButtons);
    } else {
        setupButtons();
    }
    
    updateBestScoreDisplay(); // ベストスコアを表示
    drawEvolutionRing(); // シンカの輪を描画
    nextFruitLevel = Math.floor(Math.random() * 3);
    drawNextPreview();
    spawnCurrentFruit();

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
} catch (error) {
    console.error('Initialization error:', error);
    alert('ゲームの初期化に失敗しました。ページを再読み込みしてください。');
}
