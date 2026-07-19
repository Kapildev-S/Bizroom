import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection } from 'firebase/firestore';

// Initialize Firebase (using your existing config)
const firebaseConfig = {
    apiKey: "AIzaSyAlJYElsOYVcjoWGZOYug7mkoKXYWYMaIY",
    authDomain: "bill-7362b.firebaseapp.com",
    projectId: "bill-7362b",
    storageBucket: "bill-7362b.firebasestorage.app",
    messagingSenderId: "374803975236",
    appId: "1:374803975236:web:be4e0a4caa45ad01e34011",
    measurementId: "G-8DRPZPNJRG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Your Pexels API key (please provide it below)
const PEXELS_API_KEY = 'JIspfgQC4e2xFO1Kw1EEWTBRVaIKOrwyWnqar0UMfiuISzC66qFV2AKq';

const rawProducts = `Plain Dosa,20
Idly,30
Roast Dosa,60
Egg Roast,80
Onion Roast,90
Mushroom Roast,110
Egg Dosa,30
Mini Onion Uttapam,40
Onion Uttapam,80
Chapati,25
Kothu Chapati,140`;

// Custom mapping for better image search on Pexels
const searchMapping: Record<string, string> = {
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
    const [name, price] = line.split(',');
    return { 
        name: name.trim(), 
        category: 'Tiffin', 
        price: Number(price.trim()) 
    };
});

async function fetchPexelsImage(productName: string): Promise<string> {
    const searchQuery = searchMapping[productName] || productName;
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=1`;
    
    try {
        const response = await fetch(url, {
            headers: {
                Authorization: PEXELS_API_KEY
            }
        });
        const data = await response.json();
        
        if (data.photos && data.photos.length > 0) {
            return data.photos[0].src.medium; // Use medium size for POS
        }
    } catch (e) {
        console.error(`Failed to fetch image for ${productName}`, e);
    }
    
    // Fallback dummy image if Pexels fails or no image found
    const colors = ['ff9999', '99ccff', '99ff99', 'ffcc99', 'cc99ff', 'ffff99', 'ff99cc'];
    const bgColor = colors[Math.floor(Math.random() * colors.length)];
    const encodedText = encodeURIComponent(productName.substring(0, 15) + (productName.length > 15 ? '...' : ''));
    return `https://dummyimage.com/200x200/${bgColor}/333333.jpg&text=${encodedText}`;
}

async function seedProducts(userId: string) {
    if (PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY') {
        console.error("Please insert your Pexels API Key in the script before running.");
        return;
    }

    try {
        console.log(`Starting generation of ${products.length} products for user: ${userId}`);
        const productsRef = collection(db, `users/${userId}/products`);
        
        let processedCount = 0;
        const batch = writeBatch(db);

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const productId = `prod_${Date.now()}_${i}`;
            
            console.log(`Fetching image for ${product.name}...`);
            const imageUrl = await fetchPexelsImage(product.name);
            
            const productData = {
                productId,
                name: product.name,
                category: product.category,
                price: product.price,
                stock: 100,
                imageUrl: imageUrl,
                description: `Delicious ${product.name} from our ${product.category} category.`,
                createdAt: new Date().toISOString()
            };
            
            const docRef = doc(productsRef, productId);
            batch.set(docRef, productData);
            processedCount++;
        }
        
        console.log("All images fetched. Committing Firestore batch...");
        await batch.commit();
        
        console.log(`✅ Successfully seeded ${processedCount} products with Pexels images for user ${userId}`);
    } catch (error) {
        console.error('Error seeding products:', error);
    }
}

const targetUserId = 'ZiBbTqJ1jJMPvhaaxLhg7tOGj752';
seedProducts(targetUserId).then(() => process.exit(0));
