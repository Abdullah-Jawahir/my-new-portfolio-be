import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccount) {
  console.error('FIREBASE_SERVICE_ACCOUNT environment variable is required');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
  });
}

const db = admin.firestore();

const seedAboutProfileData = async () => {
  console.log('Starting About Profile seed (non-destructive)...\n');

  try {
    // Update profile document with About-specific fields if they don't exist
    const profileRef = db.collection('profile').doc('main');
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      console.log('Profile document does not exist. Creating with About fields...');
      await profileRef.set({
        tagline: 'Problem Solver | Tech Enthusiast',
        extendedBio: `I'm a passionate Full Stack Engineer with a deep love for building digital experiences that matter. My journey in software development began with curiosity about how websites work, and it has evolved into a career dedicated to crafting elegant solutions to complex problems.

With expertise spanning both frontend and backend technologies, I bring a holistic approach to development. I believe that great software is born at the intersection of technical excellence and user empathy—code that not only works flawlessly but also delights those who use it.

When I'm not coding, you'll find me exploring new technologies, contributing to open-source projects, or enjoying a good cup of coffee while reading about the latest in tech.`,
        personalQuote: "Building software is not just about writing code—it's about solving problems, creating experiences, and making a difference in people's lives.",
        location: 'Sri Lanka',
        yearsExperience: '2+ Years Experience',
        updatedAt: new Date(),
      }, { merge: true });
      console.log('✅ Profile About fields created');
    } else {
      const profileData = profileDoc.data();
      const updates: Record<string, unknown> = {};
      
      if (!profileData?.tagline) {
        updates.tagline = 'Problem Solver | Tech Enthusiast';
        console.log('  Adding tagline...');
      } else {
        console.log('  Skipped tagline (already exists)');
      }
      
      if (!profileData?.extendedBio) {
        updates.extendedBio = `I'm a passionate Full Stack Engineer with a deep love for building digital experiences that matter. My journey in software development began with curiosity about how websites work, and it has evolved into a career dedicated to crafting elegant solutions to complex problems.

With expertise spanning both frontend and backend technologies, I bring a holistic approach to development. I believe that great software is born at the intersection of technical excellence and user empathy—code that not only works flawlessly but also delights those who use it.

When I'm not coding, you'll find me exploring new technologies, contributing to open-source projects, or enjoying a good cup of coffee while reading about the latest in tech.`;
        console.log('  Adding extendedBio...');
      } else {
        console.log('  Skipped extendedBio (already exists)');
      }
      
      if (!profileData?.personalQuote) {
        updates.personalQuote = "Building software is not just about writing code—it's about solving problems, creating experiences, and making a difference in people's lives.";
        console.log('  Adding personalQuote...');
      } else {
        console.log('  Skipped personalQuote (already exists)');
      }
      
      if (!profileData?.location) {
        updates.location = 'Sri Lanka';
        console.log('  Adding location...');
      } else {
        console.log('  Skipped location (already exists)');
      }
      
      if (!profileData?.yearsExperience) {
        updates.yearsExperience = '2+ Years Experience';
        console.log('  Adding yearsExperience...');
      } else {
        console.log('  Skipped yearsExperience (already exists)');
      }
      
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await profileRef.update(updates);
        console.log(`\n✅ Profile updated with ${Object.keys(updates).length - 1} new About fields`);
      } else {
        console.log('\n✅ All About profile fields already exist, nothing to update');
      }
    }

    console.log('\n✅ About Profile seed completed successfully!');
  } catch (error) {
    console.error('Error seeding About Profile data:', error);
    throw error;
  }
};

seedAboutProfileData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
