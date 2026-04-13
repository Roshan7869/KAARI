import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params

  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json(
      { error: 'Invalid PIN — must be exactly 6 digits' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(
      `https://api.postalpincode.in/pincode/${pin}`,
      {
        next: { revalidate: 86400 }, // Cache 24h — PIN data rarely changes
        headers: { Accept: 'application/json' },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Lookup service unavailable' }, { status: 503 })
    }

    const data = await res.json()

    if (!data?.[0] || data[0].Status !== 'Success' || !data[0].PostOffice?.length) {
      return NextResponse.json({ error: 'PIN code not found' }, { status: 404 })
    }

    const po = data[0].PostOffice[0]

    return NextResponse.json({
      city:    po.District,
      state:   po.State,
      country: 'India',
      taluk:   po.Taluk,
    })
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 503 })
  }
}
