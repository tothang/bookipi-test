const fs = require('fs');
const path = require('path');

const NUM_USERS = 10000;
const OUTPUT_FILE = path.join(__dirname, 'users.csv');

// Generate CSV with user IDs
const generateUsers = (count) => {
  const users = ['userId']; // CSV header
  
  for (let i = 1; i <= count; i++) {
    users.push(`user-${i}`);
  }
  
  return users.join('\n');
};

const csvContent = generateUsers(NUM_USERS);
fs.writeFileSync(OUTPUT_FILE, csvContent);

console.log(`Generated ${NUM_USERS} test users in ${OUTPUT_FILE}`);
