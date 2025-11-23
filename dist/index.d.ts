import { Plugins } from 'phaser';
import { Scene } from 'phaser';
import { Tilemaps } from 'phaser';

declare interface AnimatedTileData {
    index: number;
    frames: FrameData[];
    currentFrame: number;
    tiles: Tilemaps.Tile[][];
    rate: number;
    next: number;
}

declare class AnimatedTiles extends Plugins.ScenePlugin {
    map: Tilemaps.Tilemap | null;
    animatedTiles: MapAnimData[];
    rate: number;
    active: boolean;
    activeLayer: boolean[];
    followTimeScale: boolean;
    private _loggedOnce;
    constructor(scene: Scene, pluginManager: Plugins.PluginManager);
    boot(): void;
    init(map: Tilemaps.Tilemap): void;
    setRate(rate: number, gid?: number | null, mapIndex?: number | null): void;
    resetRates(mapIndex?: number | null): void;
    resume(layerIndex?: number | null, mapIndex?: number | null): void;
    pause(layerIndex?: number | null, mapIndex?: number | null): void;
    postUpdate(_time: number, delta: number): void;
    updateLayer(animatedTile: AnimatedTileData, layer: Tilemaps.Tile[], oldTileId?: number): void;
    shutdown(): void;
    destroy(): void;
    getAnimatedTiles(map: Tilemaps.Tilemap): AnimatedTileData[];
    updateAnimatedTiles(): void;
    static register(PluginManager: any): void;
}
export default AnimatedTiles;

declare interface FrameData {
    duration: number;
    tileid: number;
}

declare interface MapAnimData {
    map: Tilemaps.Tilemap;
    animatedTiles: AnimatedTileData[];
    active: boolean;
    rate: number;
    activeLayer: boolean[];
}

export { }
