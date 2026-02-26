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

const seedExperienceData = async () => {
  console.log('Starting experience data seed...');

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
      description: 'Contributed to the development of enterprise web applications, focusing on frontend development and API integration.',
      responsibilities: [
        'Developed and maintained frontend components using React',
        'Collaborated with backend team for API integration',
        'Participated in code reviews and team discussions',
        'Fixed bugs and improved application performance',
        'Documented technical specifications and user guides'
      ],
      technologies: ['React', 'JavaScript', 'HTML/CSS', 'Bootstrap', 'Git'],
      order: 1,
    }
  ];

  for (const job of workExperience) {
    await db.collection('workExperience').add({
      ...job,
      createdAt: new Date(),
    });
  }
  console.log('Work experience seeded');

  // Certifications
  const certifications = [
    {
      title: 'Full Stack Web Development',
      issuer: 'Online Learning Platform',
      date: '2023',
      credentialUrl: '',
      order: 0,
    },
    {
      title: 'React Developer Certification',
      issuer: 'Meta',
      date: '2023',
      credentialUrl: '',
      order: 1,
    },
    {
      title: 'JavaScript Algorithms and Data Structures',
      issuer: 'freeCodeCamp',
      date: '2022',
      credentialUrl: '',
      order: 2,
    }
  ];

  for (const cert of certifications) {
    await db.collection('certifications').add({
      ...cert,
      createdAt: new Date(),
    });
  }
  console.log('Certifications seeded');

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

  for (const value of coreValues) {
    await db.collection('coreValues').add(value);
  }
  console.log('Core values seeded');

  // Interests
  const interests = [
    { icon: 'Code2', label: 'Coding', order: 0 },
    { icon: 'Coffee', label: 'Coffee', order: 1 },
    { icon: 'Gamepad2', label: 'Gaming', order: 2 },
    { icon: 'BookOpen', label: 'Reading', order: 3 },
    { icon: 'Music', label: 'Music', order: 4 },
    { icon: 'Plane', label: 'Travel', order: 5 },
  ];

  for (const interest of interests) {
    await db.collection('interests').add(interest);
  }
  console.log('Interests seeded');

  // Learning Goals
  const learningGoals = [
    { name: 'TypeScript Advanced Patterns', progress: 70, order: 0 },
    { name: 'System Design', progress: 50, order: 1 },
    { name: 'Cloud Architecture (AWS)', progress: 40, order: 2 },
    { name: 'GraphQL', progress: 60, order: 3 },
    { name: 'Docker & Kubernetes', progress: 45, order: 4 },
    { name: 'AI/ML Basics', progress: 30, order: 5 },
  ];

  for (const goal of learningGoals) {
    await db.collection('learningGoals').add(goal);
  }
  console.log('Learning goals seeded');

  // Fun Facts
  const funFacts = [
    { emoji: '☕', fact: 'Fueled by countless cups of coffee', order: 0 },
    { emoji: '🌙', fact: 'Most productive during late-night coding sessions', order: 1 },
    { emoji: '🎯', fact: 'Passionate about clean, readable code', order: 2 },
    { emoji: '🚀', fact: 'Always exploring new technologies', order: 3 },
    { emoji: '🤝', fact: 'Enjoy mentoring and knowledge sharing', order: 4 },
    { emoji: '🎮', fact: 'Gaming enthusiast in spare time', order: 5 },
  ];

  for (const fact of funFacts) {
    await db.collection('funFacts').add(fact);
  }
  console.log('Fun facts seeded');

  console.log('Experience data seed completed successfully!');
  process.exit(0);
};

seedExperienceData().catch((error) => {
  console.error('Error seeding experience data:', error);
  process.exit(1);
});
