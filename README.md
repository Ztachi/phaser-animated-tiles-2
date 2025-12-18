# Phaser 3 Animated Tiles Plugin

A plugin that adds support for animated tiles to Phaser 3 (v3.90+), as exported from Tiled.

This is a modernized fork of the original [phaser-animated-tiles](https://github.com/nkholski/phaser-animated-tiles) plugin, maintained by [Ztachi](https://github.com/Ztachi). It has been rewritten in TypeScript and updated to support the latest Phaser versions (v3.90+) and Vite.

**Project Home**: [https://github.com/Ztachi/phaser-animated-tiles-2](https://github.com/Ztachi/phaser-animated-tiles-2)

## Features

-   ✅ Support for standard Tiled maps (fixed size)
-   ✅ Support for Infinite Maps (chunks)
-   ✅ Support for both Object and Array formats of `tileData` (Tiled export compatibility)
-   ✅ Compatible with Phaser 3.50+ (fixes deprecated `StaticTilemapLayer` usage)
-   ✅ Multi-tileset support
-   ✅ Animation rate control (global, per-map, or per-tile)
-   ✅ TypeScript support

## Installation

### NPM

```bash
npm install phaser-animated-tiles-2
```

## Usage

### 1. Import and Load the Plugin

In your scene's `preload` method, load the plugin.

```typescript
import AnimatedTiles from 'phaser-animated-tiles-2';

export default class WorldScene extends Phaser.Scene {
	preload() {
		this.load.scenePlugin('animatedTiles', AnimatedTiles, 'animatedTiles', 'animatedTiles');
	}

	create() {
		// Create your map
		const map = this.make.tilemap({ key: 'map' });
		const tileset = map.addTilesetImage('tiles', 'tiles');
		const layer = map.createLayer('Ground', tileset, 0, 0);

		// Initialize the plugin
		this.sys.animatedTiles.init(map);
	}
}
```

### 2. API Methods

The plugin is exposed via `this.sys.animatedTiles`.

| Method       | Arguments                                           | Description                                                                                                                                       |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init`       | `map: Phaser.Tilemaps.Tilemap`                      | Initialize the plugin for a specific map. Scans for animated tiles and starts animations.                                                         |
| `setRate`    | `rate: number`, `gid?: number`, `mapIndex?: number` | Set the playback rate. `rate` is a multiplier (1 = normal, 2 = double speed). Can be applied globally, to a specific tile GID, or a specific map. |
| `resetRates` | `mapIndex?: number`                                 | Reset all rates to 1.                                                                                                                             |
| `resume`     | `layerIndex?: number`, `mapIndex?: number`          | Resume animations. Can be specific to a layer or map.                                                                                             |
| `pause`      | `layerIndex?: number`, `mapIndex?: number`          | Pause animations. Can be specific to a layer or map.                                                                                              |

## Recent Updates & Fixes

This version includes several critical fixes to support modern development workflows:

### 1. Tiled Data Format Support

Fixed compatibility with newer Tiled versions which export `tileData` as an array `[{id: 6, animation: [...]}]` instead of an object. The plugin now auto-detects and handles both formats.

### 2. Phaser 3.50+ Compatibility

Replaced deprecated `StaticTilemapLayer` checks with modern `TilemapLayer` type checking. This ensures animations work correctly on all layer types that support them.

### 3. Infinite Map Support

Added proper support for Infinite Maps. The plugin now correctly scans chunks in infinite layers to find and animate tiles.

### 4. Robustness

-   Added null checks for layer data to prevent crashes with empty or sparse layers.
-   Improved logging for easier debugging of missing animations.

## Troubleshooting

**Animations not showing?**

1. Check the console for `[AnimatedTiles]` logs.
2. Ensure your layer is NOT a static layer if you want animations (though the plugin tries to handle this, static layers generally don't support texture frame updates).
3. If using Infinite Maps, ensure the chunks containing the animated tiles are loaded.

## Build

To build the project locally:

```bash
npm install
npm run build
```

The output will be in the `dist` folder.
