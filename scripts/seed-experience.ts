import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccount) {
  console.error('FIREBASE_SERVICE_ACCOUNT environment variable is required');
  process.exit(1);
}

// Check if already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
  });
}

const db = admin.firestore();

// Helper function to check and add items (non-destructive)
async function seedCollection<T extends Record<string, unknown>>(
  collectionName: string,
  items: T[],
  uniqueField: keyof T,
  displayField?: keyof T
): Promise<{ added: number; skipped: number }> {
  const existingSnapshot = await db.collection(collectionName).get();
  const existingValues = new Set(
    existingSnapshot.docs.map(doc => {
      const val = doc.data()[uniqueField as string];
      return typeof val === 'string' ? val.toLowerCase().trim() : val;
    })
  );

  let added = 0;
  let skipped = 0;

  for (const item of items) {
    const checkValue = item[uniqueField];
    const normalizedValue = typeof checkValue === 'string' ? checkValue.toLowerCase().trim() : checkValue;
    
    if (existingValues.has(normalizedValue)) {
      const displayValue = displayField ? item[displayField] : item[uniqueField];
      console.log(`  Skipped (exists): ${String(displayValue).substring(0, 40)}`);
      skipped++;
    } else {
      await db.collection(collectionName).add(item);
      const displayValue = displayField ? item[displayField] : item[uniqueField];
      console.log(`  Added: ${String(displayValue).substring(0, 40)}`);
      added++;
    }
  }

  return { added, skipped };
}

const seedExperienceData = async () => {
  console.log('Starting experience data seed (non-destructive)...\n');

  // Work Experience
  const workExperience = [
    {
      title: 'Full Stack Developer',
      company: 'Freelance / Self-Employed',
      location: 'Remote',
      period: '2023 - Present',
      type: 'Full-time',
      description: 'Building custom web applications for clients worldwide, specializing in React, Next.js, Node.js, and modern cloud technologies.',
      responsibilities: [
        'Designed and developed full-stack web applications for various clients',
        'Implemented responsive and accessible user interfaces using React and Next.js',
        'Built RESTful APIs and integrated third-party services',
        'Managed databases and optimized query performance',
        'Deployed and maintained applications on cloud platforms'
      ],
      technologies: ['React', 'Next.js', 'Node.js', 'TypeScript', 'MongoDB', 'PostgreSQL', 'AWS'],
      order: 0,
    },
    {
      title: 'Junior Web Developer',
      company: 'Tech Solutions Company',
      location: 'Sri Lanka',
      period: '2022 - 2023',
      type: 'Full-time',
      description: 'Contributed to the development of web applications and gained hands-on experience with modern development practices.',
      responsibilities: [
        'Developed and maintained frontend components using React',
        'Collaborated with senior developers on backend features',
        'Participated in code reviews and team discussions',
        'Assisted in debugging and troubleshooting issues'
      ],
      technologies: ['React', 'JavaScript', 'HTML', 'CSS', 'Node.js', 'MySQL'],
      order: 1,
    }
  ];

  console.log('Seeding Work Experience...');
  const workResult = await seedCollection(
    'workExperience',
    workExperience,
    'title' as keyof typeof workExperience[0],
    'title' as keyof typeof workExperience[0]
  );
  console.log(`Work Experience: ${workResult.added} added, ${workResult.skipped} existing\n`);

  // Certifications
  const certifications = [
    {
      title: 'Meta Front-End Developer Professional Certificate',
      issuer: 'Meta (Coursera)',
      date: '2023',
      credentialUrl: '',
      order: 0,
    },
    {
      title: 'JavaScript Algorithms and Data Structures',
      issuer: 'freeCodeCamp',
      date: '2023',
      credentialUrl: '',
      order: 1,
    },
    {
      title: 'Responsive Web Design',
      issuer: 'freeCodeCamp',
      date: '2022',
      credentialUrl: '',
      order: 2,
    },
  ];

  console.log('Seeding Certifications...');
  const certResult = await seedCollection(
    'certifications',
    certifications,
    'title' as keyof typeof certifications[0],
    'title' as keyof typeof certifications[0]
  );
  console.log(`Certifications: ${certResult.added} added, ${certResult.skipped} existing\n`);

  // Core Values
  const coreValues = [
    {
      icon: 'Target',
      title: 'Quality First',
      description: 'I believe in delivering clean, maintainable code that stands the test of time. Every project deserves attention to detail.',
      order: 0,
    },
    {
      icon: 'Lightbulb',
      title: 'Continuous Learning',
      description: 'Technology evolves rapidly. I stay curious and constantly expand my knowledge to bring the best solutions to the table.',
      order: 1,
    },
    {
      icon: 'Heart',
      title: 'User-Centric Design',
      description: 'Great software solves real problems. I focus on understanding user needs to create intuitive, meaningful experiences.',
      order: 2,
    },
    {
      icon: 'Code2',
      title: 'Clean Architecture',
      description: 'Well-structured code is easier to maintain, test, and scale. I prioritize architectural decisions that enable long-term success.',
      order: 3,
    }
  ];

  console.log('Seeding Core Values...');
  const valuesResult = await seedCollection(
    'coreValues',
    coreValues,
    'title' as keyof typeof coreValues[0],
    'title' as keyof typeof coreValues[0]
  );
  console.log(`Core Values: ${valuesResult.added} added, ${valuesResult.skipped} existing\n`);

  // Interests
  const interests = [
    { icon: 'Code2', label: 'Coding', order: 0 },
    { icon: 'Coffee', label: 'Coffee', order: 1 },
    { icon: 'Gamepad2', label: 'Gaming', order: 2 },
    { icon: 'BookOpen', label: 'Reading', order: 3 },
    { icon: 'Music', label: 'Music', order: 4 },
    { icon: 'Plane', label: 'Travel', order: 5 },
  ];

  console.log('Seeding Interests...');
  const interestsResult = await seedCollection(
    'interests',
    interests,
    'label' as keyof typeof interests[0],
    'label' as keyof typeof interests[0]
  );
  console.log(`Interests: ${interestsResult.added} added, ${interestsResult.skipped} existing\n`);

  // Learning Goals
  const learningGoals = [
    { name: 'TypeScript Advanced Patterns', progress: 70, order: 0 },
    { name: 'System Design', progress: 50, order: 1 },
    { name: 'Cloud Architecture (AWS)', progress: 40, order: 2 },
    { name: 'GraphQL', progress: 60, order: 3 },
    { name: 'Docker & Kubernetes', progress: 45, order: 4 },
    { name: 'AI/ML Basics', progress: 30, order: 5 },
  ];

  console.log('Seeding Learning Goals...');
  const goalsResult = await seedCollection(
    'learningGoals',
    learningGoals,
    'name' as keyof typeof learningGoals[0],
    'name' as keyof typeof learningGoals[0]
  );
  console.log(`Learning Goals: ${goalsResult.added} added, ${goalsResult.skipped} existing\n`);

  // Fun Facts
  const funFacts = [
    { emoji: '☕', fact: 'Fueled by countless cups of coffee', order: 0 },
    { emoji: '🌙', fact: 'Most productive during late-night coding sessions', order: 1 },
    { emoji: '🎯', fact: 'Passionate about clean, readable code', order: 2 },
    { emoji: '🚀', fact: 'Always exploring new technologies', order: 3 },
    { emoji: '🤝', fact: 'Enjoy mentoring and knowledge sharing', order: 4 },
    { emoji: '🎮', fact: 'Gaming enthusiast in spare time', order: 5 },
  ];

  console.log('Seeding Fun Facts...');
  const factsResult = await seedCollection(
    'funFacts',
    funFacts,
    'fact' as keyof typeof funFacts[0],
    'fact' as keyof typeof funFacts[0]
  );
  console.log(`Fun Facts: ${factsResult.added} added, ${factsResult.skipped} existing\n`);

  console.log('✅ Experience data seed completed successfully!');
  console.log('\nSummary:');
  console.log(`  - Work Experience: ${workResult.added} added, ${workResult.skipped} existing`);
  console.log(`  - Certifications: ${certResult.added} added, ${certResult.skipped} existing`);
  console.log(`  - Core Values: ${valuesResult.added} added, ${valuesResult.skipped} existing`);
  console.log(`  - Interests: ${interestsResult.added} added, ${interestsResult.skipped} existing`);
  console.log(`  - Learning Goals: ${goalsResult.added} added, ${goalsResult.skipped} existing`);
  console.log(`  - Fun Facts: ${factsResult.added} added, ${factsResult.skipped} existing`);
};

seedExperienceData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding experience data:', error);
    process.exit(1);
  });
