import { Injectable } from '@nestjs/common';

export type OzonIntegrationStatusName =
  'NOT_CONFIGURED' | 'AUTHORIZED_UNTESTED' | 'LIVE_READ_VERIFIED';

export interface OzonStatus {
  provider: 'OZON';
  status: OzonIntegrationStatusName;
  configured: boolean;
  live: boolean;
  mode: string;
  message: string;
}

export interface OzonOperationResult extends OzonStatus {
  httpAttempted: boolean;
  httpStatus?: number;
  orders?: never;
}

export interface OzonOrdersPageOptions {
  since?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

/**
 * Deliberately conservative Ozon Seller API boundary.
 *
 * This adapter does not synthesize orders and does not claim connectivity from
 * the presence of credentials. The current repository only needs the honest
 * state machine until the exact current read endpoint and response contract
 * are verified against Ozon's official documentation.
 */
@Injectable()
export class OzonAdapter {
  /** Official Seller API host; no request is made by this skeleton yet. */
  private readonly sellerApiBaseUrl = 'https://api-seller.ozon.ru';

  getStatus(): OzonStatus {
    const configured = this.hasCredentials();
    const mode = process.env.OZON_MODE?.trim() || 'NOT_CONFIGURED';

    if (!configured) {
      return {
        provider: 'OZON',
        status: 'NOT_CONFIGURED',
        configured: false,
        live: false,
        mode,
        message:
          'Ozon Client-Id and Api-Key are not configured; live calls are blocked.',
      };
    }

    return {
      provider: 'OZON',
      status: 'AUTHORIZED_UNTESTED',
      configured: true,
      live: false,
      mode,
      message:
        'Ozon credentials are present but no live Seller API read has been verified.',
    };
  }

  async ping(): Promise<OzonOperationResult> {
    const status = this.getStatus();
    if (!status.configured) {
      return { ...status, httpAttempted: false };
    }

    return {
      ...status,
      httpAttempted: false,
      httpStatus: 501,
      message: this.unverifiedEndpointMessage('ping'),
    };
  }

  async listOrdersPage(
    _options: OzonOrdersPageOptions = {},
  ): Promise<OzonOperationResult> {
    const status = this.getStatus();
    if (!status.configured) {
      return { ...status, httpAttempted: false };
    }

    return {
      ...status,
      httpAttempted: false,
      httpStatus: 501,
      message: this.unverifiedEndpointMessage('order read'),
    };
  }

  private hasCredentials(): boolean {
    return Boolean(
      process.env.OZON_CLIENT_ID?.trim() && process.env.OZON_API_KEY?.trim(),
    );
  }

  private unverifiedEndpointMessage(operation: string): string {
    // TODO(ozon): verify the current official read/ping endpoint and response
    // contract, then replace this guarded result with a real HTTP request.
    return `Ozon ${operation} is not attempted: the current Seller API endpoint and response contract need verification before enabling HTTP calls (base URL: ${this.sellerApiBaseUrl}). No order data was returned.`;
  }
}
