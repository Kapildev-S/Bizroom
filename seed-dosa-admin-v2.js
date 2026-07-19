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

const rawProducts = `Plain Dosa,20,Dosa
Idly,30,Idly
Roast Dosa,60,Dosa
Egg Roast,80,Dosa
Onion Roast,90,Dosa
Mushroom Roast,110,Dosa
Egg Dosa,30,Dosa
Mini Onion Uttapam,40,Uttapam
Onion Uttapam,80,Uttapam
Chapati,25,Chapati
Kothu Chapati,140,Chapati`;

const searchMapping = {
    'Plain Dosa': 'South Indian Dosa',
    'Idly': 'Idli South Indian',
    'Roast Dosa': 'Ghee Roast Dosa',
    'Egg Roast': 'Egg Dosa',
    'Onion Roast': 'Onion Dosa',
    'Mushroom Roast': 'Mushroom Dosa',
    'Egg Dosa': 'Egg Dosa',
    'Mini Onion Uttapam': 'Uttapam',
    'Onion Uttapam': 'Uttapam',
    'Chapati': 'Chapati Roti',
    'Kothu Chapati': 'Kothu Parotta'
};

const products = rawProducts.split('\n').filter(Boolean).map(line => {
    const [name, price, category] = line.split(',');
    return { 
        name: name.trim(), 
        category: category.trim(), 
        price: Number(price.trim()) 
    };
});

async function fetchPexelsImageBuffer(productName) {
    const searchQuery = searchMapping[productName] || productName;
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=1`;
    
    try {
        const response = await fetch(url, {
            headers: { Authorization: PEXELS_API_KEY }
        });
        const data = await response.json();
        
        if (data.photos && data.photos.length > 0) {
            const imageUrl = data.photos[0].src.medium; // Use medium size as base
            const imgRes = await fetch(imageUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
    } catch (e) {
        console.error(`Failed to fetch image for ${productName} from Pexels`, e);
    }
    return null;
}

async function processAndUploadImage(userId, productName) {
    let imgBuffer = await fetchPexelsImageBuffer(productName);
    
    if (!imgBuffer) {
        // Fallback dummy image
        const colors = ['ff9999', '99ccff', '99ff99', 'ffcc99', 'cc99ff', 'ffff99', 'ff99cc'];
        const bgColor = colors[Math.floor(Math.random() * colors.length)];
        const encodedText = encodeURIComponent(productName.substring(0, 15));
        const fallbackUrl = `https://dummyimage.com/200x200/${bgColor}/333333.jpg&text=${encodedText}`;
        const fallbackRes = await fetch(fallbackUrl);
        const fallbackArrayBuffer = await fallbackRes.arrayBuffer();
        imgBuffer = Buffer.from(fallbackArrayBuffer);
    }
    
    // Compress and format using sharp
    const compressedBuffer = await sharp(imgBuffer)
        .resize(300, 300, { fit: 'cover' }) // Resize to save space and uniform UI
        .webp({ quality: 80 }) // Compress as WebP
        .toBuffer();
        
    const fileName = `users/${userId}/products/generated_image_${crypto.randomBytes(4).toString('hex')}_${Date.now()}.webp`;
    const file = bucket.file(fileName);
    
    await file.save(compressedBuffer, {
        metadata: {
            contentType: 'image/webp',
            cacheControl: 'public, max-age=31536000'
        },
        public: true // make the file public
    });
    
    // Construct the public URL for Firebase Storage
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
    return downloadURL;
}

async function seedProducts(userId) {
    try {
        console.log(`Starting script for user: ${userId}`);
        const productsRef = db.collection(`users/${userId}/products`);
        
        // 1. Delete existing products
        const existingDocs = await productsRef.get();
        if (!existingDocs.empty) {
            console.log(`Found ${existingDocs.size} existing products. Deleting...`);
            const deleteBatch = db.batch();
            existingDocs.forEach(doc => {
                deleteBatch.delete(doc.ref);
            });
            await deleteBatch.commit();
            console.log('Successfully deleted old products.');
        } else {
            console.log('No existing products found to delete.');
        }
        
        // 2. Add new products with compression and correct categories
        let processedCount = 0;
        
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const productId = `prod_${Date.now()}_${i}`;
            
            console.log(`Fetching & compressing image for ${product.name}...`);
            const imageUrl = await processAndUploadImage(userId, product.name);
            
            const productData = {
                productId,
                name: product.name,
                category: product.category, // using proper category
                price: product.price,
                stock: 100,
                imageUrl: imageUrl,
                description: `Delicious ${product.name} from our ${product.category} category.`,
                createdAt: new Date().toISOString()
            };
            
            await productsRef.doc(productId).set(productData);
            processedCount++;
        }
        
        console.log(`✅ Successfully seeded ${processedCount} products with compressed images & categories for user ${userId}`);
    } catch (error) {
        console.error('Error seeding products:', error);
    }
}

const targetUserId = 'ZiBbTqJ1jJMPvhaaxLhg7tOGj752';
seedProducts(targetUserId).then(() => process.exit(0));
