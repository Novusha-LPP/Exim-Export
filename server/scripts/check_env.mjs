import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Current NODE_ENV in server/.env:', process.env.NODE_ENV);
console.log('Current USE_NORMALIZED_SUBCOLLECTIONS:', process.env.USE_NORMALIZED_SUBCOLLECTIONS);
const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI : process.env.DEV_MONGODB_URI;
console.log('Target MongoDB URI:', uri);
