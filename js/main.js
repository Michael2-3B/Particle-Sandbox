const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');

canvas.width = 1300;
canvas.height = 700;

const tileSize = 10;
let brushSize = 0;

const expirationTime = canvas.width / tileSize;
const maxLifeSpan = 20;
let mouseDown = false;
let erase = false;
let frames = 0;
let fps = 60;
let startTime;

let running = true;
let intervalId;
const fpsInterval = 1000;

let debugDrawInactive = false;

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
		lifeSpan: 0,
		isFlammable: true,
		killsFlame: false,
	},

	sand: {
		name: "Sand",
		useGravity: true,
		color: {r: 245, g: 185, b: 95, a:1},
		slip: 3,
		lifeSpan: 0,
		isFlammable: false,
		killsFlame: true,
	},

	block: {
		name: "Block",
		useGravity: false,
		color: {r: 50, g: 50, b: 50, a:1},
		slip: 0,
		lifeSpan: 0,
		isFlammable: false,
		killsFlame: false,
	},

	fire: {
		name: "Fire",
		useGravity: false,
		color: {r: 245, g: 123, b: 0, a:1},
		slip: 0,
		lifeSpan: maxLifeSpan,
		isFlammable: true,
		killsFlame: false,
	}
};

let tileType = tileTypes.grass;

class Tile {
	constructor(options) {
		this.name = options.name;
		this.position = options.position;
		this.color = options.color;
		this.useGravity = options.useGravity;
		this.slip = options.slip;
		this.active = (this.useGravity == true) ? expirationTime : 0;
		this.lifeSpan = options.lifeSpan;
		this.isFlammable = options.isFlammable;
		this.killsFlame = options.killsFlame;
	}

	drawTile() {

		if (this.lifeSpan || (this.useGravity && this.active))
			this.update();

		c.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a})`;
		if (!this.active && this.useGravity && debugDrawInactive)
			c.fillStyle = 'red'; //draw inactive tiles as red

		c.fillRect(this.position.x, this.position.y, tileSize, tileSize);
	}

	update() {

		if (this.lifeSpan) {

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

			let myTileIndex = tiles.findIndex(object => (object.position.x == this.position.x) && (object.position.y == this.position.y));

			if (randomX || randomY) {

				let newPositionX = Math.max(0, Math.min(canvas.width - tileSize, this.position.x + randomX * tileSize));
				let newPositionY = Math.max(0, Math.min(canvas.height - tileSize, this.position.y + randomY * tileSize));

				let tileIndex = tiles.findIndex(object => (object.position.x == newPositionX) && (object.position.y == newPositionY));

				if (tileIndex >= 0) {

					if (tiles[tileIndex].killsFlame) {

						tiles.splice(myTileIndex, 1);

					} else if (tiles[tileIndex].isFlammable) {

						let tileName = tiles[tileIndex].name;

						tiles.splice(tileIndex, 1);

						if (tileName != "Fire") {

							tiles.push(new Tile({

								name: "Fire",

								position: {
									x: newPositionX,
									y: newPositionY
								},

								color: this.color,
								useGravity: this.useGravity,
								slip: this.slip,
								lifeSpan: maxLifeSpan,
								isFlammable: true,
								killsFlame: false,

							}));

						}
					}

				} else {

					tiles.push(new Tile({

						name: "Fire",

						position: {
							x: newPositionX,
							y: newPositionY
						},

						color: this.color,
						useGravity: this.useGravity,
						slip: this.slip,
						lifeSpan: Math.max(1,this.lifeSpan - 1),
						isFlammable: true,
						killsFlame: false,

					}));

				}
			}

			myTileIndex = tiles.findIndex(object => (object.position.x == this.position.x) && (object.position.y == this.position.y));

			this.lifeSpan--;

			if (!this.lifeSpan) tiles.splice(myTileIndex, 1);

		} else {

			let posX = this.position.x;
			let posY = this.position.y;

			// if current tile detects a tile below it
			if (tiles.findIndex(object => (object.position.x == this.position.x + gravity.x * tileSize)
	            					   && (object.position.y == this.position.y + gravity.y * tileSize)) >= 0) {

				let positions = {
					x: (gravity.x == 0) ? this.position.x : this.position.y,
					y: (gravity.x == 0) ? this.position.y : this.position.x,
					maxX: ((gravity.x == 0) ? canvas.width : canvas.height) - tileSize,
					maxY: ((gravity.x == 0) ? canvas.height : canvas.width) - tileSize,
					gravity: (gravity.x == 0) ? gravity.y : gravity.x,
				}

				let currentTile;
				let tile1 = this.slip + 1;
				let tile2 = this.slip + 1;
				let total = this.slip + 1;

				for (let i = Math.max(0, positions.x - this.slip * tileSize); i <= Math.min(positions.maxX, positions.x + this.slip * tileSize); i += tileSize) {

					total--;

					if (i == positions.x) continue;
					if (total == 0) total--;

					if (gravity.x == 0) {
						currentTile = tiles.findIndex(object => (object.position.x == i) && (object.position.y == Math.max(0, Math.min(positions.maxY, positions.y + positions.gravity * tileSize))));
					} else if (gravity.y == 0) {
						currentTile = tiles.findIndex(object => (object.position.y == i) && (object.position.x == Math.max(0, Math.min(positions.maxY, positions.y + positions.gravity * tileSize))));
					}

					if (currentTile == -1) {
						if (total > 0) {
							tile1 = total;
						} else if (total < 0) {
							tile2 = Math.abs(total);
							break;
						}
					}
				}

				let direction = 0;
				if (tile1 <= this.slip || tile2 <= this.slip) {
					if (tile1 == tile2) {
						direction = Math.round(Math.random()) * 2 - 1;
					} else {
						if (tile1 < tile2) direction = -1;
						if (tile2 < tile1) direction = 1;
					}

					let emptyTile = false;

					if (gravity.x == 0) 
						emptyTile = tiles.findIndex(object => (object.position.x == this.position.x + direction * tileSize) && (object.position.y == this.position.y)) == -1;
					if (gravity.y == 0)
						emptyTile = tiles.findIndex(object => (object.position.x == this.position.x) && (object.position.y == this.position.y + direction * tileSize)) == -1;

					if (emptyTile) {

						let floorTile = -1;
						let leftTile = -1;
						let rightTile = -1;

						if (gravity.x == 0) {

							floorTile = tiles.findIndex(object => (object.position.x == this.position.x) && (object.position.y == this.position.y + gravity.y * tileSize));
							leftTile = tiles.findIndex(object => (object.position.x == this.position.x - tileSize) && (object.position.y == this.position.y));
							rightTile = tiles.findIndex(object => (object.position.x == this.position.x + tileSize) && (object.position.y == this.position.y));

							this.position.x = Math.max(0, Math.min(canvas.width - tileSize, this.position.x + direction * tileSize));
						}
						if (gravity.y == 0) {

							floorTile = tiles.findIndex(object => (object.position.x == this.position.x + gravity.x * tileSize) && (object.position.y == this.position.y));
							
							leftTile = tiles.findIndex(object => (object.position.x == this.position.x) && (object.position.y == this.position.y - tileSize));
							rightTile = tiles.findIndex(object => (object.position.x == this.position.x) && (object.position.y == this.position.y + tileSize));

							this.position.y = Math.max(0, Math.min(canvas.height - tileSize, this.position.y + direction * tileSize));

						}

						if (floorTile >= 0)
							tiles[floorTile].active = expirationTime;
						if (leftTile >= 0)
							tiles[leftTile].active = expirationTime;
						if (rightTile >= 0)
							tiles[rightTile].active = expirationTime;

						if (tiles.findIndex(object => (object.position.x == this.position.x + gravity.x * tileSize)
		            					   	       && (object.position.y == this.position.y + gravity.y * tileSize)) == -1) {

							this.position.x = Math.max(0, Math.min(canvas.width - tileSize, this.position.x + gravity.x * tileSize));
							this.position.y = Math.max(0, Math.min(canvas.height - tileSize, this.position.y + gravity.y * tileSize));

						}

					}
				}

			} else {

				this.position.x = Math.max(0, Math.min(canvas.width - tileSize, this.position.x + gravity.x * tileSize));
				this.position.y = Math.max(0, Math.min(canvas.height - tileSize, this.position.y + gravity.y * tileSize));

			}

			this.active = Math.max(0, this.active - 1);

			if (!(this.position.x == posX && this.position.y == posY)) this.active = expirationTime;
		}

	}
}

let tiles = [];

function animate() {

	if (!running) return;

	frames++;

	c.fillStyle = 'white';
	c.fillRect(0, 0, canvas.width, canvas.height);

	// add any tiles if needed
	addTiles();

	// Draw tiles
	for (let i = 0; i < tiles.length; i++) {
		tiles[i].drawTile();
	}

	// Select crosshair color
	c.fillStyle = 'rgba(160,160,160,0.4)'
	if (erase) c.fillStyle = 'rgba(255,0,0,0.4)';

	// Draw crosshair / arrow
	c.beginPath();
	c.moveTo(canvas.width / 2 + 20 * Math.sign(gravity.x), canvas.height / 2 + 20 * Math.sign(gravity.y));
	c.lineTo(canvas.width / 2 - 20 * Math.sign(gravity.y), canvas.height / 2 + 20 * Math.sign(gravity.x));
	c.lineTo(canvas.width / 2 + 20 * Math.sign(gravity.y), canvas.height / 2 - 20 * Math.sign(gravity.x));
	c.fill();

	c.font = "16px Arial";
	c.fillStyle = 'black';
	c.fillText("FPS: " + fps, 1234, 20);
	if (debugDrawInactive)
		c.fillText("Debug ON", 1217, 40);

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

function addTile() {

	// add a certain number of tiles based on brushSize
	// brushSize of 0 means 1 tile (1x1)
	// brushSize of 1 means 9 tiles (3x3)
	// etc

	let tileIndex;

	for (let i = Math.max(0, Math.floor(origin.x / tileSize) * tileSize - tileSize * brushSize); i <= Math.min(canvas.width - tileSize, Math.floor(origin.x / tileSize) * tileSize + tileSize * brushSize); i += tileSize) {
		for (let j = Math.max(0, Math.floor(origin.y / tileSize) * tileSize - tileSize * brushSize); j <= Math.min(canvas.height - tileSize, Math.floor(origin.y / tileSize) * tileSize + tileSize * brushSize); j += tileSize) {
		
			tileIndex = tiles.findIndex(object => (object.position.x == i) && (object.position.y == j));

			if (erase == true && tileIndex >= 0) {

				tiles.splice(tileIndex, 1);

			} else if (erase == false) {

				let flag = true;

				if (tileIndex >= 0) {
					flag = false;
					if ((tiles[tileIndex].name != "Block" && tileType.name == "Block") || (!tiles[tileIndex].killsFlame && tiles[tileIndex].name != "Block" && tileType.name == "Fire")) {
						flag = true;
						tiles.splice(tileIndex, 1);
					}
				}

				if (flag) {

					tiles.push(new Tile({

						name: tileType.name,

						position: {
							x: i,
							y: j
						},

						color: tileType.color,
						useGravity: tileType.useGravity,
						slip: tileType.slip,
						lifeSpan: tileType.lifeSpan,
						isFlammable: tileType.isFlammable,
						killsFlame: tileType.killsFlame,

					}));

				}

			}

		}
	}
	
}

function addTiles() {

	// Decide whether we should add or remove tiles		
	if (mouseDown) {

		addTile();

		if (erase) {

			let limitX = Math.max(0, Math.min(canvas.width - tileSize, Math.floor(origin.x / tileSize) * tileSize + gravity.x * (tileSize * brushSize)));
			let limitY = Math.max(0, Math.min(canvas.height - tileSize, Math.floor(origin.y / tileSize) * tileSize + gravity.y * (tileSize * brushSize)));

			for(let i = 0; i < tiles.length; i++) {

				if ((gravity.x == -1 && tiles[i].position.x >= limitX) || (gravity.x == 1 && tiles[i].position.x <= limitX)
						|| (gravity.y == -1 && tiles[i].position.y >= limitY) || (gravity.y == 1 && tiles[i].position.y <= limitY)) {
					
					tiles[i].active = expirationTime;

				}
			}

		}
	}
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
			debugDrawInactive = (debugDrawInactive == true) ? false : true;
			break;
		case ' ': // toggle between brush and eraser
			event.preventDefault();
			erase = (erase == true) ? false : true;
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
			tileType = tileTypes.block;
			break;
		case '4':
			erase = false;
			tileType = tileTypes.fire;
			break;

		case '-':
			brushSize = Math.max(0, brushSize - 1);
			break;
		case '=':
			brushSize = Math.min(2, brushSize + 1);
			break;
	}

	// if gravity changed, make all tiles active again
	if (!(gravX == gravity.x && gravY == gravity.y))
		for(let i = 0; i < tiles.length; i++) tiles[i].active = expirationTime;
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
