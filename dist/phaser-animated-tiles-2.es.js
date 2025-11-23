var L = Object.defineProperty;
var g = (p, m, e) => m in p ? L(p, m, { enumerable: !0, configurable: !0, writable: !0, value: e }) : p[m] = e;
var y = (p, m, e) => g(p, typeof m != "symbol" ? m + "" : m, e);
import { Plugins as v } from "phaser";
class E extends v.ScenePlugin {
  constructor(e, i) {
    super(e, i, "AnimatedTiles");
    y(this, "map");
    y(this, "animatedTiles");
    y(this, "rate");
    y(this, "active");
    y(this, "activeLayer");
    y(this, "followTimeScale");
    y(this, "_loggedOnce");
    this.map = null, this.animatedTiles = [], this.rate = 1, this.active = !1, this.activeLayer = [], this.followTimeScale = !0, this._loggedOnce = !1, e.sys.settings.isBooted || e.sys.events.once("boot", this.boot, this);
  }
  boot() {
    const e = this.systems.events;
    e.on("postupdate", this.postUpdate, this), e.on("shutdown", this.shutdown, this), e.on("destroy", this.destroy, this);
  }
  init(e) {
    const i = this.getAnimatedTiles(e), s = {
      map: e,
      animatedTiles: i,
      active: !0,
      rate: 1,
      activeLayer: []
    };
    e.layers.forEach(() => s.activeLayer.push(!0)), this.animatedTiles.push(s), this.animatedTiles.length === 1 && (this.active = !0), i.forEach((a) => {
      const o = a.frames[0].tileid;
      a.tiles.forEach((t, n) => {
        var r;
        t.forEach((l) => {
          l && l.index !== o && (l.index = o);
        });
        const h = (r = e.layers[n]) == null ? void 0 : r.tilemapLayer;
        h && (h.dirty = !0);
      });
    });
  }
  setRate(e, i = null, s = null) {
    if (i === null)
      s === null ? this.rate = e : this.animatedTiles[s].rate = e;
    else {
      const a = (o) => {
        o.forEach((t) => {
          t.index === i && (t.rate = e);
        });
      };
      s === null ? this.animatedTiles.forEach((o) => {
        a(o.animatedTiles);
      }) : a(this.animatedTiles[s].animatedTiles);
    }
  }
  resetRates(e = null) {
    e === null ? (this.rate = 1, this.animatedTiles.forEach((i) => {
      i.rate = 1, i.animatedTiles.forEach((s) => {
        s.rate = 1;
      });
    })) : this.animatedTiles[e] && (this.animatedTiles[e].rate = 1, this.animatedTiles[e].animatedTiles.forEach((i) => {
      i.rate = 1;
    }));
  }
  resume(e = null, i = null) {
    const s = i === null ? this : this.animatedTiles[i];
    e === null ? s.active = !0 : (s.activeLayer[e] = !0, "animatedTiles" in s && s.animatedTiles.forEach((a) => {
      this.updateLayer(a, a.tiles[e]);
    }));
  }
  pause(e = null, i = null) {
    const s = i === null ? this : this.animatedTiles[i];
    e === null ? s.active = !1 : s.activeLayer[e] = !1;
  }
  postUpdate(e, i) {
    if (!this.active)
      return;
    this._loggedOnce || (this._loggedOnce = !0);
    const s = i * this.rate * (this.followTimeScale && this.scene ? this.scene.time.timeScale : 1);
    this.animatedTiles.forEach((a) => {
      if (!a.active)
        return;
      const o = s * a.rate;
      a.animatedTiles.forEach((t) => {
        if (t.next -= o * t.rate, t.next < 0) {
          const n = t.currentFrame, h = t.frames[n].tileid;
          let r = n + 1;
          r > t.frames.length - 1 && (r = 0), t.next = t.frames[r].duration, t.currentFrame = r;
          const l = t.frames[r].tileid;
          t.tiles.forEach((d, T) => {
            var u;
            if (!a.activeLayer[T])
              return;
            let f = 0;
            if (d.forEach((c) => {
              c && c.index === h && (c.index = l, f++);
            }), f > 0) {
              const c = (u = a.map.layers[T]) == null ? void 0 : u.tilemapLayer;
              c && (c.dirty = !0);
            }
          });
        }
      });
    });
  }
  updateLayer(e, i, s = -1) {
    const a = [], o = e.frames[e.currentFrame].tileid;
    i.forEach((t) => {
      s > -1 && (t === null || t.index !== s) ? a.push(t) : t.index = o;
    }), a.forEach((t) => {
      const n = i.indexOf(t);
      n > -1 && i.splice(n, 1);
    });
  }
  shutdown() {
  }
  destroy() {
    this.shutdown(), this.scene = void 0;
  }
  getAnimatedTiles(e) {
    const i = [];
    return e.tilesets.forEach((s) => {
      const a = s.tileData;
      if (!a)
        return;
      let o = [];
      Array.isArray(a) ? o = a.map((t) => ({ index: t.id, data: t })) : o = Object.keys(a).map((t) => ({
        index: parseInt(t),
        data: a[t]
      })), o.forEach(({ index: t, data: n }) => {
        if (n && n.animation && n.animation.length > 0) {
          const h = {
            index: t + s.firstgid,
            // gid of the original tile
            frames: [],
            // array of frames
            currentFrame: 0,
            // start on first frame
            tiles: [],
            // array with one array per layer with list of tiles that depends on this animation data
            rate: 1,
            // multiplier
            next: 0
          };
          n.animation.forEach((r) => {
            const l = {
              duration: r.duration,
              tileid: r.tileid + s.firstgid
            };
            h.frames.push(l);
          }), h.next = h.frames[0].duration, e.layers.forEach((r, l) => {
            const d = r.tilemapLayer;
            if (d && (d.type === "StaticTilemapLayer" || d.constructor.name === "StaticTilemapLayer")) {
              h.tiles.push([]);
              return;
            }
            const f = [];
            r.data && r.data.length > 0 && r.data.forEach((u) => {
              u && Array.isArray(u) && u.forEach((c) => {
                c && c.index !== -1 && c.index === t + s.firstgid && f.push(c);
              });
            }), h.tiles.push(f);
          }), i.push(h);
        }
      });
    }), e.layers.forEach((s, a) => {
      this.activeLayer[a] = !0;
    }), i;
  }
  updateAnimatedTiles() {
    let e = null;
    e === null && (e = [], this.animatedTiles.forEach((i) => {
      e.push(i);
    })), e.forEach((i) => {
      i.animatedTiles.forEach((n) => {
        n.tiles.forEach((h, r) => {
          const l = i.map.layers[r], d = l.tilemapLayer;
          if (!(d && (d.type === "StaticTilemapLayer" || d.constructor.name === "StaticTilemapLayer")) && !(!l.data || !Array.isArray(l.data))) {
            for (let f = 0; f < 10; f++)
              if (l.data[f])
                for (let u = 0; u < 10; u++) {
                  if (!l.data[f][u]) continue;
                  const c = l.data[f][u];
                  c.index == n.index && (h.indexOf(c) === -1 && h.push(c), c.index = n.frames[n.currentFrame].tileid);
                }
          }
        });
      });
    });
  }
  static register(e) {
    e.register("AnimatedTiles", E, "animatedTiles");
  }
}
export {
  E as default
};
