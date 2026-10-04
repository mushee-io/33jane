export interface ClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export class JaneClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  assets(): Promise<any> {
    return this.request("/assets");
  }

  eligibility(input: unknown): Promise<any> {
    return this.request("/eligibility", input);
  }

  quote(input: unknown): Promise<any> {
    return this.request("/quote", input);
  }

  route(input: unknown): Promise<any> {
    return this.request("/route", input);
  }

  simulate(input: unknown): Promise<any> {
    return this.request("/simulate", input);
  }

  solve(input: unknown): Promise<any> {
    return this.request("/cow/solve", input);
  }

  evidence(): Promise<any> {
    return this.request("/evidence");
  }

  monitor(): Promise<any> {
    return this.request("/monitor");
  }

  private async request(path: string, body?: unknown): Promise<any> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`33JANE_HTTP_${response.status}:${JSON.stringify(payload)}`);
    return payload;
  }
}
