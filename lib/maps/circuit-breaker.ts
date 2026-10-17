import { CircuitBreakerState, ProviderCategory, ProviderStatus } from './types';

export const CIRCUIT_BREAKER_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes (600,000 ms)
export const CONSECUTIVE_FAILURES_THRESHOLD = 3;

export interface FailureDetails {
  status?: number;
  isTimeout?: boolean;
  message?: string;
}

export class CircuitBreaker {
  private statuses = new Map<string, ProviderStatus>();
  private halfOpenProbeInFlight = new Set<string>();

  constructor() {}

  /**
   * Retrieves or initializes provider status record
   */
  public getStatus(providerId: string, category: ProviderCategory = 'geocode'): ProviderStatus {
    let status = this.statuses.get(providerId);
    if (!status) {
      status = {
        providerId,
        category,
        state: 'closed',
        consecutiveFailures: 0,
        totalFailures: 0,
        totalSuccesses: 0,
      };
      this.statuses.set(providerId, status);
    }
    return status;
  }

  /**
   * Checks whether the circuit allows a request to proceed for a given provider.
   * If the circuit is open but the 10-minute cooldown has elapsed, it transitions to 'half-open'
   * and allows a single trial request.
   */
  public canExecute(providerId: string, category: ProviderCategory = 'geocode'): boolean {
    const status = this.getStatus(providerId, category);
    const now = Date.now();

    if (status.state === 'closed') {
      return true;
    }

    if (status.state === 'open') {
      if (status.circuitOpenUntil && now >= status.circuitOpenUntil) {
        // Cooldown period elapsed -> transition to half-open
        status.state = 'half-open';
        status.circuitOpenUntil = undefined;
        this.halfOpenProbeInFlight.delete(providerId);
        return true;
      }
      return false;
    }

    if (status.state === 'half-open') {
      // Allow only a single trial request in half-open state
      if (!this.halfOpenProbeInFlight.has(providerId)) {
        this.halfOpenProbeInFlight.add(providerId);
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Records a successful execution.
   * Resets consecutive failures and transitions 'half-open' / 'open' back to 'closed'.
   */
  public recordSuccess(providerId: string, category: ProviderCategory = 'geocode'): void {
    const status = this.getStatus(providerId, category);
    status.consecutiveFailures = 0;
    status.state = 'closed';
    status.circuitOpenUntil = undefined;
    status.totalSuccesses += 1;
    status.lastSuccessTime = Date.now();
    this.halfOpenProbeInFlight.delete(providerId);
  }

  /**
   * Records an execution failure.
   * Trips to 'open' state (10 minute cooldown) if:
   * - HTTP 429 (Rate limited / Quota exhausted)
   * - Request timeout
   * - Consecutive failures >= 3
   * - Probe failed in 'half-open' state
   */
  public recordFailure(
    providerId: string,
    error?: unknown,
    category: ProviderCategory = 'geocode'
  ): void {
    const status = this.getStatus(providerId, category);
    const now = Date.now();

    status.consecutiveFailures += 1;
    status.totalFailures += 1;
    status.lastFailureTime = now;

    const details = this.extractErrorDetails(error);
    status.lastError = details.message || 'Unknown provider error';

    const isHttp429 = details.status === 429;
    const isTimeout = details.isTimeout === true;
    const thresholdReached = status.consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD;
    const wasHalfOpen = status.state === 'half-open';

    if (isHttp429 || isTimeout || thresholdReached || wasHalfOpen) {
      status.state = 'open';
      status.circuitOpenUntil = now + CIRCUIT_BREAKER_COOLDOWN_MS;
      this.halfOpenProbeInFlight.delete(providerId);
    }
  }

  /**
   * Returns a copy of all tracked provider statuses
   */
  public getAllStatuses(): ProviderStatus[] {
    return Array.from(this.statuses.values()).map((s) => ({ ...s }));
  }

  /**
   * Resets status for a specific provider or all providers
   */
  public reset(providerId?: string): void {
    if (providerId) {
      this.statuses.delete(providerId);
      this.halfOpenProbeInFlight.delete(providerId);
    } else {
      this.statuses.clear();
      this.halfOpenProbeInFlight.clear();
    }
  }

  private extractErrorDetails(error: unknown): FailureDetails {
    if (!error) {
      return {};
    }

    if (typeof error === 'object') {
      const errObj = error as Record<string, unknown>;
      const status = typeof errObj.status === 'number' ? errObj.status : undefined;
      const isTimeout =
        Boolean(errObj.isTimeout) ||
        errObj.name === 'AbortError' ||
        errObj.name === 'TimeoutError' ||
        (typeof errObj.message === 'string' && /timeout|aborted|timed out/i.test(errObj.message));
      const message = typeof errObj.message === 'string' ? errObj.message : String(error);

      return { status, isTimeout, message };
    }

    return { message: String(error) };
  }
}

// Global singleton instance for KindLink maps
export const circuitBreaker = new CircuitBreaker();
