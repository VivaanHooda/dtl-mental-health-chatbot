/**
 * Setup Pinecone Index
 * Run: npx tsx scripts/setup-pinecone.ts
 */

import { Pinecone } from '@pinecone-database/pinecone';

async function setupPinecone() {
  console.log('🔵 Setting up Pinecone index...\n');

  const apiKey = process.env.PINECONE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ PINECONE_API_KEY not found in environment');
    process.exit(1);
  }

  const pinecone = new Pinecone({ apiKey });

  const indexName = 'mental-health-docs';

  try {
    // Check existing indexes
    console.log('🔍 Checking existing indexes...');
    const indexes = await pinecone.listIndexes();
    
    console.log(`📋 Found ${indexes.indexes?.length || 0} existing indexes:`);
    indexes.indexes?.forEach(idx => {
      console.log(`   - ${idx.name} (${idx.dimension} dimensions, ${idx.metric} metric)`);
    });

    // Check if our index exists
    const existingIndex = indexes.indexes?.find(idx => idx.name === indexName);
    
    if (existingIndex) {
      console.log(`\n✅ Index "${indexName}" already exists!`);
      console.log(`   Dimensions: ${existingIndex.dimension}`);
      console.log(`   Metric: ${existingIndex.metric}`);
      console.log(`   Status: ${existingIndex.status?.ready ? 'Ready' : 'Not Ready'}`);
      
      if (existingIndex.dimension !== 768) {
        console.log(`\n⚠️  WARNING: Index has ${existingIndex.dimension} dimensions, but text-embedding-004 needs 768!`);
        console.log(`   You need to delete and recreate the index with correct dimensions.`);
      }
      
      return;
    }

    // Create new index
    console.log(`\n📦 Creating index "${indexName}"...`);
    console.log('   Settings:');
    console.log('   - Dimensions: 768 (text-embedding-004)');
    console.log('   - Metric: cosine');
    console.log('   - Cloud: AWS');
    console.log('   - Region: us-east-1');
    
    await pinecone.createIndex({
      name: indexName,
      dimension: 768,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log(`\n✅ Index "${indexName}" created successfully!`);
    console.log(`\n⏳ Waiting for index to be ready (this may take 1-2 minutes)...`);

    // Wait for index to be ready
    let ready = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!ready && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      try {
        const indexList = await pinecone.listIndexes();
        const idx = indexList.indexes?.find(i => i.name === indexName);
        ready = idx?.status?.ready || false;
        
        if (!ready) {
          console.log(`   Attempt ${attempts}/${maxAttempts}...`);
        }
      } catch (err) {
        console.log(`   Checking... (${attempts}/${maxAttempts})`);
      }
    }

    if (ready) {
      console.log(`\n🎉 Index "${indexName}" is ready to use!`);
    } else {
      console.log(`\n⚠️  Index created but not ready yet. Please check Pinecone console.`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message?.includes('already exists')) {
      console.log('\n✅ Index already exists! You are good to go.');
    } else {
      console.error('\nFull error:', error);
      process.exit(1);
    }
  }
}

setupPinecone();
