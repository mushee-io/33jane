export type CowNetwork = "mainnet" | "xdai" | "arbitrum_one" | "base" | "sepolia";

export interface CowQuoteRequest {
  sellToken: string;
  buyToken: string;
  sellAmountBeforeFee: string;
  kind: "sell" | "buy";
  from: string;
  receiver?: string;
  priceQuality?: "optimal" | "fast" | "verified";
}

export class CowOrderbookClient {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async getQuote(network: CowNetwork, request: CowQuoteRequest): Promise<Record<string, any>> {
    const response = await this.fetchImpl(`https://api.cow.fi/${network}/api/v1/quote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`COW_QUOTE_HTTP_${response.status}:${text.slice(0, 500)}`);
    }

    return await response.json() as Record<string, any>;
  }
}
