document.body.addEventListener('click', () => {
  const text = document.querySelector('.txt');
    text.classList.add('show'); // Set opacity to 1 immediately
    setTimeout(() => {
      text.classList.remove('show'); // Reset opacity to 0 after 100ms
    }, 500);
});

var SHOOT_KNOCKBACK=5;
var SHOOT_KNOCKBACKRESET=0.25;

var mouse={
  x:0,
  y:0
}

// The Player class
class Player {
  constructor(options) {
    // Store references
    this.controls=options.controls;
    this.createBullet=options.createBullet;
    this.createSmoke=options.createSmoke;
        
    // Creating the player element
    this.createElement(options.parentContainer);
    
    // UI Elements
    this.ammoDisplayEl = $('#ammoDisplay');
    this.reloadBarContainerEl = null; // Will be set in createElement
    this.reloadBarEl = null; // Will be set in createElement
    // Position/movement
    this.x=window.innerWidth/2;
    this.y=window.innerHeight/2;
    this.xvel=0;
    this.yvel=0;
    this.friction=0.8;
    this.speed=0.8;
    this.scaleX=1;
    this.width=40;
    this.height=40;
    // Weapon
    this.magazineSize = 10;
    this.currentAmmo = this.magazineSize;
    this.isReloading = false;
    this.reloadTime = 1500; // 1.5 seconds
    this.reloadStartTime = 0; // Track when reload starts for animation
    
    // Anim
    this.anim={
      counter:0,
      inc:Math.PI/10,
      rightArm:{
        rot:0,
        offsetX:0,
        offsetY:0
      },
      leftArm:{
        rot:0
      },
      leftLeg:{
        rot:0
      },
      rightLeg:{
        rot:0
      },
      gun:{
        rot:0, // For knockback
        reloadRot: 0 // For reload animation
      },
      lift:0,
      knockback:0
    }
    
    // Shooting
    this.shoot();
    
    // Updating
    options.startUpdating(this.aim.bind(this));
    options.startUpdating(this.turn.bind(this));
    options.startUpdating(this.move.bind(this));
    options.startUpdating(this.animate.bind(this));    
    options.startUpdating(this.boundaries.bind(this));
    options.startUpdating(this.updateStyles.bind(this));
    this.updateAmmoDisplay(); // Initial ammo display
  }
  
  // Creating / injecting the element
  createElement(parentContainer) {
    // The Markup
    this.el=$(`
      <div class="player">
        <p class="txt"></p>
        <div class="reload-progress-bar-container">
            <div class="reload-progress-bar"></div>
        </div>
        <div class='hat'></div>
        <div class='eye right'></div>
        <div class='eye left'></div>
        <div class='mouth'></div>
        <div class='shirt'>
          <div class='under'></div>
        </div>
        <div class='arm right'>
          <div class='sleeve'></div>
          <div class='gun'>
            <div class='grey'></div>
            <div class='barrel'></div>
          </div>
        </div>
        <div class='arm left'>
          <div class='sleeve'></div>
        </div>
        <div class='leg right'>
          <div class='pant'></div>
        </div>
        <div class='leg left'>
          <div class='pant'></div>
        </div>
      </div>
    `)
    
    // Injection
    parentContainer.append(this.el);
    // Store references to reload bar elements
    this.reloadBarContainerEl = this.el.find('.reload-progress-bar-container');
    this.reloadBarEl = this.el.find('.reload-progress-bar');
    
    // Update dimensions
    this.width=this.el.outerWidth();
    this.height=this.el.outerHeight();
  }
  
  // Animate the player
  animate() {
    var isMoving = (
      this.controls.isDown('right') || this.controls.isDown('left') ||
      this.controls.isDown('up') || this.controls.isDown('down')
    ) ? true : false;
    const generalResetSpeed = 0.1; // For idle state transitions
    const reloadPoseResetSpeed = 0.15; // For transitioning to/from reload pose parts
    if (this.isReloading) {
      // Player is reloading: specific pose
      // Left arm brought in, e.g., to stabilize or hold magazine. Target angle 0.7 radians.
      this.anim.leftArm.rot = this.anim.leftArm.rot - (this.anim.leftArm.rot - 0.7) * reloadPoseResetSpeed;
      // Legs and body lift smoothly return to neutral (target 0)
      this.anim.rightLeg.rot = this.anim.rightLeg.rot - (this.anim.rightLeg.rot - 0) * reloadPoseResetSpeed;
      this.anim.leftLeg.rot = this.anim.leftLeg.rot - (this.anim.leftLeg.rot - 0) * reloadPoseResetSpeed;
      this.anim.lift = this.anim.lift - (this.anim.lift - 0) * reloadPoseResetSpeed;
      
      // Gun rotation for reload: 360-degree spin
      const elapsedReloadTime = performance.now() - this.reloadStartTime;
      let reloadProgress = Math.min(elapsedReloadTime / this.reloadTime, 1.0); // Progress from 0.0 to 1.0
      this.anim.gun.reloadRot = reloadProgress * (Math.PI * 2); // Full 360 spin (2 * PI radians)
      
      // Animation counter for walking is not incremented here to prevent abrupt leg movement after reload.
      
    } else {
      // Player is not reloading: normal movement or idle animations
      if (isMoving) {
        // Running animation
        // Left arm swings
        this.anim.leftArm.rot = Math.sin(this.anim.counter) / 2;
        // Legs move
        this.anim.rightLeg.rot = Math.sin(this.anim.counter * 0.9) * 0.5;
        this.anim.leftLeg.rot = Math.sin(-this.anim.counter * 0.9) * 0.5;
        // Body bobs
        this.anim.lift = Math.sin(this.anim.counter) * 5;
        // Increment animation counter
        this.anim.counter += this.anim.inc;
      } else {
        // Resetting to idle state (target 0 for all parts)
        this.anim.leftArm.rot = this.anim.leftArm.rot - (this.anim.leftArm.rot - 0) * generalResetSpeed;
        this.anim.rightLeg.rot = this.anim.rightLeg.rot - (this.anim.rightLeg.rot - 0) * generalResetSpeed;
        this.anim.leftLeg.rot = this.anim.leftLeg.rot - (this.anim.leftLeg.rot - 0) * generalResetSpeed;
        this.anim.lift = this.anim.lift - (this.anim.lift - 0) * generalResetSpeed;
      }
      // Reset gun reload rotation when not reloading
      this.anim.gun.reloadRot = this.anim.gun.reloadRot - (this.anim.gun.reloadRot - 0) * generalResetSpeed;
    }
    
    // Common animations: Right arm aiming and gun knockback effects.
    // These apply regardless of reloading state, though new knockback won't be triggered during reload.
    var rightArmRot = this.anim.rightArm.rot; // Rotation is determined by aim()
    this.anim.rightArm.offsetX = Math.cos(rightArmRot - Math.PI / 2) * this.anim.knockback;
    this.anim.rightArm.offsetY = Math.sin(rightArmRot - Math.PI / 2) * this.anim.knockback;
    this.anim.gun.rot = -this.anim.knockback * 0.1;
    
    // Knockback value itself fades over time
    this.anim.knockback = this.anim.knockback - (this.anim.knockback - 0) * SHOOT_KNOCKBACKRESET;
  }
  
  // Aiming at the mouse
  aim() {
    var rightArm=$('.player .arm.right');
    var armX=rightArm.offset().left;
    var armY=rightArm.offset().top;
    var angle=Math.atan2(mouse.y-armY,mouse.x-armX);
    this.anim.rightArm.rot=(angle-Math.PI/2)*this.scaleX;
  }
  
  // Facing the mouse
  turn() {
    if (mouse.x<this.x) {
      this.scaleX=-1;
    } else {
      this.scaleX=1;
    }
  }
  
  // Movement
  move() {    
    // Physics
    this.x+=this.xvel;
    this.y+=this.yvel
    this.xvel*=this.friction;
    this.yvel*=this.friction;
    
    // Keys
    if (this.controls.isDown('right')) {
      this.xvel+=this.speed;
    } else if (this.controls.isDown('left')) {
      this.xvel-=this.speed;
    }
    if (this.controls.isDown('up')) {
      this.yvel-=this.speed;
    } else if (this.controls.isDown('down')) {
      this.yvel+=this.speed;
    }
  }
  
  // Staying on screen
  boundaries() {
    if (this.x-this.width/2<0) {
      this.x=this.width/2+1;
      this.xvel=0;
    } else if (this.x+this.width/2>window.innerWidth) {
      this.x=window.innerWidth-this.width/2-1;
      this.xvel=0;
    }
    if (this.y-this.height/2<0) {
      this.y=this.height/2+1;
      this.yvel=0;
    } else if (this.y+this.height/2>window.innerHeight) {
      this.y=window.innerHeight-this.height/2-1;
      this.yvel=0;
    }
  }
  
  // Listen for mousepresses and shoot

shoot() {
  $(window).on('mousedown',function() {
    if (this.isReloading) {
      // console.log("Player is reloading..."); 
      return; 
    }
    if (this.currentAmmo > 0) {
      var barrel=$('.barrel'); var x=barrel.offset().left;
      var y=barrel.offset().top; var dir=this.anim.rightArm.rot*this.
                                                              scaleX;    
      this.createBullet( x,y, dir );
      this.anim.knockback=SHOOT_KNOCKBACK;         
      this.xvel+=Math.cos(dir-Math.PI/2)*2.5;
      this.yvel+=Math.sin(dir-Math.PI/2)*2.5;   
      this.createSmoke(x,y,dir,1);
      const gameContainer = $('.container');
      gameContainer.addClass('screen-shake');
      setTimeout(() => {
        gameContainer.removeClass('screen-shake');
      }, 100);
      this.currentAmmo--;
      this.updateAmmoDisplay();
      // console.log("Shot fired. Ammo: " + this.currentAmmo + "/" + this.magazineSize);
      if (this.currentAmmo === 0) {
        // console.log("Magazine empty after this shot. Starting reload.");
        this.startReload(); // This will also call updateAmmoDisplay
      }
    } else { // currentAmmo is 0 and not reloading
      // console.log("Out of ammo! Attempting to reload.");
      this.startReload();
    }
  }.bind(this))
}
  
  startReload() {
    if (this.isReloading) {
      return; // Already reloading
    }
    this.isReloading = true;
    this.reloadStartTime = performance.now(); // Set the start time for the reload animation
    // console.log(`Reloading... please wait ${this.reloadTime / 1000} seconds.`);
    // Future: Add UI text like "RELOADING..." (Now handled by updateAmmoDisplay)
    this.updateAmmoDisplay(); // Show "Reloading..." and manage progress bar display
    this.animateReloadBar();
    setTimeout(() => {
      this.currentAmmo = this.magazineSize;
      this.isReloading = false;
      this.updateAmmoDisplay(); // Update to show new ammo count and hide progress bar
      // console.log("Reload complete! Ammo: " + this.currentAmmo + "/" + this.magazineSize);
    }, this.reloadTime);
  }
  animateReloadBar() {
    if (!this.isReloading || !this.reloadBarEl) return;
    let startTime = performance.now();
    const animate = (currentTime) => {
      if (!this.isReloading) { // Stop if reloading was cancelled or finished early
        this.reloadBarEl.css('width', '0%');
        this.reloadBarContainerEl.hide();
        return;
      }
      const elapsedTime = currentTime - startTime;
      let progress = (elapsedTime / this.reloadTime) * 100;
      progress = Math.min(progress, 100); // Cap at 100%
      this.reloadBarEl.css('width', progress + '%');
      if (progress < 100) {
        requestAnimationFrame(animate);
      } else {
        // Animation finishes naturally, hiding is handled by updateAmmoDisplay when isReloading becomes false
      }
    };
    requestAnimationFrame(animate);
  }
  updateAmmoDisplay() {
    if (this.isReloading) {
      this.ammoDisplayEl.text("Reloading...");
      this.ammoDisplayEl.css('color', '#FFC107'); // Amber color for reloading
      if (this.reloadBarContainerEl) this.reloadBarContainerEl.show();
      if (this.reloadBarEl) this.reloadBarEl.css('width', '0%'); // Reset width at start of reload
    } else {
      this.ammoDisplayEl.text(`Ammo: ${this.currentAmmo}/${this.magazineSize}`);
      this.ammoDisplayEl.css('color', '#4CAF50'); // Green for ready ammo
      if (this.reloadBarContainerEl) this.reloadBarContainerEl.hide();
      if (this.reloadBarEl) this.reloadBarEl.css('width', '0%'); // Ensure bar is hidden and reset
    }
  }
  
  // Updating the styles
  updateStyles() {
    var rightArm=$('.player .arm.right');
    var leftArm=$('.player .arm.left');
    var rightLeg=$('.leg.right');
    var leftLeg=$('.leg.left');
    var gun=$('.gun');
    
    // Main el
    this.el.css({
      left:this.x,
      top:this.y,
      transform:`
        translateX(-50%)
        translateY(-${50+this.anim.lift}%)
        scaleX(${this.scaleX})
      `
    })
    
    // Arms
    rightArm.css({
      transform:`
        translateX(${this.anim.rightArm.offsetX}px)
        translateY(${this.anim.rightArm.offsetY}px)
        rotate(${this.anim.rightArm.rot}rad)
      `
    })
    leftArm.css({
      transform:`rotate(${this.anim.leftArm.rot}rad)`
    })
    
    // Legs
    rightLeg.css({
      transform:`
        translateX(-50%)
        rotate(${this.anim.rightLeg.rot}rad)
      `
    })
    leftLeg.css({
      transform:`
        translateX(-50%)
        rotate(${this.anim.leftLeg.rot}rad)
      `
    })
    
    // Gun
    gun.css({
      transform:`rotate(${this.anim.gun.rot + this.anim.gun.reloadRot}rad)`
    })
    
  }
}

// The Bullet class
class Bullet {
  constructor(options) {
    // Create the element
    this.createElement(options.parentContainer);
    this.createFlash(options.parentContainer,options.x,options.y);
    
    // Positioning / movement
    this.x=options.x;
    this.y=options.y;
    this.speed=25;
    this.dir=options.dir;    
    
    // Flash
    this.flashTimer=0;
  }
  
  // Creating / injecting the Player element
  createElement(parentContainer) {
    // The markup
    this.el=$('<div class="bullet"></div>');
    
    // Injection
    parentContainer.append(this.el);    
    
    // Dimensions
    this.width=parseInt(this.el.css('width'));
    this.height=parseInt(this.el.css('height'));
  }
  
  // Create the flash effect element
  createFlash(parentContainer,x,y) {
    // The markup
    this.flashEl=$('<div class="flash"></div>');
    
    // Positioning
    this.flashEl.css({
      left:x,
      top:y
    })
    
    // Injection
    parentContainer.append(this.flashEl);
  }
  
  // Updating (executed automatically by the `BulletHandler`
  // class.)
  update() {
    
    // Movement
    this.x+=Math.cos(this.dir+Math.PI/2)*this.speed;
    this.y+=Math.sin(this.dir+Math.PI/2)*this.speed;
    
    // Going out of bounds
    if (this.x<0 || this.y<0 ||
        this.x>window.innerWidth || this.y>window.innerHeight) {
      this.delete=true;
    }
    
    // Update styles
    this.el.css({
      left:this.x,
      top:this.y,
      transform:`
        translateX(-50%)
        translateY(-50%)
        rotate(${this.dir+Math.PI/2}rad)
      `
    })
    
    // Removing the flash
    this.flashTimer++;
    if (this.flashTimer>1) {
      this.flashEl.remove();
    }
  }
}

// The Bullet Handler class
class BulletHandler {
  constructor(options) {
    // Store options references
    this.parentContainer=options.parentContainer;
    this.enemyHandler = options.enemyHandler; // Store reference to enemy handler
    // Store all bullets
    this.bullets=[];
    
    // Updating all bullets
    options.startUpdating(this.updateBullets.bind(this));
    
    // Binding public functions
    this.createBullet=this.createBullet.bind(this);
  }
  
  // Updating all of the bullets
  updateBullets() {
    for (var i = this.bullets.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
      var bullet = this.bullets[i];
      bullet.update();
      // Check for collision with enemies
      if (this.enemyHandler && this.enemyHandler.enemies) {
        for (var j = 0; j < this.enemyHandler.enemies.length; j++) {
          var enemy = this.enemyHandler.enemies[j];
          // Basic AABB collision detection (assuming x,y are centers)
          var enemyWidth = enemy.el.outerWidth();
          var enemyHeight = enemy.el.outerHeight();
          if (Math.abs(bullet.x - enemy.x) * 2 < (bullet.width + enemyWidth) &&
              Math.abs(bullet.y - enemy.y) * 2 < (bullet.height + enemyHeight)) {
            
            if (enemy.onHit && !enemy.hit) { // Call onHit only if it exists and enemy not already hit (for bunny)
              enemy.onHit();
            }
            bullet.delete = true; // Mark bullet for deletion
            break; // Bullet hit an enemy, no need to check other enemies for this bullet
          }
        }
      }
      
      // Removing bullets
      if (bullet.delete) {
        bullet.el.remove();
        if (bullet.flashEl) bullet.flashEl.remove(); // Ensure flashEl exists before removing
        this.bullets.splice(i, 1);
      }
    }
  }
  
  // Create a new bullet
  createBullet(x,y,dir) {
    this.bullets.push(new Bullet({
      x:x,y:y,dir:dir,
      parentContainer:this.parentContainer
    }))
  }
}


// The Controls class
class Controls {
  constructor(options) {
    this.keys=[
      {
        name:'right',
        keyCode:68
      },
      {
        name:'left',
        keyCode:65
      },
      {
        name:'up',
        keyCode:87
      },
      {
        name:'down',
        keyCode:83
      }
    ]
    
    // Listening for keypresses
    this.createListeners();
    
    // Binding public functions
    this.isDown=this.isDown.bind(this);
  }
  
  // Get a key object based on it's keycode
  getKey(keyCode) {
    for (var i=0;i<this.keys.length;i++) {
      if (this.keys[i].keyCode===keyCode) {
        return this.keys[i];
      }
    }
  }
  
  // Check if a key is down
  isDown(key) {
    for (var i=0;i<this.keys.length;i++) {
      if (this.keys[i].name==key) {
        return this.keys[i].isDown;
      }
    }
  }
  
  // Create the keydown event listener
  createListeners() {
    
    // Key presses
    $(window).on('keydown',function(e) {
      var pressedKey=this.getKey(e.which);
      
      if (pressedKey!=null) {
        pressedKey.isDown=true;
      }
    }.bind(this))
    
    // Key released
    $(window).on('keyup',function(e) {
      var pressedKey=this.getKey(e.which);
      
      if (pressedKey!=null) {
        pressedKey.isDown=false
      }
    }.bind(this))
  }
}



// The Smoke class (🌲)
var SMOKE_COUNT=[2,4];
var SMOKE_SPEED=[5,10];
var SMOKE_SIZE=[5,10];
var SMOKE_FRICTION=0.85;
var SMOKE_FADESPEED=0.035;
var SMOKE_SPREAD=0.5;
class Smoke {
  constructor(options) {
    // Store the parentContainer reference
    this.parentContainer=options.parentContainer;
    
    // The clouds
    this.clouds=[];
    
    // Updating
    options.startUpdating(this.update.bind(this));
    
    // Binding public functions
    this.create=this.create.bind(this);
  }
  
  // Create a cloud puff
  create(x,y,dir,intensity) {
    
    // Creating the individual clouds
    var createCloud=function(x,y,dir,intensity) {
      
      // The cloud element
      var el=$('<div class="cloud"></div>');
      
      // Positioning and sizing
      var size=getRandom(SMOKE_SIZE[0],SMOKE_SIZE[1])*intensity;
      el.css({
        left:x,top:y,
        width:size,height:size
      })
      
      // Spread
      dir+=getRandom(-SMOKE_SPREAD*100,SMOKE_SPREAD*100)/100;
      
      // Movement
      var speed=getRandom(SMOKE_SPEED[0],SMOKE_SPEED[1])*intensity;
      var xvel=Math.cos(dir+Math.PI/2)*speed;
      var yvel=Math.sin(dir+Math.PI/2)*speed;
      
      // Return the cloud object
      return {
        el:el,
        x:x,y:y,dir:dir,
        xvel:xvel,yvel:yvel,
        opacity:1
      }
    }
    
    // Generating the clouds
    var count=getRandom(SMOKE_COUNT[0],SMOKE_COUNT[1]);
    for (var i=0;i<count;i++) {
      var newCloud=createCloud(x,y,dir,intensity)
      
      // Store the cloud object      
      this.clouds.push(newCloud)
      
      // Inject the cloud element
      this.parentContainer.append(newCloud.el);
    }
  }
  
  // Updating the clouds
  update() {
    for (var i=0;i<this.clouds.length;i++) {
      var cloud=this.clouds[i];
      
      // Movement
      cloud.x+=cloud.xvel;
      cloud.y+=cloud.yvel;
      cloud.xvel*=SMOKE_FRICTION;
      cloud.yvel*=SMOKE_FRICTION;
      
      // Opacity
      cloud.opacity-=SMOKE_FADESPEED;
      
      // Updating styles
      cloud.el.css({
        left:cloud.x,
        top:cloud.y,
        opacity:cloud.opacity
      })
      
      // Removing it
      if (cloud.opacity<=0) {
        cloud.el.remove();
        this.clouds.splice(i, 1);
      }
    }
  }
}

    class EnemyHandler {
      constructor(options) {
        this.parentContainer=options.parentContainer;
        this.getPlayer = options.getPlayer; 
        this.getGameCounter = options.getGameCounter; 
        this.onEnemyDefeated = options.onEnemyDefeated;
        this.enemies=[];
        options.startUpdating(this.updateEnemies.bind(this))
        this.createEnemy=this.createEnemy.bind(this);
    }
    updateEnemies() {
      const currentPlayer = this.getPlayer ? this.getPlayer() : null;
      if (!currentPlayer) {return;
    }


    const currentGameCounter = this.getGameCounter ? this.getGameCounter() : 0;
    for (var i = this.enemies.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
      var enemy = this.enemies[i];
      // Call enemy's animate function if it exists
      if (enemy.animate) {
        enemy.animate(currentGameCounter); // Pass the actual counter
      }
      // Call enemy's update function if it exists
      if (enemy.update) {
        enemy.update(currentPlayer); // Pass dynamically fetched player to enemy's update
      }
      // Remove enemy if marked for deletion
      if (enemy.shouldBeRemoved) {
        if(enemy.el) enemy.el.remove(); // Ensure element exists before removing
        this.enemies.splice(i, 1);
      }
    }
  }
  
  // Create a new enemy
  createEnemy(x,y) {
    var enemyIndex=Math.floor(getRandom(0,enemyTypes.length));
    var enemyData=enemyTypes[enemyIndex];
    
    // Create the new object
    var newEnemy={
      x:x,y:y,
      el:$(enemyData.markup),
      animate:enemyData.animate,
      update:enemyData.update,
      onHit: enemyData.onHit, // Add onHit callback
      type: enemyData.type, // Store type for easier identification
      hit: false, // Flag to track if hit (will be used for hit invulnerability or animation)
      shouldBeRemoved: false, // Flag for removal after death sequence
      parentContainer: this.parentContainer, // Pass parent container for particle effects
      maxHealth: enemyData.health || 1, // Default to 1 if not specified
      currentHealth: enemyData.health || 1,
      enemyHandlerRef: this, // Reference to the enemy handler
      isMoved: false, // Flag to indicate if the enemy is in a "moved" state
      hasAdvancedMoves: enemyData.hasAdvancedMoves !== undefined ? enemyData.hasAdvancedMoves : true // Tracks if enemy can use advanced moves
    }
    
    // Inject the element
    this.parentContainer.append(newEnemy.el);
    // Position the element and set initial opacity for fade-in
    newEnemy.el.css({
      left: x,
      top: y,
      opacity: 0 // Start invisible
    });
    // After adding to DOM and setting initial opacity, trigger fade-in
    // This ensures the transition fires correctly.
    requestAnimationFrame(() => {
      if (newEnemy.el) { // Check if element still exists
        newEnemy.el.css('opacity', 1);
      }
    });
    
    // Store the enemy object
    this.enemies.push(newEnemy);
  }
}


// Rooms
class RoomHandler {
  constructor(options) {
    // Store references
    this.parentContainer=options.parentContainer;
    this.createEnemy=options.createEnemy;
    
    // Load a room on init
    this.newRoom();
  }
  
  // Unloading / loading a room
  newRoom() {
    var roomIndex=Math.floor(getRandom(0,rooms.length));
    var roomData=rooms[roomIndex];
    
    // Generate everything
    for (var i=0;i<roomData.length;i++) {
      var item=roomData[i];
      
      // Enemies
      if (item.type==='enemy') {
        this.createEnemy(
          window.innerWidth*item.x/100,
          window.innerHeight*item.y/100
        )
      }
    }
  }
}


// The Game class
class Game {
  constructor() {
    // The container element
    this.container=$('.container');
    this.gameOverMessageEl = $('#gameOverMessage');
    this.gameOverTextEl = $('#gameOverText');
    this.killCounterDisplayEl = $('#killCounterDisplay');
    this.enemiesDefeated = 0; // Number of enemies destroyed so far
    this.killTarget = 10; // Number of enemies to destroy to win
    this.gameOver = false;
    
    // Updating
    this.updateQueue=[];
    this.update();
    
    // Enemies
    this.gameCounter = 0; // Add a game counter for animations
    this.enemySpawnInterval = 100; // Approx 1.67 seconds (100 frames / 60fps)
    
    // Enemies
    this.enemyHandler=new EnemyHandler({
      parentContainer:this.container,
      startUpdating:this.startUpdating.bind(this),
      getGameCounter: () => this.gameCounter, // Pass a way to get gameCounter
      getPlayer: () => this.player, // Pass a getter function for the player
      onEnemyDefeated: this.handleEnemyDefeated.bind(this) // Notified when an enemy is destroyed
    })
    // Rooms
    this.roomHandler=new RoomHandler({
      parentContainer:this.container,
      startUpdating:this.startUpdating.bind(this),
      createEnemy:this.enemyHandler.createEnemy
    })
    
    // The controls
    this.controls=new Controls();
    
    // Smoke
    this.smoke=new Smoke({
      parentContainer:this.container,
      startUpdating:this.startUpdating.bind(this)
    })
    
    // Bullets
    this.bulletHandler=new BulletHandler({
      parentContainer:this.container,
      startUpdating:this.startUpdating.bind(this),
      enemyHandler: this.enemyHandler // Pass enemyHandler to bulletHandler
    })
    
    // The player
    this.player=new Player({
      parentContainer:this.container,
      startUpdating:this.startUpdating.bind(this),
      controls:this.controls,
      createBullet:this.bulletHandler.createBullet,
      createSmoke:this.smoke.create
    })
  }
  
  // Adding a function to the update queue.
  startUpdating(func) {
    this.updateQueue.push(func);
  }
  
  updateKillCounterDisplay() {
    this.killCounterDisplayEl.text('Defeated: ' + this.enemiesDefeated + '/' + this.killTarget);
  }
  
  // Called by the EnemyHandler whenever an enemy is destroyed
  handleEnemyDefeated() {
    if (this.gameOver) return;
    this.enemiesDefeated++;
    this.updateKillCounterDisplay();
    if (this.enemiesDefeated >= this.killTarget) {
      this.handleWin();
    }
  }
  
  // Updating the queue
  update() {
    if (this.gameOver) {
      window.requestAnimationFrame(this.update.bind(this)); // Keep animation frame for restart timer
      return;
    }
    this.gameCounter++; // Keep gameCounter for other periodic logic (e.g., enemy spawning)
    
    for (var i=0;i<this.updateQueue.length;i++) {
      this.updateQueue[i](); // Player and enemies move here
    }
    
    this.checkPlayerEnemyCollisions();
    if (!this.gameOver) { // Only spawn new enemies if game is still running
        if (this.gameCounter % this.enemySpawnInterval === 0) {
          this.spawnNewEnemyRandomly();
        }
    }
    
    window.requestAnimationFrame(this.update.bind(this));
  }
  checkPlayerEnemyCollisions() {
    if (!this.player || !this.enemyHandler || !this.enemyHandler.enemies) return;
    const playerWidth = this.player.width;
    const playerHeight = this.player.height;
    for (const enemy of this.enemyHandler.enemies) {
      if (!enemy.el || enemy.shouldBeRemoved || enemy.hit) continue; // Skip dead, dying or already hit (invulnerable) enemies
      const enemyWidth = enemy.el.outerWidth();
      const enemyHeight = enemy.el.outerHeight();
      if (!enemyWidth || !enemyHeight) continue;
      // AABB collision detection (assuming x,y are centers)
      if (Math.abs(this.player.x - enemy.x) * 2 < (playerWidth + enemyWidth) &&
          Math.abs(this.player.y - enemy.y) * 2 < (playerHeight + enemyHeight)) {
        this.handleGameOver();
        return; // Collision detected, stop further checks for this frame
      }
    }
  }
  handleGameOver() {
    this.gameOver = true;
    this.gameOverTextEl.text('GAME OVER');
    this.gameOverMessageEl.show();
    
    // Optionally, make player visually react, e.g., by hiding or changing appearance
    // this.player.el.hide(); 
    setTimeout(() => {
      this.resetGame();
    }, 3000); // Restart after 3 seconds
  }
  handleWin() {
    this.gameOver = true;
    this.gameOverTextEl.text('YOU WIN!');
    this.gameOverMessageEl.show();
    
    setTimeout(() => {
      this.resetGame();
    }, 3000); // Restart after 3 seconds
  }
  resetGame() {
    this.gameOverMessageEl.hide();
    this.enemiesDefeated = 0; // Reset kill count
    this.updateKillCounterDisplay(); // Update kill counter display
    // Reset player
    this.player.x = window.innerWidth / 2;
    this.player.y = window.innerHeight / 2;
    this.player.xvel = 0;
    this.player.yvel = 0;
    this.player.anim.counter = 0; // Reset animation counter for running
    this.player.anim.knockback = 0; // Reset shooting knockback
    this.player.currentAmmo = this.player.magazineSize; // Reset ammo
    this.player.isReloading = false; // Ensure not reloading
    this.player.updateAmmoDisplay(); // Update ammo UI (also hides reload bar)
    if (this.player.reloadBarContainerEl) this.player.reloadBarContainerEl.hide(); // Explicitly hide
    if (this.player.reloadBarEl) this.player.reloadBarEl.css('width', '0%'); // Reset width
    // Ensure player visual styles are updated to reflect reset state
    this.player.updateStyles(); 
    // this.player.el.show(); // If hidden in handleGameOver
    // Clear enemies
    this.enemyHandler.enemies.forEach(enemy => { if (enemy.el) enemy.el.remove(); });
    this.enemyHandler.enemies = [];
    // Clear bullets
    this.bulletHandler.bullets.forEach(bullet => { 
      if (bullet.el) bullet.el.remove(); 
      if (bullet.flashEl) bullet.flashEl.remove(); 
    });
    this.bulletHandler.bullets = [];
    // Clear smoke particles
    this.smoke.clouds.forEach(cloud => { if (cloud.el) cloud.el.remove(); });
    this.smoke.clouds = [];
    
    this.gameCounter = 0;
    this.roomHandler.newRoom(); // Spawn initial set of enemies for the new game
    this.gameOver = false;
  }
  spawnNewEnemyRandomly() {
    const padding = 50; // Minimum distance from an edge.
    let x, y;
    const side = Math.floor(getRandom(0, 4)); // 0: top, 1: right, 2: bottom, 3: left
    switch (side) {
      case 0: // Top edge
        x = getRandom(padding, window.innerWidth - padding);
        y = padding;
        break;
      case 1: // Right edge
        x = window.innerWidth - padding;
        y = getRandom(padding, window.innerHeight - padding);
        break;
      case 2: // Bottom edge
        x = getRandom(padding, window.innerWidth - padding);
        y = window.innerHeight - padding;
        break;
      case 3: // Left edge
        x = padding;
        y = getRandom(padding, window.innerHeight - padding);
        break;
    }
    this.enemyHandler.createEnemy(x, y);
  }
}
// Tracking the mouse position
$(window).on('mousemove',function(e) {
  mouse.x=e.pageX;
  mouse.y=e.pageY;
})
// Get a random number
function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}




// ******************************** \\
// ***********The Rooms************ \\
// ******************************** \\

/*
  
  Info - The room data below holds information about
        what items can spawn where.
        
        Positions are used as percentages to ensure
        Everything fits on the screen.
        
        I would have used the typical tilemap row/column
        array technique, but the rooms are so simple
        I figured this alternative would be sufficient.
        
        This concept could be expanded to include items,
        spawning odds, secrets, and basically any other
        object-based mechanic you would implement into
        the game.

*/
var rooms=[]
rooms[0]=[ 
  { type: 'enemy', x: 25, y: 25 }, // Spawn a default enemy (Jimmy)
  { type: 'enemy', x: 75, y: 75 }  // This will potentially spawn our new Bunny
]


// ******************************** \\
// **********Enemy Types*********** \\
// ******************************** \\

/*
  
  Info - This array contains info on enemy markup,
        AI, etc.,
        
        If you do not specify an update function
        it will default to one defined in the 
        `EnemyHandler` class.

*/

var enemyTypes=[]
enemyTypes[0]={
  markup:`
    <div class="enemy jimmy">
      <div class='eye right'></div>
      <div class='eye left'></div>
      <div class='mouth'></div>
      <div class='arm right'></div>
      <div class='arm left'></div>
      <div class='leg right'></div>
      <div class='leg left'></div>
      <div class="die-text">crying</div>
    </div>
  `,
  animate:function(counter) {
    // Basic animation can be added here if needed
    if (!this.hasAdvancedMoves) { // If advanced moves are disabled, stop bobbing
        this.el.css('transform', `translateX(-50%) translateY(-50%)`);
        return;
    }
    // Example: slight bobbing
    var bob = Math.sin(counter * 0.2) * 2;
    this.el.css('transform', `translateX(-50%) translateY(calc(-50% + ${bob}px))`);
  },
  health: 2, // Jimmy gets 2 health points
  speed: 0.5, // Speed for Jimmy
  hasAdvancedMoves: true, // Jimmy can use advanced moves by default
  update: function(player) {
    if (!player || this.hit || (typeof this.currentHealth !== 'undefined' && this.currentHealth <= 0)) return; // Don't move if no player, hit, or dead
    
    // Simple chase if hasAdvancedMoves is false
    if (!this.hasAdvancedMoves) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = (this.speed || 0.5) * 0.7; // Slower when not using advanced moves
      if (distance > moveSpeed) {
          this.x += (dx / distance) * moveSpeed;
          this.y += (dy / distance) * moveSpeed;
      }
    } else { // Original "advanced" movement
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = this.speed || 0.5;
      if (distance > moveSpeed) { 
          this.x += (dx / distance) * moveSpeed;
          this.y += (dy / distance) * moveSpeed;
      } else if (distance > 0 && distance <= moveSpeed) { 
          this.x = player.x; 
          this.y = player.y;
      }
    }
    
    if(this.el) { // Ensure element exists
        this.el.css({
            left: this.x + 'px',
            top: this.y + 'px'
        });
    }
  },
  onHit: function() {
    if (this.currentHealth <= 0) return; // Already defeated
    this.currentHealth--;
    // --- Particle Explosion ---
    const numParticles = 8; // Slightly fewer for non-lethal hit
    const particleBaseSize = 5; 
    const particleSpread = 30; 
    const particleAnimationDuration = 250; 
    for (let i = 0; i < numParticles; i++) {
      const particleEl = $('<div class="particle"></div>');
      this.parentContainer.append(particleEl); 
      const initialParticleX = this.x - particleBaseSize / 2;
      const initialParticleY = this.y - particleBaseSize / 2;
      particleEl.css({
        left: initialParticleX + 'px',
        top: initialParticleY + 'px',
        backgroundColor: this.currentHealth <= 0 ? '#FFD700' : '#FFA500' // Gold on kill, Orange on hit
      });
      particleEl[0].offsetHeight; 
      const angle = Math.random() * Math.PI * 2;
      const distance = (Math.random() * particleSpread * 0.6) + (particleSpread * 0.2); 
      const targetX = initialParticleX + Math.cos(angle) * distance;
      const targetY = initialParticleY + Math.sin(angle) * distance;
      particleEl.css({
        left: targetX + 'px',
        top: targetY + 'px',
        opacity: 0,
        transform: 'scale(0.2)' 
      });
      setTimeout(() => {
        particleEl.remove();
      }, particleAnimationDuration);
    }
    // --- End Particle Explosion ---
    if (this.currentHealth <= 0) {
      if (!this.hit) { // Ensure death sequence only runs once
         this.hit = true; // Mark as "hit" for death sequence logic
         if (this.enemyHandlerRef && this.enemyHandlerRef.onEnemyDefeated) this.enemyHandlerRef.onEnemyDefeated();
         const dieTextDelay = 100; 
        
         setTimeout(() => {
          if (this.el) this.el.find('.die-text').addClass('animate-cry');
          if (this.el) this.el.css('pointer-events', 'none'); 
          if (this.el) this.el.addClass('fading-out');
          
          setTimeout(() => {
            this.shouldBeRemoved = true;
            // Removed score increment logic
          }, 800); /* Match extended CSS transition duration */
        }, dieTextDelay);
        // When this enemy dies, check for and remove any other "moved" enemies
        if (this.enemyHandlerRef && this.enemyHandlerRef.enemies) {
          this.enemyHandlerRef.enemies.forEach(otherEnemy => {
            if (otherEnemy !== this && !otherEnemy.shouldBeRemoved) {
                // If 'isMoved' was the primary flag for advanced behavior, reset it.
                // Or, more generally, disable advanced moves.
                otherEnemy.isMoved = false; 
                otherEnemy.hasAdvancedMoves = false; 
                // Optionally, make them visually less aggressive or change behavior further
                if (otherEnemy.el && otherEnemy.type === 'jimmy') { // Example: Jimmy stops his bobbing
                   // You might need to adjust animate function or add a flag there too
                }
             }
          });
        }
      }
    } else {
      // Optional: Add a brief "hit flash" or "shake" animation here for non-lethal hits
      if (this.el) this.el.css('filter', 'brightness(1.5)');
      setTimeout(() => {
        if (this.el) this.el.css('filter', '');
      }, 100);
    }
  },
  type: 'jimmy'
}
enemyTypes[1]={ // Bunny Definition
  markup:`
    <div class="enemy bunny">
      <div class="ear left"></div>
      <div class="ear right"></div>
      <div class="eye left"></div>
      <div class="eye right"></div>
      <div class="nose"></div>
      <div class="die-text">crying</div>
    </div>
  `,
  animate:function(counter) {
    if (!this.hasAdvancedMoves) { // If advanced moves are disabled, stop wiggling
        this.el.css('transform', `translateX(-50%) translateY(-50%) rotate(0deg)`);
        return;
    }
    var wiggle = Math.sin(counter * 0.5) * 5; 
    this.el.css('transform', `translateX(-50%) translateY(-50%) rotate(${wiggle}deg)`);
  },
  health: 1, // Bunny still has 1 health point
  speed: 0.7, // Speed for Bunny
  hasAdvancedMoves: true, // Bunny can use advanced moves (e.g. its wiggle animation)
  update: function(player) {
    if (!player || this.hit || (typeof this.currentHealth !== 'undefined' && this.currentHealth <= 0)) return; // Don't move if no player, hit, or dead
    // Bunny's "advanced move" is primarily its animation.
    // If hasAdvancedMoves is false, we might stop the wiggle or slow it down.
    // For movement, it will always chase.
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let moveSpeed = this.speed || 0.7;
    if (!this.hasAdvancedMoves) {
        moveSpeed *= 0.8; // Slightly slower if not "advanced"
    }
    if (distance > moveSpeed) { 
        this.x += (dx / distance) * moveSpeed;
        this.y += (dy / distance) * moveSpeed;
    } else if (distance > 0 && distance <= moveSpeed) { 
        this.x = player.x;
        this.y = player.y;
    }
    if(this.el) { // Ensure element exists
        this.el.css({
            left: this.x + 'px',
            top: this.y + 'px'
        });
    }
  },
  onHit: function() {
    if (this.currentHealth <= 0) return; 
    this.currentHealth--;
    // --- Particle Explosion (same as before for Bunny, as it dies in one hit) ---
    const numParticles = 10;
    const particleBaseSize = 6; 
    const particleSpread = 40; 
    const particleAnimationDuration = 300; 
    for (let i = 0; i < numParticles; i++) {
      const particleEl = $('<div class="particle"></div>');
      this.parentContainer.append(particleEl); 
      const initialParticleX = this.x - particleBaseSize / 2;
      const initialParticleY = this.y - particleBaseSize / 2;
      particleEl.css({
        left: initialParticleX + 'px',
        top: initialParticleY + 'px',
        // Bunny particles remain gold as it's always a kill shot for now
      });
      particleEl[0].offsetHeight; 
      const angle = Math.random() * Math.PI * 2;
      const distance = (Math.random() * particleSpread * 0.7) + (particleSpread * 0.3); 
      const targetX = initialParticleX + Math.cos(angle) * distance;
      const targetY = initialParticleY + Math.sin(angle) * distance;
      particleEl.css({
        left: targetX + 'px',
        top: targetY + 'px',
        opacity: 0,
        transform: 'scale(0.3)' 
      });
      setTimeout(() => {
        particleEl.remove();
      }, particleAnimationDuration);
    }
    // --- End Particle Explosion ---
    if (this.currentHealth <= 0) {
      if (!this.hit) { // Ensure death sequence only runs once
        this.hit = true; // Mark as "hit" for death sequence logic
        if (this.enemyHandlerRef && this.enemyHandlerRef.onEnemyDefeated) this.enemyHandlerRef.onEnemyDefeated();
        const dieTextDelay = 100; 
        setTimeout(() => {
          if(this.el) this.el.find('.die-text').addClass('animate-cry');
          if(this.el) this.el.css('pointer-events', 'none'); 
          if(this.el) this.el.addClass('fading-out');
          setTimeout(() => {
            this.shouldBeRemoved = true;
            // Removed score increment logic
          }, 800); /* Match extended CSS transition duration */
        }, dieTextDelay);
        // When this enemy dies, check for and remove any other "moved" enemies
        if (this.enemyHandlerRef && this.enemyHandlerRef.enemies) {
          this.enemyHandlerRef.enemies.forEach(otherEnemy => {
            if (otherEnemy !== this && !otherEnemy.shouldBeRemoved) {
                otherEnemy.isMoved = false;
                otherEnemy.hasAdvancedMoves = false;
                // For Bunny, if its animation is tied to hasAdvancedMoves in its animate function:
                if (otherEnemy.el && otherEnemy.type === 'bunny' && otherEnemy.animate) {
                   // Trigger a "calm down" state if its animate function checks hasAdvancedMoves
                   // For example, stop wiggling or wiggle less.
                   // This might require modifying the Bunny's animate function.
                   // For now, simply setting hasAdvancedMoves = false will be caught by its update logic.
                }
            }
          });
        }
      }
    }
    // No "else" needed for Bunny as it dies in one hit anyway
  },
  type: 'bunny'
}
// Start the game
new Game();
