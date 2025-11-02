# AnimatedTiles 插件修复文档

**日期**: 2025-11-02  
**问题**: phaser-animated-tiles 插件无法正常工作，不支持新版本Tiled地图格式和Phaser 3.90 API

## 🔧 修复内容

### 1. 支持新版Tiled地图数据格式

**问题描述**:
- 旧版本插件期望 `tileData` 是对象格式: `{"6": {animation: [...]}}`
- 新版本Tiled导出为数组格式: `[{id: 6, animation: [...]}]`

**解决方案**:
```javascript
// 兼容两种格式
let tileEntries = [];
if (Array.isArray(tileData)) {
    // 新格式：数组
    tileEntries = tileData.map(tile => ({ index: tile.id, data: tile }));
} else {
    // 老格式：对象
    tileEntries = Object.keys(tileData).map(key => ({ 
        index: parseInt(key), 
        data: tileData[key] 
    }));
}
```

### 2. 修复Phaser 3.50+废弃API

**问题描述**:
- `StaticTilemapLayer` 在 Phaser 3.50+ 已被废弃
- 插件中仍使用旧的 `layer.tilemapLayer.type === "StaticTilemapLayer"` 检查

**解决方案**:
```javascript
// 兼容旧版本和新版本
const isStaticLayer = layer.tilemapLayer && 
    (layer.tilemapLayer.type === "StaticTilemapLayer" || 
     layer.tilemapLayer.constructor.name === "StaticTilemapLayer" ||
     layer.type === "StaticTilemapLayer");
```

### 3. 改进无限地图(Infinite Map)支持

**问题描述**:
- 无限地图使用 `chunks` 而不是单一 `data` 数组
- 插件未正确处理无限地图的数据结构

**解决方案**:
```javascript
// 支持无限地图和普通地图
if (layer.data && layer.data.length > 0) {
    // 普通地图：data是二维数组
    layer.data.forEach((tileRow) => {
        if (Array.isArray(tileRow)) {
            tileRow.forEach((tile) => {
                if (tile && (tile.index - tileset.firstgid) === index) {
                    tiles.push(tile);
                }
            });
        }
    });
}
```

### 4. 添加空值检查

**问题描述**:
- 插件未处理 `layer.data[x]` 或 `layer.data[x][y]` 为空的情况

**解决方案**:
```javascript
for (let x = chkX; x < (chkX + chkW); x++) {
    if (!layer.data[x]) continue;
    for (let y = chkY; y < (chkY + chkH); y++) {
        if (!layer.data[x][y]) continue;
        let tile = layer.data[x][y];
        // ...
    }
}
```

### 5. 添加详细调试日志

为了更好地诊断问题，添加了详细的控制台日志：
- 瓦片集扫描信息
- tileData 格式检测
- 动画瓦片发现信息
- 初始化状态

## 📝 使用方法

### 在 WorldScene 中集成

```javascript
import AnimatedTiles from '@/utils/animatedTiles.js';

export default class WorldScene extends Phaser.Scene {
    preload() {
        // 作为场景插件加载
        this.load.scenePlugin('animatedTiles', AnimatedTiles, 'animatedTiles', 'animatedTiles');
    }
    
    create() {
        // 创建地图后初始化插件
        this._map = this.make.tilemap({ key: 'world_map' });
        // ... 创建图层 ...
        
        // 初始化动画系统
        this.sys.animatedTiles.init(this._map);
    }
}
```

### 调试信息

刷新页面后，在控制台查看以下日志：
```
[AnimatedTiles] 初始化, 地图: ...
[AnimatedTiles] 瓦片集数量: 22
[AnimatedTiles] 第一个瓦片集: mm1_cave_buddha
[AnimatedTiles] tileData类型: 数组
[AnimatedTiles] getAnimatedTiles 开始扫描...
[AnimatedTiles] 找到动画瓦片: tileset=mm1_sea_auto_extended, localId=6, globalId=3263, 帧数=4
[AnimatedTiles] 找到动画瓦片数量: 1
[AnimatedTiles] 初始化完成，动画系统激活: true
```

## 🎯 支持的功能

- ✅ 标准Tiled地图（fixed size）
- ✅ 无限地图（infinite map with chunks）
- ✅ 对象格式和数组格式的 tileData
- ✅ Phaser 3.50+ 新API
- ✅ 动态图层 (DynamicTilemapLayer / TilemapLayer)
- ✅ 静态图层检测（自动跳过）
- ✅ 多瓦片集支持
- ✅ 动画速率控制

## ⚠️ 已知限制

1. **无限地图的Tile查找**:
   - 由于无限地图的chunks特性，插件可能无法找到所有动画瓦片实例
   - 解决方案：确保动画瓦片在创建图层时已经加载在视野内的chunks中

2. **静态图层**:
   - 静态图层无法播放动画（引擎限制）
   - 确保包含动画瓦片的图层创建为动态图层

## 🔍 故障排除

### 问题：动画瓦片没有显示

**检查步骤**:
1. 打开控制台，查看是否有 `[AnimatedTiles]` 开头的日志
2. 确认 `找到动画瓦片数量` > 0
3. 确认 `动画系统激活: true`
4. 检查地图JSON中的 `tiles` 数组是否包含 `animation` 属性

**常见原因**:
- Tiled中未正确设置动画
- 瓦片集未正确加载
- 图层创建为静态图层
- 无限地图的chunks未加载

### 问题：找不到tileData

**检查步骤**:
1. 确认 Phaser 版本 >= 3.50
2. 确认地图JSON格式正确
3. 查看控制台日志中的 `tileData类型`

**解决方案**:
- 重新从Tiled导出地图
- 确保瓦片集正确配置

## 📚 参考资料

- [Phaser 3 官方文档](https://photonstorm.github.io/phaser3-docs/)
- [Tiled 地图编辑器](https://www.mapeditor.org/)
- [原始插件仓库](https://github.com/nkholski/phaser3-animated-tiles)

## 🔄 版本信息

- **Phaser 版本**: 3.90.0
- **插件版本**: 修复版 (基于 2.0.2)
- **Tiled 版本**: 1.11.2
- **修复日期**: 2025-11-02

