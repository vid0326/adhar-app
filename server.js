const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/output', express.static(path.join(__dirname, 'output')));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer();

function generateRandomAdhar() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

function formatDate(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

app.post('/generate', upload.none(), async (req, res) => {
  const { name = '', hindiName = '', baseDob = '', count = 10 } = req.body;
  const baseDate = new Date(baseDob);
  const templatePath = path.join(__dirname, 'template', 'my_card.jpg');

  try {
    const templateBuffer = fs.readFileSync(templatePath);
    const outputUrls = [];

    for (let i = 0; i < parseInt(count); i++) {
      const dob = new Date(baseDate);
      dob.setDate(dob.getDate() + i);
      const formattedDob = formatDate(dob);
      const adhar = generateRandomAdhar().replace(/(\d{4})(?=\d)/g, '$1 ');

      const svgText = `
        <svg width="1015" height="640">
          <style>
            .hindi { font-family: 'Noto Sans Devanagari', sans-serif; font-size: 30px; fill: #404040; }
            .english { font-family: Arial, sans-serif; font-size: 30px; fill: #404040; }
            .dob { font-family: Arial, sans-serif; font-size: 26px; fill: #404040; }
            .aadhaar { font-family: Arial, sans-serif; font-size: 50px; fill: #404040; }
          </style>
          <text x="358" y="170" class="hindi">${hindiName}</text>
          <text x="358" y="215" class="english">${name}</text>
          <text x="531" y="260" class="dob">${formattedDob}</text>
          <text x="360" y="620" class="aadhaar">${adhar}</text>
        </svg>
      `;

      const cardBuffer = await sharp(templateBuffer)
        .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
        .png()
        .toBuffer();

      const filename = `card_${name.replace(/\s+/g, '_')}_${i + 1}.png`;
      const filepath = path.join(__dirname, 'output', filename);
      fs.writeFileSync(filepath, cardBuffer);
      outputUrls.push(`/output/${filename}`);
    }

    res.json({ success: true, urls: outputUrls });
  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ success: false, error: 'Server error generating Aadhaar cards.' });
  }
});

app.listen(PORT, () => console.log(`Server started at http://localhost:${PORT}`));
