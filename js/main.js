const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');

canvas.width = 1300;
canvas.height = 700;
 
let running = true;
let intervalId;
const fpsInterval = 1000;
let frames = 0;
let fps = 60;
let startTime;

const tileSize = 10;
let brushSize = 0;
const maxBrushSize = 3;

const expirationTime = canvas.width / tileSize;
let mouseDown = false;
let erase = false;
let debugMode = false;
let activeTileCount = 0;

const origin = {
	x: 0,
	y: 0
};
const gravity = {
	x: 0,
	y: 1
};

const tileTypes = {

	grass: {
		name: "Grass",
		useGravity: true,
		color: {r: 0, g: 128, b: 0, a:1},
		slip: 1,
		lifeSpan: -1,
		isFlammable: true,
		killsFlame: false,
		explosionRadius: 0,
		blastResistance: 2,
	},

	sand: {
		name: "Sand",
		useGravity: true,
		color: {r: 245, g: 185, b: 95, a:1},
		slip: 3,
		lifeSpan: -1,
		isFlammable: false,
		killsFlame: true,
		explosionRadius: 0,
		blastResistance: 1,
	},

	stone: {
		name: "Stone",
		useGravity: true,
		color: {r: 120, g: 120, b: 130, a: 1},
		slip: 0,
		lifeSpan: -1,
		isFlammable: false,
		killsFlame: false,
		explosionRadius: 0,
		blastResistance: 5,
	},

	block: {
		name: "Block",
		useGravity: false,
		color: {r: 60, g: 60, b: 70, a: 1},
		slip: 0,
		lifeSpan: -1,
		isFlammable: false,
		killsFlame: false,
		explosionRadius: 0,
		blastResistance: 100
	},

	fire: {
		name: "Fire",
		useGravity: false,
		color: {r: 245, g: 123, b: 0, a: 1},
		slip: 0,
		lifeSpan: 20,
		isFlammable: true,
		killsFlame: false,
		explosionRadius: 0,
		blastResistance: 0,
	},

	// dynamite is not currently implemented, I am only defining it here

	dynamite: {
		name: "Dynamite",
		useGravity: false,
		color: {r: 128, g: 0, b: 0, a: 1},
		slip: 0,
		lifeSpan: -1,
		isFlammable: true,
		killsFlame: false,
		explosionRadius: 4,
		blastResistance: 0,
	}

};

let tileType = tileTypes.grass;

class Tile {
	constructor(options) {

		this.name = options.name;
		this.color = options.color;
		this.lifeSpan = options.lifeSpan;

		this.position = options.position;
		this.velocity = options.velocity;
		this.slip = options.slip;

		this.useGravity = options.useGravity;
		this.isFlammable = options.isFlammable;
		this.killsFlame = options.killsFlame;

		this.active = (this.useGravity == true) ? expirationTime : 0;

	}

	drawTile() {

		if (this.lifeSpan > 0 || this.active)
			this.update();

		c.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a})`;
		if (!this.active && this.useGravity && debugMode)
			c.fillStyle = 'red'; //draw inactive tiles as red

		c.fillRect(this.position.x, this.position.y, tileSize, tileSize);

	}

	update() {

		if (this.lifeSpan > 0) {

			let neighbor = calculateNeighboringTiles(this.position.x, this.position.y);

			if (neighbor.tileLeft >= 0)
				tiles[neighbor.tileLeft].active = (tiles[neighbor.tileLeft].useGravity) ? expirationTime : 0;
			if (neighbor.tileRight >= 0)
				tiles[neighbor.tileRight].active = (tiles[neighbor.tileRight].useGravity) ? expirationTime : 0;
			if (neighbor.tileFloor >= 0)
				tiles[neighbor.tileFloor].active = (tiles[neighbor.tileFloor].useGravity) ? expirationTime : 0;
			if (neighbor.tileAbove >= 0)
				tiles[neighbor.tileAbove].active = (tiles[neighbor.tileAbove].useGravity) ? expirationTime : 0;

			// randomly moves fire particle with a bias upwards (opposite of gravity)

			let randomX;
			let randomY;

			if (gravity.x) {
				randomX = -gravity.x * Math.sign(Math.floor(Math.random() * 6 - 1));
				randomY = Math.floor(Math.random() * 3 - 1);
			}

			if (gravity.y) {
				randomX = Math.floor(Math.random() * 3 - 1);
				randomY = -gravity.y * Math.sign(Math.floor(Math.random() * 6 - 1));
			}

			if (randomX || randomY) {

				let newPositionX = Math.max(0, Math.min(canvas.width - tileSize, this.position.x + randomX * tileSize));
				let newPositionY = Math.max(0, Math.min(canvas.height - tileSize, this.position.y + randomY * tileSize));
				let tileIndex = findTileIndex(newPositionX, newPositionY);

				if (tileIndex >= 0) {

					//if there is another tile at the random new position

					if (tiles[tileIndex].killsFlame) {

						tiles.splice(findTileIndex(this.position.x, this.position.y), 1);

					} else if (tiles[tileIndex].isFlammable) {

						let tileName = tiles[tileIndex].name;

						tiles.splice(tileIndex, 1);

						// dont add fire where we just had fire
						if (tileName != "Fire") {

							pushTile({
								tile: tileTypes.fire,
								position: {
									x: newPositionX,
									y: newPositionY
								},
								lifeSpan: tileTypes.fire.lifeSpan,
							});

						}

					}

				} else {

					// there is no tile at the random new position, but we will add a fire particle into the air here

					pushTile({
						tile: tileTypes.fire,
						position: {
							x: newPositionX,
							y: newPositionY
						},
						lifeSpan: Math.max(1, this.lifeSpan -1),
					});

				}
			}

			this.lifeSpan--;

			if (!this.lifeSpan) tiles.splice(findTileIndex(this.position.x, this.position.y), 1);

		} else {

			this.active = Math.max(0, this.active - 1);

			let neighbor = calculateNeighboringTiles(this.position.x, this.position.y);

			if (neighbor.tileLeft != -1 && neighbor.tileRight != -1 && neighbor.tileFloor != -1 && neighbor.tileAbove != -1 && !this.velocity.x && !this.velocity.y) {
				this.active = 0;
				return;
			}

			let theTileName = "";
			if (neighbor.tileFloor >= 0) theTileName = tiles[neighbor.tileFloor].name;

			// if current tile is on the ground
			if (neighbor.tileFloor != -1 && theTileName != "Fire") {

				// decrease horizontal velocity by 1
				if (gravity.x) this.velocity.y += -Math.sign(this.velocity.y);
				if (gravity.y) this.velocity.x += -Math.sign(this.velocity.x);

				// cancel downward velocity
				if (gravity.x) this.velocity.x = 0;
				if (gravity.y) this.velocity.y = 0;

				// current tile is on top of another tile, but not the border
				if (neighbor.tileFloor >= 0) {

					let tileLeftDown = {x: this.position.x - (gravity.y - gravity.x) * tileSize, y: this.position.y + (gravity.x + gravity.y) * tileSize};
					if (tileLeftDown.x < 0 || tileLeftDown.x >= canvas.width || tileLeftDown.y < 0 || tileLeftDown.y >= canvas.height) {
						tileLeftDown = -2;
					} else {
						tileLeftDown = findTileIndex(tileLeftDown.x, tileLeftDown.y);
					}

					let tileRightDown = {x: this.position.x + (gravity.y + gravity.x) * tileSize, y: this.position.y + (gravity.y - gravity.x) * tileSize};
					if (tileRightDown.x < 0 || tileRightDown.x >= canvas.width || tileRightDown.y < 0 || tileRightDown.y >= canvas.height) {
						tileRightDown = -2;
					} else {
						tileRightDown = findTileIndex(tileRightDown.x, tileRightDown.y);
					}

					let left = (neighbor.tileLeft == -1) && (tileLeftDown == -1);
					let right = (neighbor.tileRight == -1) && (tileRightDown == -1);
					let movement = 0;

					if (left || right) { // if hill goes down to the left or right

						if (left && right) {
							movement = (Math.round(Math.random()) * 2 - 1);
						} else if (left) {
							movement = -1;
						} else if (right) {
							movement = 1;
						}

						if (gravity.x) this.velocity.y = movement * -gravity.x * this.slip;
						if (gravity.y) this.velocity.x = movement * gravity.y * this.slip;

					}

				}

			} else {

				// current tile is not on the ground, so set the downward velocity to gravity

				if (gravity.x) {
					this.velocity.x = gravity.x;
					this.velocity.y = (Math.round(Math.random()) * 2 - 1) * this.slip;
				}
				if (gravity.y) {
					this.velocity.y = gravity.y;
					this.velocity.x = (Math.round(Math.random()) * 2 - 1) * this.slip;
				}

			}

			if (this.velocity.y || this.velocity.x) {

				this.active = expirationTime;

				if (neighbor.tileLeft >= 0)
					tiles[neighbor.tileLeft].active = (tiles[neighbor.tileLeft].useGravity) ? expirationTime : 0;

				if (neighbor.tileRight >= 0)
					tiles[neighbor.tileRight].active = (tiles[neighbor.tileRight].useGravity) ? expirationTime : 0;

				if (neighbor.tileFloor >= 0)
					tiles[neighbor.tileFloor].active = (tiles[neighbor.tileFloor].useGravity) ? expirationTime : 0;

				if (neighbor.tileAbove >= 0)
					tiles[neighbor.tileAbove].active = (tiles[neighbor.tileAbove].useGravity) ? expirationTime : 0;

			}

			if (neighbor.tileLeft != -1) {

				if (Math.sign(this.velocity.x) == -gravity.y) this.velocity.x = -this.velocity.x;
				if (Math.sign(this.velocity.y) == gravity.x) this.velocity.y = -this.velocity.y;

				if (neighbor.tileRight != -1) {

					if (gravity.x) this.velocity.y = 0;
					if (gravity.y) this.velocity.x = 0;

				}

			}

			if (neighbor.tileRight != -1) {

				if (Math.sign(this.velocity.x) == gravity.y) this.velocity.x = -this.velocity.x;
				if (Math.sign(this.velocity.y) == -gravity.x) this.velocity.y = -this.velocity.y;

				if (neighbor.tileLeft != -1) {

					if (gravity.x) this.velocity.y = 0;
					if (gravity.y) this.velocity.x = 0;

				}

			}

			theTileName = "";
			if (neighbor.tileFloor >= 0) theTileName = tiles[neighbor.tileFloor].name;

			if (gravity.x || (gravity.y && neighbor.tileFloor != -1 && theTileName != "Fire")) {
					if (this.position.x + Math.sign(this.velocity.x) * tileSize >= 0 && this.position.x + Math.sign(this.velocity.x) * tileSize <= canvas.width - tileSize)
						this.position.x += Math.sign(this.velocity.x) * tileSize;
			}

			if (gravity.y || (gravity.x && neighbor.tileFloor != -1 && theTileName != "Fire")) {
					if (this.position.y + Math.sign(this.velocity.y) * tileSize >= 0 && this.position.y + Math.sign(this.velocity.y) * tileSize <= canvas.height - tileSize)
						this.position.y += Math.sign(this.velocity.y) * tileSize;
			}

			if (theTileName == "Fire") {
				if (this.isFlammable) {
					tiles[neighbor.tileFloor].position.y = Math.max(0, Math.min(canvas.height - tileSize, tiles[neighbor.tileFloor].position.y - gravity.y * tileSize));
					tiles[neighbor.tileFloor].position.x = Math.max(0, Math.min(canvas.width - tileSize, tiles[neighbor.tileFloor].position.x - gravity.x * tileSize));
				} else {
					tiles.splice(neighbor.tileFloor, 1);
				}
			}

			neighbor.tileFloor = {x: this.position.x + gravity.x * tileSize, y: this.position.y + gravity.y * tileSize};
			if (neighbor.tileFloor.x < 0 || neighbor.tileFloor.x >= canvas.width || neighbor.tileFloor.y < 0 || neighbor.tileFloor.y >= canvas.height) {
				neighbor.tileFloor = -2;
			} else {
				neighbor.tileFloor = findTileIndex(neighbor.tileFloor.x, neighbor.tileFloor.y);
			}

			theTileName = "";
			if (neighbor.tileFloor >= 0) theTileName = tiles[neighbor.tileFloor].name;

			if (neighbor.tileFloor == -1 || theTileName == "Fire") {

				if (gravity.x) {
					this.position.x += gravity.x * tileSize;
					this.velocity.y = (Math.round(Math.random()) * 2 - 1) * this.slip;
				}

				if (gravity.y) {
					this.position.y += gravity.y * tileSize;
					this.velocity.x = (Math.round(Math.random()) * 2 - 1) * this.slip;
				}

				if (theTileName == "Fire") {
					if (this.isFlammable) {
						tiles[neighbor.tileFloor].position.y = Math.max(0, Math.min(canvas.height - tileSize, tiles[neighbor.tileFloor].position.y - gravity.y * tileSize));
						tiles[neighbor.tileFloor].position.x = Math.max(0, Math.min(canvas.width - tileSize, tiles[neighbor.tileFloor].position.x - gravity.x * tileSize));
					} else {
						tiles.splice(neighbor.tileFloor, 1);
					}
				}

			}

		}

	}

}

function findTileIndex(positionX, positionY) {
	return tiles.findIndex(object => (object.position.x == positionX) && (object.position.y == positionY));
}

function calculateNeighboringTiles(thisX, thisY) {

	let tileLeft = {x: thisX - gravity.y * tileSize, y: thisY + gravity.x * tileSize};
	if (tileLeft.x < 0 || tileLeft.x >= canvas.width || tileLeft.y < 0 || tileLeft.y >= canvas.height){
		tileLeft = -2;
	} else {
		tileLeft = findTileIndex(tileLeft.x, tileLeft.y);
	}

	let tileRight = {x: thisX + gravity.y * tileSize, y: thisY - gravity.x * tileSize};
	if (tileRight.x < 0 || tileRight.x >= canvas.width || tileRight.y < 0 || tileRight.y >= canvas.height){
		tileRight = -2;
	} else {
		tileRight = findTileIndex(tileRight.x, tileRight.y);
	}

	let tileFloor = {x: thisX + gravity.x * tileSize, y: thisY + gravity.y * tileSize};
	if (tileFloor.x < 0 || tileFloor.x >= canvas.width || tileFloor.y < 0 || tileFloor.y >= canvas.height) {
		tileFloor = -2;
	} else {
		tileFloor = findTileIndex(tileFloor.x, tileFloor.y);
	}

	let tileAbove = {x: thisX - gravity.x * tileSize, y: thisY - gravity.y * tileSize};
	if (tileAbove.x < 0 || tileAbove.x >= canvas.width || tileAbove.y < 0 || tileAbove.y >= canvas.height) {
		tileAbove = -2;
	} else {
		tileAbove = findTileIndex(tileAbove.x, tileAbove.y);
	}

	return {tileLeft, tileRight, tileFloor, tileAbove};

}

let tiles = [];

function animate() {

	if (!running) return;

	frames++;

	c.fillStyle = 'white';
	c.fillRect(0, 0, canvas.width, canvas.height);

	// add any tiles if needed
	if (mouseDown) addTiles();

	activeTileCount = 0;

	// Draw tiles
	for (let i = 0; i < tiles.length; i++) {
		if (tiles[i].active) activeTileCount++;
		tiles[i].drawTile();
	}

	// Draw brush cursor
	c.strokeStyle = 'rgba(0,0,0,0.5)';
	c.lineWidth = 1;
	c.strokeRect(Math.floor(origin.x / tileSize) * tileSize - tileSize * brushSize, Math.floor(origin.y / tileSize) * tileSize - tileSize * brushSize,
								(brushSize * 2 + 1) * tileSize, (brushSize * 2 + 1) * tileSize);


	// Select crosshair color
	c.fillStyle = 'rgba(160,160,160,0.4)';
	if (erase) c.fillStyle = 'rgba(200,0,0,0.4)';

	// Draw crosshair / arrow
	c.beginPath();
	c.moveTo(canvas.width / 2 + 20 * Math.sign(gravity.x), canvas.height / 2 + 20 * Math.sign(gravity.y));
	c.lineTo(canvas.width / 2 - 20 * Math.sign(gravity.y), canvas.height / 2 + 20 * Math.sign(gravity.x));
	c.lineTo(canvas.width / 2 + 20 * Math.sign(gravity.y), canvas.height / 2 - 20 * Math.sign(gravity.x));
	c.fill();

	// Draw all the text that is needed

	c.font = "16px Arial";
	c.fillStyle = 'black';
	c.fillText("FPS: " + fps, 1234, 20);
	if (debugMode){
		c.fillText("Debug ON", 10, 80);
		c.fillText("Active Tiles: " + activeTileCount, 10, 100);
	}

	if (erase) {
		c.fillText("Eraser", 10, 20);
	} else {
		c.fillText("Brush: " + tileType.name, 10, 20);
	}

	c.fillText("Brush Size: " + (brushSize * 2 + 1) + "x" + (brushSize * 2 + 1), 10, 40);

	window.requestAnimationFrame(animate);

}

function updateFPS() {

	const timeElapsed = performance.now() - startTime;
	fps = Math.floor(frames / (timeElapsed / fpsInterval));
	frames = 0;

	startTime = performance.now();

}

function addTiles() {

	// add a certain number of tiles based on brushSize
	// brushSize of 0 means 1 tile (1x1)
	// brushSize of 1 means 9 tiles (3x3)
	// etc

	let tileIndex;

	for (let i = Math.max(0, Math.floor(origin.x / tileSize) * tileSize - tileSize * brushSize); i <= Math.min(canvas.width - tileSize, Math.floor(origin.x / tileSize) * tileSize + tileSize * brushSize); i += tileSize) {
		for (let j = Math.max(0, Math.floor(origin.y / tileSize) * tileSize - tileSize * brushSize); j <= Math.min(canvas.height - tileSize, Math.floor(origin.y / tileSize) * tileSize + tileSize * brushSize); j += tileSize) {
		
			tileIndex = findTileIndex(i, j);

			if (erase == true && tileIndex >= 0) {

				tiles.splice(tileIndex, 1);

				let neighbor = calculateNeighboringTiles(i, j);

				if (neighbor.tileLeft >= 0)
					tiles[neighbor.tileLeft].active = (tiles[neighbor.tileLeft].useGravity) ? expirationTime : 0;
				if (neighbor.tileRight >= 0)
					tiles[neighbor.tileRight].active = (tiles[neighbor.tileRight].useGravity) ? expirationTime : 0;
				if (neighbor.tileFloor >= 0)
					tiles[neighbor.tileFloor].active = (tiles[neighbor.tileFloor].useGravity) ? expirationTime : 0;
				if (neighbor.tileAbove >= 0)
					tiles[neighbor.tileAbove].active = (tiles[neighbor.tileAbove].useGravity) ? expirationTime : 0;

			} else if (erase == false) {

				let flag = true;

				if (tileIndex >= 0) {
					flag = false;
					if ((tiles[tileIndex].name != "Block" && tileType.name == "Block") || (!tiles[tileIndex].killsFlame && tiles[tileIndex].name != "Block" && tiles[tileIndex].name != "Stone" && tileType.name == "Fire")) {
						flag = true;
						tiles.splice(tileIndex, 1);
					}
				}

				if (flag) {

					pushTile({
						tile: tileType,
						position: {
							x: i,
							y: j,
						},
						lifeSpan: tileType.lifeSpan,
					});

				}

			}

		}
	}
	
}

function pushTile({tile, position, lifeSpan}) {

	tiles.push(new Tile({

		name: tile.name,
		color: tile.color,

		position,
		velocity: {x: 0, y: 0},
		slip: tile.slip,

		lifeSpan,
		useGravity: tile.useGravity,
		isFlammable: tile.isFlammable,
		killsFlame: tile.killsFlame,

	}));

}

document.addEventListener("keydown", function(event) {

	let gravX = gravity.x;
	let gravY = gravity.y;

	switch (event.key) {
		case 'w': // gravity up
			gravity.x = 0;
			gravity.y = -1;
			break;
		case 'a': // gravity left
			gravity.x = -1;
			gravity.y = 0;
			break;
		case 's': // gravity down
			gravity.x = 0;
			gravity.y = 1;
			break;
		case 'd': // gravity right
			gravity.x = 1;
			gravity.y = 0;
			break;
		case 'r': // delete all tiles
			tiles = [];
			break;
		case 'z': // debug: toggle inactive tile drawing
			debugMode = (debugMode == true) ? false : true;
			break;
		case ' ': // toggle between brush and eraser
			event.preventDefault();
			erase = erase ? false : true;
			break;

		case '1':
			erase = false;
			tileType = tileTypes.grass;
			break;
		case '2':
			erase = false;
			tileType = tileTypes.sand;
			break;
		case '3':
			erase = false;
			tileType = tileTypes.stone;
			break;
		case '4':
			erase = false;
			tileType = tileTypes.block;
			break;
		case '5':
			erase = false;
			tileType = tileTypes.fire;
			break;

		case '-':
			brushSize = Math.max(0, brushSize - 1);
			break;
		case '=':
			brushSize = Math.min(maxBrushSize, brushSize + 1);
			break;
	}

	// if gravity changed, make tiles active again
	if (!(gravX == gravity.x && gravY == gravity.y))
		for(let i = 0; i < tiles.length; i++) {
			if (!tiles[i].useGravity) continue;

			let neighbor = calculateNeighboringTiles(tiles[i].position.x, tiles[i].position.y);

			if (neighbor.tileLeft == -1 || neighbor.tileRight == -1 || neighbor.tileFloor == -1 || neighbor.tileAbove == -1)
				tiles[i].active = expirationTime;

		}
});

canvas.addEventListener("mousedown", function(event) {
    mouseDown = true;
    origin.x = event.offsetX;
    origin.y = event.offsetY;
 });

canvas.addEventListener("mousemove", function(event) {
	origin.x = event.offsetX;
	origin.y = event.offsetY;
});

canvas.addEventListener("mouseup", function(event) {
	mouseDown = false;
});

window.addEventListener("blur", function() {
  running = false;
  clearInterval(intervalId);
});

window.addEventListener("focus", function() {
	running = true;
	frames = 0;
	startTime = performance.now();
	intervalId = setInterval(() => {
		updateFPS();
	}, fpsInterval);
	animate();
});
