import { TileProvider, TileProviderConfig } from '../types';

export class OSMTileProvider implements TileProvider {
  readonly id = 'osm';
  readonly name = 'OpenStreetMap Standard';

  isConfigured(): boolean {
    return true;
  }

  getTileConfig(options?: { style?: string; theme?: 'light' | 'dark' }): TileProviderConfig {
    const theme = options?.theme || 'light';

    if (theme === 'dark') {
      // CartoDB Dark Matter tiles provide clean dark theme without API key requirements
      return {
        urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
        subdomains: ['a', 'b', 'c', 'd'],
        minZoom: 0,
        maxZoom: 19,
        retina: true,
      };
    }

    return {
      urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      subdomains: ['a', 'b', 'c'],
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
