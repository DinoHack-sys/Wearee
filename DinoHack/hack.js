(function() {
    const runner = Runner.instance_ || Runner.getInstance();

    if (!runner) {
        console.error("Dino game not found! Please open chrome://dino first.");
        return;
    }

    if (window.dinoHack) {
        console.log("DinoHack is already installed.");
        return;
    }

    window.dinoHack = {
        enabled: false,
        autoJumpInterval: null,
        reverseEnabled: false,

        teleport(distance = 1000) {
            const coeff = runner.distanceMeter && runner.distanceMeter.config ? 
                          runner.distanceMeter.config.COEFFICIENT : 0.025;
            
            runner.distanceRan += Number(distance) / (coeff || 0.025);
            console.log(`%c[DinoHack] Display Score added +${distance} points.`, "color: #00ffff;");
        },

        on() {
            if (this.enabled) return;
            this.enabled = true;

            if (!runner._originalGameOver) runner._originalGameOver = Runner.prototype.gameOver;
            Runner.prototype.gameOver = function(){}; 

            this.autoJumpInterval = setInterval(() => {
                const obstacles = runner.horizon.obstacles;
                if (obstacles.length > 0) {
                    const obstacle = obstacles[0];
                    
                    let multiplier = 9.5;
                    if (runner.currentSpeed < 10) {
                        multiplier = 18.0;
                    } else if (runner.currentSpeed < 15) {
                        multiplier = 13.0;
                    }
                    
                    const safeTriggerDistance = runner.currentSpeed * multiplier; 

                    const isBird = obstacle.typeConfig && obstacle.typeConfig.type === "PTERODACTYL";
                    const isHighBird = isBird && obstacle.yPos <= 50; 
                    const isDuckBird = isBird && obstacle.yPos > 50 && obstacle.yPos <= 80; 

                    if (!this.reverseEnabled && obstacle.xPos > 0 && obstacle.xPos < safeTriggerDistance) {
                        if (!runner.tRex.jumping && !runner.tRex.ducking) {
                            
                            if (isHighBird) {
                                return; 
                            } else if (isDuckBird) {
                                runner.tRex.setDuck(true);
                                setTimeout(() => runner.tRex.setDuck(false), 500);
                            } else {
                                runner.tRex.startJump(runner.currentSpeed);
                            }

                        }
                    }
                    else if (this.reverseEnabled && obstacle.xPos < 150 && obstacle.xPos > -50) {
                        if (!runner.tRex.jumping && !runner.tRex.ducking) {
                            if (!isHighBird) {
                                runner.tRex.startJump(runner.currentSpeed);
                            }
                        }
                    }
                }
            }, 4);

            console.log("%c[DinoHack] Main System: ACTIVE (God Mode & AutoJump ON)", "color: #00ff00; font-weight: bold;");
        },

        off() {
            if (!this.enabled) return;
            this.enabled = false;

            clearInterval(this.autoJumpInterval);
            this.autoJumpInterval = null;

            if (runner._originalGameOver) Runner.prototype.gameOver = runner._originalGameOver;
            if (this.reverseEnabled) this.toggleReverse(); 

            this.speed(6);
            console.log("%c[DinoHack] Main System: DISABLED", "color: #ff0000; font-weight: bold;");
        },

        speed(value) {
            const targetSpeed = Number(value);
            
            if (runner.currentSpeed > 15 && targetSpeed <= 10) {
                runner.horizon.obstacles = [];
                if (runner.horizon && typeof runner.horizon.reset === "function") {
                    runner.horizon.reset();
                }
            }
            
            runner.setSpeed(targetSpeed);
            console.log(`%c[DinoHack] Speed set to: ${value}`, "color: #1ae642;");
        },

        jumpHeight(value) {
            runner.tRex.config.GRAVITY = 0.6; 
            runner.tRex.config.INIITAL_JUMP_VELOCITY = -Number(value); 
            console.log(`%c[DinoHack] Jump Velocity set to: ${value} (Recommended: 12 - 20)`, "color: #1ae642;");
        },

        toggleReverse() {
            this.reverseEnabled = !this.reverseEnabled;
            
            if (this.reverseEnabled) {
                this._originalUpdate = runner.horizon.update;
                
                runner.horizon.update = function(deltaTime, currentSpeed, updateObstacles, showNewObstacle) {
                    this._originalUpdate = window.dinoHack._originalUpdate;
                    this._originalUpdate(deltaTime, -currentSpeed, updateObstacles, showNewObstacle);
                };

                this._reverseKeyHandler = (e) => {
                    if (e.key === "ArrowLeft") {
                        runner.setSpeed(Math.abs(runner.currentSpeed) + 2); 
                        runner.distanceRan -= 1; 
                    }
                    if (e.key === "ArrowRight") {
                        runner.setSpeed(Math.max(2, Math.abs(runner.currentSpeed) - 2)); 
                    }
                };
                document.addEventListener("keydown", this._reverseKeyHandler);

                runner.setSpeed(10); 
                console.log("%c[DinoHack] Reverse Mode: ACTIVE. Use [Left Arrow] to accelerate backward, [Right Arrow] to brake.", "color: #ff9900; font-weight: bold;");
            } else {
                if (this._originalUpdate) runner.horizon.update = this._originalUpdate;
                if (this._reverseKeyHandler) document.removeEventListener("keydown", this._reverseKeyHandler);
                runner.setSpeed(6);
                console.log("%c[DinoHack] Reverse Mode: INACTIVE. Movement restored to normal.", "color: #ff9900; font-weight: bold;");
            }
        },

        status() {
            const coeff = runner.distanceMeter && runner.distanceMeter.config ? runner.distanceMeter.config.COEFFICIENT : 0.025;
            console.log("%c=== DINOHACK CURRENT CONFIG ===", "color: #00ffff; font-weight: bold;");
            console.log("-> Main Hack Status :", this.enabled ? "ACTIVE" : "INACTIVE");
            console.log("-> Reverse Mode    :", this.reverseEnabled ? "ACTIVE" : "INACTIVE");
            console.log("-> Dino Speed      :", runner.currentSpeed);
            console.log("-> Jump Velocity   :", runner.tRex.config.INIITAL_JUMP_VELOCITY);
            console.log("-> Display Score   :", Math.floor(runner.distanceRan * coeff));
            console.log("%c===============================", "color: #00ffff; font-weight: bold;");
        }
    };

    console.clear();
    console.log("%c[!] Initializing DinoHack Kernel v4.6...", "color: #00ff00; font-family: monospace; font-weight: bold;");
    
    const loadingLogs = [
        "[💡] Injecting core script into Runner instance...",
        "[🔓] Bypassing T-Rex hitboxes integrity check...",
        "[🛠️] Overriding Runner.prototype.gameOver handler...",
        "[⚡] Patching Velocity and Gravity modules...",
        "[🔄] Reversing Horizon vectors for backward movement...",
        "[✨] DinoHack Kernel successfully loaded into memory."
    ];

    const manualLogs = [
        "",
        "===========================================================",
        "                 🦖 DINOHACK SYSTEM MANUAL 🦖              ",
        "===========================================================",
        " Type the following commands in console and press Enter:   ",
        "                                                           ",
        "  dinoHack.on()          -> Enable God Mode & Auto Jump    ",
        "  dinoHack.off()         -> Disable All Hack Features      ",
        "  dinoHack.speed(x)      -> Modify Dino Speed (e.g., 30)   ",
        "  dinoHack.jumpHeight(x) -> Modify Jump Height (e.g., 15)  ",
        "  dinoHack.teleport(x)   -> Add Score Display (e.g., 5000) ",
        "  dinoHack.toggleReverse()-> toggle Backward Movement Mode ",
        "  dinoHack.status()      -> Check Current Configurations   ",
        "                                                           ",
        " *When Reverse Mode is Active:                             ",
        "  Press [Left Arrow]  = Accelerate backward movement       ",
        "  Press [Right Arrow] = Decelerate backward movement       ",
        "==========================================================="
    ];

    loadingLogs.forEach((line, i) => {
        setTimeout(() => {
            console.log(`%c${line}`, "color: #00ff00; font-family: monospace;");
        }, (i + 1) * 1200);
    });

    const totalLoadingTime = (loadingLogs.length + 1) * 1200; 

    manualLogs.forEach((line, i) => {
        setTimeout(() => {
            if (line.includes("🦖") || line.includes("===")) {
                console.log(`%c${line}`, "color: #00ff00; font-weight: bold; font-family: monospace;");
            } else if (line.includes("dinoHack.")) {
                console.log(`%c${line}`, "color: #ffff00; font-family: monospace;");
            } else {
                console.log(`%c${line}`, "color: #ffffff; font-family: monospace;");
            }
        }, totalLoadingTime + (i * 150));
    });
})();