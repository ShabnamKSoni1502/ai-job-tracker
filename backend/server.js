const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Get all applications
app.get('/api/applications', async (req, res) => {
  const result = await pool.query('SELECT * FROM applications ORDER BY applied_date DESC');
  res.json(result.rows);
});

// Add a new application, with AI analysis of the job description
app.post('/api/applications', async (req, res) => {
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
});

// Update status
app.patch('/api/applications/:id', async (req, res) => {
  const { status } = req.body;
  const update = await pool.query(
    'UPDATE applications SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  res.json(update.rows[0]);
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});