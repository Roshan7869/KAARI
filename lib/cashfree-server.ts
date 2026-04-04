import 'server-only'

import { createAdminClient, hasAdminClientConfig } from '@/lib/supabase/admin'

export interface ServerCashfreeConfig {
  appId: string
  secretKey: string
  isTestMode: boolean
  webhookSecret: string
}

type PaymentGatewayRow = {
  api_key: string | null
  api_secret: string | null
  webhook_secret: string | null
  is_test_mode: boolean | null
}

function getEnvCashfreeConfig(): ServerCashfreeConfig {
  return {
    appId: (process.env.CASHFREE_APP_ID || '').trim(),
    secretKey: (process.env.CASHFREE_SECRET_KEY || '').trim(),
    isTestMode:
      ((process.env.CASHFREE_TEST_MODE || process.env.NEXT_PUBLIC_CASHFREE_TEST_MODE || 'true').trim()) ===
      'true',
    webhookSecret: (process.env.CASHFREE_WEBHOOK_SECRET || '').trim(),
  }
}

async function getDatabaseCashfreeConfig(): Promise<PaymentGatewayRow | null> {
  if (!hasAdminClientConfig()) {
    return null
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('api_key, api_secret, webhook_secret, is_test_mode')
    .eq('provider', 'cashfree')
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data
}

export async function getServerCashfreeConfig(): Promise<ServerCashfreeConfig | null> {
  const envConfig = getEnvCashfreeConfig()
  const needsDatabaseLookup =
    !envConfig.appId || !envConfig.secretKey || !envConfig.webhookSecret

  if (!needsDatabaseLookup) {
    return envConfig
  }

  const dbConfig = await getDatabaseCashfreeConfig()
  const mergedConfig: ServerCashfreeConfig = {
    appId: envConfig.appId || dbConfig?.api_key || '',
    secretKey: envConfig.secretKey || dbConfig?.api_secret || '',
    isTestMode: dbConfig?.is_test_mode ?? envConfig.isTestMode,
    webhookSecret: envConfig.webhookSecret || dbConfig?.webhook_secret || '',
  }

  if (!mergedConfig.appId || !mergedConfig.secretKey) {
    return null
  }

  return mergedConfig
}

export function getCashfreeBaseUrl(isTestMode: boolean): string {
  return isTestMode ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg'
}
