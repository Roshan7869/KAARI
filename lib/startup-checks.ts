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
 * A mismatch between CASHFREE_TEST_MODE (server) and NEXT_PUBLIC_CASHFREE_MODE (client)
 * causes silent payment failures — orders created in one mode while SDK runs in another.
 */
export function validateCashfreeConfig(): StartupCheckResult {
  const result: StartupCheckResult = { passed: true, warnings: [], errors: [] }

  const serverTestMode = (process.env.CASHFREE_TEST_MODE?.trim() ?? 'true') !== 'false'
  const clientMode = process.env.NEXT_PUBLIC_CASHFREE_MODE?.trim() ?? 'sandbox'
  const clientIsProduction = clientMode === 'production'

  // Check for mode mismatch
  if (!serverTestMode && !clientIsProduction) {
    result.errors.push(
      '[Cashfree] MODE MISMATCH: Server is PRODUCTION (CASHFREE_TEST_MODE=false) ' +
      'but client SDK is SANDBOX (NEXT_PUBLIC_CASHFREE_MODE=sandbox or unset). ' +
      'Set NEXT_PUBLIC_CASHFREE_MODE=production in Vercel for this deployment.'
    )
    result.passed = false
  }

  if (serverTestMode && clientIsProduction) {
    result.errors.push(
      '[Cashfree] MODE MISMATCH: Server is SANDBOX (CASHFREE_TEST_MODE=true or unset) ' +
      'but client SDK is PRODUCTION (NEXT_PUBLIC_CASHFREE_MODE=production). ' +
      'Either set CASHFREE_TEST_MODE=false (enable production) ' +
      'or set NEXT_PUBLIC_CASHFREE_MODE=sandbox (keep sandbox).'
    )
    result.passed = false
  }

  if (serverTestMode) {
    result.warnings.push('[Cashfree] Running in SANDBOX mode. Safe for development.')
  } else {
    result.warnings.push('[Cashfree] Running in PRODUCTION mode. Real payments enabled.')
  }

  return result
}