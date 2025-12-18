/**
 * Script to clean up old similarity detection results
 * This ensures all similarity results are fresh and accurate after the bug fixes
 * 
 * Usage: npx ts-node scripts/clean-similarity-results.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanSimilarityResults() {
  console.log('🧹 Cleaning up old similarity results...\n');

  try {
    // Get statistics before cleanup
    const totalSimilarities = await prisma.documentSimilarity.count();
    const processedSimilarities = await prisma.documentSimilarity.count({
      where: { isProcessed: true },
    });
    const unprocessedSimilarities = await prisma.documentSimilarity.count({
      where: { isProcessed: false },
    });

    console.log('📊 Current Statistics:');
    console.log(`   Total similarities: ${totalSimilarities}`);
    console.log(`   Processed: ${processedSimilarities}`);
    console.log(`   Unprocessed: ${unprocessedSimilarities}\n`);

    // Option 1: Delete only unprocessed similarities (safe - keeps admin decisions)
    console.log('🗑️  Deleting unprocessed similarities...');
    const deleteUnprocessed = await prisma.documentSimilarity.deleteMany({
      where: { isProcessed: false },
    });
    console.log(`   Deleted ${deleteUnprocessed.count} unprocessed similarities\n`);

    // Option 2: If you want to delete ALL and regenerate (uncomment if needed)
    // console.log('🗑️  Deleting ALL similarities (including processed)...');
    // const deleteAll = await prisma.documentSimilarity.deleteMany({});
    // console.log(`   Deleted ${deleteAll.count} total similarities\n`);

    // Clean up orphaned similarity jobs
    console.log('🗑️  Cleaning up old similarity jobs...');
    const deleteOldJobs = await prisma.similarityJob.deleteMany({
      where: {
        OR: [
          { status: 'completed', completedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // Older than 30 days
          { status: 'failed' },
        ],
      },
    });
    console.log(`   Deleted ${deleteOldJobs.count} old jobs\n`);

    console.log('✅ Cleanup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run similarity detection again for documents that need it');
    console.log('   2. Check the admin dashboard for new similarity warnings');
    console.log('   3. Monitor logs for any issues\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanSimilarityResults()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
