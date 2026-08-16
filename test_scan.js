const { fetchJobsForQuery } = require('./src/scraper');
const { processScanResults, getJobs, getStats } = require('./src/storage');
const config = require('./src/config');

async function test() {
  console.log('🧪 Testing LinkedIn Scraper for Ankita...');
  
  // Test 1: Fetch 1 remote query
  console.log('\n--- 1. Testing Remote Scraping: "Senior SDET" ---');
  const remoteJobs = await fetchJobsForQuery('Senior SDET', config.locations.remote.locationQuery, config.locations.remote.workplaceType, '🌐 Remote (US)');
  console.log(`Found ${remoteJobs.length} remote jobs`);
  if (remoteJobs.length > 0) {
    console.log('Sample Remote Job:', {
      title: remoteJobs[0].title,
      company: remoteJobs[0].company,
      location: remoteJobs[0].location,
      url: remoteJobs[0].url
    });
  }

  // Test 2: Fetch 1 Pittsburgh query
  console.log('\n--- 2. Testing Pittsburgh Scraping: "QA Automation" ---');
  const pghJobs = await fetchJobsForQuery('QA Automation', config.locations.pittsburgh.locationQuery, config.locations.pittsburgh.workplaceType, '📍 Pittsburgh Area');
  console.log(`Found ${pghJobs.length} Pittsburgh jobs`);
  if (pghJobs.length > 0) {
    console.log('Sample Pittsburgh Job:', {
      title: pghJobs[0].title,
      company: pghJobs[0].company,
      location: pghJobs[0].location,
      url: pghJobs[0].url
    });
  }

  // Test 3: Process and enrich
  const combined = [...remoteJobs, ...pghJobs];
  console.log(`\n--- 3. Testing Storage & Enrichment (${combined.length} jobs) ---`);
  const result = processScanResults(combined);
  console.log('Process Result:', result);

  const stats = getStats();
  console.log('Stats:', stats);

  const sampleEnriched = getJobs()[0];
  if (sampleEnriched) {
    console.log('\nSample Enriched Stored Job:', {
      title: sampleEnriched.title,
      company: sampleEnriched.company,
      isTop100: sampleEnriched.isTop100,
      isPittsburgh: sampleEnriched.isPittsburgh,
      workplaceType: sampleEnriched.workplaceType,
      matchScore: sampleEnriched.matchScore,
      matchedSkills: sampleEnriched.matchedSkills,
      companyApplyUrl: sampleEnriched.companyApplyUrl
    });
  }

  console.log('\n✅ Test completed successfully!');
}

test().catch(err => {
  console.error('❌ Test failed:', err);
});
