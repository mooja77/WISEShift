/**
 * Privacy and data protection constants shared across frontend and backend.
 */

/**
 * K-anonymity threshold: suppress aggregate data when a category
 * contains fewer than this many entries to prevent re-identification.
 */
export const K_ANONYMITY_THRESHOLD = 5;

/**
 * Current consent version. When bumped, all users who consented
 * under an older version will be prompted to re-consent.
 */
export const CURRENT_CONSENT_VERSION = '1.0';
