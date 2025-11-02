/*
 * @Author: ztachi(legendryztachi@gmail.com)
 * @Date: 2025-11-02 23:58:09
 * @LastEditors: ztachi(legendryztachi@gmail.com)
 * @LastEditTime: 2025-11-03 00:37:33
 * @FilePath: /lib/animatedTiles.js
 * @Description: 
 */
/**
 * @author       Niklas Berg <nkholski@niklasberg.se>
 * @copyright    2018 Niklas Berg
 * @license      {@link https://github.com/nkholski/phaser3-animated-tiles/blob/master/LICENSE|MIT License}
 */

//
// This plugin is based on Photonstorms Phaser 3 plugin template with added support for ES6.
// 

class AnimatedTiles extends Phaser.Plugins.ScenePlugin {
  /*

  TODO: 
  1. Fix property names which is a mess after adding support for multiple maps, tilesets and layers.
  2. Helper functions: Get mapIndex by passing a map (and maybe support it as argument to methods), Get layerIndex, get tile index from properties.
  
  */
  constructor(scene, pluginManager) {
      super(scene, pluginManager);

      // TileMap the plugin belong to. 
      // TODO: Array or object for multiple tilemaps support
      // TODO: reference to layers too, and which is activated or not
      this.map = null;

      // Array with all tiles to animate
      // TODO: Turn on and off certain tiles.
      this.animatedTiles = [];

      // Global playback rate
      this.rate = 1;

      // Should the animations play or not?
      this.active = false;

      // Should the animations play or not per layer. If global active is false this value makes no difference
      this.activeLayer = [];

      // Obey timescale?
      this.followTimeScale = true;

      if (!scene.sys.settings.isBooted) {
          scene.sys.events.once('boot', this.boot, this);
      }
  }

  //  Called when the Plugin is booted by the PluginManager.
  //  If you need to reference other systems in the Scene (like the Loader or DisplayList) then set-up those references now, not in the constructor.
  boot() {
      var eventEmitter = this.systems.events;
      eventEmitter.on('postupdate', this.postUpdate, this);
      eventEmitter.on('shutdown', this.shutdown, this);
      eventEmitter.on('destroy', this.destroy, this);
  }

  // Initilize support for animated tiles on given map
  init(map) {
      console.log('[AnimatedTiles] 初始化, 地图:', map);
      console.log('[AnimatedTiles] 瓦片集数量:', map.tilesets.length);
      
      // 调试：打印第一个瓦片集的结构
      if (map.tilesets.length > 0) {
          const firstTileset = map.tilesets[0];
          console.log('[AnimatedTiles] 第一个瓦片集:', firstTileset.name);
          console.log('[AnimatedTiles] tileData类型:', Array.isArray(firstTileset.tileData) ? '数组' : typeof firstTileset.tileData);
          if (firstTileset.tileData) {
              if (Array.isArray(firstTileset.tileData)) {
                  console.log('[AnimatedTiles] tileData数组长度:', firstTileset.tileData.length);
                  console.log('[AnimatedTiles] 第一个tile:', firstTileset.tileData[0]);
              } else {
                  console.log('[AnimatedTiles] tileData keys:', Object.keys(firstTileset.tileData).slice(0, 5));
              }
          }
      }
      
     // TODO: Check if map is initilized already, if so do it again but overwrite the old.
     let mapAnimData = this.getAnimatedTiles(map);
     console.log('[AnimatedTiles] 找到动画瓦片数量:', mapAnimData.length);
     
     let animatedTiles = {
         map,
         animatedTiles: mapAnimData,
         active: true,
         rate: 1,
         activeLayer: []
     }
     map.layers.forEach(() => animatedTiles.activeLayer.push(true));
     this.animatedTiles.push(animatedTiles);
     if (this.animatedTiles.length === 1) {
         this.active = true; // Start the animations by default
     }
     
     // 初始化：将所有动画瓦片的index设置为第一帧
     mapAnimData.forEach(animatedTile => {
         const firstFrameTileId = animatedTile.frames[0].tileid;
         animatedTile.tiles.forEach((layer, layerIndex) => {
             let initCount = 0;
             layer.forEach(tile => {
                 if (tile && tile.index !== firstFrameTileId) {
                     tile.index = firstFrameTileId;
                     initCount++;
                 }
             });
             if (initCount > 0) {
                 console.log(`[AnimatedTiles] 初始化图层${layerIndex}: ${initCount}个瓦片设置为第一帧(${firstFrameTileId})`);
                 // 标记图层需要重新渲染
                 const tilemapLayer = map.layers[layerIndex]?.tilemapLayer;
                 if (tilemapLayer) {
                     tilemapLayer.dirty = true;
                 }
             }
         });
     });
     
     console.log('[AnimatedTiles] 初始化完成，动画系统激活:', this.active);
  }

  setRate(rate, gid = null, map = null) {
      if (gid === null) {
          if (map === null) {
              this.rate = rate;
          } else {
              this.animatedTiles[map].rate = rate;
          }
      } else {
          let loopThrough = (animatedTiles) => {
              animatedTiles.forEach(
                  (animatedTile) => {
                      if (animatedTile.index === gid) {
                          animatedTile.rate = rate;
                      }
                  }
              );
          }
          if (map === null) {
              this.animatedTiles.forEach(
                  (animatedTiles) => {
                      loopThrough(animatedTiles.animatedTiles);
                  }
              )
          } else {
              loopThrough(this.animatedTiles[map].animatedTiles);
          }
      }
      // if tile is number (gid) --> set rate for that tile
      // TODO: if passing an object -> check properties matching object and set rate
  }

  resetRates(mapIndex = null) {
      if (mapIndex === null) {
          this.rate = 1;
          this.animatedTiles.forEach(
              (mapAnimData) => {
                  mapAnimData.rate = 1;
                  mapAnimData.animatedTiles.forEach(
                      (tileAnimData) => {
                          tileAnimData.rate = 1;
                      }
                  )
              }
          );
      } else {
          this.animatedTiles[mapIndex].rate = 1;
          this.animatedTiles[mapIndex].animatedTiles.forEach(
              (tileAnimData) => {
                  tileAnimData.rate = 1;
              }
          );
      }
  }

  //  Start (or resume) animations
  resume(layerIndex = null, mapIndex = null) {
      let scope = (mapIndex === null) ? this : this.animatedTiles[mapIndex];
      if (layerIndex === null) {
          scope.active = true;
      } else {
          scope.activeLayer[layerIndex] = true;
          scope.animatedTiles.forEach(
              (animatedTile) => {
                  this.updateLayer(animatedTile, animatedTile.tiles[layerIndex]);
              }
          )
      }
  }

  // Stop (or pause) animations
  pause(layerIndex = null, mapIndex = null) {
      let scope = (mapIndex === null) ? this : this.animatedTiles[mapIndex];
      if (layerIndex === null) {
          scope.active = false;
      } else {
          scope.activeLayer[layerIndex] = false;
      }
  }

  postUpdate(time, delta) {
      if (!this.active) {
          return;
      }
      
      // 只在第一次更新时打印日志
      if (!this._loggedOnce) {
          console.log('[AnimatedTiles] postUpdate 开始运行, delta:', delta);
          this._loggedOnce = true;
      }
      
      // Elapsed time is the delta multiplied by the global rate and the scene timeScale if folowTimeScale is true
      let globalElapsedTime = delta * this.rate * (this.followTimeScale ? this.scene.time.timeScale : 1);
      this.animatedTiles.forEach(
          (mapAnimData) => {
              if (!mapAnimData.active) {
                  return;
              }
              // Multiply with rate for this map
              let elapsedTime = globalElapsedTime * mapAnimData.rate;
              mapAnimData.animatedTiles.forEach(
                  (animatedTile) => {
                      // Reduce time for current tile, multiply elapsedTime with this tile's private rate
                      animatedTile.next -= elapsedTime * animatedTile.rate;
                      // Time for current tile is up!!!
                      if (animatedTile.next < 0) {
                          // Remember current frame index
                          let currentIndex = animatedTile.currentFrame;
                          // Remember the tileId of current tile
                          let oldTileId = animatedTile.frames[currentIndex].tileid;
                          // Advance to next in line
                          let newIndex = currentIndex + 1;
                          // If we went beyond last frame, we just start over
                          if (newIndex > (animatedTile.frames.length - 1)) {
                              newIndex = 0;
                          }
                          // Set lifelength for current frame
                          animatedTile.next = animatedTile.frames[newIndex].duration;
                          // Set index of current frame
                          animatedTile.currentFrame = newIndex;
                          
                          // 新的tileId
                          let newTileId = animatedTile.frames[newIndex].tileid;
                          
                          console.log(`[AnimatedTiles] 切换动画帧: ${oldTileId} -> ${newTileId}, 帧索引: ${currentIndex} -> ${newIndex}`);
                          
                          // Loop through all tiles (via layers)
                          animatedTile.tiles.forEach((layer, layerIndex) => {
                              if (!mapAnimData.activeLayer[layerIndex]) {
                                  return;
                              }
                              
                              let updatedCount = 0;
                              layer.forEach((tile) => {
                                  if (tile && tile.index === oldTileId) {
                                      tile.index = newTileId;
                                      updatedCount++;
                                  }
                              });
                              
                              if (updatedCount > 0) {
                                  console.log(`[AnimatedTiles] 图层${layerIndex}: 更新了${updatedCount}个瓦片的index从${oldTileId}到${newTileId}`);
                                  
                                  // 标记图层需要重新渲染（关键！否则瓦片更新不会显示）
                                  const tilemapLayer = mapAnimData.map.layers[layerIndex]?.tilemapLayer;
                                  if (tilemapLayer) {
                                      tilemapLayer.dirty = true;
                                  }
                              }
                          });
                      }
                  }
              ); // animData loop
          }
      ); // Map loop
  }

  updateLayer(animatedTile, layer, oldTileId = -1) {
      let tilesToRemove = [];
      let tileId = animatedTile.frames[animatedTile.currentFrame].tileid;
      layer.forEach(
          (tile) => {
              // If the tile is removed or has another index than expected, it's
              // no longer animated. Mark for removal.
              if (oldTileId > -1 && (tile === null || tile.index !== oldTileId)) {
                  tilesToRemove.push(tile);
              } else {
                  // Finally we set the index of the tile to the one specified by current frame!!!
                  tile.index = tileId;
              }
          }
      );
      // Remove obselete tiles
      tilesToRemove.forEach(
          (tile) => {
              let pos = layer.indexOf(tile);
              if (pos > -1) {
                  layer.splice(pos, 1);
              } else {
                  console.error("This shouldn't happen. Not at all. Blame Phaser Animated Tiles plugin. You'll be fine though.");
              }

          }
      );
  }

  //  Called when a Scene shuts down, it may then come back again later (which will invoke the 'start' event) but should be considered dormant.
  shutdown() {}


  //  Called when a Scene is destroyed by the Scene Manager. There is no coming back from a destroyed Scene, so clear up all resources here.
  destroy() {
      this.shutdown();
      this.scene = undefined;
  }

  getAnimatedTiles(map) {
      // this.animatedTiles is an array of objects with information on how to animate and which tiles.
      let animatedTiles = [];
      
      console.log('[AnimatedTiles] getAnimatedTiles 开始扫描...');
      
      // loop through all tilesets
      map.tilesets.forEach((tileset, idx) => {
          console.log(`[AnimatedTiles] 扫描瓦片集 ${idx}: ${tileset.name}`);
          
          // Phaser的tileData可能是对象或数组，需要兼容处理
          let tileData = tileset.tileData;
          if (!tileData) {
              console.log(`[AnimatedTiles] 瓦片集 ${tileset.name} 没有tileData，跳过`);
              return; // 没有tile数据，跳过
          }
          
          // 支持两种格式：对象格式（老版本）和数组格式（新版本）
          let tileEntries = [];
          if (Array.isArray(tileData)) {
              // 新格式：数组 [{id: 6, animation: [...]}]
              tileEntries = tileData.map(tile => ({ index: tile.id, data: tile }));
          } else {
              // 老格式：对象 {"6": {animation: [...]}}
              tileEntries = Object.keys(tileData).map(key => ({ 
                  index: parseInt(key), 
                  data: tileData[key] 
              }));
          }
          
          tileEntries.forEach(({ index, data }) => {
              // If tile has animation info we'll dive into it
              if (data && data.animation && data.animation.length > 0) {
                  console.log(`[AnimatedTiles] 找到动画瓦片: tileset=${tileset.name}, localId=${index}, globalId=${index + tileset.firstgid}, 帧数=${data.animation.length}`);
                  
                  let animatedTileData = {
                      index: index + tileset.firstgid, // gid of the original tile
                      frames: [], // array of frames
                      currentFrame: 0, // start on first frame
                      tiles: [], // array with one array per layer with list of tiles that depends on this animation data
                      rate: 1, // multiplier, set to 2 for double speed or 0.25 quarter speed
                  };
                  
                  // push all frames to the animatedTileData
                  data.animation.forEach((frameData) => {
                      let frame = {
                          duration: frameData.duration,
                          tileid: frameData.tileid + tileset.firstgid
                      };
                      animatedTileData.frames.push(frame);
                  });
                  
                  // time until jumping to next frame
                  animatedTileData.next = animatedTileData.frames[0].duration;
                  
                  // Go through all layers for tiles
                  map.layers.forEach((layer, layerIdx) => {
                      // 检查图层类型（Phaser 3.50+已废弃StaticTilemapLayer）
                      // 现在统一为TilemapLayer，通过renderOrder检查
                      const isStaticLayer = layer.tilemapLayer && 
                          (layer.tilemapLayer.type === "StaticTilemapLayer" || 
                           layer.tilemapLayer.constructor.name === "StaticTilemapLayer");
                      
                      if (isStaticLayer) {
                          // 静态图层无法动画，推入空数组
                          animatedTileData.tiles.push([]);
                          console.log(`[AnimatedTiles] 图层 ${layerIdx}(${layer.name}) 是静态图层，跳过`);
                          return;
                      }
                      
                      // tiles array for current layer
                      let tiles = [];
                      
                      console.log(`[AnimatedTiles] 扫描图层 ${layerIdx}(${layer.name}), data类型: ${typeof layer.data}, 长度: ${layer.data?.length}`);
                      
                      // 支持无限地图（chunks）和普通地图（data）
                      if (layer.data && layer.data.length > 0) {
                          // 尝试遍历所有瓦片
                          // 对于无限地图，Phaser的layer.data是稀疏数组
                          let tileCount = 0;
                          let matchCount = 0;
                          
                          layer.data.forEach((tileRow, rowIdx) => {
                              if (tileRow && Array.isArray(tileRow)) {
                                  tileRow.forEach((tile, colIdx) => {
                                      if (tile && tile.index !== -1) {
                                          tileCount++;
                                          // 检查是否匹配动画瓦片的index
                                          if (tile.index === (index + tileset.firstgid)) {
                                              tiles.push(tile);
                                              matchCount++;
                                              console.log(`[AnimatedTiles] 找到匹配瓦片！位置(${rowIdx},${colIdx}), tile.index=${tile.index}, 期望=${index + tileset.firstgid}`);
                                          }
                                      }
                                  });
                              }
                          });
                          
                          console.log(`[AnimatedTiles] 图层 ${layer.name}: 总瓦片数=${tileCount}, 匹配动画瓦片=${matchCount}`);
                      } else {
                          console.log(`[AnimatedTiles] 图层 ${layer.name} 没有data或data为空`);
                      }
                      
                      // add the layer's array with tiles to the tiles array.
                      animatedTileData.tiles.push(tiles);
                  });
                  
                  // animatedTileData is finished for current animation, push it to the animatedTiles-property of the plugin
                  animatedTiles.push(animatedTileData);
              }
          });
      });
      
      map.layers.forEach((layer, layerIndex) => {
          // layer indices array of booleans whether to animate tiles on layer or not
          this.activeLayer[layerIndex] = true;
      });

      return animatedTiles;
  }

  putTileAt(layer, tile, x, y) {
      // Replaces putTileAt of the native API, but updates the list of animatedTiles in the process.
      // No need to call updateAnimatedTiles as required for other modificatons of the tile-map
  }

  updateAnimatedTiles() {
      // future args: x=null, y=null, w=null, h=null, container=null 
      let x = null,
          y = null,
          w = null,
          h = null,
          container = null;
      // 1. If no container, loop through all initilized maps
      if (container === null) {
          container = [];
          this.animatedTiles.forEach(
              (mapAnimData) => {
                  container.push(mapAnimData);
              }
          )
      }
      // 2. If container is a map, loop through it's layers
      // container = [container];

      // 1 & 2: Update the map(s)
      container.forEach(
          (mapAnimData) => {
              let chkX = x !== null ? x : 0;
              let chkY = y !== null ? y : 0;
              let chkW = w !== null ? mapAnimData.map.width : 10;
              let chkH = h !== null ? mapAnimData.map.height : 10;

              mapAnimData.animatedTiles.forEach(
                  (tileAnimData) => {
                      tileAnimData.tiles.forEach(
                          (tiles, layerIndex) => {
                              let layer = mapAnimData.map.layers[layerIndex];
                              // 检查是否为静态图层（兼容旧版本API）
                              const isStaticLayer = layer.tilemapLayer && 
                                  (layer.tilemapLayer.type === "StaticTilemapLayer" || 
                                   layer.tilemapLayer.constructor.name === "StaticTilemapLayer" ||
                                   layer.type === "StaticTilemapLayer");
                              
                              if (isStaticLayer) {
                                  return;
                              }
                              
                              // 支持无限地图和普通地图
                              if (!layer.data || !Array.isArray(layer.data)) {
                                  return;
                              }
                              
                              for (let x = chkX; x < (chkX + chkW); x++) {
                                  if (!layer.data[x]) continue;
                                  for (let y = chkY; y < (chkY + chkH); y++) {
                                      if (!layer.data[x][y]) continue;
                                      let tile = layer.data[x][y];
                                      // should this tile be animated?
                                      if (tile.index == tileAnimData.index) {
                                          // is it already known? if not, add it to the list
                                          if (tiles.indexOf(tile) === -1) {
                                              tiles.push(tile);
                                          }
                                          // update index to match current fram of this animation
                                          tile.index = tileAnimData.frames[tileAnimData.currentFrame].tileid;
                                      }
                                  }
                              }
                          }
                      )
                  }
              )
          }
      );
      // 3. If container is a layer, just loop through it's tiles
  }
};

//  Static function called by the PluginFile Loader.
AnimatedTiles.register = function (PluginManager) {
  //  Register this plugin with the PluginManager, so it can be added to Scenes.
  PluginManager.register('AnimatedTiles', AnimatedTiles, 'animatedTiles');
}

export default AnimatedTiles;