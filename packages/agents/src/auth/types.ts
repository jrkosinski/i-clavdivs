/**
 * Authentication profile types and interfaces
 */

/**
 * API key-based authentication credential
 */
export interface IApiKeyCredential {
  type: 'api_key';
  provider: string;
  key?: string;
  email?: string;
  /** Provider-specific metadata (e.g., account IDs, regions) */
  metadata?: Record<string, string>;
}

/**
 * Bearer token authentication credential
 */
export interface ITokenCredential {
  type: 'token';
  provider: string;
  token: string;
  /** Token expiry timestamp (ms since epoch) */
  expires?: number;
  email?: string;
}

/**
 * OAuth authentication credential with refresh support
 */
export interface IOAuthCredential {
  type: 'oauth';
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  clientId?: string;
  email?: string;
}

/**
 * Union type of all credential types
 */
export type AuthProfileCredential = IApiKeyCredential | ITokenCredential | IOAuthCredential;

/**
 * Failure reason for authentication profile
 */
export type AuthProfileFailureReason =
  | 'auth'        // authentication failed
  | 'format'      // request format error
  | 'rate_limit'  // rate limit exceeded
  | 'billing'     // billing/quota issue
  | 'timeout'     // request timeout
  | 'unknown';    // unclassified error

/**
 * Usage statistics for an authentication profile
 */
export interface IProfileUsageStats {
  /** Last time this profile was used (ms since epoch) */
  lastUsed?: number;
  /** Profile is in cooldown until this timestamp (ms since epoch) */
  cooldownUntil?: number;
  /** Profile is disabled until this timestamp (ms since epoch) */
  disabledUntil?: number;
  /** Reason profile was disabled */
  disabledReason?: AuthProfileFailureReason;
  /** Total error count */
  errorCount?: number;
  /** Error counts per failure reason */
  failureCounts?: Partial<Record<AuthProfileFailureReason, number>>;
  /** Last failure timestamp (ms since epoch) */
  lastFailureAt?: number;
}

/**
 * Authentication profile store structure
 */
export interface IAuthProfileStore {
  /** Store schema version */
  version: number;
  /** Authentication profiles keyed by profile ID */
  profiles: Record<string, AuthProfileCredential>;
  /** Per-agent profile order preferences */
  order?: Record<string, string[]>;
  /** Last successful profile per provider */
  lastGood?: Record<string, string>;
  /** Usage statistics per profile */
  usageStats?: Record<string, IProfileUsageStats>;
}

/**
 * Configuration for authentication profile selection
 */
export interface IAuthProfileConfig {
  /** Provider to authenticate with */
  provider: string;
  /** Specific profile ID to use (optional) */
  profileId?: string;
  /** Agent ID for agent-specific profile preferences */
  agentId?: string;
}

/**
 * Resolved authentication profile with credentials
 */
export interface IResolvedAuthProfile {
  /** Profile identifier */
  profileId: string;
  /** Provider name */
  provider: string;
  /** Authentication credential */
  credential: AuthProfileCredential;
  /** Usage statistics */
  stats?: IProfileUsageStats;
}
