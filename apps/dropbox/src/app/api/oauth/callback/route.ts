import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken } from './service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let serverState = request.cookies.get('organisationId')?.value;

  try {
    const [code, state, error] = [
      searchParams.get('code'),
      searchParams.get('state'),
      searchParams.get('error'),
    ];

    if (error === 'access_denied') {
      return NextResponse.redirect('https://admin.elba.ninja');
    }

    if (typeof code !== 'string') {
      return NextResponse.redirect('https://admin.elba.ninja');
    }

    if (!state || state !== serverState) {
      return NextResponse.redirect('https://admin.elba.ninja');
    }

    await generateAccessToken({ authenticationCode: code, organisationId: state });

    // fetch users
    // Insert a job for user sync

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        success: false,
        message: 'authentication failed',
      },
      { status: 401 }
    );
  }
}
