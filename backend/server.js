const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.get('/api/applications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM applications ORDER BY applied_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    const { company, role, job_description } = req.body;
    let ai_analysis = '';
    if (job_description) {
      const prompt = `Summarize this job description in 3 bullet points covering key requirements, and rate how well a fresher Computer Science graduate with full-stack, cloud, and AI project experience would fit (score out of 10 with reason):\n\n${job_description}`;
      const result = await genAI.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });
      ai_analysis = result.text;
    }
    const insert = await pool.query(
      'INSERT INTO applications (company, role, job_description, ai_analysis) VALUES ($1, $2, $3, $4) RETURNING *',
      [company, role, job_description, ai_analysis]
    );
    res.json(insert.rows[0]);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/applications/:id', async (req, res) => {
  try {
    const { status, interview_date } = req.body;
    const update = await pool.query(
      'UPDATE applications SET status = COALESCE($1, status), interview_date = COALESCE($2, interview_date) WHERE id = $3 RETURNING *',
      [status || null, interview_date || null, req.params.id]
    );
    res.json(update.rows[0]);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/applications/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM applications WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/applications/stats', async (req, res) => {
  try {
    const all = await pool.query('SELECT status, applied_date FROM applications');
    const rows = all.rows;
    const now = new Date();
    const day30ago = new Date(now); day30ago.setDate(now.getDate() - 30);
    const day60ago = new Date(now); day60ago.setDate(now.getDate() - 60);
    const last30 = rows.filter(r => new Date(r.applied_date) >= day30ago);
    const prev30 = rows.filter(r => {
      const d = new Date(r.applied_date);
      return d >= day60ago && d < day30ago;
    });
    const countByStatus = (arr, status) => arr.filter(r => r.status === status).length;
    const pctChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };
    const statusBreakdown = {};
    rows.forEach(r => { statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1; });
    const trendMap = {};
    last30.forEach(r => {
      const key = new Date(r.applied_date).toISOString().split('T')[0];
      trendMap[key] = (trendMap[key] || 0) + 1;
    });
    const trend = Object.entries(trendMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
    res.json({
      total: rows.length,
      totalChange: pctChange(last30.length, prev30.length),
      interviews: countByStatus(rows, 'interview'),
      interviewsChange: pctChange(countByStatus(last30, 'interview'), countByStatus(prev30, 'interview')),
      offers: countByStatus(rows, 'offer'),
      offersChange: pctChange(countByStatus(last30, 'offer'), countByStatus(prev30, 'offer')),
      rejections: countByStatus(rows, 'rejected'),
      rejectionsChange: pctChange(countByStatus(last30, 'rejected'), countByStatus(prev30, 'rejected')),
      statusBreakdown,
      trend
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/applications/upcoming-interviews', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM applications WHERE interview_date IS NOT NULL AND interview_date >= CURRENT_DATE ORDER BY interview_date ASC LIMIT 5`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${process.env.PORT}`);
});