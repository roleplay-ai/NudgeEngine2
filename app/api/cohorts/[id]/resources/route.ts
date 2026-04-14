import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: cohortId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: resources, error } = await supabase
    .from('resources')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ resources: resources ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: cohortId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: callerUC } = await supabase
    .from('user_companies')
    .select('role, company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!callerUC || !['superadmin', 'hr', 'trainer'].includes(callerUC.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const title = formData.get('title') as string;
  const type = formData.get('type') as string;
  const durationMinutes = formData.get('duration_minutes') as string;

  if (!title || !type) {
    return NextResponse.json({ error: 'title and type are required' }, { status: 400 });
  }

  let fileUrl = '';

  if (file) {
    const admin = createAdminClient();
    const ext = file.name.split('.').pop();
    const storagePath = `${cohortId}/${Date.now()}-${file.name}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadErr } = await admin.storage
      .from('resources')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });

    const { data: urlData } = admin.storage.from('resources').getPublicUrl(uploadData.path);
    fileUrl = urlData.publicUrl;
  } else {
    fileUrl = (formData.get('file_url') as string) ?? '';
  }

  const { data: maxSort } = await supabase
    .from('resources')
    .select('sort_order')
    .eq('cohort_id', cohortId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSort = (maxSort?.sort_order ?? 0) + 1;

  const { data: resource, error: insertErr } = await supabase
    .from('resources')
    .insert({
      cohort_id: cohortId,
      title,
      type,
      file_url: fileUrl,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      sort_order: nextSort,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ resource }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get('resource_id');

  if (!resourceId) return NextResponse.json({ error: 'resource_id required' }, { status: 400 });

  const { data: resource } = await supabase
    .from('resources')
    .select('id, file_url')
    .eq('id', resourceId)
    .single();

  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });

  if (resource.file_url) {
    try {
      const admin = createAdminClient();
      const urlPath = new URL(resource.file_url).pathname;
      const storagePath = urlPath.split('/resources/')[1];
      if (storagePath) {
        await admin.storage.from('resources').remove([storagePath]);
      }
    } catch {
      // Storage deletion is best-effort
    }
  }

  const { error } = await supabase.from('resources').delete().eq('id', resourceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
