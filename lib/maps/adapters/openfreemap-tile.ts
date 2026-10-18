import { TileProvider, TileProviderConfig } from '../types';

export class OpenFreeMapTileProvider implements TileProvider {
  readonly id = 'openfreemap';
  readonly name = 'OpenFreeMap';

  isConfigured(): boolean {
    return true; // Zero API key required
  }

  getTileConfig(options?: { style?: string; theme?: 'light' | 'dark' }): TileProviderConfig {
    const theme = options?.theme || 'light';
    const style = options?.style || (theme === 'dark' ? 'dark' : 'liberty');

    return {
      urlTemplate: `https://tiles.openfreemap.org/styles/${style}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>',
      minZoom: 0,
      maxZoom: 19,
    };
  }

  getAttribution(): string {
    return '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>';
  }

  getMaxZoom(): number {
    return 19;
  }

  getMinZoom(): number {
    return 0;
  }
}

export const openFreeMapTileProvider = new OpenFreeMapTileProvider();
