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

const rawProducts = `Tandoori Chicken Oil Fry,120,Chilly Items
Chicken 65,60,Chilly Items
Chicken 65 (Boneless),80,Chilly Items
Chicken Leg Piece,60,Chilly Items
Chicken Lollipop,40,Chilly Items
Kadai Roast,110,Chilly Items
Mushroom Chilli,50,Chilly Items
Mushroom Chilli Fry,60,Chilly Items
Green Chicken Chilli (Boneless),90,Chilly Items
Chettinad Chicken,150,Chicken Gravies
Pallipalayam Chicken,120,Chicken Gravies
Chinthamani Chicken,140,Chicken Gravies
Pepper Chicken,140,Chicken Gravies
Black Pepper Chicken,150,Chicken Gravies
Chicken Manchurian,150,Chicken Gravies
Mushroom Pepper Fry,130,Veg Gravies
Mushroom Fry,120,Veg Gravies
Mushroom Manchurian,130,Veg Gravies
Cauliflower Pepper Fry,130,Veg Gravies
Paneer Gravy,150,Veg Gravies
Paneer Manchurian,150,Veg Gravies
Paneer Pepper Fry,150,Veg Gravies
Hot Pepper Leg (2 Pieces),150,Dry Items
Hot Pepper Lollipop (2 Pieces),120,Dry Items
Hot Pepper Boneless,170,Dry Items
Chicken Kothu Parotta,150,Parotta Varieties
Plain Parotta,20,Parotta Varieties
Wheat Parotta,25,Parotta Varieties
Nool Parotta,25,Parotta Varieties
Panchu Parotta,25,Parotta Varieties
Ilai Parotta,130,Parotta Varieties
Kothu Parotta,100,Parotta Varieties
Veg Kothu Parotta,90,Parotta Varieties
Veg Fried Rice,70,Rice Varieties
Egg Fried Rice,80,Rice Varieties
Chicken Fried Rice,100,Rice Varieties
Veg Noodles,80,Rice Varieties
Egg Noodles,90,Rice Varieties
Chicken Noodles,110,Rice Varieties
Black Pepper Chicken Rice,140,Rice Varieties
Pallipalayam Chicken Rice,140,Rice Varieties
Cauliflower Fried Rice,100,Rice Varieties
Mushroom Fried Rice,110,Rice Varieties
Paneer Fried Rice,110,Rice Varieties
Plain Dosa,20,Dosa Varieties
Idli,30,Dosa Varieties
Roast Dosa,60,Dosa Varieties
Egg Roast,80,Dosa Varieties
Onion Roast,90,Dosa Varieties
Mushroom Roast,110,Dosa Varieties
Egg Dosa,30,Dosa Varieties
Mini Onion Uttapam,40,Dosa Varieties
Onion Uttapam,80,Dosa Varieties
Chapati,25,Dosa Varieties
Kothu Chapati,110,Dosa Varieties`;

const searchMapping = {
    // Chilly Items
    'Tandoori Chicken Oil Fry': 'Tandoori Chicken',
    'Chicken 65': 'Chicken 65 Indian',
    'Chicken 65 (Boneless)': 'Fried Chicken Boneless Indian',
    'Chicken Leg Piece': 'Chicken Drumstick Fry',
    'Chicken Lollipop': 'Chicken Lollipop',
    'Kadai Roast': 'Kadai Chicken',
    'Mushroom Chilli': 'Chilli Mushroom',
    'Mushroom Chilli Fry': 'Fried Mushroom Chilli',
    'Green Chicken Chilli (Boneless)': 'Green Chilli Chicken',

    // CHICKEN GRAVIES
    'Chettinad Chicken': 'Chettinad Chicken Curry',
    'Pallipalayam Chicken': 'Indian Chicken Curry',
    'Chinthamani Chicken': 'Spicy Chicken Curry Indian',
    'Pepper Chicken': 'Pepper Chicken Indian',
    'Black Pepper Chicken': 'Black Pepper Chicken Curry',
    'Chicken Manchurian': 'Chicken Manchurian',

    // VEG GRAVIES
    'Mushroom Pepper Fry': 'Mushroom Pepper Fry Indian',
    'Mushroom Fry': 'Mushroom Fry',
    'Mushroom Manchurian': 'Mushroom Manchurian',
    'Cauliflower Pepper Fry': 'Gobi Pepper Fry',
    'Paneer Gravy': 'Paneer Butter Masala',
    'Paneer Manchurian': 'Paneer Manchurian',
    'Paneer Pepper Fry': 'Paneer Pepper Fry',

    // DRY ITEMS
    'Hot Pepper Leg (2 Pieces)': 'Spicy Chicken Drumsticks',
    'Hot Pepper Lollipop (2 Pieces)': 'Spicy Chicken Lollipop',
    'Hot Pepper Boneless': 'Spicy Boneless Chicken Fry',

    // PAROTTA VARIETIES
    'Chicken Kothu Parotta': 'Kothu Parotta Chicken',
    'Plain Parotta': 'Kerala Parotta',
    'Wheat Parotta': 'Wheat Parotta',
    'Nool Parotta': 'Flaky Parotta',
    'Panchu Parotta': 'Soft Parotta',
    'Ilai Parotta': 'Parotta in Banana Leaf',
    'Kothu Parotta': 'Kothu Parotta',
    'Veg Kothu Parotta': 'Veg Kothu Parotta',

    // RICE VARIETIES
    'Veg Fried Rice': 'Vegetable Fried Rice',
    'Egg Fried Rice': 'Egg Fried Rice',
    'Chicken Fried Rice': 'Chicken Fried Rice',
    'Veg Noodles': 'Vegetable Noodles',
    'Egg Noodles': 'Egg Noodles',
    'Chicken Noodles': 'Chicken Noodles',
    'Black Pepper Chicken Rice': 'Black Pepper Chicken Rice',
    'Pallipalayam Chicken Rice': 'Indian Chicken Fried Rice',
    'Cauliflower Fried Rice': 'Gobi Fried Rice',
    'Mushroom Fried Rice': 'Mushroom Fried Rice',
    'Paneer Fried Rice': 'Paneer Fried Rice',

    // DOSA VARIETIES
    'Plain Dosa': 'South Indian Dosa',
    'Idli': 'Idli South Indian',
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
        const colors = ['ff9999', '99ccff', '99ff99', 'ffcc99', 'cc99ff', 'ffff99', 'ff99cc'];
        const bgColor = colors[Math.floor(Math.random() * colors.length)];
        const encodedText = encodeURIComponent(productName.substring(0, 15));
        const fallbackUrl = `https://dummyimage.com/200x200/${bgColor}/333333.jpg&text=${encodedText}`;
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
        }
        
        // 2. Add new products with compression and correct categories
        // Upload in parallel batches of 5 to speed things up
        const concurrency = 5;
        let processedCount = 0;

        for (let i = 0; i < products.length; i += concurrency) {
            const batchChunk = products.slice(i, i + concurrency);
            
            const promises = batchChunk.map(async (product, index) => {
                const productId = `prod_${Date.now()}_${i + index}`;
                console.log(`Fetching & compressing image for ${product.name}...`);
                
                const imageUrl = await processAndUploadImage(userId, product.name);
                
                return {
                    productId,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    stock: 100,
                    imageUrl: imageUrl,
                    description: `Delicious ${product.name} from our ${product.category} category.`,
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
            console.log(`Processed ${processedCount}/${products.length}...`);
        }
        
        console.log(`✅ Successfully seeded ${processedCount} products with compressed images & categories for user ${userId}`);
    } catch (error) {
        console.error('Error seeding products:', error);
    }
}

const targetUserId = 'ZiBbTqJ1jJMPvhaaxLhg7tOGj752';
seedProducts(targetUserId).then(() => process.exit(0));
