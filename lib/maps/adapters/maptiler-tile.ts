import { TileProvider, TileProviderConfig } from '../types';

export class MapTilerTileProvider implements TileProvider {
  readonly id = 'maptiler';
  readonly name = 'MapTiler';

  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  private getKey(): string {
    return (
      this.apiKey ||
      process.env.NEXT_PUBLIC_MAPTILER_API_KEY ||
      process.env.MAPTILER_API_KEY ||
      ''
    );
  }

  isConfigured(): boolean {
    const key = this.getKey();
    return Boolean(key && key.trim().length > 0);
  }

  getTileConfig(options?: { style?: string; theme?: 'light' | 'dark' }): TileProviderConfig {
    const key = this.getKey();
    const theme = options?.theme || 'light';
    // MapTiler style defaults: 'streets-v2' for light, 'streets-v2-dark' for dark
    const defaultStyle = theme === 'dark' ? 'streets-v2-dark' : 'streets-v2';
    const style = options?.style || defaultStyle;

    return {
      urlTemplate: `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.png?key=${key}`,
      attribution:
        '&copy; <a href="https://www.maptiler.com/" target="_blank" rel="noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      minZoom: 0,
      maxZoom: 20,
      retina: true,
    };
  }

  getAttribution(): string {
    return '&copy; <a href="https://www.maptiler.com/" target="_blank" rel="noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
  }

  getMaxZoom(): number {
    return 20;
  }

  getMinZoom(): number {
    return 0;
  }
}

export const mapTilerTileProvider = new MapTilerTileProvider();
