import L from 'leaflet';

/**
 * Checks if WebGL is supported by the current browser environment.
 */
export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export type MapLibreGLModule = typeof import('maplibre-gl');

/**
 * Dynamically loads maplibre-gl if available in node_modules or global scope.
 */
export async function getMapLibre(): Promise<any | null> {
  if (typeof window === 'undefined') return null;
  if ((window as any).maplibregl) {
    return (window as any).maplibregl;
  }
  try {
    const ml = await import('maplibre-gl');
    return (ml as any)?.default || ml;
  } catch {
    return null;
  }
}

export interface MaplibreGLLayerOptions extends L.LayerOptions {
  style: string | object;
  updateInterval?: number;
  padding?: number;
  onTileLoaded?: () => void;
  onError?: (err: any) => void;
}

const BaseLayer = (typeof L !== 'undefined' && L?.Layer ? L.Layer : class {}) as typeof L.Layer;

/**
 * Leaflet Layer that embeds a MapLibre GL map instance inside Leaflet's tilePane.
 * Keeps all Leaflet markers, polylines, circles, and clustering 100% intact.
 */
export class MaplibreGLLayer extends BaseLayer {
  private _container: HTMLDivElement | null = null;
  private _glMap: any = null;
  private _options: MaplibreGLLayerOptions;
  private _offset: L.Point = typeof L !== 'undefined' && L?.Point ? new L.Point(0, 0) : ({ x: 0, y: 0 } as any);
  private _zooming = false;
  private _throttledUpdate: any = null;

  constructor(options: MaplibreGLLayerOptions) {
    super(options);
    this._options = {
      updateInterval: 32,
      padding: 0.1,
      pane: 'tilePane',
      ...options,
    };
    if (typeof L !== 'undefined' && L?.Util?.throttle) {
      this._throttledUpdate = L.Util.throttle(
        this._update,
        this._options.updateInterval || 32,
        this
      );
    } else {
      this._throttledUpdate = this._update.bind(this);
    }
  }

  public getGLMap(): any {
    return this._glMap;
  }

  public onAdd(map: L.Map): this {
    if (!this._container) {
      this._initContainer(map);
    }

    const paneName = this._options.pane || 'tilePane';
    const pane = map.getPane(paneName) || map.getPane('tilePane');
    if (pane && this._container) {
      pane.appendChild(this._container);
    }

    this._initGL(map);

    this._offset = map.containerPointToLayerPoint([0, 0]);

    map.on('move', this._throttledUpdate, this);
    map.on('moveend', this._update, this);
    map.on('zoom', this._pinchZoom, this);
    map.on('zoomstart', this._zoomStart, this);
    map.on('zoomend', this._zoomEnd, this);
    map.on('resize', this._resize, this);

    return this;
  }

  public onRemove(map: L.Map): this {
    map.off('move', this._throttledUpdate, this);
    map.off('moveend', this._update, this);
    map.off('zoom', this._pinchZoom, this);
    map.off('zoomstart', this._zoomStart, this);
    map.off('zoomend', this._zoomEnd, this);
    map.off('resize', this._resize, this);

    if (this._glMap) {
      try {
        this._glMap.remove();
      } catch {
        // Ignore cleanup error
      }
      this._glMap = null;
    }

    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._container = null;

    return this;
  }

  public setStyle(style: string | object): void {
    this._options.style = style;
    if (this._glMap) {
      try {
        this._glMap.setStyle(style);
      } catch {
        // Ignore style update error
      }
    }
  }

  private _getSize(map: L.Map): L.Point {
    const pad = this._options.padding ?? 0.1;
    return map.getSize().multiplyBy(1 + pad * 2);
  }

  private _roundPoint(p: L.Point): L.Point {
    return L.point(Math.round(p.x), Math.round(p.y));
  }

  private _initContainer(map: L.Map): void {
    const container = (this._container = L.DomUtil.create('div', 'leaflet-gl-layer'));
    const pad = this._options.padding ?? 0.1;
    const size = this._getSize(map);
    const offset = map.getSize().multiplyBy(pad);

    container.style.width = size.x + 'px';
    container.style.height = size.y + 'px';
    container.style.position = 'absolute';
    container.style.pointerEvents = 'none';

    const topLeft = map.containerPointToLayerPoint([0, 0]).subtract(offset);
    L.DomUtil.setPosition(container, this._roundPoint(topLeft));
  }

  private async _initGL(map: L.Map): Promise<void> {
    const maplibregl = await getMapLibre();
    if (!maplibregl || !this._container) {
      this._options.onError?.(new Error('MapLibre GL not loaded or unavailable'));
      return;
    }

    const center = map.getCenter();
    try {
      this._glMap = new maplibregl.Map({
        container: this._container,
        style: this._options.style,
        center: [center.lng, center.lat],
        zoom: Math.max(0, map.getZoom() - 1),
        attributionControl: false,
        interactive: false,
      });

      this._glMap.on('load', () => {
        this._options.onTileLoaded?.();
      });

      this._glMap.on('render', () => {
        if (this._glMap && this._glMap.areTilesLoaded?.()) {
          this._options.onTileLoaded?.();
        }
      });

      this._glMap.on('error', (e: any) => {
        this._options.onError?.(e);
      });

      // Style canvas for Leaflet zoom transform animation
      const canvas = this._glMap.getCanvas();
      if (canvas) {
        L.DomUtil.addClass(canvas, 'leaflet-image-layer');
        L.DomUtil.addClass(canvas, 'leaflet-zoom-animated');
      }

      this._transformGL(map);
    } catch (err) {
      this._options.onError?.(err);
    }
  }

  private _update(): void {
    const map = (this as any)._map as L.Map | undefined;
    if (!map || !this._container || !this._glMap) return;

    this._offset = map.containerPointToLayerPoint([0, 0]);
    if (this._zooming) return;

    const pad = this._options.padding ?? 0.1;
    const size = this._getSize(map);
    const offset = map.getSize().multiplyBy(pad);
    const topLeft = map.containerPointToLayerPoint([0, 0]).subtract(offset);

    L.DomUtil.setPosition(this._container, this._roundPoint(topLeft));
    this._transformGL(map);

    if (
      this._glMap.transform &&
      (this._glMap.transform.width !== size.x || this._glMap.transform.height !== size.y)
    ) {
      this._container.style.width = size.x + 'px';
      this._container.style.height = size.y + 'px';
      this._glMap.resize();
    }
  }

  private _transformGL(map: L.Map): void {
    if (!this._glMap) return;
    const center = map.getCenter();
    const tr = this._glMap.transform;
    if (tr) {
      tr.center = { lng: center.lng, lat: center.lat };
      tr.zoom = Math.max(0, map.getZoom() - 1);
    }
  }

  private _pinchZoom(): void {
    const map = (this as any)._map as L.Map | undefined;
    if (!map || !this._glMap) return;
    this._glMap.jumpTo({
      zoom: Math.max(0, map.getZoom() - 1),
      center: [map.getCenter().lng, map.getCenter().lat],
    });
  }

  private _zoomStart(): void {
    this._zooming = true;
  }

  private _zoomEnd(): void {
    const map = (this as any)._map as L.Map | undefined;
    if (!map || !this._glMap) return;
    this._zooming = false;
    this._update();
  }

  private _resize(): void {
    this._update();
  }
}

export function maplibreGLLayer(options: MaplibreGLLayerOptions): MaplibreGLLayer {
  if (typeof window === 'undefined') {
    return null as unknown as MaplibreGLLayer;
  }
  return new MaplibreGLLayer(options);
}
