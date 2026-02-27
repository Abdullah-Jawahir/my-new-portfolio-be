import { Router, Response, Request } from 'express';
import { db } from '../config/firebase';

const router = Router();

const DEVICON_URL = 'https://raw.githubusercontent.com/devicons/devicon/master/devicon.json';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DevIconItem {
  name: string;
  altnames: string[];
  tags: string[];
  versions: {
    svg: string[];
    font: string[];
  };
  color: string;
  aliases: Array<{
    base: string;
    alias: string;
  }>;
}

interface TechItem {
  name: string;
  displayName: string;
  category: string;
  tags: string[];
  color: string;
  type: 'tool' | 'technology';
}

const categoryMapping: Record<string, { category: string; type: 'tool' | 'technology' }> = {
  'language': { category: 'Programming Language', type: 'technology' },
  'programming': { category: 'Programming Language', type: 'technology' },
  'framework': { category: 'Framework', type: 'technology' },
  'nodejs': { category: 'Backend Framework', type: 'technology' },
  'frontend': { category: 'Frontend Framework', type: 'technology' },
  'backend': { category: 'Backend Framework', type: 'technology' },
  'library': { category: 'Library', type: 'technology' },
  'database': { category: 'Database', type: 'technology' },
  'nosql': { category: 'Database', type: 'technology' },
  'sql': { category: 'Database', type: 'technology' },
  'data': { category: 'Database', type: 'technology' },
  'css': { category: 'CSS Framework', type: 'technology' },
  'styling': { category: 'CSS Framework', type: 'technology' },
  'ide': { category: 'IDE', type: 'tool' },
  'editor': { category: 'IDE', type: 'tool' },
  'versioncontrol': { category: 'Version Control', type: 'tool' },
  'git': { category: 'Version Control', type: 'tool' },
  'testing': { category: 'Testing', type: 'tool' },
  'test': { category: 'Testing', type: 'tool' },
  'ci': { category: 'CI/CD', type: 'tool' },
  'cd': { category: 'CI/CD', type: 'tool' },
  'devops': { category: 'DevOps', type: 'tool' },
  'deployment': { category: 'CI/CD', type: 'tool' },
  'cloud': { category: 'Cloud Platform', type: 'tool' },
  'saas': { category: 'Cloud Platform', type: 'tool' },
  'paas': { category: 'Cloud Platform', type: 'tool' },
  'iaas': { category: 'Cloud Platform', type: 'tool' },
  'container': { category: 'Containerization', type: 'tool' },
  'virtualization': { category: 'Containerization', type: 'tool' },
  'mobile': { category: 'Mobile', type: 'technology' },
  'ios': { category: 'Mobile', type: 'technology' },
  'android': { category: 'Mobile', type: 'technology' },
  'design': { category: 'Design', type: 'tool' },
  'ui': { category: 'Design', type: 'tool' },
  'ux': { category: 'Design', type: 'tool' },
  'bundler': { category: 'Build Tool', type: 'tool' },
  'build': { category: 'Build Tool', type: 'tool' },
  'package': { category: 'Package Manager', type: 'tool' },
  'packagemanager': { category: 'Package Manager', type: 'tool' },
  'api': { category: 'API', type: 'technology' },
  'rest': { category: 'API', type: 'technology' },
  'graphql': { category: 'API', type: 'technology' },
  'cms': { category: 'CMS', type: 'technology' },
  'authentication': { category: 'Authentication', type: 'technology' },
  'auth': { category: 'Authentication', type: 'technology' },
  'machinelearning': { category: 'AI/ML', type: 'technology' },
  'ai': { category: 'AI/ML', type: 'technology' },
  'ml': { category: 'AI/ML', type: 'technology' },
  'collaboration': { category: 'Collaboration', type: 'tool' },
  'communication': { category: 'Collaboration', type: 'tool' },
  'monitoring': { category: 'Monitoring', type: 'tool' },
  'logging': { category: 'Monitoring', type: 'tool' },
  'documentation': { category: 'Documentation', type: 'tool' },
  'docs': { category: 'Documentation', type: 'tool' },
  'webserver': { category: 'Web Server', type: 'tool' },
  'server': { category: 'Web Server', type: 'tool' },
  'statemanagement': { category: 'State Management', type: 'technology' },
  'state': { category: 'State Management', type: 'technology' },
};

function capitalizeWords(str: string): string {
  return str
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function determineCategoryAndType(tags: string[], name: string): { category: string; type: 'tool' | 'technology' } {
  const lowercaseTags = tags.map(t => t.toLowerCase().replace(/\s+/g, ''));
  
  for (const tag of lowercaseTags) {
    if (categoryMapping[tag]) {
      return categoryMapping[tag];
    }
  }
  
  const nameLower = name.toLowerCase();
  const knownTools = ['vscode', 'git', 'github', 'gitlab', 'docker', 'kubernetes', 'jenkins', 'jira', 'slack', 'figma', 'postman', 'npm', 'yarn', 'webpack', 'babel', 'jest', 'cypress', 'selenium'];
  
  if (knownTools.some(tool => nameLower.includes(tool))) {
    return { category: 'Tool', type: 'tool' };
  }
  
  return { category: 'Other', type: 'technology' };
}

function transformDevIconData(devicons: DevIconItem[]): TechItem[] {
  return devicons.map(item => {
    const { category, type } = determineCategoryAndType(item.tags, item.name);
    return {
      name: item.name,
      displayName: capitalizeWords(item.name),
      category,
      tags: item.tags,
      color: item.color,
      type,
    };
  }).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

async function fetchAndCacheDevIcons(): Promise<TechItem[]> {
  try {
    const cacheDoc = await db.collection('cache').doc('devicons').get();
    
    if (cacheDoc.exists) {
      const cacheData = cacheDoc.data();
      const lastUpdated = cacheData?.lastUpdated?.toDate?.() || new Date(0);
      const now = new Date();
      
      if (now.getTime() - lastUpdated.getTime() < CACHE_DURATION_MS) {
        console.log('Returning cached DevIcon data');
        return cacheData?.items || [];
      }
    }
    
    console.log('Fetching fresh DevIcon data from GitHub...');
    const response = await fetch(DEVICON_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch DevIcon data: ${response.status}`);
    }
    
    const devicons = (await response.json()) as DevIconItem[];
    const transformedData = transformDevIconData(devicons);
    
    await db.collection('cache').doc('devicons').set({
      items: transformedData,
      lastUpdated: new Date(),
      totalCount: transformedData.length,
    });
    
    console.log(`Cached ${transformedData.length} DevIcon items`);
    return transformedData;
  } catch (error) {
    console.error('Error fetching DevIcon data:', error);
    
    const cacheDoc = await db.collection('cache').doc('devicons').get();
    if (cacheDoc.exists) {
      return cacheDoc.data()?.items || [];
    }
    
    return [];
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const items = await fetchAndCacheDevIcons();
    
    const { search, type, category } = req.query;
    
    let filteredItems = items;
    
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.displayName.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    if (type && typeof type === 'string') {
      filteredItems = filteredItems.filter(item => item.type === type);
    }
    
    if (category && typeof category === 'string') {
      filteredItems = filteredItems.filter(item => 
        item.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    res.json({
      success: true,
      data: {
        items: filteredItems,
        total: filteredItems.length,
        categories: [...new Set(items.map(i => i.category))].sort(),
      },
    });
  } catch (error) {
    console.error('Error in tech-data route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch technology data',
    });
  }
});

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const items = await fetchAndCacheDevIcons();
    
    const { type } = req.query;
    let filteredItems = items;
    
    if (type && typeof type === 'string') {
      filteredItems = filteredItems.filter(item => item.type === type);
    }
    
    const categories = [...new Set(filteredItems.map(i => i.category))].sort();
    
    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    await db.collection('cache').doc('devicons').delete();
    
    const items = await fetchAndCacheDevIcons();
    
    res.json({
      success: true,
      message: `Refreshed cache with ${items.length} items`,
      data: { total: items.length },
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache',
    });
  }
});

export default router;
