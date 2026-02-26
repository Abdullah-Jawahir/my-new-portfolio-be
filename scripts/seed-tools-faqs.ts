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

const seedToolsAndFaqs = async () => {
  console.log('Starting tools, technologies, and FAQs seed (non-destructive)...');

  // Tools & Technologies data
  const toolsTechnologies = [
    { name: 'VS Code', category: 'IDE', order: 0 },
    { name: 'Git', category: 'Version Control', order: 1 },
    { name: 'GitHub', category: 'Version Control', order: 2 },
    { name: 'Postman', category: 'API Testing', order: 3 },
    { name: 'Figma', category: 'Design', order: 4 },
    { name: 'Docker', category: 'DevOps', order: 5 },
    { name: 'npm/yarn', category: 'Package Manager', order: 6 },
    { name: 'Linux', category: 'OS', order: 7 },
    { name: 'Vercel', category: 'Deployment', order: 8 },
    { name: 'Firebase', category: 'BaaS', order: 9 },
    { name: 'MongoDB Compass', category: 'Database Tool', order: 10 },
    { name: 'Chrome DevTools', category: 'Development', order: 11 },
    { name: 'Slack', category: 'Communication', order: 12 },
    { name: 'Notion', category: 'Productivity', order: 13 },
    { name: 'Jira', category: 'Project Management', order: 14 },
  ];

  // FAQs data
  const faqs = [
    {
      question: 'What technologies do you specialize in?',
      answer: 'I specialize in modern web development technologies including React, Next.js, Node.js, TypeScript, and various databases like MongoDB and PostgreSQL. I also have experience with cloud platforms like AWS and Firebase.',
      category: 'Technical',
      order: 0,
    },
    {
      question: 'Do you offer freelance services?',
      answer: 'Yes! I am available for freelance projects. Whether you need a complete web application, a landing page, or help with an existing project, feel free to reach out through the contact form.',
      category: 'Services',
      order: 1,
    },
    {
      question: 'What is your typical project timeline?',
      answer: 'Project timelines vary based on complexity and scope. A simple landing page might take 1-2 weeks, while a full-stack application could take 4-8 weeks or more. I provide detailed estimates after understanding your requirements.',
      category: 'Services',
      order: 2,
    },
    {
      question: 'Do you provide ongoing maintenance and support?',
      answer: 'Yes, I offer maintenance and support packages for projects I develop. This includes bug fixes, security updates, feature additions, and performance optimization.',
      category: 'Services',
      order: 3,
    },
    {
      question: 'Can you work with existing codebases?',
      answer: 'Absolutely! I am comfortable working with existing projects, whether it is adding new features, fixing bugs, or refactoring code for better performance and maintainability.',
      category: 'Technical',
      order: 4,
    },
    {
      question: 'What is your preferred communication method?',
      answer: 'I am flexible with communication methods. Email is great for detailed discussions, while Slack or Discord work well for quick questions and regular updates. I am also available for video calls when needed.',
      category: 'General',
      order: 5,
    },
  ];

  try {
    // Check existing tools and only add non-duplicates
    console.log('\nSeeding Tools & Technologies...');
    const existingToolsSnapshot = await db.collection('toolsTechnologies').get();
    const existingToolNames = new Set(existingToolsSnapshot.docs.map(doc => doc.data().name?.toLowerCase()));
    
    let toolsAdded = 0;
    let toolsSkipped = 0;
    
    for (const tool of toolsTechnologies) {
      if (existingToolNames.has(tool.name.toLowerCase())) {
        console.log(`  Skipped (already exists): ${tool.name}`);
        toolsSkipped++;
      } else {
        await db.collection('toolsTechnologies').add(tool);
        console.log(`  Added: ${tool.name} (${tool.category})`);
        toolsAdded++;
      }
    }
    console.log(`Tools & Technologies: ${toolsAdded} added, ${toolsSkipped} skipped`);

    // Check existing FAQs and only add non-duplicates
    console.log('\nSeeding FAQs...');
    const existingFaqsSnapshot = await db.collection('faqs').get();
    const existingQuestions = new Set(existingFaqsSnapshot.docs.map(doc => doc.data().question?.toLowerCase().trim()));
    
    let faqsAdded = 0;
    let faqsSkipped = 0;
    
    for (const faq of faqs) {
      if (existingQuestions.has(faq.question.toLowerCase().trim())) {
        console.log(`  Skipped (already exists): ${faq.question.substring(0, 40)}...`);
        faqsSkipped++;
      } else {
        await db.collection('faqs').add(faq);
        console.log(`  Added: ${faq.question.substring(0, 40)}...`);
        faqsAdded++;
      }
    }
    console.log(`FAQs: ${faqsAdded} added, ${faqsSkipped} skipped`);

    console.log('\n✅ Seed completed successfully!');
    console.log('Summary:');
    console.log(`  - Tools & Technologies: ${toolsAdded} added, ${toolsSkipped} existing`);
    console.log(`  - FAQs: ${faqsAdded} added, ${faqsSkipped} existing`);
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
};

seedToolsAndFaqs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
