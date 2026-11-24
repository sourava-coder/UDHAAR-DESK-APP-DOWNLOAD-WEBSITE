import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import path from 'node:path';
import { supabase, ASSETS_BUCKET, DOWNLOADS_BUCKET } from './supabase.js';
import { requireAdmin } from './auth.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
}
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: FRONTEND_ORIGIN.split(',').map(x => x.trim()), credentials: false }));
app.use(express.json({ limit: '1mb' }));

const reviewLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 }
});

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const safeSettings = row => row ? ({
  appName: row.app_name, tagline: row.tagline, description: row.description,
  version: row.version, fileSize: row.file_size, androidRequirement: row.android_requirement,
  iconUrl: row.icon_url || null, downloadReady: Boolean(row.download_path),
  demoVideoUrl: row.demo_video_url || null,
  iconPath: row.icon_path || null,
  demoVideoPath: row.demo_video_path || null,
  demoVideoName: row.demo_video_name || null,
  downloadPath: row.download_path || null,
  downloadName: row.download_file_name || null,
  features: row.features || [], screenshots: row.screenshots || [],
  updatedAt: row.updated_at
}) : null;

async function getSettings() {
  const { data, error } = await supabase.from('app_settings').select('*').eq('slug', 'udhaar-desk').single();
  if (error) throw error;
  let icon_url = null;
  if (data.icon_path) {
    const { data: publicData } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(data.icon_path);
    icon_url = publicData.publicUrl;
  }
  let demo_video_url = null;
  if (data.demo_video_path) {
    const { data: publicData } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(data.demo_video_path);
    demo_video_url = publicData.publicUrl;
  }
  const screenshots = (data.screenshots || []).map(item => {
    const { data: publicData } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(item.path);
    return { ...item, url: publicData.publicUrl };
  });
  return { ...data, icon_url, demo_video_url, screenshots };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'udhaar-desk-portal-api' }));

app.get('/api/app', asyncRoute(async (_req, res) => {
  const settings = await getSettings();
  const [{ count: downloads, error: dErr }, { data: ratings, error: rErr }] = await Promise.all([
    supabase.from('download_events').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('rating').eq('status', 'approved')
  ]);
  if (dErr) throw dErr;
  if (rErr) throw rErr;
  const totalReviews = ratings.length;
  const averageRating = totalReviews ? ratings.reduce((sum, item) => sum + item.rating, 0) / totalReviews : 0;
  res.json({ app: safeSettings(settings), stats: { downloads: downloads || 0, reviews: totalReviews, averageRating } });
}));

app.get('/api/reviews', asyncRoute(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
  const { data, error } = await supabase.from('reviews')
    .select('id, reviewer_name, rating, review_text, created_at')
    .eq('status', 'approved').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  res.json({ reviews: data });
}));

app.post('/api/reviews', reviewLimiter, asyncRoute(async (req, res) => {
  const { name, rating, review } = req.body || {};
  const reviewer_name = String(name || '').trim();
  const review_text = String(review || '').trim();
  const stars = Number(rating);
  if (reviewer_name.length < 2 || reviewer_name.length > 50) return res.status(400).json({ error: 'Name must be 2–50 characters.' });
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return res.status(400).json({ error: 'Choose a rating from 1 to 5.' });
  if (review_text.length < 5 || review_text.length > 1000) return res.status(400).json({ error: 'Review must be 5–1000 characters.' });
  const { error } = await supabase.from('reviews').insert({ reviewer_name, rating: stars, review_text, status: 'pending' });
  if (error) throw error;
  res.status(201).json({ message: 'Thanks! Your review was submitted and will appear after moderation.' });
}));

app.get('/api/download', asyncRoute(async (req, res) => {
  const settings = await getSettings();
  if (!settings.download_path) return res.status(404).json({ error: 'The app download is not available yet.' });

  const { data, error } = await supabase.storage.from(DOWNLOADS_BUCKET).download(settings.download_path);
  if (error || !data) return res.status(502).json({ error: 'Could not retrieve the release file. Please try again later.' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const ip_hash = crypto.createHash('sha256').update(`${ip}:${process.env.IP_HASH_SALT || process.env.JWT_SECRET}`).digest('hex');
  const { error: countError } = await supabase.from('download_events').insert({
    user_agent: String(req.headers['user-agent'] || '').slice(0, 500), ip_hash
  });
  if (countError) console.error('Download event insert failed:', countError.message);

  const filename = path.basename(settings.download_file_name || settings.download_path).replace(/["\r\n]/g, '');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  const buffer = Buffer.from(await data.arrayBuffer());
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}));

app.post('/api/admin/login', loginLimiter, asyncRoute(async (req, res) => {
  const pin = String(req.body?.pin || '').trim();
  const adminPin = String(process.env.ADMIN_PIN || '').trim();
  if (!/^\d{4}$/.test(pin) || !adminPin || pin !== adminPin) {
    return res.status(401).json({ error: 'Invalid admin PIN.' });
  }
  const token = jwt.sign({ access: 'pin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
}));

app.get('/api/admin/overview', requireAdmin, asyncRoute(async (_req, res) => {
  const [{ count: downloads, error: dErr }, { data: reviews, error: rErr }, { data: settings, error: sErr }] = await Promise.all([
    supabase.from('download_events').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('app_settings').select('*').eq('slug', 'udhaar-desk').single()
  ]);
  if (dErr) throw dErr;
  if (rErr) throw rErr;
  if (sErr) throw sErr;
  res.json({ downloads: downloads || 0, reviews, settings: safeSettings(await getSettings()) });
}));

app.put('/api/admin/app', requireAdmin, asyncRoute(async (req, res) => {
  const body = req.body || {};
  const fields = {
    app_name: String(body.appName || '').trim().slice(0, 80),
    tagline: String(body.tagline || '').trim().slice(0, 140),
    description: String(body.description || '').trim().slice(0, 3000),
    version: String(body.version || '').trim().slice(0, 30),
    file_size: String(body.fileSize || '').trim().slice(0, 40),
    android_requirement: String(body.androidRequirement || '').trim().slice(0, 100),
    features: Array.isArray(body.features) ? body.features.map(x => String(x).trim()).filter(Boolean).slice(0, 20) : [],
    updated_at: new Date().toISOString()
  };
  if (!fields.app_name || !fields.description || !fields.version) return res.status(400).json({ error: 'App name, description and version are required.' });
  const { error } = await supabase.from('app_settings').update(fields).eq('slug', 'udhaar-desk');
  if (error) throw error;
  res.json({ message: 'App details updated.' });
}));

app.post('/api/admin/media/demo-video/upload-url', requireAdmin, asyncRoute(async (req, res) => {
  const fileName = String(req.body?.fileName || '').trim();
  const contentType = String(req.body?.contentType || '').trim();
  if (!/^video\/(mp4|webm|quicktime)$/i.test(contentType)) {
    return res.status(400).json({ error: 'Upload an MP4, WEBM or MOV application demo video.' });
  }
  const ext = path.extname(fileName).toLowerCase() || (contentType === 'video/webm' ? '.webm' : contentType === 'video/quicktime' ? '.mov' : '.mp4');
  const objectPath = `demo-video/${Date.now()}-${crypto.randomUUID()}${ext}`;
  const { data, error } = await supabase.storage.from(ASSETS_BUCKET).createSignedUploadUrl(objectPath);
  if (error) throw error;
  res.json({ signedUrl: data.signedUrl, objectPath, fileName });
}));

app.post('/api/admin/media/demo-video/confirm', requireAdmin, asyncRoute(async (req, res) => {
  const objectPath = String(req.body?.objectPath || '').trim();
  const fileName = String(req.body?.fileName || '').trim();
  if (!objectPath.startsWith('demo-video/')) {
    return res.status(400).json({ error: 'Invalid demo video path.' });
  }
  const { error } = await supabase.from('app_settings').update({
    demo_video_path: objectPath,
    demo_video_name: fileName,
    updated_at: new Date().toISOString()
  }).eq('slug', 'udhaar-desk');
  if (error) throw error;
  res.json({ message: 'demo-video uploaded successfully.' });
}));

app.post('/api/admin/upload/:kind', requireAdmin, upload.single('file'), asyncRoute(async (req, res) => {
  const kind = req.params.kind;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Choose a file first.' });
  if (!['icon', 'demo-video', 'release'].includes(kind)) return res.status(400).json({ error: 'Unsupported upload type.' });

  const isRelease = kind === 'release';
  const isDemoVideo = kind === 'demo-video';
  const allowed = isRelease
    ? /\.(apk|aab|zip|pdf)$/i.test(file.originalname)
    : isDemoVideo
      ? /^video\/(mp4|webm|quicktime)$/i.test(file.mimetype)
      : /^image\/(png|jpeg|webp|gif)$/i.test(file.mimetype);
  if (!allowed) return res.status(400).json({ error: isRelease ? 'Allowed release files: APK, AAB, ZIP or PDF.' : isDemoVideo ? 'Upload an MP4, WEBM or MOV application demo video.' : 'Upload a PNG, JPG, WEBP or GIF image.' });
  if (isRelease && file.size > 150 * 1024 * 1024) return res.status(400).json({ error: 'Release file exceeds 150 MB.' });
  if (isDemoVideo && file.size > 150 * 1024 * 1024) return res.status(400).json({ error: 'Demo video exceeds 150 MB.' });
  if (!isRelease && !isDemoVideo && file.size > 8 * 1024 * 1024) return res.status(400).json({ error: 'Images must be 8 MB or smaller.' });

  const bucket = isRelease ? DOWNLOADS_BUCKET : ASSETS_BUCKET;
  const ext = path.extname(file.originalname).toLowerCase() || (isRelease ? '.apk' : '.png');
  const objectPath = `${kind}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, file.buffer, {
    contentType: file.mimetype, upsert: false
  });
  if (uploadError) throw uploadError;

  if (kind === 'icon') {
    const { error } = await supabase.from('app_settings').update({ icon_path: objectPath, updated_at: new Date().toISOString() }).eq('slug', 'udhaar-desk');
    if (error) throw error;
  } else if (kind === 'demo-video') {
    const { error } = await supabase.from('app_settings').update({
      demo_video_path: objectPath,
      demo_video_name: file.originalname,
      updated_at: new Date().toISOString()
    }).eq('slug', 'udhaar-desk');
    if (error) throw error;
  } else {
    const { error } = await supabase.from('app_settings').update({
      download_path: objectPath, download_file_name: file.originalname,
      file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      updated_at: new Date().toISOString()
    }).eq('slug', 'udhaar-desk');
    if (error) throw error;
  }
  res.status(201).json({ message: `${kind} uploaded successfully.` });
}));

app.delete('/api/admin/media/:kind', requireAdmin, asyncRoute(async (req, res) => {
  const kind = req.params.kind;
  if (!['icon', 'demo-video', 'release'].includes(kind)) {
    return res.status(400).json({ error: 'Unsupported media type.' });
  }
  const field = kind === 'icon' ? 'icon_path' : kind === 'demo-video' ? 'demo_video_path' : 'download_path';
  const nameField = kind === 'demo-video' ? 'demo_video_name' : kind === 'release' ? 'download_file_name' : null;
  const { data: current, error: readError } = await supabase
    .from('app_settings')
    .select(field)
    .eq('slug', 'udhaar-desk')
    .single();
  if (readError) throw readError;
  const objectPath = current?.[field];
  if (!objectPath) return res.status(404).json({ error: 'This file is already removed.' });

  const bucket = kind === 'release' ? DOWNLOADS_BUCKET : ASSETS_BUCKET;
  const { error: removeError } = await supabase.storage.from(bucket).remove([objectPath]);
  if (removeError) throw removeError;

  const update = { updated_at: new Date().toISOString(), [field]: null };
  if (nameField) update[nameField] = null;
  if (kind === 'release') update.file_size = 'To be updated';
  const { error: updateError } = await supabase.from('app_settings').update(update).eq('slug', 'udhaar-desk');
  if (updateError) throw updateError;

  res.json({ message: `${kind} removed successfully.` });
}));

app.patch('/api/admin/reviews/:id', requireAdmin, asyncRoute(async (req, res) => {
  const status = req.body?.status;
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid review status.' });
  const { error } = await supabase.from('reviews').update({ status }).eq('id', req.params.id);
  if (error) throw error;
  res.json({ message: 'Review status updated.' });
}));

app.delete('/api/admin/reviews/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { error } = await supabase.from('reviews').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ message: 'Review deleted.' });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Check the backend logs and Supabase configuration.' });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`Udhaar Desk API running on http://localhost:${PORT}`));
}

export default app;
