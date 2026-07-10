import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

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
const storage = getStorage(app);

const rawProducts = `ABC ,Fresh Juice,50
Apple,Fresh Juice,50
Orange Juice,Fresh Juice,50
Orange Pure,Fresh Juice,60
Mosambi,Fresh Juice,45
Mosambi Pure,Fresh Juice,60
Carrot,Fresh Juice,50
Carrot Mint,Fresh Juice,55
Beetroot,Fresh Juice,40
Pomegranate,Fresh Juice,60
Pomegranate Pure,Fresh Juice,80
Mango,Fresh Juice,50
Grapes,Fresh Juice,40
Watermelon,Fresh Juice,40
Watermelon Mint,Fresh Juice,45
Pineapple,Fresh Juice,40
Muskmelon,Fresh Juice,40
Kiwi,Fresh Juice,60
Strawberry,Fresh Juice,60
Guava,Fresh Juice,40
Sapota,Fresh Juice,40
Papaya,Fresh Juice,40
Dragon Fruit,Fresh Juice,60
Amla,Fresh Juice,40
Fig,Fresh Juice,60
Custard Apple,Fresh Juice,50
Lemon,Fresh Juice,30
Lemon Mint,Fresh Juice,35
Lemon Soda,Fresh Juice,40
Nannari Sarbath,Fresh Juice,35
Elaneer Sarbath,Fresh Juice,70
Avil Milk,Milk Flavour,50
Rose Milk,Milk Flavour,40
Dates Milk,Milk Flavour,50
Fig Milk,Milk Flavour,60
Boost Milk,Milk Flavour,50
Horlicks Milk,Milk Flavour,50
Badam Milk,Milk Flavour,50
Ragi Malt Milk,Milk Flavour,50
Complan Milk,Milk Flavour,50
Paruthipaal Milk (Cold),Milk Flavour,50
Red Banana Milk,Milk Flavour,50
Mango Milk,Milk Flavour,50
Sweet Lassi,Lassi,50
Mango Lassi,Lassi,50
Strawberry Lassi,Lassi,50
Chocolate Lassi,Lassi,50
Oreo Lassi,Lassi,60
Vanilla Shake,Milkshake,60
Apple Shake,Milkshake,70
Green Apple Shake,Milkshake,70
Mango Shake,Milkshake,70
Strawberry Shake,Milkshake,70
Chocolate Shake,Milkshake,70
Kulfi Shake,Milkshake,80
Butterscotch Shake,Milkshake,70
Blueberry Shake,Milkshake,70
Black Currant Shake,Milkshake,70
Lychee Shake,Milkshake,70
Guava Shake,Milkshake,70
Pineapple Shake,Milkshake,70
Papaya Shake,Milkshake,60
Red Banana Shake,Milkshake,70
KitKat Shake,Milkshake,80
Dairy Milk Shake,Milkshake,80
Badam Shake,Milkshake,80
Pista Shake,Milkshake,80
Sharjah Shake,Milkshake,80
Dragon Fruit Shake,Milkshake,80
Dry Fruit Nuts Shake,Milkshake,90
Vanilla Ice Cream,Ice Cream,40
Mango Ice Cream,Ice Cream,40
Strawberry Ice Cream,Ice Cream,40
Butterscotch Ice Cream,Ice Cream,40
Chocolate Ice Cream,Ice Cream,40
Black Currant Ice Cream,Ice Cream,50
Blueberry Ice Cream,Ice Cream,50
Pista Malai Ice Cream,Ice Cream,50
Badam Ice Cream,Ice Cream,50
Choco Chips Ice Cream,Ice Cream,50
Cookie Cream Ice Cream,Ice Cream,60
Kulfi Ice Cream,Ice Cream,50
Banana Strawberry Ice Cream,Ice Cream,50
Brownie with Ice Cream,Dessert,100
Royal Falooda,Dessert,100
Fruit Salad,Dessert,60
Blue Mojito,Mojito,50
Strawberry Mojito,Mojito,50
Kiwi Mojito,Mojito,50
Green Apple Mojito,Mojito,50
Blueberry Mojito,Mojito,50
Black Currant Mojito,Mojito,50
Lime Mint Mojito,Mojito,50
Ginger Lime Mojito,Mojito,50`;

const products = rawProducts.split('\n').filter(Boolean).map(line => {
    const [name, category, price] = line.split(',');
    return { 
        name: name.trim(), 
        category: category.trim(), 
        price: Number(price.trim()) 
    };
});

// Generates an image with text and minimal file size
async function fetchGeneratedImage(text: string): Promise<Blob> {
    // We use a dummy image generator that writes the product name on a colored background
    // 200x200 resolution means extremely small size (often < 5KB)
    // We create a random background color for a nice touch
    const colors = ['ff9999', '99ccff', '99ff99', 'ffcc99', 'cc99ff', 'ffff99', 'ff99cc'];
    const bgColor = colors[Math.floor(Math.random() * colors.length)];
    
    const encodedText = encodeURIComponent(text.substring(0, 15) + (text.length > 15 ? '...' : ''));
    const url = `https://dummyimage.com/200x200/${bgColor}/333333.jpg&text=${encodedText}`;
    
    const response = await fetch(url);
    return await response.blob();
}

async function seedProducts(userId: string) {
    try {
        console.log(`Starting generation of ${products.length} products for user: ${userId}`);
        const productsRef = collection(db, `users/${userId}/products`);
        
        // Process in small batches of 5 to not overwhelm the network/rate limits
        const chunkSize = 5;
        let processedCount = 0;
        const batch = writeBatch(db); // Max is 500, we have ~95, so 1 batch is perfectly fine

        for (let i = 0; i < products.length; i += chunkSize) {
            console.log(`Processing chunk ${i / chunkSize + 1} of ${Math.ceil(products.length / chunkSize)}...`);
            
            const chunk = products.slice(i, i + chunkSize);
            const chunkPromises = chunk.map(async (product, index) => {
                const productIndex = i + index;
                const productId = `prod_${Date.now()}_${productIndex}`;
                
                try {
                    // Fetch text-based dummy image
                    const imageBlob = await fetchGeneratedImage(product.name);
                    
                    // Upload to Firebase Storage
                    const imagePath = `users/${userId}/products/generated_image_${productIndex}_${Date.now()}.jpg`;
                    const storageRef = ref(storage, imagePath);
                    
                    const uploadTask = await uploadBytesResumable(storageRef, imageBlob, { contentType: 'image/jpeg' });
                    const downloadURL = await getDownloadURL(uploadTask.ref);
                    
                    return {
                        productId,
                        name: product.name,
                        category: product.category,
                        price: product.price,
                        stock: 100, // default stock
                        imageUrl: downloadURL,
                        description: `Delicious ${product.name} from our ${product.category} category.`,
                        createdAt: new Date().toISOString()
                    };
                } catch (e) {
                    console.error(`Failed to process image for ${product.name}`, e);
                    return null;
                }
            });
            
            const chunkResults = await Promise.all(chunkPromises);
            
            // Add to Firestore batch
            for (const product of chunkResults) {
                if (product) {
                    const docRef = doc(productsRef, product.productId);
                    batch.set(docRef, product);
                }
            }
            
            processedCount += chunk.length;
            console.log(`Finished ${processedCount}/${products.length} uploads.`);
        }
        
        console.log("All images uploaded. Committing Firestore batch...");
        await batch.commit();
        
        console.log(`✅ Successfully seeded ${products.length} products with generated images for user ${userId}`);
    } catch (error) {
        console.error('Error seeding products:', error);
    }
}

const targetUserId = 'r7CAAvWnznOKLw7KAabKFtXd8Oa2';
seedProducts(targetUserId).then(() => process.exit(0));
