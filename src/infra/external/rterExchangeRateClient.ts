export interface ExchangeRateApiResponse {
  [key: string]: {
    Exrate: number;
    UTC: string;
  };
}

export class RterExchangeRateClient {
  private readonly baseUrl: string;

  constructor() {
    const isDev = import.meta.env.DEV;
    this.baseUrl = isDev ? '/rter-api' : 'https://tw.rter.info';
  }

  async fetchAllRates(): Promise<ExchangeRateApiResponse> {
    const response = await fetch(`${this.baseUrl}/capi.php`);
    if (!response.ok) {
      throw new Error(`rter.info API HTTP error: ${response.status}`);
    }
    return response.json();
  }
}

export const rterExchangeRateClient = new RterExchangeRateClient();
