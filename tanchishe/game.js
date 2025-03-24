class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.canvas.width = 600;  // 设置画布宽度
        this.canvas.height = 400; // 设置画布高度
        this.score = 0;
        this.isPlaying = false;
        this.difficulty = 'normal';

        this.difficultySettings = {
            easy: { speed: 200, scoreMultiplier: 0.5, rewardDuration: 5000 },
            normal: { speed: 100, scoreMultiplier: 1, rewardDuration: 5000 },
            hard: { speed: 70, scoreMultiplier: 2, rewardDuration: 3000 },
            hell: { speed: 50, scoreMultiplier: 3, obstacles: true, rewardDuration: 2000 }
        };
        this.obstacles = [];
        
        // 奖励系统相关属性
        this.foodEatenCount = 0;
        this.foodsToReward = this.getRandomFoodsToReward();
        this.reward = null;
        this.rewardActive = false;
        this.rewardTimer = null;
        this.rewardTimeLeft = 0;
        
        // 音频系统相关属性
        this.audioEnabled = true;
        this.backgroundMusic = null;
        this.hellBackgroundMusic = null;
        this.currentBackgroundMusic = null;
        this.eatSound = null;
        this.goodEatSound = null;
        this.goodSound = null;
        this.gameOverSound = null;
        this.lastScoreMilestone = 0;
        
        // 初始化音频
        this.initAudio();
        
        // 初始化蛇的位置和方向
        this.snake = [
            {x: 15, y: 10}, // 蛇头
            {x: 14, y: 10},
            {x: 13, y: 10}
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
        
        // 初始化食物位置
        this.food = this.generateFood();
        
        // 绑定键盘事件
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        document.getElementById('startButton').addEventListener('click', this.startGame.bind(this));
        
        // 添加难度等级映射
        this.difficultyLevels = {
            'easy': 1,
            'normal': 2,
            'hard': 3,
            'hell': 4
        };

        // 添加难度选择按钮事件
        document.querySelectorAll('.difficulty-button').forEach(button => {
            button.addEventListener('click', () => {
                const newDifficulty = button.dataset.difficulty;
                
                // 只在游戏进行中才限制难度切换
                if (this.isPlaying) {
                    const currentLevel = this.difficultyLevels[this.difficulty];
                    const newLevel = this.difficultyLevels[newDifficulty];
                    
                    // 如果尝试选择更简单的难度，强制进入地狱模式
                    if (newLevel < currentLevel) {
                        this.difficulty = 'hell';
                        document.body.classList.add('hell-mode');
                        document.querySelector('.difficulty-button[data-difficulty="hell"]').classList.add('active');
                        // 切换到地狱模式背景音乐
                        if (this.audioEnabled) {
                            this.switchBackgroundMusic('hell');
                        }
                        return;
                    }
                }
                
                this.difficulty = newDifficulty;
                if (this.difficulty === 'hell') {
                    document.body.classList.add('hell-mode');
                    // 切换到地狱模式背景音乐
                    if (this.isPlaying && this.audioEnabled) {
                        this.switchBackgroundMusic('hell');
                    }
                } else {
                    document.body.classList.remove('hell-mode');
                    // 切换到普通背景音乐
                    if (this.isPlaying && this.audioEnabled) {
                        this.switchBackgroundMusic('normal');
                    }
                }

                // 更新按钮状态
                document.querySelectorAll('.difficulty-button').forEach(btn => btn.classList.remove('active'));
                document.querySelector(`.difficulty-button[data-difficulty="${this.difficulty}"]`).classList.add('active');
            });
        });
    }
    
    // 初始化音频系统
    initAudio() {
        // 加载背景音乐
        this.backgroundMusic = new Audio('music/beijing.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.5;
        
        // 加载地狱模式背景音乐
        this.hellBackgroundMusic = new Audio('music/diyubeijing.mp3');
        this.hellBackgroundMusic.loop = true;
        this.hellBackgroundMusic.volume = 0.5;
        
        // 加载音效
        this.eatSound = new Audio('music/eat.mp3');
        this.eatSound.volume = 0.6;
        
        this.goodEatSound = new Audio('music/goodeat.mp3');
        this.goodEatSound.volume = 0.7;
        
        this.goodSound = new Audio('music/good.mp3');
        this.goodSound.volume = 0.7;
        
        this.gameOverSound = new Audio('music/shibai.mp3');
        this.gameOverSound.volume = 0.7;
    }
    
    // 切换背景音乐
    switchBackgroundMusic(mode) {
        // 停止当前播放的背景音乐
        if (this.currentBackgroundMusic) {
            this.currentBackgroundMusic.pause();
            this.currentBackgroundMusic.currentTime = 0;
        }
        
        // 根据模式选择背景音乐
        if (mode === 'hell') {
            this.currentBackgroundMusic = this.hellBackgroundMusic;
        } else {
            this.currentBackgroundMusic = this.backgroundMusic;
        }
        
        // 播放新的背景音乐
        if (this.audioEnabled) {
            this.currentBackgroundMusic.play().catch(e => console.log('音频播放失败:', e));
        }
    }
    
    // 获取随机的奖励食物数量（5-10之间）
    getRandomFoodsToReward() {
        return Math.floor(Math.random() * 6) + 5; // 5到10之间的随机数
    }
    
    // 生成奖励（占用四个格子的奖励球）
    generateReward() {
        const maxX = Math.floor(this.canvas.width / this.gridSize) - 2; // 减2确保奖励球不会超出边界
        const maxY = Math.floor(this.canvas.height / this.gridSize) - 2;
        let rewardCenter;
        
        do {
            rewardCenter = {
                x: Math.floor(Math.random() * maxX) + 1, // 加1确保奖励球不会超出左边界
                y: Math.floor(Math.random() * maxY) + 1  // 加1确保奖励球不会超出上边界
            };
        } while (
            // 检查奖励球的四个格子是否与蛇身、食物或障碍物重叠
            this.snake.some(segment => 
                (Math.abs(segment.x - rewardCenter.x) < 2 && Math.abs(segment.y - rewardCenter.y) < 2)
            ) ||
            (Math.abs(this.food.x - rewardCenter.x) < 2 && Math.abs(this.food.y - rewardCenter.y) < 2) ||
            this.obstacles.some(obs => 
                (Math.abs(obs.x - rewardCenter.x) < 2 && Math.abs(obs.y - rewardCenter.y) < 2)
            )
        );
        
        return rewardCenter;
    }
    
    // 显示奖励信息和倒计时
    showRewardInfo() {
        // 如果奖励面板不存在，则创建
        if (!document.getElementById('rewardPanel')) {
            const rewardPanel = document.createElement('div');
            rewardPanel.id = 'rewardPanel';
            rewardPanel.innerHTML = `
                <div class="reward-info">奖励球！吃掉获得三倍分数！</div>
                <div class="reward-timer-container">
                    <div id="rewardTimer" class="reward-timer"></div>
                </div>
            `;
            document.getElementById('gameContainer').appendChild(rewardPanel);
        } else {
            document.getElementById('rewardPanel').style.display = 'block';
        }
        
        // 更新倒计时进度条
        this.updateRewardTimer();
    }
    
    // 更新奖励倒计时进度条
    updateRewardTimer() {
        const timerElement = document.getElementById('rewardTimer');
        if (timerElement) {
            const percentage = (this.rewardTimeLeft / this.difficultySettings[this.difficulty].rewardDuration) * 100;
            timerElement.style.height = `${percentage}%`;
        }
    }
    
    // 隐藏奖励信息
    hideRewardInfo() {
        const rewardPanel = document.getElementById('rewardPanel');
        if (rewardPanel) {
            rewardPanel.style.display = 'none';
        }
    }
    
    startGame() {
        // 先停止当前游戏循环
        this.isPlaying = false;
        // 等待一小段时间确保之前的游戏循环完全停止
        setTimeout(() => {
            this.snake = [
                {x: 15, y: 10},
                {x: 14, y: 10},
                {x: 13, y: 10}
            ];
            this.direction = 'right';
            this.nextDirection = 'right';
            this.score = 0;
            this.lastScoreMilestone = 0; // 重置分数里程碑
            this.isPlaying = true;
            this.obstacles = [];
            // 重置奖励系统
            this.foodEatenCount = 0;
            this.foodsToReward = this.getRandomFoodsToReward();
            this.reward = null;
            this.rewardActive = false;
            if (this.rewardTimer) {
                clearTimeout(this.rewardTimer);
                this.rewardTimer = null;
            }
            this.hideRewardInfo();
            
            // 播放背景音乐
            if (this.difficulty === 'hell') {
                this.generateObstacles();
                document.body.classList.add('hell-mode');
                this.switchBackgroundMusic('hell');
            } else {
                document.body.classList.remove('hell-mode');
                this.switchBackgroundMusic('normal');
            }
            this.food = this.generateFood();
            document.getElementById('score').textContent = this.score;
            document.getElementById('startButton').disabled = true;
            this.gameLoop();
        }, 100); // 给予100ms的延迟来确保之前的循环已停止
    }
    
    generateFood() {
        const maxX = Math.floor(this.canvas.width / this.gridSize) - 1;
        const maxY = Math.floor(this.canvas.height / this.gridSize) - 1;
        let food;
        do {
            food = {
                x: Math.floor(Math.random() * maxX),
                y: Math.floor(Math.random() * maxY)
            };
        } while (
            this.snake.some(segment => segment.x === food.x && segment.y === food.y) ||
            this.obstacles.some(obs => obs.x === food.x && obs.y === food.y)
        );
        return food;
    }

    generateObstacles() {
        const maxX = Math.floor(this.canvas.width / this.gridSize) - 1;
        const maxY = Math.floor(this.canvas.height / this.gridSize) - 1;
        const obstacleCount = 5;

        for (let i = 0; i < obstacleCount; i++) {
            let obstacle;
            do {
                obstacle = {
                    x: Math.floor(Math.random() * maxX),
                    y: Math.floor(Math.random() * maxY)
                };
            } while (
                this.snake.some(segment => segment.x === obstacle.x && segment.y === obstacle.y) ||
                this.obstacles.some(obs => obs.x === obstacle.x && obs.y === obstacle.y)
            );
            this.obstacles.push(obstacle);
        }
    }
    
    handleKeyPress(event) {
        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'w': 'up',
            's': 'down',
            'a': 'left',
            'd': 'right'
        };
        
        const newDirection = keyMap[event.key];
        if (!newDirection) return;
        
        const opposites = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        
        if (opposites[this.direction] !== newDirection) {
            this.nextDirection = newDirection;
        }
    }
    
    update() {
        if (!this.isPlaying) return;
        
        // 更新蛇的方向
        this.direction = this.nextDirection;
        
        // 获取蛇头位置
        const head = {...this.snake[0]};
        
        // 根据方向移动蛇头
        switch (this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }
        
        // 检查碰撞
        if (this.checkCollision(head) || this.checkObstacleCollision(head)) {
            this.isPlaying = false;
            this.showGameOver();
            return;
        }
        
        // 将新的头部添加到蛇身数组的开头
        this.snake.unshift(head);
        
        // 检查是否吃到食物
        if (head.x === this.food.x && head.y === this.food.y) {
            const baseScore = 10;
            this.score += Math.round(baseScore * this.difficultySettings[this.difficulty].scoreMultiplier);
            document.getElementById('score').textContent = this.score;
            
            // 播放吃食物音效
            if (this.audioEnabled) {
                this.eatSound.currentTime = 0;
                this.eatSound.play().catch(e => console.log('音频播放失败:', e));
            }
            
            // 检查是否达到分数里程碑（100的倍数）
            if (Math.floor(this.score / 100) > Math.floor(this.lastScoreMilestone / 100)) {
                this.lastScoreMilestone = this.score;
                // 播放得分里程碑音效
                if (this.audioEnabled) {
                    this.goodSound.currentTime = 0;
                    this.goodSound.play().catch(e => console.log('音频播放失败:', e));
                }
            }
            
            // 更新吃到的食物计数
            this.foodEatenCount++;
            
            // 检查是否应该生成奖励
            if (this.foodEatenCount >= this.foodsToReward && !this.rewardActive) {
                this.reward = this.generateReward();
                this.rewardActive = true;
                this.rewardTimeLeft = this.difficultySettings[this.difficulty].rewardDuration;
                this.showRewardInfo();
                
                // 设置奖励倒计时
                this.rewardTimer = setTimeout(() => {
                    this.rewardActive = false;
                    this.reward = null;
                    this.hideRewardInfo();
                    this.foodEatenCount = 0;
                    this.foodsToReward = this.getRandomFoodsToReward();
                }, this.difficultySettings[this.difficulty].rewardDuration);
            }
            
            // 在地狱模式下重新生成障碍物
            if (this.difficulty === 'hell') {
                this.obstacles = [];
                this.generateObstacles();
            }
            // 确保新的食物不会生成在障碍物上
            this.food = this.generateFood();
        } 
        // 检查是否吃到奖励
        else if (this.rewardActive && 
                 Math.abs(head.x - this.reward.x) < 2 && 
                 Math.abs(head.y - this.reward.y) < 2) {
            // 吃到奖励，获得三倍分数
            const baseScore = 30; // 三倍普通食物的分数
            this.score += Math.round(baseScore * this.difficultySettings[this.difficulty].scoreMultiplier);
            document.getElementById('score').textContent = this.score;
            
            // 播放吃奖励球音效
            if (this.audioEnabled) {
                this.goodEatSound.currentTime = 0;
                this.goodEatSound.play().catch(e => console.log('音频播放失败:', e));
            }
            
            // 检查是否达到分数里程碑（100的倍数）
            if (Math.floor(this.score / 100) > Math.floor(this.lastScoreMilestone / 100)) {
                this.lastScoreMilestone = this.score;
                // 播放得分里程碑音效
                if (this.audioEnabled) {
                    this.goodSound.currentTime = 0;
                    this.goodSound.play().catch(e => console.log('音频播放失败:', e));
                }
            }
            
            // 清除奖励倒计时
            if (this.rewardTimer) {
                clearTimeout(this.rewardTimer);
                this.rewardTimer = null;
            }
            
            // 重置奖励状态
            this.rewardActive = false;
            this.reward = null;
            this.hideRewardInfo();
            this.foodEatenCount = 0;
            this.foodsToReward = this.getRandomFoodsToReward();
        } else {
            // 如果没有吃到食物或奖励，移除尾部
            this.snake.pop();
        }
        
        // 更新奖励倒计时
        if (this.rewardActive) {
            this.rewardTimeLeft -= this.difficultySettings[this.difficulty].speed;
            this.updateRewardTimer();
            
            // 检查奖励是否已过期
            if (this.rewardTimeLeft <= 0) {
                this.rewardActive = false;
                this.reward = null;
                this.hideRewardInfo();
                this.foodEatenCount = 0;
                this.foodsToReward = this.getRandomFoodsToReward();
                
                if (this.rewardTimer) {
                    clearTimeout(this.rewardTimer);
                    this.rewardTimer = null;
                }
            }
        }
    }
    
    checkObstacleCollision(head) {
        return this.obstacles.some(obstacle => 
            obstacle.x === head.x && obstacle.y === head.y
        );
    }

    checkCollision(head) {
        // 检查是否撞墙
        if (head.x < 0 || 
            head.y < 0 || 
            head.x >= this.canvas.width / this.gridSize || 
            head.y >= this.canvas.height / this.gridSize) {
            return true;
        }
        
        // 检查是否撞到自己
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            return true;
        }
        return false;
    }

    showGameOver() {
        // 停止背景音乐
        if (this.currentBackgroundMusic) {
            this.currentBackgroundMusic.pause();
            this.currentBackgroundMusic.currentTime = 0;
        }
        
        // 播放游戏结束音效
        if (this.audioEnabled) {
            this.gameOverSound.currentTime = 0;
            this.gameOverSound.play().catch(e => console.log('音频播放失败:', e));
        }
        
        // 重置画布效果
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
        
        // 绘制背景
        if (this.difficulty === 'hell') {
            // 地狱模式使用深红色渐变背景
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, 'rgba(80, 0, 0, 0.9)');
            gradient.addColorStop(1, 'rgba(30, 0, 0, 0.95)');
            this.ctx.fillStyle = gradient;
            
            // 地狱模式使用特殊的文字效果
            this.ctx.shadowColor = '#ff0000';
            this.ctx.shadowBlur = 15;
        } else {
            // 其他模式使用半透明黑色背景
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        }
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制GAME OVER文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`GAME OVER - ${this.difficulty.toUpperCase()}`, this.canvas.width / 2, this.canvas.height / 2 - 30);

        // 绘制最终得分
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`最终得分: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);

        // 绘制重新开始按钮
        const buttonWidth = 150;
        const buttonHeight = 40;
        const buttonX = (this.canvas.width - buttonWidth) / 2;
        const buttonY = this.canvas.height / 2 + 50;

        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('重新开始', this.canvas.width / 2, buttonY + buttonHeight / 2);

        // 添加点击事件监听
        const handleClick = (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // 检查重新开始按钮点击
            if (x >= buttonX && x <= buttonX + buttonWidth &&
                y >= buttonY && y <= buttonY + buttonHeight) {
                this.canvas.removeEventListener('click', handleClick);
                this.startGame();
                return;
            }
        };

        this.canvas.addEventListener('click', handleClick);
    }
    
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 重置画布效果
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
        
        // 在地狱模式下绘制特殊背景
        if (this.difficulty === 'hell') {
            // 绘制暗红色背景
            this.ctx.fillStyle = '#1a0000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 绘制火焰边框
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#ff4400');
            gradient.addColorStop(0.5, '#ff0000');
            gradient.addColorStop(1, '#990000');
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
        }
        
        // 绘制蛇
        this.ctx.fillStyle = '#4CAF50';
        this.snake.forEach((segment, index) => {
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                this.gridSize - 1,
                this.gridSize - 1
            );
            
            // 为蛇头绘制眼睛
            if (index === 0) {
                this.ctx.fillStyle = '#000';
                const eyeSize = 4;
                const eyeOffset = 4;
                
                // 根据方向绘制眼睛
                let eyeX1, eyeX2, eyeY1, eyeY2;
                switch (this.direction) {
                    case 'right':
                        eyeX1 = eyeX2 = segment.x * this.gridSize + this.gridSize - eyeOffset;
                        eyeY1 = segment.y * this.gridSize + eyeOffset;
                        eyeY2 = segment.y * this.gridSize + this.gridSize - eyeOffset;
                        break;
                    case 'left':
                        eyeX1 = eyeX2 = segment.x * this.gridSize + eyeOffset;
                        eyeY1 = segment.y * this.gridSize + eyeOffset;
                        eyeY2 = segment.y * this.gridSize + this.gridSize - eyeOffset;
                        break;
                    case 'up':
                        eyeX1 = segment.x * this.gridSize + eyeOffset;
                        eyeX2 = segment.x * this.gridSize + this.gridSize - eyeOffset;
                        eyeY1 = eyeY2 = segment.y * this.gridSize + eyeOffset;
                        break;
                    case 'down':
                        eyeX1 = segment.x * this.gridSize + eyeOffset;
                        eyeX2 = segment.x * this.gridSize + this.gridSize - eyeOffset;
                        eyeY1 = eyeY2 = segment.y * this.gridSize + this.gridSize - eyeOffset;
                        break;
                }
                
                this.ctx.beginPath();
                this.ctx.arc(eyeX1, eyeY1, eyeSize/2, 0, Math.PI * 2);
                this.ctx.arc(eyeX2, eyeY2, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#4CAF50';
            }
        });
        
        // 绘制食物
        this.ctx.fillStyle = '#FF4444';
        this.ctx.fillRect(
            this.food.x * this.gridSize,
            this.food.y * this.gridSize,
            this.gridSize - 1,
            this.gridSize - 1
        );
        
        // 绘制奖励球（如果存在）
        if (this.rewardActive && this.reward) {
            // 创建闪烁效果
            const time = Date.now() / 1000;
            const pulse = Math.sin(time * 8) * 0.3 + 0.7;
            
            // 创建渐变色
            const gradient = this.ctx.createRadialGradient(
                (this.reward.x + 0.5) * this.gridSize,
                (this.reward.y + 0.5) * this.gridSize,
                0,
                (this.reward.x + 0.5) * this.gridSize,
                (this.reward.y + 0.5) * this.gridSize,
                this.gridSize * 2
            );
            gradient.addColorStop(0, `rgba(255, 215, 0, ${pulse})`);
            gradient.addColorStop(1, `rgba(218, 165, 32, ${pulse})`);
            
            this.ctx.fillStyle = gradient;
            
            // 添加发光效果
            this.ctx.shadowColor = '#FFD700';
            this.ctx.shadowBlur = 15;
            
            // 绘制奖励球（2x2格子）
            this.ctx.beginPath();
            this.ctx.arc(
                (this.reward.x + 0.5) * this.gridSize,
                (this.reward.y + 0.5) * this.gridSize,
                this.gridSize,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            // 重置阴影效果
            this.ctx.shadowBlur = 0;
            this.ctx.shadowColor = 'transparent';
        }

        // 绘制障碍物
        if (this.difficulty === 'hell') {
            const time = Date.now() / 1000;
            this.obstacles.forEach(obstacle => {
                // 创建脉动效果
                const pulse = Math.sin(time * 4) * 0.3 + 0.7;
                this.ctx.fillStyle = `rgba(139, 0, 0, ${pulse})`;
                this.ctx.fillRect(
                    obstacle.x * this.gridSize,
                    obstacle.y * this.gridSize,
                    this.gridSize - 1,
                    this.gridSize - 1
                );
                
                // 添加发光效果
                this.ctx.shadowColor = '#ff0000';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            });
            // 重置阴影效果
            this.ctx.shadowBlur = 0;
        }
    }
    
    gameLoop() {
        if (!this.isPlaying) {
            document.getElementById('startButton').disabled = false;
            return;
        }
        
        this.update();
        if (this.isPlaying) {
            this.draw();
            setTimeout(this.gameLoop.bind(this), this.difficultySettings[this.difficulty].speed); // 根据难度控制游戏速度
        }
    }
}

// 初始化游戏
window.onload = () => {
    new SnakeGame();
};