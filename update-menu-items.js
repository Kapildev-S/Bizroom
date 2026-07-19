require('dotenv').config();
const admin = require('firebase-admin');
const sharp = require('sharp');
const crypto = require('crypto');

// Initialize Firebase Admin
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: 'bill-7362b',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
        storageBucket: 'bill-7362b.firebasestorage.app'
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();
const PEXELS_API_KEY = 'JIspfgQC4e2xFO1Kw1EEWTBRVaIKOrwyWnqar0UMfiuISzC66qFV2AKq';

const updateTargets = {
    'Chicken 65': { newName: 'Chicken 65', search: 'spicy fried chicken indian 65 red' },
    'Chicken Lollipop': { newName: 'Chicken Lollipop', search: 'chicken lollipop indian appetizer' },
    'Mushroom Chilli': { newName: 'Cauliflower Chilly', search: 'gobi manchurian chilli cauliflower indian' },
    'Cauliflower Pepper Fry': { newName: 'Cauliflower Pepper Fry', search: 'roasted cauliflower pepper fry indian gobi' },
    'Plain Parotta': { newName: 'Plain Parotta', search: 'kerala parotta layered flatbread' },
    'Ilai Parotta': { newName: 'Ilai Parotta', search: 'food wrapped in banana leaf south indian' },
    'Egg Fried Rice': { newName: 'Egg Fried Rice', search: 'egg fried rice indian chinese' },
    'Paneer Fried Rice': { newName: 'Paneer Fried Rice', search: 'paneer fried rice bowl' },
    'Black Pepper Chicken Rice': { newName: 'Nallampathi Rice', search: 'spicy chicken rice biryani south indian pepper' }
};

async function fetchPexelsImageBuffer(searchQuery) {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=3`;
    
    try {
        const response = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
        const data = await response.json();
        
        if (data.photos && data.photos.length > 0) {
            // we grab the first good match
            const imageUrl = data.photos[0].src.medium;
            const imgRes = await fetch(imageUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
    } catch (e) {
        console.error(`Failed to fetch image for ${searchQuery} from Pexels`, e);
    }
    return null;
}

async function processAndUploadImage(userId, searchQuery) {
    let imgBuffer = await fetchPexelsImageBuffer(searchQuery);
    if (!imgBuffer) return null;
    
    const compressedBuffer = await sharp(imgBuffer)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();
        
    const fileName = `users/${userId}/products/updated_image_${crypto.randomBytes(4).toString('hex')}_${Date.now()}.webp`;
    const file = bucket.file(fileName);
    
    await file.save(compressedBuffer, {
        metadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000' },
        public: true
    });
    
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
}

async function updateItems(userId) {
    console.log(`Starting update for user: ${userId}`);
    const productsRef = db.collection(`users/${userId}/products`);
    const snapshot = await productsRef.get();
    
    let updateCount = 0;
    
    for (const doc of snapshot.docs) {
        const product = doc.data();
        const target = updateTargets[product.name];
        
        if (target) {
            console.log(`Found target: ${product.name}. Updating to ${target.newName} and fetching new image...`);
            
            const newImageUrl = await processAndUploadImage(userId, target.search);
            
            if (newImageUrl) {
                await doc.ref.update({
                    name: target.newName,
                    imageUrl: newImageUrl
                });
                console.log(`✅ Updated ${product.name} successfully!`);
                updateCount++;
            } else {
                console.log(`❌ Failed to find new image for ${product.name}`);
            }
        }
    }
    
    console.log(`Finished updating ${updateCount} items.`);
}

const targetUserId = 'ZiBbTqJ1jJMPvhaaxLhg7tOGj752';
updateItems(targetUserId).then(() => process.exit(0));
