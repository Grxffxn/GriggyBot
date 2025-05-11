const fs = require('fs');
const path = require('path');
const { getConfig } = require('./configUtils.js');

async function findYamlFiles(basePath) {
  const results = [];

  async function searchDirectory(directory) {
    try {
      const files = await fs.promises.readdir(directory, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(directory, file.name);

        if (file.isDirectory()) {
          await searchDirectory(filePath);
        } else if (file.name.endsWith('.yml') || file.name.endsWith('.yaml')) {
          results.push(filePath);
        }
      }
    } catch (err) {
      console.error(`Error reading directory ${directory}: ${err.message}`);
    }
  }

  await searchDirectory(basePath);
  return results;
}

function getBaseDirectory() {
  const config = getConfig();
  const cmiPath = config.cmi_sqlite_db;
  if (!cmiPath) throw new Error('CMI path not found in config (cmi_sqlite_db)');
  return path.resolve(cmiPath, '../../../plugins');
}

async function updateFileCache(client) {
  try {
    const baseDirectory = getBaseDirectory();
    const yamlFiles = await findYamlFiles(baseDirectory);

    Object.keys(client.fileCache).forEach(key => delete client.fileCache[key]);

    yamlFiles.forEach(filePath => {
      const relativePath = path.relative(baseDirectory, filePath);
      client.fileCache[relativePath] = fs.readFileSync(filePath, 'utf-8').split('\n');
    });

    return true;
  } catch (err) {
    client.log(`Error updating file cache: ${err.message}`, 'ERROR', err);
    return false;
  }
}

async function searchConfigFiles(keyword, directory, fileCache, includeBackups = false) {
  const matches = [];

  const baseDirectory = getBaseDirectory();
  const targetDirectory = directory ? path.join(baseDirectory, directory) : baseDirectory;

  const filteredFiles = Object.entries(fileCache).filter(([relativePath, _]) => {
    const filePath = path.join(baseDirectory, relativePath);

    if (!filePath.startsWith(targetDirectory)) return false;
    if (!includeBackups && filePath.toLowerCase().includes('backup')) return false;

    return true;
  });

  for (const [relativePath, lines] of filteredFiles) {
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(keyword.toLowerCase())) {
        matches.push({
          file: relativePath,
          line: index + 1,
          content: line,
        });
      }
    });
  }

  return matches;
}

module.exports = { findYamlFiles, getBaseDirectory, updateFileCache, searchConfigFiles };