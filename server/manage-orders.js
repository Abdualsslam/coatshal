import { openDatabase } from './database.js';

const [action = 'list', reference] = process.argv.slice(2);
const store = openDatabase();
try {
  if (action === 'list') {
    console.log(JSON.stringify(store.list(), null, 2));
  } else if ((action === 'confirm' || action === 'reject') && /^CS-[A-F0-9]{12}$/.test(reference ?? '')) {
    if (store.review(reference, action)) console.log(reference + ' ' + action);
    else {
      console.error('No pending order with that reference.');
      process.exitCode = 1;
    }
  } else {
    console.error('Use: npm run orders -- list | confirm CS-… | reject CS-…');
    process.exitCode = 1;
  }
} finally {
  store.close();
}
