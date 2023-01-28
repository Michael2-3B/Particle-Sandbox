const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');

canvas.width = 1300;
canvas.height = 700;

const tileSize = 20;
const expirationTime = canvas.width / tileSize;
let mouseDown = false;
let erase = false;
let frame = 0;

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
		slip: 1
	},

	sand: {
		name: "Sand",
		useGravity: true,
		color: {r: 245, g: 185, b: 95, a:1},
		slip: 3
	},

	block: {
		name: "Block",
		useGravity: false,
		color: {r: 50, g: 50, b: 50, a:1},
		slip: 0
	}
};

let tileType = tileTypes.grass;

class Tile {
	constructor(options) {
		this.position = options.position;
		this.color = options.color;
		this.useGravity = options.useGravity;
		this.slip = options.slip;
		this.active = (this.useGravity == true) ? expirationTime : 0;
	}

	drawTiles() {

		if (this.useGravity && this.active)
			this.update();

		c.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a})`;
		c.fillRect(this.position.x, this.position.y, tileSize, tileSize);
	}

	update() {

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

let tiles = [];

function animate() {
	window.requestAnimationFrame(animate);
	c.fillStyle = 'white';
	c.fillRect(0, 0, canvas.width, canvas.height);

	// add any tiles if needed
	addTiles();

	// Draw tiles
	for (let i = 0; i < tiles.length; i++) {
		tiles[i].drawTiles();
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
	if (erase) {
		c.fillStyle = 'red';
		c.fillText("Erase", 10, 20);
	} else {
		c.fillText("Brush: " + tileType.name, 10, 20);
	}

	frame++;
	if (frame == 2) frame = 0;
}

function addTile() {
	tiles.push(new Tile({

		position: {
			x: Math.floor(origin.x / tileSize) * tileSize,
			y: Math.floor(origin.y / tileSize) * tileSize
		},

		color: tileType.color,
		useGravity: tileType.useGravity,
		slip: tileType.slip

	}));
}

function addTiles() {
	//get tile index of current origin point
	let tileIndex = tiles.findIndex(object => (object.position.x == Math.floor(origin.x / tileSize) * tileSize)
										   && (object.position.y == Math.floor(origin.y / tileSize) * tileSize));

	// Decide whether we should add or remove tiles		
	if (mouseDown) {
		if (tileIndex == -1 && erase == false) {

			if (!tileType.useGravity || (tileType.useGravity == true && frame == 0)) addTile();

		} else if (tileIndex >= 0 && erase == false) { // there is already a tile in the cursors location and we are adding tiles

			if (tiles[tileIndex].useGravity == true && tileType.useGravity == false){ // overwrites gravity particle with non-gravity particle

				tiles.splice(tileIndex, 1);
				addTile();

			}
		}

		if (tileIndex >= 0 && erase == true) {
			tiles.splice(tileIndex, 1);
			for(let i = 0; i < tiles.length; i++) tiles[i].active = expirationTime;
		}
	}
}

document.addEventListener("keydown", function(event) {

	let gravX = gravity.x;
	let gravY = gravity.y;

	switch (event.key) {
		case 'w':
			gravity.x = 0;
			gravity.y = -1;
			break;
		case 'a':
			gravity.x = -1;
			gravity.y = 0;
			break;
		case 's':
			gravity.x = 0;
			gravity.y = 1;
			break;
		case 'd':
			gravity.x = 1;
			gravity.y = 0;
			break;
		case 'r':
			tiles = [];
			break;
		case ' ':
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
	}

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

animate();
