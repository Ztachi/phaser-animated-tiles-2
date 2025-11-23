import { Scene, Plugins, Tilemaps } from 'phaser';

interface FrameData {
	duration: number;
	tileid: number;
}

interface AnimatedTileData {
	index: number; // gid of the original tile
	frames: FrameData[];
	currentFrame: number;
	tiles: Tilemaps.Tile[][]; // array with one array per layer
	rate: number;
	next: number;
}

interface MapAnimData {
	map: Tilemaps.Tilemap;
	animatedTiles: AnimatedTileData[];
	active: boolean;
	rate: number;
	activeLayer: boolean[];
}

export default class AnimatedTiles extends Plugins.ScenePlugin {
	map: Tilemaps.Tilemap | null;
	animatedTiles: MapAnimData[];
	rate: number;
	active: boolean;
	activeLayer: boolean[];
	followTimeScale: boolean;
	private _loggedOnce: boolean;

	constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
		super(scene, pluginManager, 'AnimatedTiles');

		this.map = null;
		this.animatedTiles = [];
		this.rate = 1;
		this.active = false;
		this.activeLayer = [];
		this.followTimeScale = true;
		this._loggedOnce = false;

		if (!scene.sys.settings.isBooted) {
			scene.sys.events.once('boot', this.boot, this);
		}
	}

	boot() {
		const eventEmitter = this.systems!.events;
		eventEmitter.on('postupdate', this.postUpdate, this);
		eventEmitter.on('shutdown', this.shutdown, this);
		eventEmitter.on('destroy', this.destroy, this);
	}

	init(map: Tilemaps.Tilemap) {
		// TODO: Check if map is initialized already, if so do it again but overwrite the old.
		const mapAnimData = this.getAnimatedTiles(map);

		const animatedTiles: MapAnimData = {
			map,
			animatedTiles: mapAnimData,
			active: true,
			rate: 1,
			activeLayer: [],
		};

		map.layers.forEach(() => animatedTiles.activeLayer.push(true));
		this.animatedTiles.push(animatedTiles);

		if (this.animatedTiles.length === 1) {
			this.active = true; // Start the animations by default
		}

		// Initialize: set all animated tiles to their first frame
		mapAnimData.forEach(animatedTile => {
			const firstFrameTileId = animatedTile.frames[0].tileid;
			animatedTile.tiles.forEach((layer, layerIndex) => {
				layer.forEach(tile => {
					if (tile && tile.index !== firstFrameTileId) {
						tile.index = firstFrameTileId;
					}
				});

				// Mark layer as dirty to ensure re-render
				const tilemapLayer = map.layers[layerIndex]?.tilemapLayer;
				if (tilemapLayer) {
					// @ts-ignore - dirty property exists on TilemapLayer but might not be in definition
					tilemapLayer.dirty = true;
				}
			});
		});
	}

	setRate(rate: number, gid: number | null = null, mapIndex: number | null = null) {
		if (gid === null) {
			if (mapIndex === null) {
				this.rate = rate;
			} else {
				this.animatedTiles[mapIndex].rate = rate;
			}
		} else {
			const loopThrough = (animatedTiles: AnimatedTileData[]) => {
				animatedTiles.forEach(animatedTile => {
					if (animatedTile.index === gid) {
						animatedTile.rate = rate;
					}
				});
			};

			if (mapIndex === null) {
				this.animatedTiles.forEach(mapAnim => {
					loopThrough(mapAnim.animatedTiles);
				});
			} else {
				loopThrough(this.animatedTiles[mapIndex].animatedTiles);
			}
		}
	}

	resetRates(mapIndex: number | null = null) {
		if (mapIndex === null) {
			this.rate = 1;
			this.animatedTiles.forEach(mapAnimData => {
				mapAnimData.rate = 1;
				mapAnimData.animatedTiles.forEach(tileAnimData => {
					tileAnimData.rate = 1;
				});
			});
		} else {
			if (this.animatedTiles[mapIndex]) {
				this.animatedTiles[mapIndex].rate = 1;
				this.animatedTiles[mapIndex].animatedTiles.forEach(tileAnimData => {
					tileAnimData.rate = 1;
				});
			}
		}
	}

	resume(layerIndex: number | null = null, mapIndex: number | null = null) {
		const scope = mapIndex === null ? this : this.animatedTiles[mapIndex];
		if (layerIndex === null) {
			scope.active = true;
		} else {
			scope.activeLayer[layerIndex] = true;
			if ('animatedTiles' in scope) {
				(scope as MapAnimData).animatedTiles.forEach(animatedTile => {
					this.updateLayer(animatedTile, animatedTile.tiles[layerIndex]);
				});
			}
		}
	}

	pause(layerIndex: number | null = null, mapIndex: number | null = null) {
		const scope = mapIndex === null ? this : this.animatedTiles[mapIndex];
		if (layerIndex === null) {
			scope.active = false;
		} else {
			scope.activeLayer[layerIndex] = false;
		}
	}

	postUpdate(_time: number, delta: number) {
		if (!this.active) {
			return;
		}

		if (!this._loggedOnce) {
			// console.log('AnimatedTiles plugin active');
			this._loggedOnce = true;
		}

		// Elapsed time is the delta multiplied by the global rate and the scene timeScale if followTimeScale is true
		const globalElapsedTime = delta * this.rate * (this.followTimeScale && this.scene ? this.scene.time.timeScale : 1);

		this.animatedTiles.forEach(mapAnimData => {
			if (!mapAnimData.active) {
				return;
			}

			// Multiply with rate for this map
			const elapsedTime = globalElapsedTime * mapAnimData.rate;

			mapAnimData.animatedTiles.forEach(animatedTile => {
				// Reduce time for current tile, multiply elapsedTime with this tile's private rate
				animatedTile.next -= elapsedTime * animatedTile.rate;

				// Time for current tile is up!!!
				if (animatedTile.next < 0) {
					// Remember current frame index
					const currentIndex = animatedTile.currentFrame;
					// Remember the tileId of current tile
					const oldTileId = animatedTile.frames[currentIndex].tileid;
					// Advance to next in line
					let newIndex = currentIndex + 1;
					// If we went beyond last frame, we just start over
					if (newIndex > animatedTile.frames.length - 1) {
						newIndex = 0;
					}
					// Set lifelength for current frame
					animatedTile.next = animatedTile.frames[newIndex].duration;
					// Set index of current frame
					animatedTile.currentFrame = newIndex;

					// New tileId
					const newTileId = animatedTile.frames[newIndex].tileid;

					// Loop through all tiles (via layers)
					animatedTile.tiles.forEach((layer, layerIndex) => {
						if (!mapAnimData.activeLayer[layerIndex]) {
							return;
						}

						let updatedCount = 0;
						layer.forEach(tile => {
							if (tile && tile.index === oldTileId) {
								tile.index = newTileId;
								updatedCount++;
							}
						});

						if (updatedCount > 0) {
							// Mark layer as dirty to ensure re-render
							const tilemapLayer = mapAnimData.map.layers[layerIndex]?.tilemapLayer;
							if (tilemapLayer) {
								// @ts-ignore
								tilemapLayer.dirty = true;
							}
						}
					});
				}
			});
		});
	}

	updateLayer(animatedTile: AnimatedTileData, layer: Tilemaps.Tile[], oldTileId: number = -1) {
		const tilesToRemove: Tilemaps.Tile[] = [];
		const tileId = animatedTile.frames[animatedTile.currentFrame].tileid;

		layer.forEach(tile => {
			// If the tile is removed or has another index than expected, it's
			// no longer animated. Mark for removal.
			if (oldTileId > -1 && (tile === null || tile.index !== oldTileId)) {
				tilesToRemove.push(tile);
			} else {
				// Finally we set the index of the tile to the one specified by current frame!!!
				tile.index = tileId;
			}
		});

		// Remove obsolete tiles
		tilesToRemove.forEach(tile => {
			const pos = layer.indexOf(tile);
			if (pos > -1) {
				layer.splice(pos, 1);
			}
		});
	}

	shutdown() {
		// Cleanup if needed
	}

	destroy() {
		this.shutdown();
		// @ts-ignore
		this.scene = undefined;
	}

	getAnimatedTiles(map: Tilemaps.Tilemap): AnimatedTileData[] {
		const animatedTiles: AnimatedTileData[] = [];

		// Loop through all tilesets
		map.tilesets.forEach(tileset => {
			// Phaser's tileData can be an object or an array, need to handle both
			const tileData = tileset.tileData as any;
			if (!tileData) {
				return;
			}

			// Support both formats: Object (old) and Array (new)
			let tileEntries: { index: number; data: any }[] = [];
			if (Array.isArray(tileData)) {
				// New format: Array [{id: 6, animation: [...]}]
				tileEntries = tileData.map((tile: any) => ({ index: tile.id, data: tile }));
			} else {
				// Old format: Object {"6": {animation: [...]}}
				tileEntries = Object.keys(tileData).map(key => ({
					index: parseInt(key),
					data: tileData[key],
				}));
			}

			tileEntries.forEach(({ index, data }) => {
				// If tile has animation info we'll dive into it
				if (data && data.animation && data.animation.length > 0) {
					const animatedTileData: AnimatedTileData = {
						index: index + tileset.firstgid, // gid of the original tile
						frames: [], // array of frames
						currentFrame: 0, // start on first frame
						tiles: [], // array with one array per layer with list of tiles that depends on this animation data
						rate: 1, // multiplier
						next: 0,
					};

					// Push all frames to the animatedTileData
					data.animation.forEach((frameData: any) => {
						const frame: FrameData = {
							duration: frameData.duration,
							tileid: frameData.tileid + tileset.firstgid,
						};
						animatedTileData.frames.push(frame);
					});

					// Time until jumping to next frame
					animatedTileData.next = animatedTileData.frames[0].duration;

					// Go through all layers for tiles
					map.layers.forEach((layerData, _layerIdx) => {
						const layer = layerData.tilemapLayer;

						// Check layer type (Phaser 3.50+ deprecated StaticTilemapLayer)
						// Now unified as TilemapLayer, check via type or constructor name
						const isStaticLayer =
							layer && (layer.type === 'StaticTilemapLayer' || layer.constructor.name === 'StaticTilemapLayer');

						if (isStaticLayer) {
							// Static layers cannot be animated
							animatedTileData.tiles.push([]);
							return;
						}

						const tiles: Tilemaps.Tile[] = [];

						// Support infinite maps (chunks) and regular maps (data)
						if (layerData.data && layerData.data.length > 0) {
							// Try to traverse all tiles
							layerData.data.forEach(tileRow => {
								if (tileRow && Array.isArray(tileRow)) {
									tileRow.forEach(tile => {
										if (tile && tile.index !== -1) {
											// Check if matches animated tile index
											if (tile.index === index + tileset.firstgid) {
												tiles.push(tile);
											}
										}
									});
								}
							});
						}

						// Add the layer's array with tiles to the tiles array.
						animatedTileData.tiles.push(tiles);
					});

					// animatedTileData is finished for current animation, push it to the animatedTiles-property of the plugin
					animatedTiles.push(animatedTileData);
				}
			});
		});

		map.layers.forEach((_, layerIndex) => {
			this.activeLayer[layerIndex] = true;
		});

		return animatedTiles;
	}

	updateAnimatedTiles() {
		// Future args: x=null, y=null, w=null, h=null, container=null
		let x: number | null = null;
		let y: number | null = null;
		let w: number | null = null;
		let h: number | null = null;
		let container: any = null;

		// 1. If no container, loop through all initialized maps
		if (container === null) {
			container = [];
			this.animatedTiles.forEach(mapAnimData => {
				container.push(mapAnimData);
			});
		}

		// 1 & 2: Update the map(s)
		(container as MapAnimData[]).forEach(mapAnimData => {
			const chkX = x !== null ? x : 0;
			const chkY = y !== null ? y : 0;
			const chkW = w !== null ? mapAnimData.map.width : 10;
			const chkH = h !== null ? mapAnimData.map.height : 10;

			mapAnimData.animatedTiles.forEach(tileAnimData => {
				tileAnimData.tiles.forEach((tiles, layerIndex) => {
					const layer = mapAnimData.map.layers[layerIndex];
					const tilemapLayer = layer.tilemapLayer;

					// Check if static layer
					const isStaticLayer =
						tilemapLayer &&
						(tilemapLayer.type === 'StaticTilemapLayer' || tilemapLayer.constructor.name === 'StaticTilemapLayer');

					if (isStaticLayer) {
						return;
					}

					// Support infinite maps and regular maps
					if (!layer.data || !Array.isArray(layer.data)) {
						return;
					}

					for (let x = chkX; x < chkX + chkW; x++) {
						if (!layer.data[x]) continue;
						for (let y = chkY; y < chkY + chkH; y++) {
							if (!layer.data[x][y]) continue;
							const tile = layer.data[x][y];
							// Should this tile be animated?
							if (tile.index == tileAnimData.index) {
								// Is it already known? If not, add it to the list
								if (tiles.indexOf(tile) === -1) {
									tiles.push(tile);
								}
								// Update index to match current frame of this animation
								tile.index = tileAnimData.frames[tileAnimData.currentFrame].tileid;
							}
						}
					}
				});
			});
		});
	}

	static register(PluginManager: any) {
		PluginManager.register('AnimatedTiles', AnimatedTiles, 'animatedTiles');
	}
}
