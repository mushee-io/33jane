export class JsonRpcClient {
  private nextId = 1;

  constructor(
    readonly url: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async call<T>(method: string, params: unknown[]): Promise<T> {
    const response = await this.fetchImpl(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.nextId++,
        method,
        params
      })
    });

    if (!response.ok) throw new Error(`RPC_HTTP_${response.status}`);
    const payload = await response.json() as { result?: T; error?: { code: number; message: string } };
    if (payload.error) throw new Error(`RPC_${payload.error.code}:${payload.error.message}`);
    if (payload.result === undefined) throw new Error("RPC_MISSING_RESULT");
    return payload.result;
  }

  async blockNumber(): Promise<string> {
    return this.call<string>("eth_blockNumber", []);
  }

  async getCode(address: string): Promise<string> {
    return this.call<string>("eth_getCode", [address, "latest"]);
  }

  async ethCall(tx: { from?: string; to: string; data?: string; value?: string }): Promise<string> {
    return this.call<string>("eth_call", [tx, "latest"]);
  }
}
