/**
 * Startup validation for environment configuration.
 * Prevents silent misconfiguration that can cause production incidents.
 */

type StartupCheckResult = {
  passed: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Validate that Cashfree server and client mode settings are in sync.
 * A mismatch between CASHFREE_MODE (server) and NEXT_PUBLIC_CASHFREE_MODE (client)
 * causes silent payment failures — orders created in one mode while SDK runs in another.
 */
export function validateCashfreeConfig(): StartupCheckResult {
  const result: StartupCheckResult = { passed: true, warnings: [], errors: [] }

  // Legacy CASHFREE_TEST_MODE is checked for backward compatibility but CASHFREE_MODE takes precedence
  const legacyTestMode = process.env.CASHFREE_TEST_MODE?.trim()
  if (legacyTestMode !== undefined) {
    result.warnings.push(
      '[Cashfree] CASHFREE_TEST_MODE is deprecated. Use CASHFREE_MODE=sandbox|production instead.'
    )
  }

  const serverMode = (process.env.CASHFREE_MODE?.trim().toLowerCase() ?? 'sandbox')
  const clientMode = (process.env.NEXT_PUBLIC_CASHFREE_MODE?.trim().toLowerCase() ?? 'sandbox')
  const serverIsProduction = serverMode === 'production'
  const clientIsProduction = clientMode === 'production'

  // Check for mode mismatch
  if (serverIsProduction && !clientIsProduction) {
    result.errors.push(
      '[Cashfree] MODE MISMATCH: Server is PRODUCTION (CASHFREE_MODE=production) ' +
      'but client SDK is SANDBOX (NEXT_PUBLIC_CASHFREE_MODE=sandbox or unset). ' +
      'Set NEXT_PUBLIC_CASHFREE_MODE=production in Vercel for this deployment.'
    )
    result.passed = false
  }

  if (!serverIsProduction && clientIsProduction) {
    result.errors.push(
      '[Cashfree] MODE MISMATCH: Server is SANDBOX (CASHFREE_MODE=sandbox or unset) ' +
      'but client SDK is PRODUCTION (NEXT_PUBLIC_CASHFREE_MODE=production). ' +
      'Either set CASHFREE_MODE=production (enable production) ' +
      'or set NEXT_PUBLIC_CASHFREE_MODE=sandbox (keep sandbox).'
    )
    result.passed = false
  }

  if (!serverIsProduction) {
    result.warnings.push('[Cashfree] Running in SANDBOX mode. Safe for development.')
  } else {
    result.warnings.push('[Cashfree] Running in PRODUCTION mode. Real payments enabled.')
  }

  return result
}