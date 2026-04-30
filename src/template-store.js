// Folder Forge — by Harish

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getStorePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'templates.json');
}

function readStore() {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) {
    // Create with default motion design template
    const defaults = [
      {
        id: 'default-video-project',
        name: 'Video Project',
        icon: 'film',
        createdAt: new Date().toISOString(),
        structure: [
          {
            name: 'Project_Name',
            children: [
              { name: '01_Footage', children: [
                { name: 'Raw', children: [] },
                { name: 'Selects', children: [] },
              ]},
              { name: '02_Audio', children: [
                { name: 'Music', children: [] },
                { name: 'SFX', children: [] },
                { name: 'VO', children: [] },
              ]},
              { name: '03_Graphics', children: [
                { name: 'Logos', children: [] },
                { name: 'Titles', children: [] },
                { name: 'Lower_Thirds', children: [] },
              ]},
              { name: '04_Project_Files', children: [
                { name: 'After_Effects', children: [] },
                { name: 'Premiere', children: [] },
              ]},
              { name: '05_Exports', children: [
                { name: 'Drafts', children: [] },
                { name: 'Finals', children: [] },
              ]},
              { name: '06_References', children: [] },
              { name: '07_Assets', children: [
                { name: 'Fonts', children: [] },
                { name: 'Textures', children: [] },
              ]},
            ],
          },
        ],
      },
      {
        id: 'default-motion-graphics',
        name: 'Motion Graphics',
        icon: 'sparkles',
        createdAt: new Date().toISOString(),
        structure: [
          {
            name: 'MoGraph_Project',
            children: [
              { name: '01_Design', children: [
                { name: 'Styleframes', children: [] },
                { name: 'Storyboard', children: [] },
              ]},
              { name: '02_Animation', children: [
                { name: 'After_Effects', children: [] },
                { name: 'Cinema4D', children: [] },
              ]},
              { name: '03_Assets', children: [
                { name: 'Illustrations', children: [] },
                { name: 'Icons', children: [] },
                { name: 'Fonts', children: [] },
                { name: 'Audio', children: [] },
              ]},
              { name: '04_Renders', children: [
                { name: 'WIP', children: [] },
                { name: 'Final', children: [] },
              ]},
              { name: '05_Deliverables', children: [] },
            ],
          },
        ],
      },
    ];
    fs.writeFileSync(storePath, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(storePath, 'utf-8'));
}

function writeStore(data) {
  fs.writeFileSync(getStorePath(), JSON.stringify(data, null, 2));
}

module.exports = {
  getAll() {
    return readStore();
  },

  getById(id) {
    const templates = readStore();
    return templates.find(t => t.id === id);
  },

  save(template) {
    const templates = readStore();
    const existing = templates.findIndex(t => t.id === template.id);
    if (existing >= 0) {
      templates[existing] = { ...templates[existing], ...template };
    } else {
      template.id = 'tpl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      template.createdAt = new Date().toISOString();
      templates.push(template);
    }
    writeStore(templates);
    return template;
  },

  remove(id) {
    const templates = readStore().filter(t => t.id !== id);
    writeStore(templates);
    return true;
  },
};
