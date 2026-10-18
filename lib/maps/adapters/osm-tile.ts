import { TileProvider, TileProviderConfig } from '../types';

export class OSMTileProvider implements TileProvider {
  readonly id = 'osm';
  readonly name = 'OpenStreetMap Standard';

  isConfigured(): boolean {
    return true;
  }

  getTileConfig(options?: { style?: string; theme?: 'light' | 'dark' }): TileProviderConfig {
    return {
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      minZoom: 0,
      maxZoom: 19,
    };
  }

  getAttribution(): string {
    return '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
  }

  getMaxZoom(): number {
    return 19;
  }

  getMinZoom(): number {
    return 0;
  }
}

export const osmTileProvider = new OSMTileProvider();
