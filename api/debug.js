import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const data = {
    cwd: process.cwd(),
    files: [],
    errors: []
  };
  
  // Check sources
  const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');
  try {
    if (fs.existsSync(sourcesPath)) {
      const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
      data.files.push('sources.json: FOUND (' + sources.length + ' sources)');
      sources.forEach(s => {
        data.files.push(`  - ${s.name}: ${s.enabled ? 'ON' : 'OFF'}`);
      });
    } else {
      data.errors.push('sources.json: NOT FOUND at ' + sourcesPath);
    }
  } catch(e) {
    data.errors.push('sources.json: ERROR - ' + e.message);
  }
  
  // Check filter
  const filterPath = path.join(process.cwd(), 'data', 'filter.json');
  try {
    if (fs.existsSync(filterPath)) {
      const filter = JSON.parse(fs.readFileSync(filterPath, 'utf-8'));
      data.files.push('filter.json: FOUND');
      data.filter = filter;
    } else {
      data.errors.push('filter.json: NOT FOUND at ' + filterPath);
    }
  } catch(e) {
    data.errors.push('filter.json: ERROR - ' + e.message);
  }
  
  // List data directory
  const dataDir = path.join(process.cwd(), 'data');
  try {
    if (fs.existsSync(dataDir)) {
      data.dataFiles = fs.readdirSync(dataDir);
    }
  } catch(e) {}
  
  res.status(200).json(data);
}
