export class CowIntegrationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 422
  ) {
    super(message);
    this.name = "CowIntegrationError";
  }
}
