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
        manualControlActive: false,
        isInvisible: false,
        isMoonGravity: false,
        isWalkingInAir: false,
        _lockedSpeed: 0,
        _savedSpeed: 6,
        _originalDraw: null,
        _defaultGroundY: 93,
        _isStatusMenuRendered: false,

        teleport(distance = 1000) {
            if (!this.enabled) {
                console.log("%c[DinoHack] Access Denied: Please run dinoHack.on() first!", "color: #ff0000; font-weight: bold;");
                return;
            }
            const coeff = runner.distanceMeter && runner.distanceMeter.config ? 
                          runner.distanceMeter.config.COEFFICIENT : 0.025;
            
            runner.distanceRan += Number(distance) / (coeff || 0.025);
            
            if (runner.distanceMeter) {
                const targetScoreStr = String(Math.floor(runner.distanceRan * (coeff || 0.025)));
                const meterConfig = runner.distanceMeter.config || runner.distanceMeter.CONFIG || Runner.config?.RESOURCE_TEMPLATE_DATA;
                
                if (meterConfig) {
                    const maxUnits = meterConfig.MAX_DISTANCE_UNITS || 5;
                    if (targetScoreStr.length > maxUnits) {
                        meterConfig.MAX_DISTANCE_UNITS = targetScoreStr.length;
                    }
                } else {
                    runner.distanceMeter.maxDigits = targetScoreStr.length;
                }
                
                if (typeof runner.distanceMeter.update === "function") {
                    runner.distanceMeter.update(runner.distanceRan);
                }
            }
            
            this.status();
        },

        on() {
            if (this.enabled) return;
            this.enabled = true;

            if (!runner._originalGameOver) runner._originalGameOver = Runner.prototype.gameOver;
            Runner.prototype.gameOver = function(){}; 

            this.autoJumpInterval = setInterval(() => {
                if (this.manualControlActive) return;

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

                    if (obstacle.xPos > 0 && obstacle.xPos < safeTriggerDistance) {
                        if (!runner.tRex.jumping && !runner.tRex.ducking) {
                            if (isHighBird) {
                                return; 
                            } else if (isDuckBird) {
                                this.duck(500);
                            } else {
                                this.jump();
                            }
                        }
                    }
                }
            }, 4);

            this._setupGlobalCheatKeys();
            console.log("%c[DinoHack] Main System: ACTIVE (God Mode & AutoJump ON)", "color: #00ff00; font-weight: bold;");
        },

        off() {
            if (!this.enabled) return;

            if (this.manualControlActive) this.toggleControl(true);
            if (this.isInvisible) this.toggleInvisibility(true);
            if (this.isMoonGravity) this.moonGravity(true);
            if (this.isWalkingInAir) this.walkHeight(0, true);

            clearInterval(this.autoJumpInterval);
            this.autoJumpInterval = null;

            if (runner._originalGameOver) Runner.prototype.gameOver = runner._originalGameOver;
            if (this._globalCheatKeyHandler) document.removeEventListener("keydown", this._globalCheatKeyHandler);

            const meterConfig = runner.distanceMeter && (runner.distanceMeter.config || runner.distanceMeter.CONFIG);
            if (meterConfig) {
                meterConfig.MAX_DISTANCE_UNITS = 5;
            } else if (runner.distanceMeter) {
                runner.distanceMeter.maxDigits = 5;
            }

            this.enabled = false;
            this.speed(6);

            if (this._isStatusMenuRendered) {
                console.clear();
                this._renderMainManual();
                console.log("%c[DinoHack] Main System: DISABLED (Config Restored)", "color: #ff0000; font-weight: bold;");
            } else {
                console.log("%c[DinoHack] Main System: DISABLED", "color: #ff0000; font-weight: bold;");
            }
            this._isStatusMenuRendered = false;
        },

        speed(value) {
            if (!this.enabled && value !== 6) {
                console.log("%c[DinoHack] Access Denied: Please run dinoHack.on() first!", "color: #ff0000; font-weight: bold;");
                return;
            }
            
            if (this.manualControlActive) {
                this._savedSpeed = Number(value);
                this.status();
                return;
            }

            const targetSpeed = Number(value);
            if (runner.currentSpeed > 15 && targetSpeed <= 10) {
                runner.horizon.obstacles = [];
                if (runner.horizon && typeof runner.horizon.reset === "function") {
                    runner.horizon.reset();
                }
            }
            
            runner.setSpeed(targetSpeed);
            if (this.enabled) this.status();
        },

        jumpHeight(value) {
            if (!this.enabled) {
                console.log("%c[DinoHack] Access Denied: Please run dinoHack.on() first!", "color: #ff0000; font-weight: bold;");
                return;
            }
            runner.tRex.config.INIITAL_JUMP_VELOCITY = -Number(value); 
            this.status();
        },

        jump() {
            if (!runner.tRex.jumping && !runner.tRex.ducking) {
                runner.tRex.startJump(runner.currentSpeed || 6);
            }
        },

        duck(duration = 400) {
            if (!runner.tRex.jumping && !runner.tRex.ducking) {
                runner.tRex.setDuck(true);
                setTimeout(() => {
                    runner.tRex.setDuck(false);
                }, duration);
            }
        },

        toggleControl(silent = false) {
            if (!this.enabled && !silent) {
                console.log("%c[DinoHack] Access Denied: Please run dinoHack.on() first!", "color: #ff0000; font-weight: bold;");
                return;
            }

            this.manualControlActive = !this.manualControlActive;

            if (this.manualControlActive) {
                this._savedSpeed = runner.currentSpeed || 6;
                this._lockedSpeed = 0;

                Object.defineProperty(runner, 'currentSpeed', {
                    get: () => { return this._lockedSpeed; },
                    set: (value) => {},
                    configurable: true
                });

                this._keydownHandler = (e) => {
                    if (e.key === "ArrowRight") {
                        this._lockedSpeed = this._savedSpeed;
                    } else if (e.key === "ArrowLeft") {
                        this._lockedSpeed = -this._savedSpeed;
                    } else if (e.key === "ArrowUp") {
                        this.jump();
                    } else if (e.key === "ArrowDown") {
                        runner.tRex.setDuck(true);
                    }
                };

                this._keyupHandler = (e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        this._lockedSpeed = 0;
                    } else if (e.key === "ArrowDown") {
                        runner.tRex.setDuck(false);
                    }
                };

                document.addEventListener("keydown", this._keydownHandler);
                document.addEventListener("keyup", this._keyupHandler);
            } else {
                document.removeEventListener("keydown", this._keydownHandler);
                document.removeEventListener("keyup", this._keyupHandler);

                delete runner.currentSpeed; 
                runner.setSpeed(this._savedSpeed);
            }

            if (!silent) this.status();
        },

        walkHeight(offsetValue, silent = false) {
            if (!this.enabled && !silent) {
                console.log("%c[DinoHack] Access Denied: Please run dinoHack.on() first!", "color: #ff0000; font-weight: bold;");
                return;
            }
            runner.tRex.groundYPos = this._defaultGroundY - Number(offsetValue);
            this.isWalkingInAir = Number(offsetValue) > 0;
            if (!silent) this.status();
        },

        toggleInvisibility(silent = false) {
            if (!this.enabled && !silent) {
                console.log("%c[DinoHack] Access Denied: Please run dinoHack.on() first!", "color: #ff0000; font-weight: bold;");
                return;
            }

            this.isInvisible = !this.isInvisible;

            if (this.isInvisible) {
                this._originalDraw = runner.tRex.draw;
                runner.tRex.draw = function() {};
            } else {
                if (this._originalDraw) {
                    runner.tRex.draw = this._originalDraw;
                }
            }
            if (!silent) this.status();
        },

        moonGravity(silent = false) {
            if (!this.enabled && !silent) {
                console.log("%c[DinoHack] Access Denied: Please run dinoHack.on() first!", "color: #ff0000; font-weight: bold;");
                return;
            }

            this.isMoonGravity = !this.isMoonGravity;

            const targetGravity = this.isMoonGravity ? 0.2 : 0.6;
            Object.assign(runner.tRex.config, { 
                GRAVITY: targetGravity, 
                gravity: targetGravity 
            });
            
            if (!silent) this.status();
        },

        _setupGlobalCheatKeys() {
            if (this._globalCheatKeyHandler) {
                document.removeEventListener("keydown", this._globalCheatKeyHandler);
            }

            this._globalCheatKeyHandler = (e) => {
                const key = e.key.toLowerCase();
                const targetKeys = ["m", "i", "h", "k", "o"];
                
                if (targetKeys.includes(key)) {
                    if (!this.enabled) {
                        console.log("%c[DinoHack] Access Denied: Please run dinoHack.on() first!", "color: #ff0000; font-weight: bold;");
                        return;
                    }
                    
                    if (key === "m") this.moonGravity();
                    if (key === "i") this.toggleInvisibility();
                    if (key === "h") {
                        if (this.isWalkingInAir) {
                            this.walkHeight(0);
                        } else {
                            this.walkHeight(40);
                        }
                    }
                    if (key === "k") this.toggleControl();
                    if (key === "o") this.status();
                }
            };
            document.addEventListener("keydown", this._globalCheatKeyHandler);
        },

        _renderMainManual() {
            const manuals = [
                "===========================================================",
                "                 🦖 DINOHACK SYSTEM MANUAL 🦖              ",
                "===========================================================",
                " Type the following commands in console and press Enter:   ",
                "                                                           ",
                "  dinoHack.on()              -> Enable God Mode & Auto Jump",
                "  dinoHack.off()             -> Disable All Hack Features  ",
                "  dinoHack.speed(x)          -> Modify Dino Speed (e.g. 30)",
                "  dinoHack.jumpHeight(x)     -> Modify Jump Force (e.g. 15)",
                "  dinoHack.teleport(x)       -> Add Score Display (e.g. 5000)",
                "                                                           ",
                " *GLOBAL HOTKEYS (Active immediately after dinoHack.on()): ",
                "  Press [ K ] -> TOGGLE Total Manual Simulator Mode        ",
                "  Press [ O ] -> CLEAR CONSOLE & RENDER CURRENT STATUS LOG  ",
                "  Press [ M ] -> TOGGLE Moon Gravity Mode (Float)          ",
                "  Press [ I ] -> TOGGLE Invisibility Mode (Ghost)         ",
                "  Press [ H ] -> TOGGLE Walk in Air Mode (Levitate 40px)   ",
                "-----------------------------------------------------------",
                " 📢 INFO: Pressing hotkeys will automatically clear the    ",
                " console screen and refresh the configurations panel       ",
                " in real-time so you always see your active attributes.     ",
                "==========================================================="
            ];
            manuals.forEach((line) => {
                if (line.includes("🦖") || line.includes("===")) {
                    console.log(`%c${line}`, "color: #00ff00; font-weight: bold; font-family: monospace;");
                } else if (line.includes("dinoHack.") || line.includes("Press [")) {
                    console.log(`%c${line}`, "color: #ffff00; font-family: monospace;");
                } else {
                    console.log(`%c${line}`, "color: #ffffff; font-family: monospace;");
                }
            });
        },

        status() {
            this._isStatusMenuRendered = true;
            console.clear();
            const coeff = runner.distanceMeter && runner.distanceMeter.config ? runner.distanceMeter.config.COEFFICIENT : 0.025;
            console.log("%c=== DINOHACK CURRENT CONFIG CONFIGURATION ===", "color: #00ffff; font-weight: bold;");
            console.log("-> Main Hack Status :", this.enabled ? "ACTIVE" : "INACTIVE");
            console.log("-> Control Mode     :", this.manualControlActive ? "MANUAL SIMULATOR" : "BOT AUTO-PILOT");
            console.log("-> Invisibility     :", this.isInvisible ? "ACTIVE" : "INACTIVE");
            console.log("-> Moon Gravity     :", this.isMoonGravity ? "ACTIVE" : "INACTIVE");
            console.log("-> Walk in Air      :", this.isWalkingInAir ? "ACTIVE (40px)" : "INACTIVE");
            console.log("-> Current Gravity  :", runner.tRex.config.GRAVITY);
            console.log("-> Dino Speed       :", runner.currentSpeed);
            console.log("-> Jump Velocity    :", runner.tRex.config.INIITAL_JUMP_VELOCITY);
            console.log("-> Display Score    :", Math.floor(runner.distanceRan * coeff));
            console.log("%c==============================================", "color: #00ffff; font-weight: bold;");
            console.log("%c💡 TIP: Press [ O ] key anytime to clear console and force-render the latest configuration logs.", "color: #ff9900; font-weight: bold;");
            console.log("\n");
            this._renderMainManual();
        }
    };

    console.clear();
    console.log("%c[!] Initializing DinoHack Kernel v4.23...", "color: #00ff00; font-family: monospace; font-weight: bold;");
    
    const loadingLogs = [
        "[💡] Injecting core script into Runner instance...",
        "[🔓] Bypassing T-Rex hitboxes integrity check...",
        "[🛠️] Overriding Runner.prototype.gameOver handler...",
        "[⚡] Patching Velocity and Gravity modules...",
        "[🎹] Binding Global Mechanical Key Listeners [M, I, H, K, O]...",
        "[✨] DinoHack Kernel successfully loaded into memory."
    ];

    loadingLogs.forEach((line, i) => {
        setTimeout(() => {
            console.log(`%c${line}`, "color: #00ff00; font-family: monospace;");
        }, (i + 1) * 1200);
    });

    const totalLoadingTime = (loadingLogs.length + 1) * 1200; 

    setTimeout(() => {
        window.dinoHack._setupGlobalCheatKeys();
        window.dinoHack._renderMainManual();
    }, totalLoadingTime);
})();
