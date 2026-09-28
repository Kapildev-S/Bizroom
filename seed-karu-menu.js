require('dotenv').config();
const admin = require('firebase-admin');
const sharp = require('sharp');
const crypto = require('crypto');

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

const rawProducts = [
    // PAROTTA SPECIAL
    { name: "Veechu", price: 30, category: "PAROTTA SPECIAL", search: "Parotta Indian bread" },
    { name: "Muttai Veechu", price: 40, category: "PAROTTA SPECIAL", search: "Egg Parotta Indian" },
    { name: "Onion Muttai Veechu", price: 50, category: "PAROTTA SPECIAL", search: "Egg Onion Parotta" },
    { name: "Bun Parotta", price: 50, category: "PAROTTA SPECIAL", search: "Madurai Bun Parotta" },
    { name: "Illai Parotta", price: 120, category: "PAROTTA SPECIAL", search: "Parotta Banana Leaf" },

    // KOTHU & PAROTTA
    { name: "Chicken Kothu", price: 180, category: "KOTHU & PAROTTA", search: "Chicken Kothu Parotta" },
    { name: "Chapathi Kothu", price: 120, category: "KOTHU & PAROTTA", search: "Kothu Chapathi" },
    { name: "Paneer Kothu", price: 140, category: "KOTHU & PAROTTA", search: "Veg Kothu Parotta" },
    { name: "Chilli Parotta", price: 120, category: "KOTHU & PAROTTA", search: "Chilli Parotta Indian" },

    // DOSAI
    { name: "Muttai Dosai", price: 30, category: "DOSAI", search: "Egg Dosa Indian" },
    { name: "Kari Dosai", price: 100, category: "DOSAI", search: "Madurai Kari Dosa" },
    { name: "Nice", price: 30, category: "DOSAI", search: "Plain Dosa" },
    { name: "Muttai Nice", price: 40, category: "DOSAI", search: "Egg Dosa" },

    // EGG & SNACKS
    { name: "Omelet", price: 25, category: "EGG & SNACKS", search: "Egg Omelette Indian" },
    { name: "Half Boil", price: 15, category: "EGG & SNACKS", search: "Bullseye Egg Half Boil" },
    { name: "Kalaki", price: 20, category: "EGG & SNACKS", search: "Egg Kalaki South Indian" },
    { name: "Kulambu Kalaki", price: 25, category: "EGG & SNACKS", search: "Egg Kalaki Curry" },
    { name: "Onion Kulambu Kalaki", price: 30, category: "EGG & SNACKS", search: "Onion Egg Kalaki" },
    { name: "Muttai Poriyal", price: 30, category: "EGG & SNACKS", search: "Scrambled Eggs Indian" },

    // ROAST
    { name: "Roast", price: 60, category: "ROAST", search: "Plain Dosa Roast" },
    { name: "Onion Roast", price: 90, category: "ROAST", search: "Onion Dosa Roast" },
    { name: "Onion Muttai Roast", price: 100, category: "ROAST", search: "Onion Egg Dosa" },
    { name: "Nei Roast", price: 80, category: "ROAST", search: "Ghee Roast Dosa" },
    { name: "Podi Roast", price: 80, category: "ROAST", search: "Podi Dosa Roast" },
    { name: "Kaalan Roast", price: 90, category: "ROAST", search: "Mushroom Dosa" },
    { name: "Paneer Roast", price: 100, category: "ROAST", search: "Paneer Dosa" },

    // RICE VARIETIES
    { name: "Egg Rice", price: 80, category: "RICE VARIETIES", search: "Egg Fried Rice" },
    { name: "Chicken Rice", price: 100, category: "RICE VARIETIES", search: "Chicken Fried Rice" },
    { name: "Kaalan Rice", price: 100, category: "RICE VARIETIES", search: "Mushroom Fried Rice" },
    { name: "Paneer Rice", price: 120, category: "RICE VARIETIES", search: "Paneer Fried Rice" },
    { name: "Szechwan Rice", price: 100, category: "RICE VARIETIES", search: "Schezwan Fried Rice" },
    { name: "Chicken Szechwan Rice", price: 140, category: "RICE VARIETIES", search: "Schezwan Chicken Fried Rice" },
    { name: "Karaikudi Rice", price: 100, category: "RICE VARIETIES", search: "Spicy South Indian Rice" },
    { name: "Nallampatti Rice", price: 160, category: "RICE VARIETIES", search: "Indian Fried Rice" },

    // CHICKEN SPECIALS
    { name: "Leg Nallampathi", price: 110, category: "CHICKEN SPECIALS", search: "Chicken Leg Fry" },
    { name: "Chicken Nallampathi", price: 160, category: "CHICKEN SPECIALS", search: "Spicy Chicken Gravy" },
    { name: "Nattu Kozhi Pallipalayam", price: 180, category: "CHICKEN SPECIALS", search: "Country Chicken Fry" },
    { name: "Mutton Fry", price: 200, category: "CHICKEN SPECIALS", search: "Mutton Fry Indian" },
    { name: "Mutton Chukka", price: 200, category: "CHICKEN SPECIALS", search: "Mutton Chukka South Indian" },
    { name: "Nattu Kozhi Chukka", price: 180, category: "CHICKEN SPECIALS", search: "Country Chicken Chukka" },
    { name: "Nattu Kozhi Nallampathi", price: 200, category: "CHICKEN SPECIALS", search: "Country Chicken Curry" },
    { name: "Leg Fry", price: 70, category: "CHICKEN SPECIALS", search: "Chicken Leg Fry" },
    { name: "Chicken 65", price: 60, category: "CHICKEN SPECIALS", search: "Chicken 65" },
    { name: "Pallipalayam", price: 90, category: "CHICKEN SPECIALS", search: "Pallipalayam Chicken" },
    { name: "Pepper Chicken", price: 140, category: "CHICKEN SPECIALS", search: "Pepper Chicken Indian" },
    { name: "Chicken Monika", price: 160, category: "CHICKEN SPECIALS", search: "Chicken Gravy Indian" },
    { name: "Chicken Maharani", price: 160, category: "CHICKEN SPECIALS", search: "Rich Chicken Curry" },
    { name: "Chicken Hot Pepper", price: 160, category: "CHICKEN SPECIALS", search: "Hot Pepper Chicken" },
    { name: "Dragon Chicken", price: 160, category: "CHICKEN SPECIALS", search: "Dragon Chicken Indo Chinese" },

    // VEG STARTERS
    { name: "Kaalan", price: 60, category: "VEG STARTERS", search: "Mushroom Fry Indian" },
    { name: "Cauliflower", price: 50, category: "VEG STARTERS", search: "Gobi 65 Cauliflower Fry" },
    { name: "Paneer Maharani", price: 160, category: "VEG STARTERS", search: "Paneer Butter Masala" },
    { name: "Kaalan Manchurian", price: 140, category: "VEG STARTERS", search: "Mushroom Manchurian" },
    { name: "Paneer Chilli", price: 100, category: "VEG STARTERS", search: "Chilli Paneer" },

    // CHICKEN DRY
    { name: "Chicken Fry", price: 150, category: "CHICKEN DRY", search: "Spicy Chicken Fry" },
    { name: "Chicken Pallipalayam", price: 150, category: "CHICKEN DRY", search: "Pallipalayam Chicken Fry" },
    { name: "Chicken Chindamani", price: 150, category: "CHICKEN DRY", search: "Chinthamani Chicken" },
    { name: "Chicken Guntur", price: 160, category: "CHICKEN DRY", search: "Guntur Chicken Fry" }
];

async function fetchPexelsImageBuffer(searchQuery) {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=1`;
    try {
        const response = await fetch(url, {
            headers: { Authorization: PEXELS_API_KEY }
        });
        const data = await response.json();
        
        if (data.photos && data.photos.length > 0) {
            const imageUrl = data.photos[0].src.medium;
            const imgRes = await fetch(imageUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
    } catch (e) {
        console.error(`Failed to fetch image for "${searchQuery}" from Pexels`, e.message);
    }
    return null;
}

async function processAndUploadImage(userId, productName, searchQuery) {
    let imgBuffer = await fetchPexelsImageBuffer(searchQuery);
    
    if (!imgBuffer) {
        const colors = ['ff9999', '99ccff', '99ff99', 'ffcc99', 'cc99ff', 'ffff99', 'ff99cc'];
        const bgColor = colors[Math.floor(Math.random() * colors.length)];
        const encodedText = encodeURIComponent(productName.substring(0, 15));
        const fallbackUrl = `https://dummyimage.com/300x300/${bgColor}/333333.jpg&text=${encodedText}`;
        const fallbackRes = await fetch(fallbackUrl);
        const fallbackArrayBuffer = await fallbackRes.arrayBuffer();
        imgBuffer = Buffer.from(fallbackArrayBuffer);
    }
    
    const compressedBuffer = await sharp(imgBuffer)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();
        
    const fileName = `users/${userId}/products/generated_image_${crypto.randomBytes(4).toString('hex')}_${Date.now()}.webp`;
    const file = bucket.file(fileName);
    
    await file.save(compressedBuffer, {
        metadata: {
            contentType: 'image/webp',
            cacheControl: 'public, max-age=31536000'
        },
        public: true
    });
    
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
}

async function seedUserProducts(userId) {
    try {
        console.log(`🚀 Starting product import (${rawProducts.length} items) for user: ${userId}`);
        const productsRef = db.collection(`users/${userId}/products`);
        
        // Batch concurrency of 5
        const concurrency = 5;
        let processedCount = 0;

        for (let i = 0; i < rawProducts.length; i += concurrency) {
            const batchChunk = rawProducts.slice(i, i + concurrency);
            
            const promises = batchChunk.map(async (product, index) => {
                const productIndex = i + index;
                const productId = `prod_${Date.now()}_${productIndex}`;
                console.log(`[${productIndex + 1}/${rawProducts.length}] Processing image & data for "${product.name}" (${product.category})...`);
                
                const imageUrl = await processAndUploadImage(userId, product.name, product.search);
                
                return {
                    productId,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    stock: 100,
                    imageUrl: imageUrl,
                    description: `Delicious ${product.name} from our ${product.category} section.`,
                    createdAt: new Date().toISOString()
                };
            });
            
            const results = await Promise.all(promises);
            
            const writeBatch = db.batch();
            for (const productData of results) {
                writeBatch.set(productsRef.doc(productData.productId), productData);
            }
            await writeBatch.commit();
            
            processedCount += results.length;
            console.log(`✅ Uploaded batch: ${processedCount}/${rawProducts.length} completed.`);
        }
        
        console.log(`🎉 Successfully seeded ALL ${processedCount} products with custom images for user ${userId}!`);
    } catch (error) {
        console.error('❌ Error seeding products:', error);
    }
}

const targetUserId = 'lPPYtQ7ghnXYON6Saqox0kri7DG3';
seedUserProducts(targetUserId).then(() => process.exit(0));
