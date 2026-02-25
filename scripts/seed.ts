import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccount) {
  console.error('FIREBASE_SERVICE_ACCOUNT environment variable is required');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccount)),
});

const db = admin.firestore();

const seedData = async () => {
  console.log('Starting database seed...');

  // Profile data
  const profile = {
    name: 'Abdullah Jawahir',
    title: 'Full Stack Engineer',
    greeting: "Hello, I'm",
    description: 'I architect and build end-to-end web applications, from pixel-perfect user interfaces to robust backend systems. Passionate about creating scalable solutions that deliver exceptional user experiences.',
    aboutDescription1: 'A skilled full stack engineer with expertise in both frontend and backend technologies, I specialize in building complete web applications from the ground up. With proficiency in modern frameworks and databases, I create scalable solutions that deliver exceptional user experiences.',
    aboutDescription2: 'My passion for clean architecture and attention to detail drives me to develop robust applications that not only meet requirements but exceed expectations in performance and maintainability.',
    avatarUrl: '',
    cvUrl: '',
    updatedAt: new Date(),
  };

  await db.collection('profile').doc('main').set(profile);
  console.log('Profile seeded');

  // Stats
  const stats = [
    { icon: 'Briefcase', number: '2+', label: 'Years Experience', description: 'Full Stack Development', order: 0 },
    { icon: 'GraduationCap', number: '4', label: 'Certifications', description: 'Python, Web Design & Responsive Design', order: 1 },
    { icon: 'Code2', number: '10+', label: 'Projects', description: 'Completed Successfully', order: 2 },
    { icon: 'Award', number: '5+', label: 'Technologies', description: 'Mastered & Proficient', order: 3 },
  ];

  for (const stat of stats) {
    await db.collection('stats').add(stat);
  }
  console.log('Stats seeded');

  // Contact Info
  const contactInfo = [
    { type: 'email', value: 'mjabdullah33@gmail.com', href: 'mailto:mjabdullah33@gmail.com', icon: 'Mail' },
    { type: 'phone', value: '+94 77 802 7136', href: 'tel:+94778027136', icon: 'Phone' },
    { type: 'location', value: 'Nawalapitiya, Sri Lanka', href: '#', icon: 'MapPin' },
  ];

  for (const info of contactInfo) {
    await db.collection('contactInfo').add(info);
  }
  console.log('Contact info seeded');

  // Social Links
  const socialLinks = [
    { platform: 'GitHub', url: 'https://github.com/Abdullah-Jawahir', icon: 'Github', order: 0 },
    { platform: 'LinkedIn', url: 'https://www.linkedin.com/in/mohamed-jawahir-abdullah/', icon: 'Linkedin', order: 1 },
    { platform: 'Email', url: 'mailto:mjabdullah33@gmail.com', icon: 'MessageCircle', order: 2 },
  ];

  for (const link of socialLinks) {
    await db.collection('socialLinks').add(link);
  }
  console.log('Social links seeded');

  // Skill Categories
  const skillCategories = [
    {
      category: 'frontend',
      title: 'Frontend Development',
      icon: 'Globe',
      description: 'Crafting modern, responsive user interfaces with cutting-edge technologies',
      order: 0,
      skills: [
        { name: 'HTML', level: 95, icon: 'FileText', color: 'from-orange-500 to-red-500', order: 0 },
        { name: 'CSS', level: 90, icon: 'Palette', color: 'from-blue-500 to-indigo-500', order: 1 },
        { name: 'SASS', level: 75, icon: 'Paintbrush', color: 'from-pink-500 to-rose-500', order: 2 },
        { name: 'JavaScript', level: 80, icon: 'Code2', color: 'from-yellow-500 to-amber-500', order: 3 },
        { name: 'Bootstrap', level: 85, icon: 'Layers', color: 'from-purple-500 to-violet-500', order: 4 },
        { name: 'React', level: 70, icon: 'Atom', color: 'from-cyan-500 to-teal-500', order: 5 },
        { name: 'Tailwind CSS', level: 80, icon: 'Code2', color: 'from-emerald-500 to-green-500', order: 6 },
        { name: 'Next.js', level: 70, icon: 'Code2', color: 'from-violet-500 to-purple-500', order: 7 },
      ],
    },
    {
      category: 'backend',
      title: 'Backend Development',
      icon: 'Zap',
      description: 'Developing scalable APIs and server-side solutions for full-stack applications',
      order: 1,
      skills: [
        { name: 'Java', level: 80, icon: 'Code', color: 'from-orange-500 to-red-500', order: 0 },
        { name: 'Spring Boot', level: 75, icon: 'Code', color: 'from-blue-500 to-indigo-500', order: 1 },
        { name: 'Laravel', level: 85, icon: 'Code', color: 'from-pink-500 to-rose-500', order: 2 },
        { name: 'FastAPI', level: 70, icon: 'Code2', color: 'from-yellow-500 to-amber-500', order: 3 },
        { name: 'MySQL', level: 75, icon: 'Database', color: 'from-purple-500 to-violet-500', order: 4 },
        { name: 'Python', level: 70, icon: 'Code2', color: 'from-cyan-500 to-teal-500', order: 5 },
        { name: 'Git', level: 80, icon: 'GitBranch', color: 'from-emerald-500 to-green-500', order: 6 },
      ],
    },
  ];

  for (const category of skillCategories) {
    await db.collection('skillCategories').add(category);
  }
  console.log('Skill categories seeded');

  // Additional Skills
  const additionalSkills = [
    'Responsive Design',
    'Version Control',
    'API Integration',
    'Performance Optimization',
    'Cross-browser Compatibility',
    'Agile Development',
    'Problem Solving',
    'Team Collaboration',
  ];

  for (let i = 0; i < additionalSkills.length; i++) {
    await db.collection('additionalSkills').add({ name: additionalSkills[i], order: i });
  }
  console.log('Additional skills seeded');

  // Education
  const education = [
    {
      title: 'BSc in Software Engineering',
      subtitle: 'Bachelor Degree',
      period: '2023 - 2025',
      description: 'Bachelor of Science in Software Engineering, focusing on advanced software development methodologies, system design, and engineering principles.',
      order: 0,
    },
    {
      title: 'HND in Computing',
      subtitle: 'Software Engineering',
      period: '2021 - 2023',
      description: 'Higher National Diploma in Computing with specialization in Software Engineering, covering modern development practices and technologies.',
      order: 1,
    },
    {
      title: 'GCE Advance Level',
      subtitle: 'Physical Science',
      period: '2018 - 2020',
      description: 'Completed Advanced Level in Physical Science stream with focus on Mathematics, Physics, and Chemistry.',
      order: 2,
    },
  ];

  for (const edu of education) {
    await db.collection('education').add(edu);
  }
  console.log('Education seeded');

  // Projects
  const projects = [
    {
      title: 'React VivaCart E-Commerce Application',
      description: 'A full-featured e-commerce platform built with React, featuring shopping cart, user authentication, payment integration, and admin dashboard.',
      imageUrl: '/Images/vivacart.png',
      technologies: ['React', 'JavaScript', 'CSS', 'Node.js', 'MongoDB'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/React-VivaCart-eCommerce-Application',
      liveUrl: 'https://vivacart.netlify.app/',
      featured: true,
      order: 0,
      createdAt: new Date(),
    },
    {
      title: 'DevFinder',
      description: 'A GitHub user search application that allows users to find and view GitHub profiles with detailed information and repositories.',
      imageUrl: '/Images/devfinder-img.png',
      technologies: ['React', 'JavaScript', 'CSS', 'GitHub API'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/DevFinder',
      liveUrl: 'https://abdullah-jawahir.github.io/DevFinder/',
      featured: true,
      order: 1,
      createdAt: new Date(),
    },
    {
      title: 'Homy Furnitures Website',
      description: 'A modern furniture e-commerce website with beautiful UI, product catalog, and responsive design for all devices.',
      imageUrl: '/Images/homy-furnitue-img.png',
      technologies: ['HTML', 'CSS', 'JavaScript', 'Bootstrap'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/Homy-Furniture-Landing-Page',
      liveUrl: 'https://abdullah-jawahir.github.io/Homy-Furniture-Landing-Page/',
      featured: true,
      order: 2,
      createdAt: new Date(),
    },
    {
      title: 'Online Photography Management System',
      description: 'A comprehensive system for managing photography bookings, client galleries, and photographer portfolios.',
      imageUrl: '/Images/online-phptography.png',
      technologies: ['PHP', 'MySQL', 'HTML', 'CSS', 'JavaScript'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/Malcolm-Lismore-Photography-Website',
      liveUrl: 'https://malcolm-lismore-photography.netlify.app/',
      featured: true,
      order: 3,
      createdAt: new Date(),
    },
    {
      title: 'Online Job Portal',
      description: 'A job search platform connecting employers with job seekers, featuring job listings, applications, and user profiles.',
      imageUrl: '/Images/jobzz.png',
      technologies: ['PHP', 'MySQL', 'Bootstrap', 'JavaScript'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/Job-Portal-WebApp',
      liveUrl: 'https://abdullah-jawahir.github.io/Job-Portal-WebApp/',
      featured: false,
      order: 4,
      createdAt: new Date(),
    },
    {
      title: 'React Todo App',
      description: 'A modern todo application with drag-and-drop functionality, categories, and local storage persistence.',
      imageUrl: '/Images/todo.png',
      technologies: ['React', 'JavaScript', 'CSS', 'Local Storage'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/React-Todo-App',
      liveUrl: 'https://react-prac-todo-app.netlify.app/',
      featured: false,
      order: 5,
      createdAt: new Date(),
    },
    {
      title: 'Beauty Parlour Management System',
      description: 'A comprehensive management system for beauty parlours with appointment booking, service management, and client tracking.',
      imageUrl: '/Images/BeautyParlourMS-pic.png',
      technologies: ['PHP', 'MySQL', 'HTML', 'CSS', 'JavaScript'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/OnlineBeautyParlor',
      liveUrl: 'https://abdullah-jawahir.github.io/OnlineBeautyParlor/',
      featured: false,
      order: 6,
      createdAt: new Date(),
    },
    {
      title: 'React Food Order UI',
      description: 'A modern food ordering interface built with React, featuring menu browsing, cart functionality, and responsive design.',
      imageUrl: '/Images/food-order.png',
      technologies: ['React', 'JavaScript', 'CSS', 'Local Storage'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/React-Food-Order-UI',
      liveUrl: 'https://react-food-order-ui.netlify.app/',
      featured: false,
      order: 7,
      createdAt: new Date(),
    },
    {
      title: 'Memory Game Application',
      description: 'An interactive memory card game with multiple difficulty levels and score tracking functionality.',
      imageUrl: '/Images/memory.png',
      technologies: ['JavaScript', 'HTML', 'CSS'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/Memory-Game',
      liveUrl: 'https://abdullah-jawahir.github.io/Memory-Game/',
      featured: false,
      order: 8,
      createdAt: new Date(),
    },
    {
      title: 'Neumorphism Calculator',
      description: 'A modern calculator with neumorphism design principles, featuring smooth animations and intuitive user interface.',
      imageUrl: '/Images/calculator.png',
      technologies: ['JavaScript', 'HTML', 'CSS'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/Nemorphism-Calculator',
      liveUrl: 'https://abdullah-jawahir.github.io/Nemorphism-Calculator/',
      featured: false,
      order: 9,
      createdAt: new Date(),
    },
    {
      title: 'Budget Calculator Application',
      description: 'A personal finance tool for tracking expenses, managing budgets, and analyzing spending patterns.',
      imageUrl: '/Images/budget.png',
      technologies: ['JavaScript', 'HTML', 'CSS', 'Local Storage'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/Budget-Calculator',
      liveUrl: 'https://abdullah-jawahir.github.io/Budget-Calculator/',
      featured: false,
      order: 10,
      createdAt: new Date(),
    },
    {
      title: 'Password Generator Application',
      description: 'A secure password generator with customizable options for length, character types, and special requirements.',
      imageUrl: '/Images/password-gen.png',
      technologies: ['JavaScript', 'HTML', 'CSS'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/Password-Generator',
      liveUrl: 'https://abdullah-jawahir.github.io/Password-Generator/',
      featured: false,
      order: 11,
      createdAt: new Date(),
    },
    {
      title: 'Typewriter Application',
      description: 'A dynamic text animation tool that creates typewriter effects with customizable speed and styling options.',
      imageUrl: '/Images/typewriter.png',
      technologies: ['JavaScript', 'HTML', 'CSS'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/JS-Type-Writer',
      liveUrl: 'https://abdullah-jawahir.github.io/JS-Type-Writer/',
      featured: false,
      order: 12,
      createdAt: new Date(),
    },
    {
      title: 'Glassmorphism Clock',
      description: 'A beautiful digital clock with glassmorphism design, featuring real-time updates and modern aesthetics.',
      imageUrl: '/Images/clock.png',
      technologies: ['JavaScript', 'HTML', 'CSS'],
      githubUrl: 'https://github.com/Abdullah-Jawahir/Simple-Clock',
      liveUrl: 'https://abdullah-jawahir.github.io/Simple-Clock/',
      featured: false,
      order: 13,
      createdAt: new Date(),
    },
  ];

  for (const project of projects) {
    await db.collection('projects').add(project);
  }
  console.log('Projects seeded');

  console.log('Database seed completed successfully!');
  process.exit(0);
};

seedData().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
