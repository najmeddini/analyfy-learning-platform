import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code       = searchParams.get('code');
  const next       = searchParams.get('next') ?? '/explore';
  const invitedBy  = searchParams.get('invited_by'); // set during invite signup

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this signup came through an invite link, record the referrer.
      // Only write if profile doesn't already have an invited_by value.
      if (invitedBy && data?.user?.id) {
        await supabase
          .from('profiles')
          .update({ invited_by: invitedBy })
          .eq('user_id', data.user.id)
          .is('invited_by', null); // never overwrite an existing referrer
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
