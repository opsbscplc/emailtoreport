const { MongoClient } = require('mongodb');

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emailtoreport';
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('=== Checking emails from August 11, 2025 ===');
    
    // Find all emails from August 11, 2025
    const emails = await db.collection('emails').find({
      date: {
        $gte: new Date('2025-08-10T00:00:00.000Z'),
        $lte: new Date('2025-08-12T00:00:00.000Z')
      }
    }).toArray();
    
    console.log(`Found ${emails.length} emails:`);
    emails.forEach(email => {
      console.log(`- ${email.type.toUpperCase()}: ${email.date.toISOString()} (${email.subject})`);
    });
    
    console.log('\n=== Checking outages from August 11, 2025 ===');
    
    // Find all outages from August 11, 2025
    const outages = await db.collection('outages').find({
      start: {
        $gte: new Date('2025-08-10T00:00:00.000Z'),
        $lte: new Date('2025-08-12T00:00:00.000Z')
      }
    }).toArray();
    
    console.log(`Found ${outages.length} outages:`);
    outages.forEach(outage => {
      console.log(`- START: ${outage.start.toISOString()}`);
      if (outage.end) {
        console.log(`  END: ${outage.end.toISOString()}`);
      }
      console.log(`  DURATION: ${outage.durationMinutes} minutes`);
      console.log(`  EVENTS: ${outage.events.length} events`);
      outage.events.forEach((event, i) => {
        console.log(`    ${i+1}. ${event.type.toUpperCase()} at ${event.at.toISOString()} (ID: ${event.messageId})`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
