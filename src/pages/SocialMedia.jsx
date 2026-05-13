import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Share2, Facebook, Instagram, Twitter, MessageCircle, Plug, Plug2,
  Upload, Image as ImageIcon, Send, Calendar, Clock, CheckCircle2,
  AlertCircle, X, Trash2, Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useRole } from '../contexts/RoleContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { makeReq } from '../api.js';

// ─────────────────────────────────────────────────────────────────────────────
// Platform metadata. `connect_fields` describes which inputs the connect modal
// renders for each platform. `accent` is a Tailwind colour pair used for the
// chip / icon background to make the cards visually distinct.
// ─────────────────────────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    key:   'facebook',
    label: 'Facebook Page',
    icon:  Facebook,
    accent:{ bg: 'bg-[#1877F2]/10', fg: 'text-[#1877F2]' },
    connect_fields: [
      { name: 'account_label', label: 'Page name (display only)', placeholder: 'Grace Community Church' },
      { name: 'page_id',       label: 'Page ID',                  placeholder: '123456789012345',         required: true, meta: true },
      { name: 'access_token',  label: 'Page Access Token',        placeholder: 'EAAJ...', required: true, secret: true,
        hint: 'Long-lived Page Access Token from Graph API Explorer (pages_manage_posts + pages_read_engagement).' },
    ],
    live: true,
  },
  {
    key:   'instagram',
    label: 'Instagram',
    icon:  Instagram,
    accent:{ bg: 'bg-pink-100', fg: 'text-pink-600' },
    connect_fields: [
      { name: 'account_label', label: 'Handle',                    placeholder: '@gracechurch' },
      { name: 'ig_user_id',    label: 'IG User ID',                placeholder: '17841400000000000', required: true, meta: true },
      { name: 'access_token',  label: 'Page Access Token',         placeholder: 'EAAJ...', required: true, secret: true,
        hint: 'Same Page Access Token as Facebook (IG must be a Business account linked to the FB Page).' },
    ],
    live: true,
    note: 'Instagram fetches the flyer from this app\'s public media route — no extra hosting needed.',
  },
  {
    key:   'twitter',
    label: 'X / Twitter',
    icon:  Twitter,
    accent:{ bg: 'bg-zinc-100', fg: 'text-zinc-900' },
    connect_fields: [
      { name: 'account_label', label: 'Handle',                    placeholder: '@gracechurch' },
      { name: 'access_token',  label: 'Bearer / OAuth token',      placeholder: 'AAAA...', required: true, secret: true },
    ],
    live: false,
    note: 'X publishing is a stub in this build — credentials save, but the API call is not yet wired.',
  },
  {
    key:   'whatsapp',
    label: 'WhatsApp',
    icon:  MessageCircle,
    accent:{ bg: 'bg-emerald-100', fg: 'text-emerald-700' },
    connect_fields: [
      { name: 'account_label',     label: 'Display name',           placeholder: 'Grace Church Broadcast' },
      { name: 'phone_number_id',   label: 'Phone Number ID',        placeholder: '11122233344', required: true, meta: true },
      { name: 'access_token',      label: 'Permanent Access Token', placeholder: 'EAAJ...', required: true, secret: true },
    ],
    live: false,
    note: 'WhatsApp Cloud API broadcast is a stub in this build — credentials save, but the API call is not yet wired.',
  },
];

const META_FIELDS = new Set(['page_id', 'ig_user_id', 'phone_number_id']);

export default function SocialMedia() {
  const { api, token } = useAuth();
  const { canSee }     = useRole();
  const toast          = useToast();
  const req            = useMemo(() => makeReq(api, token), [api, token]);

  const canEdit = canSee('social');

  const [accounts, setAccounts]   = useState([]);
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [connecting, setConnecting] = useState(null);  // platform key or null
  const [disconnecting, setDisconnecting] = useState(null);

  // Composer state
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageBase64, setImageBase64]   = useState('');
  const [imageMime, setImageMime]       = useState('image/jpeg');
  const [caption, setCaption]           = useState('');
  const [selected, setSelected]         = useState({});   // { facebook: true, ... }
  const [scheduleAt, setScheduleAt]     = useState('');
  const [publicUrl, setPublicUrl]       = useState('');
  const [publishing, setPublishing]     = useState(false);
  const fileRef = useRef(null);

  const accountByPlatform = useMemo(() => {
    const m = {};
    for (const a of accounts) m[a.platform] = a;
    return m;
  }, [accounts]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        req('/api/church-admin/social/accounts'),
        req('/api/church-admin/social/posts?limit=20'),
      ]);
      setAccounts(a.accounts || []);
      setPosts(p.posts || []);
    } catch (e) {
      toast?.error(e.message || 'Failed to load social data.');
    } finally {
      setLoading(false);
    }
  }, [req, toast]);

  useEffect(() => { load(); }, [load]);

  const pickFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast?.error('Please choose an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast?.error('Image must be under 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const [, b64] = dataUrl.split(',');
      setImageDataUrl(dataUrl);
      setImageBase64(b64 || '');
      setImageMime(file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageDataUrl('');
    setImageBase64('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const disconnect = async (acct) => {
    if (!confirm(`Disconnect ${platformLabel(acct.platform)}?`)) return;
    setDisconnecting(acct.id);
    try {
      await req(`/api/church-admin/social/accounts/${acct.id}`, 'DELETE');
      toast?.success(`Disconnected ${platformLabel(acct.platform)}.`);
      await load();
    } catch (e) {
      toast?.error(e.message || 'Disconnect failed.');
    } finally {
      setDisconnecting(null);
    }
  };

  const publish = async () => {
    const platforms = Object.keys(selected).filter((k) => selected[k]);
    if (!platforms.length)  return toast?.error('Pick at least one platform.');
    if (!imageBase64 && !publicUrl) return toast?.error('Upload a flyer or paste a public image URL.');

    setPublishing(true);
    try {
      const body = {
        caption,
        platforms,
        image_base64:     imageBase64 || undefined,
        image_mime:       imageBase64 ? imageMime : undefined,
        public_image_url: publicUrl || undefined,
        scheduled_at:     scheduleAt || undefined,
      };
      const r = await req('/api/church-admin/social/posts', 'POST', body);
      const status = r.post?.status || 'queued';
      if (status === 'scheduled')      toast?.success(`Scheduled for ${new Date(r.post.scheduled_at).toLocaleString()}.`);
      else if (status === 'published') toast?.success(`Posted to ${platforms.length} platform${platforms.length === 1 ? '' : 's'}.`);
      else if (status === 'partial')   toast?.info('Posted with some failures — see history below.');
      else                              toast?.error('Publish failed. See history for details.');
      clearImage();
      setCaption('');
      setScheduleAt('');
      setPublicUrl('');
      setSelected({});
      await load();
    } catch (e) {
      toast?.error(e.message || 'Publish failed.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Community</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Social broadcast</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Upload a program flyer once and push it to every connected platform.
          </p>
        </div>
      </div>

      {/* ── Connected accounts strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLATFORMS.map((p) => {
          const acct = accountByPlatform[p.key];
          const connected = !!acct;
          const Icon = p.icon;
          return (
            <div key={p.key} className="card flex flex-col p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${p.accent.bg} ${p.accent.fg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">{p.label}</div>
                  <div className="truncate text-xs text-zinc-500">
                    {connected ? (acct.account_label || 'Connected') : 'Not connected'}
                  </div>
                </div>
                {connected ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Live
                  </span>
                ) : (
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                    Off
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {connected ? (
                  <>
                    <button
                      onClick={() => setConnecting(p.key)}
                      className="btn-ghost flex-1 text-xs"
                      disabled={!canEdit}
                    >
                      <Plug2 className="h-3 w-3" /> Re-connect
                    </button>
                    <button
                      onClick={() => disconnect(acct)}
                      className="rounded-md p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600"
                      title="Disconnect"
                      disabled={!canEdit || disconnecting === acct.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConnecting(p.key)}
                    className="btn-primary w-full text-xs"
                    disabled={!canEdit}
                  >
                    <Plug className="h-3 w-3" /> Connect
                  </button>
                )}
              </div>
              {!p.live && (
                <p className="mt-2 text-[10.5px] leading-snug text-zinc-400">{p.note}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="text-sm font-bold text-ink">Create broadcast</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Flyer + caption → one click to every selected platform.</p>

          <div className="mt-4">
            {imageDataUrl ? (
              <div className="relative overflow-hidden rounded-lg ring-1 ring-zinc-200">
                <img src={imageDataUrl} alt="Flyer preview" className="block w-full max-h-[360px] object-contain bg-zinc-50" />
                <button
                  onClick={clearImage}
                  className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-zinc-700 ring-1 ring-zinc-200 hover:bg-white"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-25 px-4 py-10 text-center hover:bg-zinc-50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-500 ring-1 ring-zinc-200">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold text-ink">Drop a flyer or click to upload</div>
                <div className="text-xs text-zinc-500">PNG / JPG up to 8 MB</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </label>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="Join us this Sunday for…"
              className="mt-1 w-full rounded-md ring-1 ring-zinc-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
            />
            <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
              <span>{caption.length} chars</span>
              <span>X limit: 280</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Calendar className="mr-1 inline h-3 w-3" /> Schedule (optional)
              </label>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="mt-1 w-full rounded-md ring-1 ring-zinc-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <LinkIcon className="mr-1 inline h-3 w-3" /> Public image URL (optional)
              </label>
              <input
                type="url"
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder="Leave blank — we'll auto-host your flyer"
                className="mt-1 w-full rounded-md ring-1 ring-zinc-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-zinc-500">Override only if your flyer is already hosted elsewhere.</p>
            </div>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-ink">Where to post</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Greyed-out platforms aren't connected yet.</p>
          <div className="mt-3 flex flex-col gap-2">
            {PLATFORMS.map((p) => {
              const connected = !!accountByPlatform[p.key];
              const checked   = !!selected[p.key];
              const Icon      = p.icon;
              return (
                <label
                  key={p.key}
                  className={`flex items-center gap-3 rounded-lg p-2.5 ring-1 transition ${
                    connected
                      ? checked
                        ? 'bg-brand-50 ring-brand-200'
                        : 'bg-white ring-zinc-200 hover:bg-zinc-50'
                      : 'bg-zinc-50 ring-zinc-100 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!connected || !canEdit}
                    onChange={(e) => setSelected((s) => ({ ...s, [p.key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-600"
                  />
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md ${p.accent.bg} ${p.accent.fg}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink">{p.label}</div>
                    <div className="truncate text-[11px] text-zinc-500">
                      {connected ? (accountByPlatform[p.key].account_label || 'Connected') : 'Connect to enable'}
                    </div>
                  </div>
                  {!p.live && connected && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700" title={p.note}>
                      stub
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <button
            onClick={publish}
            disabled={!canEdit || publishing || (!imageBase64 && !publicUrl) || !Object.values(selected).some(Boolean)}
            className="btn-primary mt-4 w-full justify-center"
          >
            {publishing ? (
              <>
                <Clock className="h-3.5 w-3.5 animate-pulse" /> {scheduleAt ? 'Scheduling…' : 'Posting…'}
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> {scheduleAt ? 'Schedule broadcast' : 'Post now'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── History ──────────────────────────────────────────────────────── */}
      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3">
          <h2 className="text-sm font-bold text-ink">Recent broadcasts</h2>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-500">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-500">
            <ImageIcon className="mx-auto mb-2 h-6 w-6 text-zinc-300" />
            No broadcasts yet — your first flyer post will show up here.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {posts.map((p) => <HistoryRow key={p.id} post={p} />)}
          </ul>
        )}
      </div>

      <ConnectModal
        open={!!connecting}
        platformKey={connecting}
        existing={connecting ? accountByPlatform[connecting] : null}
        onClose={() => setConnecting(null)}
        onSaved={async () => { setConnecting(null); await load(); }}
        req={req}
        toast={toast}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function HistoryRow({ post }) {
  const platforms = Array.isArray(post.platforms) ? post.platforms : [];
  const results   = post.results || {};
  const statusBadge = {
    published: { bg: 'bg-emerald-50', fg: 'text-emerald-700', label: 'Posted' },
    partial:   { bg: 'bg-amber-50',   fg: 'text-amber-700',   label: 'Partial' },
    failed:    { bg: 'bg-red-50',     fg: 'text-red-700',     label: 'Failed' },
    scheduled: { bg: 'bg-brand-50',   fg: 'text-brand-700',   label: 'Scheduled' },
    publishing:{ bg: 'bg-zinc-100',   fg: 'text-zinc-700',    label: 'Publishing' },
    queued:    { bg: 'bg-zinc-100',   fg: 'text-zinc-700',    label: 'Queued' },
  }[post.status] || { bg: 'bg-zinc-100', fg: 'text-zinc-700', label: post.status };

  return (
    <li className="flex gap-4 px-5 py-4">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200">
        {post.image_data_url
          ? <img src={post.image_data_url} alt="" className="h-full w-full object-cover" />
          : <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-5 w-5 text-zinc-400" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate text-sm text-ink">
            {post.caption ? post.caption.slice(0, 90) + (post.caption.length > 90 ? '…' : '') : <span className="text-zinc-400 italic">No caption</span>}
          </div>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadge.bg} ${statusBadge.fg}`}>
            {statusBadge.label}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {platforms.map((plat) => {
            const r = results[plat];
            const ok = r?.ok;
            const meta = PLATFORMS.find((x) => x.key === plat);
            const Icon = meta?.icon || Share2;
            return (
              <span
                key={plat}
                title={r?.error || (ok ? 'Published' : 'Pending')}
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${
                  ok    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                  : r    ? 'bg-red-50 text-red-700 ring-red-100'
                        : 'bg-zinc-50 text-zinc-500 ring-zinc-200'
                }`}
              >
                <Icon className="h-3 w-3" />
                {meta?.label || plat}
                {ok    ? <CheckCircle2 className="h-3 w-3" />
                : r    ? <AlertCircle  className="h-3 w-3" />
                        : null}
              </span>
            );
          })}
        </div>
        <div className="mt-1.5 text-[11px] text-zinc-500">
          {post.published_at
            ? `Published ${fmt(post.published_at)}`
            : post.scheduled_at
              ? `Scheduled for ${fmt(post.scheduled_at)}`
              : `Created ${fmt(post.created_at)}`}
          {post.created_by && <> · by {post.created_by}</>}
        </div>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ConnectModal({ open, platformKey, existing, onClose, onSaved, req, toast }) {
  const platform = PLATFORMS.find((p) => p.key === platformKey);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !platform) return;
    const init = {};
    for (const f of platform.connect_fields) {
      if (f.secret) { init[f.name] = ''; continue; }
      if (f.meta)   init[f.name] = existing?.meta?.[f.name] || '';
      else          init[f.name] = existing?.[f.name] || '';
    }
    setValues(init);
  }, [open, platform, existing]);

  if (!platform) return null;

  const save = async () => {
    const missing = platform.connect_fields.filter((f) => f.required && !values[f.name]?.trim());
    if (missing.length) return toast?.error(`Missing: ${missing.map((f) => f.label).join(', ')}`);

    const meta = {};
    const top  = { platform: platform.key };
    for (const f of platform.connect_fields) {
      const v = (values[f.name] || '').trim();
      if (!v && f.secret && existing) continue;          // keep existing token
      if (META_FIELDS.has(f.name))    meta[f.name] = v;
      else                            top[f.name]  = v;
    }
    top.meta = meta;

    setSaving(true);
    try {
      await req('/api/church-admin/social/accounts', 'POST', top);
      toast?.success(`${platform.label} connected.`);
      onSaved?.();
    } catch (e) {
      toast?.error(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={`Connect ${platform.label}`}
      sub={existing ? 'Update credentials (leave token blank to keep the current one).' : 'Paste credentials from the platform\'s developer portal.'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {platform.connect_fields.map((f) => (
          <div key={f.name}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {f.label} {f.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={f.secret ? 'password' : 'text'}
              value={values[f.name] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              placeholder={f.placeholder}
              autoComplete="off"
              className="mt-1 w-full rounded-md ring-1 ring-zinc-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600/40 focus:outline-none"
            />
            {f.hint && <p className="mt-1 text-[11px] text-zinc-500">{f.hint}</p>}
          </div>
        ))}
        {!platform.live && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800 ring-1 ring-amber-100">
            Heads up — {platform.label} publishing is a stub in this build. Credentials save, but the actual API call needs to be wired in <code>services/socialPublishers.js</code>.
          </div>
        )}
      </div>
    </Modal>
  );
}

function platformLabel(key) {
  return PLATFORMS.find((p) => p.key === key)?.label || key;
}

function fmt(s) {
  if (!s) return '';
  try { return new Date(s).toLocaleString(); }
  catch { return s; }
}
